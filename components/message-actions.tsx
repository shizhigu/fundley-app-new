import { useCopyToClipboard } from 'usehooks-ts';

import { CopyIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { memo } from 'react';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/types';

export function PureMessageActions({
  message,
  isLoading,
}: {
  message: ChatMessage;
  isLoading: boolean;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) return null;
  if (message.role === 'user') return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="neuro-raised-sm px-3 py-1.5 rounded-lg bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 text-muted-foreground hover:text-foreground transition-all duration-300"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter((part: any) => part.type === 'text')
                  .map((part: any) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success('Copied to clipboard!');
              }}
              type="button"
            >
              <CopyIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    return true;
  },
);
