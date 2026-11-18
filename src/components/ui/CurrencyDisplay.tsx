import React from 'react';
import { formatEur, formatFcfa, cn } from '@/lib/currency';

interface CurrencyDisplayProps {
  amountEur: number;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'inline' | 'stacked';
  className?: string;
  fcfaClassName?: string;
}

export function CurrencyDisplay({
  amountEur,
  decimals = 0,
  size = 'md',
  layout = 'stacked',
  className,
  fcfaClassName,
}: CurrencyDisplayProps) {
  const eurFormatted = formatEur(amountEur, decimals);
  const fcfaFormatted = formatFcfa(amountEur);

  const eurClasses = {
    sm: 'text-[13px] font-semibold',
    md: 'text-[15px] font-semibold',
    lg: 'text-xl font-bold tracking-tight',
    xl: 'text-2xl font-bold tracking-tight',
  }[size];

  const fcfaClasses = {
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-xs',
    xl: 'text-[13px]',
  }[size];

  if (layout === 'inline') {
    return (
      <span className={cn('inline-flex items-baseline gap-1.5', className)}>
        <span className={cn('text-zinc-900', eurClasses)}>{eurFormatted}</span>
        <span
          className={cn(
            'text-zinc-500 font-normal font-mono',
            fcfaClasses,
            fcfaClassName
          )}
        >
          ({fcfaFormatted})
        </span>
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn('text-zinc-900 leading-tight', eurClasses)}>
        {eurFormatted}
      </span>
      <span
        className={cn(
          'text-zinc-500 font-normal font-mono mt-0.5',
          fcfaClasses,
          fcfaClassName
        )}
      >
        {fcfaFormatted}
      </span>
    </div>
  );
}
