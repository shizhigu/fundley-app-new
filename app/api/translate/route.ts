import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/translate
 * Translate text to Chinese using OpenRouter (DeepSeek V3.2)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 },
      );
    }

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          provider: {
            only: ['cerebras'],
          },
          messages: [
            {
              role: 'system',
              content: `你是一位专业的财经翻译专家。你的任务是将英文财报电话会议记录翻译成**中文**，并使用 Markdown 格式输出。

## 翻译要求
1. 完整翻译全文，不得省略、概括或总结任何内容
2. 保留所有数字、日期、公司名称、人名、产品名称等专有名词（人名保留英文原文）
3. 使用专业的财经术语
4. 翻译要准确、流畅、自然
5. 不要添加任何解释、注释或个人评论
6. 直接输出翻译结果，不要有任何前言或后语

## 排版格式要求（非常重要）
1. 发言人姓名使用三级标题格式：### Tim Cook - CEO
2. 每位发言者的内容作为独立段落，发言者之间空一行
3. 同一发言者的长段落，每 3-4 句话换一次行，便于阅读
4. 重要数字、百分比、金额可以用 **加粗** 突出
5. 如果有明显的会议环节（如开场白、Q&A环节），用 ## 二级标题分隔
6. 列举多个要点时，使用有序或无序列表
7. 保持整洁的视觉层次，让读者容易浏览`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      console.error(
        'OpenRouter API error:',
        response.status,
        response.statusText,
      );
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return NextResponse.json(
        { error: 'Translation failed' },
        { status: response.status },
      );
    }

    const result = await response.json();
    const translatedText = result.choices?.[0]?.message?.content;

    if (!translatedText) {
      return NextResponse.json(
        { error: 'No translation returned' },
        { status: 500 },
      );
    }

    return NextResponse.json({ translation: translatedText });
  } catch (error) {
    console.error('Error translating:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
