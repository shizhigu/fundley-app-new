import { PersistentChat } from '@/components/persistent-chat';
import { auth } from '@/lib/auth/clerk';
import { redirect } from 'next/navigation';
import { DEFAULT_MODEL } from '@/lib/ai/models';
import { preloadUserMessages } from '@/lib/server/convex-auth';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  // 🔒 安全的服务器端数据预加载
  const preloadedMessages = await preloadUserMessages();

  return (
    <PersistentChat 
      initialChatModel={DEFAULT_MODEL}
      session={session}
      preloadedMessages={preloadedMessages}
    />
  );
}
