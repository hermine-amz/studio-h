'use client';

import React from 'react';
import {
  ALL_COUNTRIES,
  getCountryByCode,
  getFlagImageUrl,
  resolveIso2Code,
} from '@/lib/countries';
import { cn } from '@/lib/currency';

interface CountryBadgeProps {
  code: string | null | undefined;
  showName?: boolean;
  className?: string;
}

export function CountryBadge({
  code,
  showName = false,
  className,
}: CountryBadgeProps) {
  const country = getCountryByCode(code);
  const flagUrl = getFlagImageUrl(country.code);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg bg-white/90 border border-stone-200/90 px-2 py-0.5 text-xs font-medium text-zinc-800 shadow-2xs shrink-0',
        className
      )}
      title={`${country.name} (${country.code})`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagUrl}
        alt={country.name}
        className="h-3.5 w-5 rounded-[2px] object-cover border border-stone-200/60 shrink-0"
        loading="lazy"
      />
      <span className="font-mono text-[11px] font-semibold uppercase">
        {country.code}
      </span>
      {showName && (
        <span className="text-zinc-600 font-normal truncate max-w-[120px]">
          {country.name}
        </span>
      )}
    </span>
  );
}

interface CountrySelectProps {
  value: string;
  onChange: (newCode: string) => void;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  className,
}: CountrySelectProps) {
  const currentIso = resolveIso2Code(value);
  const regions = [
    'Europe',
    'Amérique',
    'Afrique',
    'Moyen-Orient & Asie',
    'Océanie',
  ] as const;

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getFlagImageUrl(currentIso)}
        alt={currentIso}
        className="h-4 w-5 rounded-[2px] object-cover border border-stone-200 absolute left-3 pointer-events-none z-10"
      />
      <select
        value={currentIso}
        onChange={(e) => onChange(e.target.value)}
        className="glass-input pl-10 pr-7"
      >
        {regions.map((reg) => (
          <optgroup key={reg} label={`— ${reg} —`}>
            {ALL_COUNTRIES.filter((c) => c.region === reg).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

