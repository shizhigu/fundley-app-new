import { useCopyToClipboard } from 'usehooks-ts';
import { memo } from 'react';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface MessageActionsProps {
  message: ChatMessage;
  isLoading: boolean;
}

export function PureMessageActions({
  message,
  isLoading,
}: MessageActionsProps) {
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) return null;
  if (message.role === 'user') return null;

  const handleCopy = async () => {
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
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-card border border-border/50 text-muted-foreground hover:text-brand-primary hover:border-brand-primary/30 hover:scale-[1.02] transition-all duration-150"
            >
              <Copy className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy message</p>
          </TooltipContent>
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
