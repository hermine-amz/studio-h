'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Video,
  Sparkles,
  Wallet,
  LogOut,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { StudioHLogo } from '@/components/brand/StudioHLogo';
import { cn } from '@/lib/currency';
import { useStudioData } from '@/context/StudioDataContext';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const NAV_ITEMS = [
  {
    label: 'Cockpit',
    href: '/',
    icon: LayoutDashboard,
    description: 'Focus & Objectif',
  },
  {
    label: 'Prospects & Clients',
    href: '/crm',
    icon: Users,
    description: 'Pipeline Europe & 360',
  },
  {
    label: 'Production UGC',
    href: '/production',
    icon: Video,
    description: 'Atelier & Livraison',
  },
  {
    label: 'Bibliothèque Prompts',
    href: '/prompts',
    icon: Sparkles,
    description: 'Hooks & Scripts IA',
  },
  {
    label: 'Trésorerie',
    href: '/finances',
    icon: Wallet,
    description: 'Revenus & Outils IA',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLiveSupabase, commandes, prospects } = useStudioData();

  const activeOrdersCount = commandes.filter(
    (c) => c.statut_production !== 'Livré'
  ).length;
  const signedClientsCount = prospects.filter(
    (p) => p.statut === 'Signé'
  ).length;

  const handleLogout = async () => {
    document.cookie =
      'studio_h_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignore signOut error
      }
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden lg:flex w-60 flex-col bg-white/95 backdrop-blur-md border-r border-stone-200/90">
      {/* Brand Header */}
      <div className="px-5 py-4.5 border-b border-stone-100">
        <Link href="/" className="block focus:outline-none">
          <StudioHLogo size="md" />
        </Link>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-150 border',
                isActive
                  ? 'bg-[#FFF8B9]/45 text-zinc-900 border-[#568203]/25 font-medium'
                  : 'bg-transparent text-zinc-600 border-transparent hover:bg-stone-100/80 hover:text-zinc-900'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#568203]" />
              )}

              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    isActive
                      ? 'text-[#568203]'
                      : 'text-zinc-400 group-hover:text-zinc-700'
                  )}
                  strokeWidth={1.5}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] leading-tight truncate">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-zinc-400 leading-tight truncate mt-0.5">
                    {item.description}
                  </span>
                </div>
              </div>

              {item.href === '/production' && activeOrdersCount > 0 && (
                <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-mono text-zinc-700">
                  {activeOrdersCount}
                </span>
              )}
              {item.href === '/crm' && signedClientsCount > 0 && (
                <span className="rounded-md bg-[#568203] px-2 py-0.5 text-[11px] font-mono text-white">
                  {signedClientsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Currency & Security Footer */}
      <div className="p-3.5 border-t border-stone-100 space-y-2.5">
        <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-700">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-[#568203]" />
              <Database
                className="h-3.5 w-3.5 text-zinc-500"
                strokeWidth={1.5}
              />
              {isLiveSupabase ? 'Supabase Actif' : 'Synchronisé'}
            </span>
            <ShieldCheck
              className="h-4 w-4 text-[#568203]"
              strokeWidth={1.5}
            />
          </div>
          <div className="text-[11px] text-zinc-500 pt-1.5 border-t border-stone-200/60 flex items-center justify-between">
            <span>Taux EUR/XOF</span>
            <span className="font-mono font-medium text-zinc-800">
              1 € = 655,957
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          Verrouiller la session
        </button>
      </div>
    </aside>
  );
}
