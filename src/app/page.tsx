'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import {
  formatEur,
  formatFcfa,
  daysSince,
  hoursUntil,
  normalizeCountryCode,
} from '@/lib/currency';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Skeleton } from '@/components/ui/Skeleton';

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
    convertIdeaToTask,
    deleteFocusTache,
    updateProspect,
  } = useStudioData();
  const { toast } = useToast();

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(monthlyGoalEur));
  const [newTaskText, setNewTaskText] = useState('');
  const [newIdeaText, setNewIdeaText] = useState('');

  // Revenue collected this month (from Revenu entries in current month)
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

    // Fallback to paid orders
    return commandes
      .filter((c) => c.statut_paiement === 'Payé')
      .reduce((acc, c) => acc + Number(c.montant_eur || 0), 0);
  }, [finances, commandes]);

  const progressPct = Math.min(
    100,
    Math.round((monthlyRevenueEur / Math.max(1, monthlyGoalEur)) * 100)
  );

  // Daily critical tasks (type = 'tache_jour')
  const dailyTasks = useMemo(
    () => focusTaches.filter((t) => t.type === 'tache_jour'),
    [focusTaches]
  );

  const activeDailyTasksCount = useMemo(
    () => dailyTasks.filter((t) => !t.est_termine).length,
    [dailyTasks]
  );

  // Quick ideas (type = 'boite_idee')
  const ideaItems = useMemo(
    () => focusTaches.filter((t) => t.type === 'boite_idee'),
    [focusTaches]
  );

  // Follow-up alerts: prospects contacted > 3 days ago (not Signé / Perdu)
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

  // Urgent deadlines: orders not yet delivered with date_limite <= 48h
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
    if (!newTaskText.trim()) return;
    const result = await addFocusTache('tache_jour', newTaskText);
    if (!result.ok) {
      toast({
        title: 'Limite anti-dispersion active',
        description: result.reason,
        type: 'error',
      });
      return;
    }
    setNewTaskText('');
    toast({
      title: 'Action critique ajoutée',
      description: 'Tâche enregistrée dans votre focus du jour.',
    });
  };

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaText.trim()) return;
    await addFocusTache('boite_idee', newIdeaText);
    setNewIdeaText('');
    toast({
      title: 'Idée capturée',
      description: 'Ajoutée dans votre boîte à idées sans quitter le cockpit.',
    });
  };

  const handlePromoteIdea = async (id: string) => {
    const res = await convertIdeaToTask(id);
    if (!res.ok) {
      toast({
        title: 'Focus complet (3/3)',
        description: res.reason,
        type: 'error',
      });
      return;
    }
    toast({
      title: 'Idée convertie en action du jour',
      description: 'Ajoutée à vos 3 actions critiques.',
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#FFF8B9]/65">
            Vue 01 — Pilotage Quotidien
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-[#FFF8B9]">
            Cockpit Anti-Dispersion
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/crm" className="btn-secondary">
            <span>Pipeline Europe</span>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <Link href="/production" className="btn-primary">
            <Layers className="h-4 w-4" strokeWidth={1.5} />
            <span>Atelier UGC</span>
          </Link>
        </div>
      </div>

      {/* 1. Monthly Revenue Objective Banner */}
      <section className="glass-card-avocado p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#FFF8B9]/10 border border-[#FFF8B9]/20 px-3 py-1 text-xs font-medium text-[#FFF8B9]">
              <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Bannière Objectif Mensuel — Chiffre d’Affaires Encaissé</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1">
              <CurrencyDisplay
                amountEur={monthlyRevenueEur}
                size="xl"
                layout="inline"
              />
              <span className="text-sm text-[#FFF8B9]/65">
                sur un objectif de{' '}
                <strong className="text-[#FFF8B9] font-semibold">
                  {formatEur(monthlyGoalEur)}
                </strong>{' '}
                ({formatFcfa(monthlyGoalEur)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditingGoal ? (
              <form onSubmit={handleSaveGoal} className="flex items-center gap-2">
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="glass-input w-36 py-2 text-sm"
                  placeholder="Ex: 3000"
                />
                <button type="submit" className="btn-primary py-2 px-3">
                  <Check className="h-4 w-4" strokeWidth={1.5} />
                  <span>Valider</span>
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
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                <span>Modifier l’objectif</span>
              </button>
            )}
          </div>
        </div>

        {/* Styled Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#FFF8B9]/80">
            <span>Progression du mois en cours</span>
            <span className="font-mono font-semibold text-[#FFF8B9]">
              {progressPct}% atteint
            </span>
          </div>
          <div className="h-3.5 w-full rounded-full bg-[#0C0D0E]/90 border border-[#FFF8B9]/25 p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#568203] via-[#6D9F0A] to-[#FFF8B9] transition-all duration-500"
              style={{ width: `${Math.max(4, progressPct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. Critical Daily Actions & Quick Idea Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: 3 Actions Critiques du Jour */}
        <section className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-[#FFF8B9]/15">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[#FFF8B9]/[0.06] border border-[#FFF8B9]/25 p-2">
                  <CheckSquare
                    className="h-5 w-5 text-[#FFF8B9]"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#FFF8B9]">
                    3 Actions Critiques du Jour
                  </h2>
                  <p className="text-xs text-[#FFF8B9]/65">
                    Limité strictement à 3 tâches actives non terminées
                  </p>
                </div>
              </div>

              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-medium border ${
                  activeDailyTasksCount >= 3
                    ? 'bg-[#568203] text-[#FFF8B9] border-[#FFF8B9]/40'
                    : 'bg-[#FFF8B9]/10 text-[#FFF8B9] border-[#FFF8B9]/20'
                }`}
              >
                {activeDailyTasksCount} / 3 actives
              </span>
            </div>

            {/* Add Daily Task Input */}
            <form onSubmit={handleAddDailyTask} className="flex gap-2 mb-5">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                disabled={activeDailyTasksCount >= 3}
                placeholder={
                  activeDailyTasksCount >= 3
                    ? 'Plafond de 3 actions atteint — terminez une action d’abord'
                    : 'Ajouter une action critique à fort impact...'
                }
                className="glass-input flex-1 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={activeDailyTasksCount >= 3 || !newTaskText.trim()}
                className="btn-primary shrink-0"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Ajouter</span>
              </button>
            </form>

            {/* Task List */}
            <div className="space-y-2.5">
              {dailyTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#FFF8B9]/20 p-6 text-center text-xs text-[#FFF8B9]/60">
                  Aucune action critique définie pour aujourd’hui.
                </div>
              ) : (
                dailyTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between gap-3 rounded-xl p-3.5 border transition-all ${
                      task.est_termine
                        ? 'bg-[#0C0D0E]/40 border-[#FFF8B9]/10 opacity-60'
                        : 'bg-[#FFF8B9]/10 border-[#FFF8B9]/25'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleFocusTache(task.id, !task.est_termine)
                      }
                      className="flex items-start gap-3 text-left flex-1 min-w-0"
                    >
                      {task.est_termine ? (
                        <CheckSquare
                          className="h-5 w-5 text-[#FFF8B9] shrink-0 mt-0.5"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Square
                          className="h-5 w-5 text-[#FFF8B9]/80 shrink-0 mt-0.5"
                          strokeWidth={1.5}
                        />
                      )}
                      <span
                        className={`text-sm leading-snug ${
                          task.est_termine
                            ? 'line-through text-[#FFF8B9]/60'
                            : 'text-[#FFF8B9]'
                        }`}
                      >
                        {task.contenu}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteFocusTache(task.id)}
                      className="rounded-lg p-1.5 text-[#FFF8B9]/50 hover:text-[#FFF8B9] hover:bg-[#FFF8B9]/10 transition-colors"
                      aria-label="Supprimer la tâche"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#FFF8B9]/10 flex items-center justify-between text-[11px] text-[#FFF8B9]/60">
            <span>Règle Studio H : Zéro multitâche dispersé</span>
            <span>Table : focus_taches (tache_jour)</span>
          </div>
        </section>

        {/* Widget 2: Boîte à Idées Rapide */}
        <section className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-[#FFF8B9]/15">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[#FFF8B9]/[0.06] border border-[#FFF8B9]/25 p-2">
                  <Lightbulb
                    className="h-5 w-5 text-[#FFF8B9]"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#FFF8B9]">
                    Boîte à Idées Rapide
                  </h2>
                  <p className="text-xs text-[#FFF8B9]/65">
                    Capturez vos angles créatifs et stratégies sans quitter votre flux
                  </p>
                </div>
              </div>

              <span className="rounded-lg bg-[#FFF8B9]/10 border border-[#FFF8B9]/20 px-2.5 py-1 text-xs font-mono text-[#FFF8B9]">
                {ideaItems.length} idée{ideaItems.length > 1 ? 's' : ''}
              </span>
            </div>

            <form onSubmit={handleAddIdea} className="flex gap-2 mb-5">
              <input
                type="text"
                value={newIdeaText}
                onChange={(e) => setNewIdeaText(e.target.value)}
                placeholder="Noter une idée de hook, d’offre ou d’automatisation..."
                className="glass-input flex-1"
              />
              <button
                type="submit"
                disabled={!newIdeaText.trim()}
                className="btn-primary shrink-0"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Capturer</span>
              </button>
            </form>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {ideaItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#FFF8B9]/20 p-6 text-center text-xs text-[#FFF8B9]/60">
                  Votre boîte à idées est vide.
                </div>
              ) : (
                ideaItems.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#FFF8B9]/5 border border-[#FFF8B9]/15 p-3.5 hover:border-[#FFF8B9]/30 transition-all"
                  >
                    <p className="text-sm text-[#FFF8B9]/90 leading-snug flex-1">
                      {idea.contenu}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePromoteIdea(idea.id)}
                        title="Convertir en action critique du jour"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#FFF8B9]/[0.06] hover:bg-[#568203] border border-[#FFF8B9]/25 px-2.5 py-1.5 text-xs font-medium text-[#FFF8B9] transition-colors"
                      >
                        <ArrowUpRight
                          className="h-3.5 w-3.5"
                          strokeWidth={1.5}
                        />
                        <span>En tâche</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFocusTache(idea.id)}
                        className="rounded-lg p-1.5 text-[#FFF8B9]/50 hover:text-[#FFF8B9] hover:bg-[#FFF8B9]/10 transition-colors"
                        aria-label="Supprimer l'idée"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#FFF8B9]/10 flex items-center justify-between text-[11px] text-[#FFF8B9]/60">
            <span>Conversion directe vers les actions du jour</span>
            <span>Table : focus_taches (boite_idee)</span>
          </div>
        </section>
      </div>

      {/* 3. Alertes de Relance (> 3 jours) & Deadlines (< 48h) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relances Prospects (> 3 jours) */}
        <section className="glass-card p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#FFF8B9]/15">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-[#FFF8B9]/[0.06] border border-[#FFF8B9]/25 p-2">
                <AlertCircle
                  className="h-5 w-5 text-[#FFF8B9]"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#FFF8B9]">
                  Alertes de Relance Commerciale
                </h2>
                <p className="text-xs text-[#FFF8B9]/65">
                  Prospects sans suivi depuis plus de 3 jours
                </p>
              </div>
            </div>

            <span className="rounded-lg bg-[#568203] border border-[#FFF8B9]/30 px-2.5 py-1 text-xs font-mono font-semibold text-[#FFF8B9]">
              {followUpProspects.length} à relancer
            </span>
          </div>

          <div className="space-y-3">
            {followUpProspects.length === 0 ? (
              <div className="rounded-xl border border-[#FFF8B9]/15 bg-[#FFF8B9]/5 p-5 text-center text-xs text-[#FFF8B9]/70">
                Tous vos prospects actifs ont été contactés au cours des 3 derniers jours.
              </div>
            ) : (
              followUpProspects.map((prospect) => {
                const elapsed = daysSince(prospect.date_dernier_contact);
                return (
                  <div
                    key={prospect.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#0C0D0E]/65 border border-[#FFF8B9]/20 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/crm/${prospect.id}`}
                          className="text-sm font-semibold text-[#FFF8B9] hover:underline"
                        >
                          {prospect.nom_marque}
                        </Link>
                        <span className="rounded bg-[#FFF8B9]/15 border border-[#FFF8B9]/25 px-1.5 py-0.5 text-[10px] font-mono uppercase text-[#FFF8B9]">
                          {normalizeCountryCode(prospect.pays)}
                        </span>
                        <span className="rounded bg-[#FFF8B9]/[0.06] border border-[#FFF8B9]/20 px-2 py-0.5 text-[11px] text-[#FFF8B9]">
                          {prospect.statut}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#FFF8B9]/70">
                        <span>
                          Inactif depuis{' '}
                          <strong className="text-[#FFF8B9]">
                            {elapsed} jours
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Potentiel :{' '}
                          {formatEur(prospect.valeur_estimee_eur)} (
                          {formatFcfa(prospect.valeur_estimee_eur)})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleMarkFollowUpDone(
                            prospect.id,
                            prospect.nom_marque
                          )
                        }
                        className="btn-secondary py-1.5 px-3 text-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Relancé</span>
                      </button>
                      <Link
                        href={`/crm/${prospect.id}`}
                        className="btn-primary py-1.5 px-3 text-xs"
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
        <section className="glass-card p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#FFF8B9]/15">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-[#FFF8B9]/[0.06] border border-[#FFF8B9]/25 p-2">
                <Clock className="h-5 w-5 text-[#FFF8B9]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#FFF8B9]">
                  Deadlines Production Imminentes
                </h2>
                <p className="text-xs text-[#FFF8B9]/65">
                  Commandes UGC dont la date limite est à moins de 48h
                </p>
              </div>
            </div>

            <span className="rounded-lg bg-[#568203] border border-[#FFF8B9]/30 px-2.5 py-1 text-xs font-mono font-semibold text-[#FFF8B9]">
              {urgentOrders.length} urgente{urgentOrders.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {urgentOrders.length === 0 ? (
              <div className="rounded-xl border border-[#FFF8B9]/15 bg-[#FFF8B9]/5 p-5 text-center text-xs text-[#FFF8B9]/70">
                Aucune commande n’arrive à échéance dans les prochaines 48 heures.
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#0C0D0E]/65 border border-[#FFF8B9]/20 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#FFF8B9]">
                          {order.nom_pack}
                        </span>
                        <span className="rounded bg-[#FFF8B9]/[0.08] border border-[#FFF8B9]/25 px-2 py-0.5 text-[11px] text-[#FFF8B9]">
                          {order.statut_production}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#FFF8B9]/70">
                        <span>
                          Client :{' '}
                          <strong className="text-[#FFF8B9]">
                            {client?.nom_marque || 'Client Studio H'}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Échéance :{' '}
                          <strong className="text-[#FFF8B9]">
                            {remH <= 0
                              ? 'Échéance dépassée'
                              : `Dans ${remH}h (${order.date_limite})`}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/production?commande=${order.id}`}
                      className="btn-primary py-1.5 px-3 text-xs shrink-0"
                    >
                      <span>Ouvrir l’atelier</span>
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
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

