import { PersistentChat } from '@/components/persistent-chat';
import { TradingChart } from '@/components/trading-chart';
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
      <div className="hidden lg:flex h-screen bg-gray-50">
        {/* 左侧聊天面板 */}
        <div className="flex-1 min-w-0 border-r border-gray-200">
          <PersistentChat
            initialChatModel={DEFAULT_MODEL}
            user={session.user}
            preloadedMessages={null}
          />
        </div>

        {/* 右侧图表面板 */}
        <div className="flex-1 min-w-0 bg-white">
          <TradingChart />
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
