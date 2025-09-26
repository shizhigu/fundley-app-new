import { ChatLayout } from '@/components/chat-layout';
import { auth } from '@/lib/auth/clerk';
import { redirect } from 'next/navigation';
import { DEFAULT_MODEL } from '@/lib/ai/models';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <ChatLayout
      user={session.user}
      initialChatModel={DEFAULT_MODEL}
    />
  );
}
