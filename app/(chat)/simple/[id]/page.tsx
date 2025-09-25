import { SimpleChat } from '@/components/simple-chat';
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
      <SimpleChat id={id} user={session.user} />
    </div>
  );
}