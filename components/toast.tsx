'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircleFillIcon, WarningIcon } from './icons';
import { cn } from '@/lib/utils';

const iconsByType: Record<'success' | 'error', ReactNode> = {
  success: <CheckCircleFillIcon />,
  error: <WarningIcon />,
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
          'neuro-card px-4 py-3 w-full toast-mobile:w-fit flex flex-row gap-3 backdrop-blur-sm',
          multiLine ? 'items-start' : 'items-center',
        )}
      >
        <div
          data-type={type}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            'data-[type=error]:bg-gradient-to-br data-[type=error]:from-red-50 data-[type=error]:to-red-100 data-[type=error]:text-red-600',
            'data-[type=success]:bg-gradient-to-br data-[type=success]:from-green-50 data-[type=success]:to-green-100 data-[type=success]:text-green-600',
            'neuro-raised-sm',
            { 'mt-0.5': multiLine },
          )}
        >
          {iconsByType[type]}
        </div>
        <div ref={descriptionRef} className="text-foreground text-sm font-medium flex-1">
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
