import React from 'react';
import { cn } from '@/lib/currency';

interface StudioHLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function StudioHLogo({
  size = 'md',
  showText = true,
  className,
}: StudioHLogoProps) {
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }[size];

  return (
    <div
      className={cn('inline-flex items-center gap-2.5 select-none', className)}
    >
      <div
        className={cn(
          'relative flex items-center justify-center rounded-lg bg-[#FFF8B9]/60 border border-[#568203]/30 overflow-hidden shrink-0 shadow-sm',
          dimensions
        )}
      >
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 h-3/4 w-3/4"
        >
          {/* Corner viewfinder brackets */}
          <path
            d="M7 13V9.5C7 8.11929 8.11929 7 9.5 7H13"
            stroke="#568203"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M31 7H34.5C35.8807 7 37 8.11929 37 9.5V13"
            stroke="#568203"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M37 31V34.5C37 35.8807 35.8807 37 34.5 37H31"
            stroke="#568203"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M13 37H9.5C8.11929 37 7 35.8807 7 34.5V31"
            stroke="#568203"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Architectural H Pillars */}
          <path
            d="M15.5 12.5V31.5"
            stroke="#18181B"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M28.5 12.5V31.5"
            stroke="#18181B"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Crossbar */}
          <path
            d="M15.5 22H19.5"
            stroke="#18181B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M24.5 22H28.5"
            stroke="#18181B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* 5% Avocado Jewel Diamond in Center */}
          <path
            d="M22 18.2L25.8 22L22 25.8L18.2 22L22 18.2Z"
            fill="#568203"
            stroke="#568203"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tracking-[0.12em] text-zinc-900 text-xs uppercase leading-none">
              Studio H
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#568203]" />
          </div>
          <span className="mt-0.5 text-[10px] tracking-[0.06em] text-zinc-500 uppercase leading-none">
            Creative AI & UGC
          </span>
        </div>
      )}
    </div>
  );
}
