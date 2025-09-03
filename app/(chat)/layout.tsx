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
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <ChatLayoutProvider session={session}>
          <div className="flex-1 overflow-hidden max-w-full min-w-0">
            {children}
          </div>
          <MemoSystem />
        </ChatLayoutProvider>
      </DataStreamProvider>
    </>
  );
}
