'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { StudioHLogo } from '@/components/brand/StudioHLogo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('amouzounhermine7@gmail.com');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          throw new Error(error.message);
        }
      }

      document.cookie =
        'studio_h_session=authenticated; path=/; max-age=2592000; SameSite=Lax';

      toast({
        title: 'Session Studio H déverrouillée',
        description: 'Bienvenue dans votre QG de direction créative.',
        type: 'success',
      });

      router.push('/');
      router.refresh();
    } catch (err) {
      toast({
        title: 'Authentification refusée',
        description:
          err instanceof Error
            ? err.message
            : 'Vérifiez vos identifiants Supabase Auth.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#FFF8B9] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Subtle Ambient Light */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-[#FFF8B9]/[0.03] blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-[#568203]/[0.06] blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <StudioHLogo size="lg" showText={false} className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-[0.14em] uppercase text-[#FFF8B9]">
            Studio H
          </h1>
          <p className="mt-1.5 text-xs uppercase tracking-[0.12em] text-[#FFF8B9]/55">
            Quartier Général Privé — Production UGC IA Europe
          </p>
        </div>

        <div className="glass-card p-8 border border-[#FFF8B9]/15">
          <div className="flex items-center gap-2.5 pb-5 mb-6 border-b border-[#FFF8B9]/10">
            <ShieldCheck
              className="h-5 w-5 text-[#568203]"
              strokeWidth={1.5}
            />
            <div>
              <h2 className="text-sm font-medium text-[#FFF8B9]">
                Accès Exclusif Administrateur
              </h2>
              <p className="text-xs text-[#FFF8B9]/55">
                Aucun accès client externe autorisé sur cette instance
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#FFF8B9]/75 mb-1.5">
                Email de connexion
              </label>
              <div className="relative">
                <Mail
                  className="h-4 w-4 text-[#FFF8B9]/45 absolute left-3.5 top-3"
                  strokeWidth={1.5}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="amouzounhermine7@gmail.com"
                  className="glass-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#FFF8B9]/75 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <KeyRound
                  className="h-4 w-4 text-[#FFF8B9]/45 absolute left-3.5 top-3"
                  strokeWidth={1.5}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre clé d'accès privée"
                  className="glass-input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 mt-2"
            >
              <Lock className="h-4 w-4" strokeWidth={1.5} />
              <span>
                {isSubmitting
                  ? 'Vérification des accès...'
                  : 'Déverrouiller Studio H'}
              </span>
              <ArrowRight className="h-4 w-4 ml-auto" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
