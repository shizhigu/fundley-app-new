import { PersistentChat } from '@/components/persistent-chat';
import { RightPanelTabs } from '@/components/right-panel-tabs';
import { MobileTabs } from '@/components/mobile-tabs';
import { auth } from '@/lib/auth/clerk';
import { redirect } from 'next/navigation';
import { DEFAULT_MODEL } from '@/lib/ai/models';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <>
      {/* 桌面端分屏布局 */}
      <div className="hidden lg:flex h-screen bg-transparent">
        {/* 左侧聊天面板 */}
        <div className="flex-1 min-w-0 border-r border-border">
          <PersistentChat
            initialChatModel={DEFAULT_MODEL}
            user={session.user}
            preloadedMessages={null}
          />
        </div>

        {/* 右侧标签页面板 */}
        <div className="flex-1 min-w-0 bg-transparent">
          <RightPanelTabs />
        </div>
      </div>

      {/* 移动端标签式布局 */}
      <MobileTabs
        initialChatModel={DEFAULT_MODEL}
        user={session.user}
        preloadedMessages={null}
      />
    </>
  );
}
