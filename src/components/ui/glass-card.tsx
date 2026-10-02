import React from 'react';
import { cn } from '@/lib/utils';

/**
 * GlassCard — superfície padrão do Design System (glassmorphism).
 * bg-black/40 + backdrop-blur-md + borda branca 10% + rounded-3xl.
 */
export const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md shadow-glass',
        className
      )}
      {...props}
    />
  )
);
GlassCard.displayName = 'GlassCard';
