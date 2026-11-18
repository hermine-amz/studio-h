'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Video,
  Sparkles,
  Wallet,
  Menu,
  X,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { StudioHLogo } from '@/components/brand/StudioHLogo';
import { cn } from '@/lib/currency';

const MOBILE_NAV = [
  { label: 'Cockpit', href: '/', icon: LayoutDashboard },
  { label: 'Prospects & Clients', href: '/crm', icon: Users },
  { label: 'Production UGC', href: '/production', icon: Video },
  { label: 'Bibliothèque Prompts', href: '/prompts', icon: Sparkles },
  { label: 'Trésorerie', href: '/finances', icon: Wallet },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 relative selection:bg-[#FFF8B9] selection:text-zinc-900">
      {/* Subtle Ambient Light on White Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 right-1/4 h-80 w-80 rounded-full bg-[#FFF8B9]/40 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#568203]/[0.04] blur-[120px]" />
      </div>

      <Sidebar />

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <Link href="/">
          <StudioHLogo size="sm" />
        </Link>
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-lg bg-stone-100 border border-stone-200 p-1.5 text-zinc-800"
          aria-label="Ouvrir le menu"
        >
          {mobileOpen ? (
            <X className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-12 z-40 lg:hidden bg-white/95 backdrop-blur-md border-b border-stone-200 p-3 space-y-1 shadow-lg">
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
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium border transition-colors',
                  isActive
                    ? 'bg-[#FFF8B9]/50 text-zinc-900 border-[#568203]/30'
                    : 'text-zinc-600 border-transparent hover:bg-stone-100'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4',
                    isActive ? 'text-[#568203]' : 'text-zinc-500'
                  )}
                  strokeWidth={1.5}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* Compact Main Content Area */}
      <main className="relative z-10 lg:pl-56 min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-5">
          {children}
        </div>
      </main>
    </div>
  );
}
