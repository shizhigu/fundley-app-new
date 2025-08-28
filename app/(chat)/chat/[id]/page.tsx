import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth/clerk';
import { ChatWrapper } from '@/components/chat-wrapper';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  return (
    <ChatWrapper 
      id={id}
      session={session}
    />
  );
}
