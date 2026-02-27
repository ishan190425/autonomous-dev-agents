'use client';

import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GlowColor = 'none' | 'cyan' | 'purple' | 'pink';

const glowStyles: Record<GlowColor, string> = {
  none: '',
  cyan: 'border-n-cyan/20 shadow-glow-cyan',
  purple: 'border-n-purple/20 shadow-glow-purple',
  pink: 'border-n-pink/20 shadow-glow-pink',
};

interface GlassCardProps {
  glow?: GlowColor;
  hover?: boolean;
  className?: string;
  children?: ReactNode;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = 'none', hover = true, children }, ref) => (
    <motion.div
      ref={ref}
      whileHover={hover ? { scale: 1.005 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'rounded-xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-xl',
        glowStyles[glow],
        hover && 'hover:bg-white/[0.08] hover:border-white/[0.12] transition-colors',
        className
      )}
    >
      {children}
    </motion.div>
  )
);
GlassCard.displayName = 'GlassCard';

const GlassCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
);
GlassCardHeader.displayName = 'GlassCardHeader';

const GlassCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-n-text', className)}
      {...props}
    />
  )
);
GlassCardTitle.displayName = 'GlassCardTitle';

const GlassCardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-n-text-muted', className)}
      {...props}
    />
  )
);
GlassCardDescription.displayName = 'GlassCardDescription';

const GlassCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
GlassCardContent.displayName = 'GlassCardContent';

const GlassCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
);
GlassCardFooter.displayName = 'GlassCardFooter';

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
};
