'use client';

import { memo } from 'react';
import type { VisibilityType, } from './visibility-selector';
import type { AuthSession } from '@/lib/auth/clerk';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  user,
  onToggleSidebar,
  isSidebarOpen,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  user: AuthSession['user'];
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}) {

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background">
      {/* 左侧：侧边栏切换按钮 */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
            title={isSidebarOpen ? "收起聊天列表" : "展开聊天列表"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}

        <div className="text-sm text-muted-foreground">
          Chat • {selectedModelId}
        </div>
      </div>

      {/* 右侧：用户信息 */}
      <div className="flex items-center gap-2">
        {user && (
          <div className="text-sm text-muted-foreground">
            {user.firstName} {user.lastName}
          </div>
        )}
      </div>
    </div>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
