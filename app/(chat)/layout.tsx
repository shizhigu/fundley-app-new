import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/lib/auth/clerk';
import Script from 'next/script';
import { DataStreamProvider } from '@/components/data-stream-provider';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <DataStreamProvider>
        <div className="professional-layout">
          <SidebarProvider defaultOpen={!isCollapsed}>
            <AppSidebar user={session?.user} />
            <SidebarInset className="professional-main overflow-hidden">
              <div className="glass-container h-full flex flex-col overflow-hidden">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </DataStreamProvider>
    </>
  );
}
