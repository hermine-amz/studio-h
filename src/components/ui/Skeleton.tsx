import React from 'react';
import { cn } from '@/lib/currency';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-stone-200/60 border border-stone-200/80',
        className
      )}
    />
  );
}
