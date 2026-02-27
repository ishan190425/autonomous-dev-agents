'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const neonButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-n-bg disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-n-cyan/10 text-n-cyan border border-n-cyan/20 hover:bg-n-cyan/20 hover:shadow-glow-cyan',
        primary:
          'bg-n-purple text-white hover:bg-n-purple-dim shadow-glow-purple hover:shadow-glow-purple-lg',
        ghost: 'text-n-text-secondary hover:bg-white/[0.06] hover:text-n-text',
        outline:
          'border border-white/[0.12] bg-transparent text-n-text-secondary hover:bg-white/[0.06] hover:text-n-text hover:border-white/[0.2]',
        destructive:
          'bg-n-status-error/10 text-n-status-error border border-n-status-error/20 hover:bg-n-status-error/20',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface NeonButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof neonButtonVariants> {}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(neonButtonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
NeonButton.displayName = 'NeonButton';

export { NeonButton, neonButtonVariants };
