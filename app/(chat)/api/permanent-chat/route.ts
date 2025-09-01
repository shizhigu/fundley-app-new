import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { NextResponse } from 'next/server';
import { getLanguageModel } from '@/lib/ai/providers';
import { streamText } from 'ai';
import { systemPrompt } from '@/lib/ai/prompts';

export const maxDuration = 60;

export async function POST(request: Request) {
  console.log('🚀 Permanent chat API called');
  const { getToken, userId } = await auth();
  console.log('👤 User ID:', userId);
  
  if (!userId) {
    console.log('❌ No user ID, returning 401');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    console.log('📨 Permanent chat API received:', JSON.stringify(requestBody, null, 2));
    
    // Handle both useChat format and custom format
    let messages;
    let selectedChatModel;
    
    if (requestBody.messages && Array.isArray(requestBody.messages)) {
      // useChat format
      messages = requestBody.messages;
      selectedChatModel = requestBody.selectedChatModel || requestBody.body?.selectedChatModel || 'grok-3';
    } else if (requestBody.message) {
      // Custom format (fallback)
      messages = [{ role: 'user', content: requestBody.message.text }];
      selectedChatModel = requestBody.model || 'grok-3';
    } else {
      console.log('❌ Invalid request format');
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    if (!messages || messages.length === 0) {
      console.log('❌ No messages provided');
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Create authenticated Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
    const token = await getToken({ template: 'convex' }); if (token) { convex.setAuth(token); }
    
    // Ensure user exists
    await convex.mutation(api.users.store);
    
    // Get the new user message (last message in the array)
    const newUserMessage = messages[messages.length - 1];
    
    // Prepare messages for AI (messages array already contains the conversation)
    const aiMessages = [
      { role: 'system' as const, content: systemPrompt({}) },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Get AI model
    const languageModel = getLanguageModel(selectedChatModel);

    // Stream AI response
    const result = streamText({
      model: languageModel,
      messages: aiMessages,
      temperature: 0.7,
    });

    // Save user message first (only if it's not already saved)
    if (newUserMessage.role === 'user') {
      await convex.mutation(api.messages.create, {
        role: 'user',
        parts: [{ type: 'text', text: newUserMessage.content }],
        attachments: [],
      });
    }

    // Handle streaming and save assistant response
    return result.toUIMessageStreamResponse({
      onFinish: async ({ text }) => {
        await convex.mutation(api.messages.create, {
          role: 'assistant',
          parts: [{ type: 'text', text }],
          attachments: [],
        });
      }
    });

  } catch (error) {
    console.error('Permanent chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}