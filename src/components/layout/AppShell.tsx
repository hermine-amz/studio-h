'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Video,
  Sparkles,
  Wallet,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Database,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { StudioHLogo } from '@/components/brand/StudioHLogo';
import { cn } from '@/lib/currency';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';

const MOBILE_NAV = [
  { label: 'Cockpit', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/crm', icon: Users },
  { label: 'Atelier', href: '/production', icon: Video },
  { label: 'Prompts', href: '/prompts', icon: Sparkles },
  { label: 'Finances', href: '/finances', icon: Wallet },
];

const RLS_UNLOCK_SQL = `ALTER TABLE prospects DISABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_ugc DISABLE ROW LEVEL SECURITY;
ALTER TABLE medias_creations DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE finances DISABLE ROW LEVEL SECURITY;
ALTER TABLE focus_taches DISABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { rlsBlocked, refreshAllData } = useStudioData();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    document.cookie =
      'studio_h_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
    router.push('/login');
    router.refresh();
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await refreshAllData();
    setIsSyncing(false);
    toast({
      title: 'Synchronisation Cloud effectuée',
      description: 'Données actualisées depuis Supabase.',
    });
  };

  const handleCopyUnlockSql = async () => {
    try {
      await navigator.clipboard.writeText(RLS_UNLOCK_SQL);
      setCopiedSql(true);
      toast({
        title: 'Script SQL de synchronisation copié',
        description:
          'Collez-le dans Supabase > SQL Editor > Run pour synchroniser votre PC et votre téléphone.',
      });
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8F9FA] text-zinc-900 relative selection:bg-[#FFF8B9] selection:text-zinc-900">
      <Sidebar />

      {/* Fixed Mobile Top Bar */}
      <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-stone-200 w-full">
        <Link href="/" className="shrink-0">
          <StudioHLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            className="inline-flex items-center gap-1 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700"
            title="Synchroniser avec Supabase"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')}
              strokeWidth={1.5}
            />
            <span>Sync</span>
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 p-2 text-zinc-700"
            aria-label="Verrouiller la session"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Balanced Main Content Area */}
      <main className="relative z-10 lg:pl-60 w-full max-w-full overflow-x-hidden pb-24 lg:pb-8">
        <div className="max-w-[1360px] w-full mx-auto px-3.5 sm:px-7 py-5 sm:py-6 overflow-x-hidden space-y-4">
          {rlsBlocked && (
            <div className="rounded-2xl bg-[#FFF8B9]/65 border border-[#568203]/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Database
                  className="h-5 w-5 text-[#568203] shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <div className="text-xs text-zinc-800 space-y-0.5">
                  <p className="font-semibold text-zinc-900">
                    Synchronisation PC & Téléphone : débloquez l’écriture Supabase (RLS)
                  </p>
                  <p className="text-zinc-600">
                    Supabase bloque actuellement l’écriture cloud (erreur RLS 42501). Copiez ce script SQL et cliquez sur « Run » dans Supabase &gt; SQL Editor pour que votre PC et votre téléphone se synchronisent en direct.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUnlockSql}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>SQL Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Copier le SQL de synchro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Fixed Native-Style Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex lg:hidden items-center justify-around bg-white/95 backdrop-blur-md border-t border-stone-200 px-1.5 py-2 shadow-lg">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors min-w-[60px]',
                isActive
                  ? 'text-[#568203] bg-[#FFF8B9]/55 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  isActive ? 'text-[#568203]' : 'text-zinc-500'
                )}
                strokeWidth={1.5}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
