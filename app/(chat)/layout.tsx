import { ChatLayoutProvider } from '@/components/chat-layout-provider';
import { auth } from '@/lib/auth/clerk';
import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { MemoSystem } from '@/components/memo-system';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <>
      <DataStreamProvider>
        <ChatLayoutProvider user={session?.user || null}>
          <div className="flex-1 overflow-hidden max-w-full min-w-0">
            {children}
          </div>
          <MemoSystem />
        </ChatLayoutProvider>
      </DataStreamProvider>
    </>
  );
}
