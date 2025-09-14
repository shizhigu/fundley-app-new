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
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  user: AuthSession['user'];
}) {

  return null;
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
