'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';
import { memo } from 'react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { VisibilityType, } from './visibility-selector';
import { DevTools } from './dev-tools';
import { cn } from '@/lib/utils';
import type { AuthSession } from '@/lib/auth/clerk';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: AuthSession;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'order-2 md:order-1 ml-auto md:ml-0 h-8 px-3 transition-all duration-200',
                'bg-white/10 backdrop-blur-md border border-white/20',
                'hover:bg-white/20 hover:border-white/30',
                'text-foreground/80 hover:text-foreground'
              )}
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon size={16} />
              <span className="md:sr-only ml-1.5">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}


      {/* Development Tools - Only show in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <DevTools />
      )}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
