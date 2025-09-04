'use client';

import { memo } from 'react';
import type { VisibilityType, } from './visibility-selector';
import { DevTools } from './dev-tools';
import type { AuthSession } from '@/lib/auth/clerk';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  user,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  user: AuthSession['user'];
}) {

  return (
    <>
      {/* Development Tools - Floating in top-right corner in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <DevTools />
        </div>
      )}
    </>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
