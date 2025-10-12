import { ChatManager } from '@/components/chat-manager';
import { auth } from '@/lib/auth/clerk';
import { redirect } from 'next/navigation';

export default async function SimpleChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session.user) {
    redirect('/sign-in');
  }

  const { id } = await params;

  return (
    <div className="h-screen">
      <ChatManager user={session.user} />
    </div>
  );
}