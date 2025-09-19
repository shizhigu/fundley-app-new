import { ChatInterface } from '@/components/chat-interface';
import { auth } from '@/lib/auth/clerk';
import { redirect } from 'next/navigation';
import { DEFAULT_MODEL } from '@/lib/ai/models';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <ChatInterface
      initialChatModel={DEFAULT_MODEL}
      user={session.user}
    />
  );
}
