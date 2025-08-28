'use client';

import type { AuthSession } from '@/lib/auth/clerk';
import { useRouter } from 'next/navigation';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: AuthSession['user'] }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return (
    <div className="w-64 h-screen bg-transparent backdrop-blur-sm p-3">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 h-[calc(100vh-1.5rem)] flex flex-col overflow-hidden relative">
        
        {/* Header - 品牌和新建对话 */}
        <div className="p-6 border-b border-gray-300 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              onClick={() => setOpenMobile(false)}
              className="flex flex-col"
            >
              <div className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                FUNDLEY A.I+
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Financial Intelligence
              </div>
            </Link>
          </div>
          
          {/* 新建对话按钮 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center gap-2 transition-all duration-200 shadow-md"
                onClick={() => {
                  setOpenMobile(false);
                  router.push('/');
                  router.refresh();
                }}
              >
                <PlusIcon size={16} />
                <span className="font-medium">New chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start a new conversation</TooltipContent>
          </Tooltip>
        </div>

        {/* 历史对话区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-3 border-b border-gray-300 dark:border-gray-600">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-500">
              Your conversations
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 py-2 pb-20 custom-scrollbar">
            <SidebarHistory user={user} />
          </div>
        </div>

        {/* Footer */}
        <div 
          className="absolute bottom-0 left-0 right-0 p-4" 
          style={{ 
            background: 'transparent !important',
            backgroundColor: 'transparent !important',
            backgroundImage: 'none !important',
            borderBottom: 'none !important',
            borderTop: 'none !important'
          }}
        >
          {user && <SidebarUserNav user={user} />}
        </div>
      </div>
    </div>
  );
}