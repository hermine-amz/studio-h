'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { StudioHLogo } from '@/components/brand/StudioHLogo';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useToast } from '@/context/ToastContext';
import { isValidEmail } from '@/lib/validation';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('amouzounhermine7@gmail.com');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "L'adresse email est obligatoire.";
    } else if (!isValidEmail(email)) {
      errors.email = "Veuillez saisir une adresse email valide (ex: nom@domaine.com).";
    }
    if (!password) {
      errors.password = 'Le mot de passe est obligatoire.';
    } else if (password.length < 4) {
      errors.password = 'Le mot de passe doit contenir au moins 4 caractères.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: 'Champs incomplets ou invalides',
        description: Object.values(errors)[0],
        type: 'error',
      });
      return;
    }

    setFormErrors({});
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
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-x-hidden overflow-y-auto">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-1/4 left-1/3 h-72 w-72 rounded-full bg-[#FFF8B9]/60 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full bg-[#568203]/[0.05] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-5">
          <StudioHLogo size="lg" showText={false} className="mb-3" />
          <h1 className="text-lg font-semibold tracking-[0.14em] uppercase text-zinc-900">
            Studio H
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-zinc-500">
            QG Privé — Production UGC IA Europe
          </p>
        </div>

        <div className="glass-card p-6 border border-stone-200/90">
          <div className="flex items-center gap-2 pb-3.5 mb-4 border-b border-stone-100">
            <ShieldCheck
              className="h-4 w-4 text-[#568203] shrink-0"
              strokeWidth={1.5}
            />
            <div>
              <h2 className="text-xs font-semibold text-zinc-900">
                Accès Exclusif Administrateur
              </h2>
              <p className="text-[11px] text-zinc-500">
                Aucun accès client externe autorisé
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                Email de connexion
              </label>
              <div className="relative">
                <Mail
                  className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-2.5"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formErrors.email) {
                      setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="amouzounhermine7@gmail.com"
                  className={`glass-input pl-8 ${
                    formErrors.email ? 'border-red-400 focus:border-red-500' : ''
                  }`}
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-[11px] text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <KeyRound
                  className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-2.5"
                  strokeWidth={1.5}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="Votre clé d'accès privée"
                  className={`glass-input pl-8 ${
                    formErrors.password ? 'border-red-400 focus:border-red-500' : ''
                  }`}
                />
              </div>
              {formErrors.password && (
                <p className="mt-1 text-[11px] text-red-600">
                  {formErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2 mt-1"
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                {isSubmitting ? 'Vérification...' : 'Déverrouiller Studio H'}
              </span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
