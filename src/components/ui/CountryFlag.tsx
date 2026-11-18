'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Search, ChevronDown, Check } from 'lucide-react';
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

interface CountryFilterDropdownProps {
  value: string; // 'ALL' or ISO2 code
  onChange: (code: string) => void;
  className?: string;
}

export function CountryFilterDropdown({
  value,
  onChange,
  className,
}: CountryFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCountries = ALL_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.region.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCountry = value === 'ALL' ? null : getCountryByCode(value);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center justify-between gap-2 rounded-xl bg-white border border-stone-300/90 hover:border-[#568203] px-3.5 py-2 text-xs font-medium text-zinc-800 shadow-xs transition-all min-w-[200px] w-full sm:w-auto"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedCountry ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getFlagImageUrl(selectedCountry.code)}
                alt={selectedCountry.name}
                className="h-3.5 w-5 rounded-[2px] object-cover border border-stone-200 shrink-0"
              />
              <span className="truncate">
                {selectedCountry.name} ({selectedCountry.code})
              </span>
            </>
          ) : (
            <>
              <Globe
                className="h-4 w-4 text-[#568203] shrink-0"
                strokeWidth={1.5}
              />
              <span>Tous les pays ({ALL_COUNTRIES.length})</span>
            </>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-zinc-400 transition-transform shrink-0',
            open && 'rotate-180'
          )}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div
          style={{ zIndex: 2147483500 }}
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-stone-200 shadow-2xl p-2.5 space-y-2"
        >
          <div className="relative">
            <Search
              className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-2.5"
              strokeWidth={1.5}
            />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un pays (ex: Bénin, France...)"
              className="w-full rounded-xl bg-stone-50 border border-stone-200 pl-8 pr-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#568203]"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
            <button
              type="button"
              onClick={() => {
                onChange('ALL');
                setOpen(false);
                setSearch('');
              }}
              className={cn(
                'w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors',
                value === 'ALL'
                  ? 'bg-[#FFF8B9]/75 text-zinc-900 font-semibold'
                  : 'text-zinc-700 hover:bg-stone-100'
              )}
            >
              <span className="flex items-center gap-2">
                <Globe
                  className="h-4 w-4 text-[#568203]"
                  strokeWidth={1.5}
                />
                <span>Tous les pays</span>
              </span>
              {value === 'ALL' && (
                <Check className="h-3.5 w-3.5 text-[#568203]" strokeWidth={2} />
              )}
            </button>

            {filteredCountries.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400">
                Aucun pays trouvé.
              </div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = value === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors',
                      isSelected
                        ? 'bg-[#FFF8B9]/75 text-zinc-900 font-semibold'
                        : 'text-zinc-700 hover:bg-stone-100'
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getFlagImageUrl(c.code)}
                        alt={c.name}
                        className="h-3.5 w-5 rounded-[2px] object-cover border border-stone-200 shrink-0"
                        loading="lazy"
                      />
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                        {c.code}
                      </span>
                    </span>
                    {isSelected && (
                      <Check
                        className="h-3.5 w-3.5 text-[#568203] shrink-0"
                        strokeWidth={2}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
