'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  CheckCircleFillIcon,
  ChevronDownIcon,
  GlobeIcon,
  LockIcon,
} from './icons';
import { useChatVisibility } from '@/hooks/use-chat-visibility';

export type VisibilityType = 'private' | 'public';

const visibilities: Array<{
  id: VisibilityType;
  label: string;
  icon: ReactNode;
}> = [
  {
    id: 'private',
    label: 'Private',
    icon: <LockIcon size={14} />,
  },
  {
    id: 'public',
    label: 'Public',
    icon: <GlobeIcon size={14} />,
  },
];

export function VisibilitySelector({
  chatId,
  className,
  selectedVisibilityType,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId,
    initialVisibilityType: selectedVisibilityType,
  });

  const selectedVisibility = useMemo(
    () => visibilities.find((visibility) => visibility.id === visibilityType),
    [visibilityType],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="visibility-selector"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-3 text-sm font-medium transition-all duration-200',
            'bg-white/10 backdrop-blur-md border border-white/20',
            'hover:bg-white/20 hover:border-white/30',
            'text-foreground/80 hover:text-foreground',
            'hidden md:flex items-center gap-1.5',
            open && 'bg-white/20 border-white/30',
            className,
          )}
        >
          {selectedVisibility?.icon}
          <span>{selectedVisibility?.label}</span>
          <div className={cn(
            'ml-1 transition-transform duration-200',
            open && 'rotate-180'
          )}>
            <ChevronDownIcon size={12} />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        align="start" 
        className="w-40 p-1 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
        sideOffset={4}
      >
        <div className="space-y-1">
          {visibilities.map((visibility) => (
            <button
              key={visibility.id}
              data-testid={`visibility-selector-item-${visibility.id}`}
              type="button"
              onClick={() => {
                setVisibilityType(visibility.id);
                setOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-sm font-medium transition-all duration-200',
                'flex items-center justify-between rounded-md',
                'hover:bg-white/20 text-foreground/80 hover:text-foreground',
                visibility.id === visibilityType && 'bg-white/20 text-foreground'
              )}
            >
              <div className="flex items-center gap-2">
                {visibility.icon}
                <span>{visibility.label}</span>
              </div>
              {visibility.id === visibilityType && (
                <CheckCircleFillIcon size={14} />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
