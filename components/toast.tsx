'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconsByType: Record<'success' | 'error', ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
};

export function toast(props: Omit<ToastProps, 'id'>) {
  return sonnerToast.custom((id) => (
    <Toast id={id} type={props.type} description={props.description} />
  ));
}

function Toast(props: ToastProps) {
  const { id, type, description } = props;

  const descriptionRef = useRef<HTMLDivElement>(null);
  const [multiLine, setMultiLine] = useState(false);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const update = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
      const lines = Math.round(el.scrollHeight / lineHeight);
      setMultiLine(lines > 1);
    };

    update(); // initial check
    const ro = new ResizeObserver(update); // re-check on width changes
    ro.observe(el);

    return () => ro.disconnect();
  }, [description]);

  return (
    <div className="flex w-full toast-mobile:w-[356px] justify-center">
      <div
        data-testid="toast"
        key={id}
        className={cn(
          'px-4 py-3 w-full toast-mobile:w-fit flex flex-row gap-3 bg-popover border border-border rounded-lg shadow-lg',
          multiLine ? 'items-start' : 'items-center'
        )}
      >
        <div
          data-type={type}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            type === 'error'
              ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
              : 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
            { 'mt-0.5': multiLine }
          )}
        >
          {iconsByType[type]}
        </div>
        <div
          ref={descriptionRef}
          className="text-foreground text-sm font-medium flex-1"
        >
          {description}
        </div>
      </div>
    </div>
  );
}

interface ToastProps {
  id: string | number;
  type: 'success' | 'error';
  description: string;
}
