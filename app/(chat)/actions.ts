'use server';

import { convexQueries } from '@/lib/convex/client';

// Simple UI message type for AgentOS migration
interface SimpleUIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: SimpleUIMessage;
}) {
  // Simple title generation for AgentOS migration
  // Extract first 60 characters from content as title
  const title = message.content.slice(0, 60) + (message.content.length > 60 ? '...' : '');

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const message = await convexQueries.getMessageById({ id });
  if (!message) return;

  await convexQueries.deleteMessagesAfterTimestamp({
    timestamp: message.createdAt,
  });
}