import { NavigationSidebar } from '@/components/navigation-sidebar';
import { auth } from '@/lib/auth/clerk';
import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';

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
        <div className="professional-layout flex">
          <NavigationSidebar user={session?.user} />
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </DataStreamProvider>
    </>
  );
}
