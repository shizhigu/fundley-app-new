import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'neuro-primary text-white rounded-xl font-semibold',
        destructive:
          'neuro-raised rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[4px_4px_8px_rgba(239,68,68,0.15),-2px_-2px_6px_rgba(255,255,255,0.1)] hover:shadow-[6px_6px_12px_rgba(239,68,68,0.2),-3px_-3px_8px_rgba(255,255,255,0.15)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]',
        outline:
          'neuro-raised-sm rounded-xl bg-gradient-to-br from-white to-gray-50 text-foreground hover:text-primary',
        secondary:
          'neuro-raised-sm rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-foreground',
        ghost: 'rounded-lg hover:bg-gray-100/50 text-foreground transition-colors duration-200',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-6 py-2.5',
        sm: 'h-9 px-4 py-2 text-xs',
        lg: 'h-12 px-8 py-3 text-base',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
