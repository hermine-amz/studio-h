'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Target,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Lightbulb,
  ArrowUpRight,
  Clock,
  AlertCircle,
  SlidersHorizontal,
  Check,
  RefreshCw,
  ChevronRight,
  Layers,
  Flame,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import type { UrgenceNiveau } from '@/types/database';
import {
  formatEur,
  formatFcfa,
  daysSince,
  hoursUntil,
  normalizeCountryCode,
} from '@/lib/currency';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Skeleton } from '@/components/ui/Skeleton';

const URGENCE_ORDER: Record<UrgenceNiveau, number> = {
  Critique: 0,
  Haute: 1,
  Normale: 2,
};

export default function CockpitPage() {
  const {
    isLoading,
    prospects,
    commandes,
    finances,
    focusTaches,
    monthlyGoalEur,
    setMonthlyGoalEur,
    addFocusTache,
    toggleFocusTache,
    updateFocusTacheUrgence,
    convertIdeaToTask,
    deleteFocusTache,
    updateProspect,
  } = useStudioData();
  const { toast } = useToast();

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(monthlyGoalEur));
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskUrgence, setNewTaskUrgence] =
    useState<UrgenceNiveau>('Critique');
  const [newIdeaText, setNewIdeaText] = useState('');

  const taskInputRef = useRef<HTMLInputElement | null>(null);
  const ideaInputRef = useRef<HTMLInputElement | null>(null);

  const monthlyRevenueEur = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const revenueFromFinances = finances
      .filter((f) => {
        if (f.type !== 'Revenu') return false;
        const d = new Date(f.date_transaction);
        return (
          d.getMonth() === currentMonth && d.getFullYear() === currentYear
        );
      })
      .reduce((acc, item) => acc + Number(item.montant_eur || 0), 0);

    if (revenueFromFinances > 0) return revenueFromFinances;

    return commandes
      .filter((c) => c.statut_paiement === 'Payé')
      .reduce((acc, c) => acc + Number(c.montant_eur || 0), 0);
  }, [finances, commandes]);

  const progressPct = Math.min(
    100,
    Math.round((monthlyRevenueEur / Math.max(1, monthlyGoalEur)) * 100)
  );

  // Daily tasks sorted by unfinished first, then by urgency (Critique -> Haute -> Normale)
  const dailyTasks = useMemo(() => {
    return focusTaches
      .filter((t) => t.type === 'tache_jour')
      .sort((a, b) => {
        if (a.est_termine !== b.est_termine) {
          return a.est_termine ? 1 : -1;
        }
        const ua = URGENCE_ORDER[a.urgence || 'Normale'] ?? 2;
        const ub = URGENCE_ORDER[b.urgence || 'Normale'] ?? 2;
        return ua - ub;
      });
  }, [focusTaches]);

  const activeDailyTasksCount = useMemo(
    () => dailyTasks.filter((t) => !t.est_termine).length,
    [dailyTasks]
  );

  const ideaItems = useMemo(
    () => focusTaches.filter((t) => t.type === 'boite_idee'),
    [focusTaches]
  );

  const followUpProspects = useMemo(
    () =>
      prospects
        .filter(
          (p) =>
            p.statut !== 'Signé' &&
            p.statut !== 'Perdu' &&
            daysSince(p.date_dernier_contact) > 3
        )
        .sort(
          (a, b) =>
            daysSince(b.date_dernier_contact) -
            daysSince(a.date_dernier_contact)
        ),
    [prospects]
  );

  const urgentOrders = useMemo(
    () =>
      commandes
        .filter((c) => {
          if (c.statut_production === 'Livré' || !c.date_limite) return false;
          const remHours = hoursUntil(c.date_limite);
          return remHours !== null && remHours <= 48;
        })
        .sort((a, b) => {
          const ha = hoursUntil(a.date_limite) ?? 999;
          const hb = hoursUntil(b.date_limite) ?? 999;
          return ha - hb;
        }),
    [commandes]
  );

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(goalInput);
    if (!parsed || parsed <= 0) return;
    setMonthlyGoalEur(parsed);
    setIsEditingGoal(false);
    toast({
      title: 'Objectif mensuel mis à jour',
      description: `Nouvel objectif fixé à ${formatEur(parsed)} (${formatFcfa(parsed)}).`,
    });
  };

  const handleAddDailyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) {
      taskInputRef.current?.focus();
      return;
    }
    const result = await addFocusTache(
      'tache_jour',
      newTaskText,
      newTaskUrgence
    );
    if (!result.ok) {
      toast({
        title: 'Plafond de 10 tâches atteint',
        description: result.reason,
        type: 'error',
      });
      return;
    }
    setNewTaskText('');
    toast({
      title: `Tâche ajoutée (Urgence : ${newTaskUrgence})`,
      description: 'Enregistrée dans vos 10 actions du jour.',
    });
  };

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim()) {
      ideaInputRef.current?.focus();
      return;
    }
    await addFocusTache('boite_idee', newIdeaText);
    setNewIdeaText('');
    toast({
      title: 'Idée capturée',
      description: 'Ajoutée dans votre boîte à idées.',
    });
  };

  const handlePromoteIdea = async (id: string) => {
    const res = await convertIdeaToTask(id, 'Haute');
    if (!res.ok) {
      toast({
        title: 'Focus complet (10/10)',
        description: res.reason,
        type: 'error',
      });
      return;
    }
    toast({
      title: 'Idée convertie en tâche du jour',
      description: 'Ajoutée avec urgence Haute.',
    });
  };

  const handleMarkFollowUpDone = async (prospectId: string, brand: string) => {
    await updateProspect(prospectId, {
      date_dernier_contact: new Date().toISOString(),
    });
    toast({
      title: 'Relance enregistrée',
      description: `Date de dernier contact actualisée pour ${brand}.`,
    });
  };

  const getUrgenceBadgeClass = (urg: UrgenceNiveau = 'Normale') => {
    if (urg === 'Critique') {
      return 'bg-red-50 text-red-700 border-red-200 font-semibold';
    }
    if (urg === 'Haute') {
      return 'bg-[#FFF8B9] text-zinc-900 border-[#568203]/30 font-semibold';
    }
    return 'bg-stone-100 text-zinc-600 border-stone-200';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Vue 01 — Pilotage Quotidien
          </span>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
            Cockpit Anti-Dispersion
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm" className="btn-secondary">
            <span>Pipeline Europe</span>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
          <Link href="/production" className="btn-primary">
            <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Atelier UGC</span>
          </Link>
        </div>
      </div>

      {/* 1. Compact Monthly Revenue Objective Banner */}
      <section className="glass-card-avocado p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#FFF8B9]/70 border border-[#568203]/20 px-2 py-0.5 text-[11px] font-medium text-zinc-800">
              <Target className="h-3 w-3 text-[#568203]" strokeWidth={1.5} />
              <span>Objectif Mensuel — CA Encaissé</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-0.5">
              <CurrencyDisplay
                amountEur={monthlyRevenueEur}
                size="xl"
                layout="inline"
              />
              <span className="text-xs text-zinc-500">
                sur un objectif de{' '}
                <strong className="text-zinc-900 font-semibold">
                  {formatEur(monthlyGoalEur)}
                </strong>{' '}
                ({formatFcfa(monthlyGoalEur)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditingGoal ? (
              <form
                onSubmit={handleSaveGoal}
                className="flex items-center gap-1.5"
              >
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="glass-input w-28"
                  placeholder="Ex: 3000"
                />
                <button type="submit" className="btn-primary">
                  <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>OK</span>
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setGoalInput(String(monthlyGoalEur));
                  setIsEditingGoal(true);
                }}
                className="btn-secondary"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Modifier l’objectif</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>Progression mensuelle</span>
            <span className="font-mono font-semibold text-zinc-800">
              {progressPct}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-200/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#568203] transition-all duration-500"
              style={{ width: `${Math.max(2, progressPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. 10 Daily Tasks with Urgency & Quick Idea Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Widget 1: 10 Actions du Jour & Niveau d'Urgence */}
        <section className="glass-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#FFF8B9]/60 border border-[#568203]/20 p-1.5">
                  <CheckSquare
                    className="h-4 w-4 text-[#568203]"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-900">
                    10 Tâches du Jour & Niveau d’Urgence
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Jusqu’à 10 tâches actives triées automatiquement par urgence
                  </p>
                </div>
              </div>

              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-medium border ${
                  activeDailyTasksCount >= 10
                    ? 'bg-[#568203] text-white border-[#568203]'
                    : 'bg-stone-100 text-zinc-700 border-stone-200'
                }`}
              >
                {activeDailyTasksCount} / 10
              </span>
            </div>

            <form
              onSubmit={handleAddDailyTask}
              className="flex flex-col sm:flex-row gap-1.5 mb-3"
            >
              <input
                ref={taskInputRef}
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                disabled={activeDailyTasksCount >= 10}
                placeholder={
                  activeDailyTasksCount >= 10
                    ? 'Plafond 10/10 atteint — terminez une tâche'
                    : 'Saisir une tâche à accomplir...'
                }
                className="glass-input flex-1"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={newTaskUrgence}
                  onChange={(e) =>
                    setNewTaskUrgence(e.target.value as UrgenceNiveau)
                  }
                  aria-label="Niveau d'urgence"
                  className="glass-input w-28 font-medium"
                >
                  <option value="Critique">Critique</option>
                  <option value="Haute">Haute</option>
                  <option value="Normale">Normale</option>
                </select>

                <button
                  type="submit"
                  disabled={activeDailyTasksCount >= 10}
                  className="btn-primary shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Ajouter</span>
                </button>
              </div>
            </form>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {dailyTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-200 p-4 text-center text-xs text-zinc-400">
                  Aucune tâche définie pour aujourd’hui. Tapez une tâche ci-dessus, choisissez son urgence et cliquez sur Ajouter.
                </div>
              ) : (
                dailyTasks.map((task) => {
                  const urg = task.urgence || 'Normale';
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 border transition-all ${
                        task.est_termine
                          ? 'bg-stone-50 border-stone-200/60 opacity-60'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleFocusTache(task.id, !task.est_termine)
                        }
                        className="flex items-start gap-2 text-left flex-1 min-w-0"
                      >
                        {task.est_termine ? (
                          <CheckSquare
                            className="h-4 w-4 text-[#568203] shrink-0 mt-0.5"
                            strokeWidth={1.5}
                          />
                        ) : (
                          <Square
                            className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5"
                            strokeWidth={1.5}
                          />
                        )}
                        <span
                          className={`text-xs leading-snug ${
                            task.est_termine
                              ? 'line-through text-zinc-400'
                              : 'text-zinc-800'
                          }`}
                        >
                          {task.contenu}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative flex items-center">
                          {urg === 'Critique' && !task.est_termine && (
                            <Flame
                              className="h-3 w-3 text-red-600 mr-1 shrink-0"
                              strokeWidth={1.5}
                            />
                          )}
                          <select
                            value={urg}
                            onChange={(e) =>
                              updateFocusTacheUrgence(
                                task.id,
                                e.target.value as UrgenceNiveau
                              )
                            }
                            aria-label="Modifier l'urgence"
                            className={`rounded-md border px-2 py-0.5 text-[10px] focus:outline-none cursor-pointer ${getUrgenceBadgeClass(
                              urg
                            )}`}
                          >
                            <option value="Critique">Critique</option>
                            <option value="Haute">Haute</option>
                            <option value="Normale">Normale</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteFocusTache(task.id)}
                          className="rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-stone-100 transition-colors"
                          aria-label="Supprimer la tâche"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Widget 2: Boîte à Idées Rapide */}
        <section className="glass-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#FFF8B9]/60 border border-[#568203]/20 p-1.5">
                  <Lightbulb
                    className="h-4 w-4 text-[#568203]"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-900">
                    Boîte à Idées Rapide
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Capturez vos idées sans quitter l’écran
                  </p>
                </div>
              </div>

              <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-mono text-zinc-700">
                {ideaItems.length}
              </span>
            </div>

            <form onSubmit={handleAddIdea} className="flex gap-1.5 mb-3">
              <input
                ref={ideaInputRef}
                type="text"
                value={newIdeaText}
                onChange={(e) => setNewIdeaText(e.target.value)}
                placeholder="Noter une idée de hook, d’offre..."
                className="glass-input flex-1"
              />
              <button type="submit" className="btn-primary shrink-0">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Noter</span>
              </button>
            </form>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {ideaItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-200 p-4 text-center text-xs text-zinc-400">
                  Votre boîte à idées est vide.
                </div>
              ) : (
                ideaItems.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-stone-50/80 border border-stone-200/80 px-3 py-2"
                  >
                    <p className="text-xs text-zinc-800 leading-snug flex-1">
                      {idea.contenu}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePromoteIdea(idea.id)}
                        title="Convertir en tâche du jour"
                        className="inline-flex items-center gap-1 rounded-md bg-white hover:bg-[#FFF8B9]/50 border border-stone-200 px-2 py-1 text-[11px] font-medium text-zinc-700 transition-colors"
                      >
                        <ArrowUpRight
                          className="h-3 w-3 text-[#568203]"
                          strokeWidth={1.5}
                        />
                        <span>En tâche</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFocusTache(idea.id)}
                        className="rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-stone-100 transition-colors"
                        aria-label="Supprimer l'idée"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Alertes de Relance (> 3 jours) & Deadlines (< 48h) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Relances Prospects (> 3 jours) */}
        <section className="glass-card p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#FFF8B9]/60 border border-[#568203]/20 p-1.5">
                <AlertCircle
                  className="h-4 w-4 text-[#568203]"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-900">
                  Alertes de Relance Commerciale
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Prospects sans suivi depuis plus de 3 jours
                </p>
              </div>
            </div>

            <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-700">
              {followUpProspects.length}
            </span>
          </div>

          <div className="space-y-2">
            {followUpProspects.length === 0 ? (
              <div className="rounded-lg border border-stone-200/70 bg-stone-50/60 p-3.5 text-center text-xs text-zinc-500">
                Aucun prospect en attente de relance (&gt; 3 jours).
              </div>
            ) : (
              followUpProspects.map((prospect) => {
                const elapsed = daysSince(prospect.date_dernier_contact);
                return (
                  <div
                    key={prospect.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-stone-50/80 border border-stone-200 px-3 py-2.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/crm/${prospect.id}`}
                          className="text-xs font-semibold text-zinc-900 hover:underline"
                        >
                          {prospect.nom_marque}
                        </Link>
                        <span className="rounded bg-white border border-stone-200 px-1.5 py-0.5 text-[10px] font-mono uppercase text-zinc-700">
                          {normalizeCountryCode(prospect.pays)}
                        </span>
                        <span className="rounded bg-[#FFF8B9]/70 border border-[#568203]/20 px-1.5 py-0.5 text-[10px] text-zinc-800">
                          {prospect.statut}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Sans contact depuis{' '}
                        <strong className="text-zinc-800">{elapsed} j</strong> •{' '}
                        {formatEur(prospect.valeur_estimee_eur)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleMarkFollowUpDone(
                            prospect.id,
                            prospect.nom_marque
                          )
                        }
                        className="btn-secondary py-1 px-2 text-[11px]"
                      >
                        <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
                        <span>Relancé</span>
                      </button>
                      <Link
                        href={`/crm/${prospect.id}`}
                        className="btn-primary py-1 px-2.5 text-[11px]"
                      >
                        <span>Fiche 360</span>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Deadlines Commandes (< 48h) */}
        <section className="glass-card p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#FFF8B9]/60 border border-[#568203]/20 p-1.5">
                <Clock className="h-4 w-4 text-[#568203]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-900">
                  Deadlines Production (&lt; 48h)
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Commandes UGC proches de la date limite
                </p>
              </div>
            </div>

            <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-700">
              {urgentOrders.length}
            </span>
          </div>

          <div className="space-y-2">
            {urgentOrders.length === 0 ? (
              <div className="rounded-lg border border-stone-200/70 bg-stone-50/60 p-3.5 text-center text-xs text-zinc-500">
                Aucune commande n’arrive à échéance dans les 48h.
              </div>
            ) : (
              urgentOrders.map((order) => {
                const client = prospects.find(
                  (p) => p.id === order.prospect_id
                );
                const remH = hoursUntil(order.date_limite) ?? 0;

                return (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-stone-50/80 border border-stone-200 px-3 py-2.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-900">
                          {order.nom_pack}
                        </span>
                        <span className="rounded bg-[#FFF8B9]/70 border border-[#568203]/20 px-1.5 py-0.5 text-[10px] text-zinc-800">
                          {order.statut_production}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {client?.nom_marque || 'Client'} •{' '}
                        <strong className="text-zinc-800">
                          {remH <= 0
                            ? 'Échéance dépassée'
                            : `Dans ${remH}h (${order.date_limite})`}
                        </strong>
                      </div>
                    </div>

                    <Link
                      href={`/production?commande=${order.id}`}
                      className="btn-primary py-1 px-2.5 text-[11px] shrink-0"
                    >
                      <span>Atelier</span>
                      <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
