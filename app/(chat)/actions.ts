'use server';

import { generateText, type UIMessage } from 'ai';
import { convexQueries } from '@/lib/convex/client';
import { titleModel } from '@/lib/ai/providers';

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: titleModel,
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const message = await convexQueries.getMessageById({ id });
  if (!message) return;

  await convexQueries.deleteMessagesAfterTimestamp({
    timestamp: message.createdAt,
  });
}

// Permanent chat doesn't need title updates
// export async function updatePermanentChatTitle({
//   title,
// }: {
//   title: string;
// }) {
//   await convexQueries.updatePermanentChatTitle(title);
// }
