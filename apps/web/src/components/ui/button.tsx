import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button Component — Per C1112 Design System
 * Variants: default (primary), secondary, outline, ghost, destructive
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-n-bg disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-n-purple text-white hover:bg-n-purple-dim',
        secondary: 'bg-white/[0.06] text-n-text-secondary hover:bg-white/[0.1] hover:text-n-text',
        outline: 'border border-white/[0.12] bg-transparent text-n-text-secondary hover:bg-white/[0.06] hover:text-n-text',
        ghost: 'text-n-text-secondary hover:bg-white/[0.06] hover:text-n-text',
        destructive: 'bg-n-status-error text-white hover:bg-n-status-error/90',
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

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
