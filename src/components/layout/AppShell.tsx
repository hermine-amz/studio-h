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
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { StudioHLogo } from '@/components/brand/StudioHLogo';
import { cn } from '@/lib/currency';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const MOBILE_NAV = [
  { label: 'Cockpit', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/crm', icon: Users },
  { label: 'Atelier', href: '/production', icon: Video },
  { label: 'Prompts', href: '/prompts', icon: Sparkles },
  { label: 'Finances', href: '/finances', icon: Wallet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8F9FA] text-zinc-900 relative selection:bg-[#FFF8B9] selection:text-zinc-900">
      <Sidebar />

      {/* Fixed Mobile Top Bar */}
      <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between px-3.5 py-2.5 bg-white/95 backdrop-blur-md border-b border-stone-200 w-full">
        <Link href="/" className="shrink-0">
          <StudioHLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-mono text-zinc-600">
            1 € = 655,957
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 p-1.5 text-zinc-700"
            aria-label="Verrouiller la session"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Main Content Area (locked horizontally, padded for mobile bottom bar) */}
      <main className="relative z-10 lg:pl-56 w-full max-w-full overflow-x-hidden pb-20 lg:pb-6">
        <div className="max-w-[1280px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* Fixed Native-Style Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex lg:hidden items-center justify-around bg-white/95 backdrop-blur-md border-t border-stone-200 px-1 py-1.5 shadow-lg">
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
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors min-w-[56px]',
                isActive
                  ? 'text-[#568203] bg-[#FFF8B9]/50 font-semibold'
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
