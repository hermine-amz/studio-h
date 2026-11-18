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
  Link2,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import type { UrgenceNiveau, FocusTache } from '@/types/database';
import {
  formatEur,
  formatFcfa,
  daysSince,
  hoursUntil,
} from '@/lib/currency';
import { CountryBadge } from '@/components/ui/CountryFlag';
import { fileToResizedDataUrl } from '@/lib/image-resize';
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
    updateFocusTache,
    toggleFocusTache,
    updateFocusTacheUrgence,
    convertIdeaToTask,
    deleteFocusTache,
    updateProspect,
  } = useStudioData();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Collapsible Drawers State (Tiroirs réductibles)
  const [drawers, setDrawers] = useState({
    goal: true,
    tasks: true,
    ideas: true,
    relances: true,
    deadlines: true,
  });

  const toggleDrawer = (key: keyof typeof drawers) => {
    setDrawers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(monthlyGoalEur));
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskUrgence, setNewTaskUrgence] =
    useState<UrgenceNiveau>('Critique');

  // Rich Idea Box State
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaLinkInput, setIdeaLinkInput] = useState('');
  const [ideaLinks, setIdeaLinks] = useState<string[]>([]);
  const [ideaPhotos, setIdeaPhotos] = useState<string[]>([]);
  const [showIdeaExtras, setShowIdeaExtras] = useState(false);
  const [expandedIdeas, setExpandedIdeas] = useState<Record<string, boolean>>(
    {}
  );
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Edit Idea Modal
  const [editingIdea, setEditingIdea] = useState<FocusTache | null>(null);
  const [editIdeaTitle, setEditIdeaTitle] = useState('');
  const [editIdeaDesc, setEditIdeaDesc] = useState('');
  const [editIdeaLinks, setEditIdeaLinks] = useState<string[]>([]);
  const [editIdeaLinkInput, setEditIdeaLinkInput] = useState('');
  const [editIdeaPhotos, setEditIdeaPhotos] = useState<string[]>([]);

  const taskInputRef = useRef<HTMLInputElement | null>(null);
  const ideaTitleRef = useRef<HTMLInputElement | null>(null);
  const ideaPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const editIdeaPhotoInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(goalInput);
    if (!parsed || parsed <= 0) return;

    const ok = await confirm({
      title: 'Modifier l’objectif mensuel ?',
      description: `Voulez-vous remplacer votre objectif actuel (${formatEur(
        monthlyGoalEur
      )}) par ${formatEur(parsed)} (${formatFcfa(parsed)}) ?`,
      confirmLabel: 'Confirmer le nouvel objectif',
      variant: 'modify',
    });
    if (!ok) return;

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

  const handleChangeTaskUrgence = async (
    taskId: string,
    contenu: string,
    newUrg: UrgenceNiveau
  ) => {
    const ok = await confirm({
      title: 'Modifier le niveau d’urgence ?',
      description: `Voulez-vous passer la tâche "${contenu}" au niveau d'urgence "${newUrg}" ?`,
      confirmLabel: 'Modifier l’urgence',
      variant: 'modify',
    });
    if (!ok) return;
    await updateFocusTacheUrgence(taskId, newUrg);
  };

  const handleDeleteTaskOrIdea = async (
    id: string,
    contenu: string,
    isIdea: boolean
  ) => {
    const ok = await confirm({
      title: isIdea ? 'Supprimer cette idée ?' : 'Supprimer cette tâche ?',
      description: `Êtes-vous sûr de vouloir supprimer définitivement : "${contenu}" ?`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;

    await deleteFocusTache(id);
    toast({
      title: isIdea ? 'Idée supprimée' : 'Tâche supprimée',
    });
  };

  // --- Rich Idea Handlers ---
  const handleAddIdeaPhoto = async (
    files: FileList | null,
    isEdit = false
  ) => {
    if (!files || files.length === 0) return;
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await fileToResizedDataUrl(file, 850, 0.8);
        added.push(dataUrl);
      }
      if (isEdit) {
        setEditIdeaPhotos((prev) => [...prev, ...added]);
      } else {
        setIdeaPhotos((prev) => [...prev, ...added]);
      }
      toast({
        title: 'Photo(s) ajoutée(s) à l’idée',
      });
    } catch {
      toast({
        title: 'Impossible de charger la photo',
        type: 'error',
      });
    }
  };

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) {
      ideaTitleRef.current?.focus();
      return;
    }

    const finalLinks = ideaLinkInput.trim()
      ? [...ideaLinks, ideaLinkInput.trim()]
      : ideaLinks;

    await addFocusTache('boite_idee', ideaTitle, 'Normale', {
      description: ideaDescription,
      liens: finalLinks,
      photos: ideaPhotos,
    });

    setIdeaTitle('');
    setIdeaDescription('');
    setIdeaLinkInput('');
    setIdeaLinks([]);
    setIdeaPhotos([]);
    setShowIdeaExtras(false);

    toast({
      title: 'Idée enrichie enregistrée',
      description: 'Ajoutée dans votre boîte à idées avec ses détails.',
    });
  };

  const openEditIdeaModal = (idea: FocusTache) => {
    setEditingIdea(idea);
    setEditIdeaTitle(idea.titre || idea.contenu);
    setEditIdeaDesc(idea.description || '');
    setEditIdeaLinks(idea.liens || []);
    setEditIdeaLinkInput('');
    setEditIdeaPhotos(idea.photos || []);
  };

  const handleSaveEditedIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea || !editIdeaTitle.trim()) return;

    const ok = await confirm({
      title: `Modifier l'idée "${editingIdea.titre || editingIdea.contenu}" ?`,
      description:
        'Voulez-vous enregistrer les modifications apportées au titre, à la description, aux liens et aux photos de cette idée ?',
      confirmLabel: 'Enregistrer les modifications',
      variant: 'modify',
    });
    if (!ok) return;

    const finalLinks = editIdeaLinkInput.trim()
      ? [...editIdeaLinks, editIdeaLinkInput.trim()]
      : editIdeaLinks;

    await updateFocusTache(editingIdea.id, {
      titre: editIdeaTitle.trim(),
      contenu: editIdeaTitle.trim(),
      description: editIdeaDesc.trim(),
      liens: finalLinks,
      photos: editIdeaPhotos,
    });

    setEditingIdea(null);
    toast({
      title: 'Idée mise à jour',
    });
  };

  const handlePromoteIdea = async (id: string, contenu: string) => {
    const ok = await confirm({
      title: 'Convertir cette idée en tâche du jour ?',
      description: `Voulez-vous déplacer "${contenu}" vers vos 10 tâches du jour avec une urgence Haute ?`,
      confirmLabel: 'Convertir en tâche',
      variant: 'modify',
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: `Confirmer la relance de ${brand} ?`,
      description: `Voulez-vous actualiser la date de dernier contact de "${brand}" à aujourd'hui ?`,
      confirmLabel: 'Marquer comme relancé',
      variant: 'modify',
    });
    if (!ok) return;

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
      <div className="space-y-5">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Vue 01 — Pilotage Quotidien
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Cockpit Anti-Dispersion
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
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

      {/* 1. Tiroir 1 : Monthly Revenue Objective Banner */}
      <section className="glass-card-avocado p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF8B9]/80 border border-[#568203]/25 px-2.5 py-1 text-xs font-medium text-zinc-800">
            <Target className="h-3.5 w-3.5 text-[#568203]" strokeWidth={1.5} />
            <span>Objectif Mensuel — Chiffre d’Affaires Encaissé</span>
          </div>

          <button
            type="button"
            onClick={() => toggleDrawer('goal')}
            className="inline-flex items-center gap-1 rounded-lg bg-white/80 hover:bg-white border border-stone-200 px-2.5 py-1 text-xs font-medium text-zinc-600"
          >
            <span>{drawers.goal ? 'Réduire' : 'Développer'}</span>
            {drawers.goal ? (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {drawers.goal && (
          <div className="mt-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <CurrencyDisplay
                  amountEur={monthlyRevenueEur}
                  size="xl"
                  layout="inline"
                />
                <span className="text-[13px] text-zinc-500">
                  sur un objectif de{' '}
                  <strong className="text-zinc-900 font-semibold">
                    {formatEur(monthlyGoalEur)}
                  </strong>{' '}
                  ({formatFcfa(monthlyGoalEur)})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isEditingGoal ? (
                  <form
                    onSubmit={handleSaveGoal}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      className="glass-input w-32"
                      placeholder="Ex: 3000"
                    />
                    <button type="submit" className="btn-primary">
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

            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Progression mensuelle</span>
                <span className="font-mono font-semibold text-zinc-800">
                  {progressPct}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-stone-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#568203] transition-all duration-500"
                  style={{ width: `${Math.max(2, progressPct)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Tiroirs 2 & 3 : 10 Daily Tasks & Rich Quick Idea Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Widget 1: 10 Actions du Jour & Niveau d'Urgence */}
        <section className="glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                  <CheckSquare
                    className="h-4 w-4 text-[#568203]"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-zinc-900">
                    10 Tâches du Jour & Niveau d’Urgence
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Jusqu’à 10 tâches actives triées automatiquement par urgence
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono font-medium border ${
                    activeDailyTasksCount >= 10
                      ? 'bg-[#568203] text-white border-[#568203]'
                      : 'bg-stone-100 text-zinc-700 border-stone-200'
                  }`}
                >
                  {activeDailyTasksCount} / 10
                </span>
                <button
                  type="button"
                  onClick={() => toggleDrawer('tasks')}
                  className="rounded-lg bg-stone-100 hover:bg-stone-200 p-1.5 text-zinc-600"
                  title={drawers.tasks ? 'Réduire le tiroir' : 'Développer le tiroir'}
                >
                  {drawers.tasks ? (
                    <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {drawers.tasks && (
              <div className="mt-4">
                <form
                  onSubmit={handleAddDailyTask}
                  className="flex flex-col sm:flex-row gap-2 mb-4"
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

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={newTaskUrgence}
                      onChange={(e) =>
                        setNewTaskUrgence(e.target.value as UrgenceNiveau)
                      }
                      aria-label="Niveau d'urgence"
                      className="glass-input w-32 font-medium"
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
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {dailyTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-xs text-zinc-400">
                      Aucune tâche définie pour aujourd’hui. Tapez une tâche ci-dessus, choisissez son urgence et cliquez sur Ajouter.
                    </div>
                  ) : (
                    dailyTasks.map((task) => {
                      const urg = task.urgence || 'Normale';
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 border transition-all ${
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
                            className="flex items-start gap-2.5 text-left flex-1 min-w-0"
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
                              className={`text-[13px] leading-snug ${
                                task.est_termine
                                  ? 'line-through text-zinc-400'
                                  : 'text-zinc-800'
                              }`}
                            >
                              {task.titre || task.contenu}
                            </span>
                          </button>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative flex items-center">
                              {urg === 'Critique' && !task.est_termine && (
                                <Flame
                                  className="h-3.5 w-3.5 text-red-600 mr-1 shrink-0"
                                  strokeWidth={1.5}
                                />
                              )}
                              <select
                                value={urg}
                                onChange={(e) =>
                                  handleChangeTaskUrgence(
                                    task.id,
                                    task.titre || task.contenu,
                                    e.target.value as UrgenceNiveau
                                  )
                                }
                                aria-label="Modifier l'urgence"
                                className={`rounded-lg border px-2 py-1 text-[11px] focus:outline-none cursor-pointer ${getUrgenceBadgeClass(
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
                              onClick={() =>
                                handleDeleteTaskOrIdea(
                                  task.id,
                                  task.titre || task.contenu,
                                  false
                                )
                              }
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              aria-label="Supprimer la tâche"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Widget 2: Boîte à Idées Rapide Enrichie */}
        <section className="glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                  <Lightbulb
                    className="h-4 w-4 text-[#568203]"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-zinc-900">
                    Boîte à Idées Rapide
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Titres, descriptions avec « Lire plus », liens & photos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-mono text-zinc-700">
                  {ideaItems.length}
                </span>
                <button
                  type="button"
                  onClick={() => toggleDrawer('ideas')}
                  className="rounded-lg bg-stone-100 hover:bg-stone-200 p-1.5 text-zinc-600"
                  title={drawers.ideas ? 'Réduire le tiroir' : 'Développer le tiroir'}
                >
                  {drawers.ideas ? (
                    <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {drawers.ideas && (
              <div className="mt-4">
                <form onSubmit={handleAddIdea} className="space-y-2.5 mb-4">
                  <div className="flex gap-2">
                    <input
                      ref={ideaTitleRef}
                      type="text"
                      value={ideaTitle}
                      onChange={(e) => setIdeaTitle(e.target.value)}
                      placeholder="Titre de l’idée (ex: Concept Hook Miroir Skincare)..."
                      className="glass-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIdeaExtras((prev) => !prev)}
                      className="btn-secondary px-3 text-xs"
                      title="Ajouter description, liens et photos"
                    >
                      {showIdeaExtras ? (
                        <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                      )}
                      <span>Détails</span>
                    </button>
                    <button type="submit" className="btn-primary shrink-0">
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      <span>Noter</span>
                    </button>
                  </div>

                  {showIdeaExtras && (
                    <div className="rounded-xl bg-stone-50 border border-stone-200/90 p-3.5 space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                          Description détaillée
                        </label>
                        <textarea
                          rows={3}
                          value={ideaDescription}
                          onChange={(e) => setIdeaDescription(e.target.value)}
                          placeholder="Décrivez le déroulé du hook, l'angle psychologique, le script..."
                          className="glass-input"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                          Ajouter des liens d’inspiration
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={ideaLinkInput}
                            onChange={(e) => setIdeaLinkInput(e.target.value)}
                            placeholder="https://..."
                            className="glass-input flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!ideaLinkInput.trim()) return;
                              setIdeaLinks((prev) => [
                                ...prev,
                                ideaLinkInput.trim(),
                              ]);
                              setIdeaLinkInput('');
                            }}
                            className="btn-secondary text-xs"
                          >
                            <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>+ Lien</span>
                          </button>
                        </div>
                        {ideaLinks.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {ideaLinks.map((lnk, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-xs text-zinc-700"
                              >
                                <span className="truncate max-w-[180px]">
                                  {lnk}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIdeaLinks((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  className="text-zinc-400 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" strokeWidth={1.5} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <input
                          ref={ideaPhotoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) =>
                            handleAddIdeaPhoto(e.target.files, false)
                          }
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                            Photos / Captures ({ideaPhotos.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => ideaPhotoInputRef.current?.click()}
                            className="btn-secondary py-1.5 px-2.5 text-xs"
                          >
                            <ImageIcon
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                            <span>+ Ajouter photo</span>
                          </button>
                        </div>
                        {ideaPhotos.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {ideaPhotos.map((ph, idx) => (
                              <div
                                key={idx}
                                className="relative h-14 w-14 rounded-lg overflow-hidden border border-stone-200 group"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ph}
                                  alt="Aperçu idée"
                                  className="h-full w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIdeaPhotos((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  className="absolute top-0.5 right-0.5 rounded-full bg-zinc-900/70 p-0.5 text-white"
                                >
                                  <X className="h-3 w-3" strokeWidth={1.5} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </form>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {ideaItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-xs text-zinc-400">
                      Votre boîte à idées est vide.
                    </div>
                  ) : (
                    ideaItems.map((idea) => {
                      const title = idea.titre || idea.contenu;
                      const desc = idea.description || '';
                      const links = idea.liens || [];
                      const photos = idea.photos || [];
                      const isExpanded = Boolean(expandedIdeas[idea.id]);
                      const isLongDesc =
                        desc.length > 110 || desc.includes('\n');

                      return (
                        <div
                          key={idea.id}
                          className="rounded-xl bg-stone-50/90 border border-stone-200/90 p-3.5 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-[13.5px] font-semibold text-zinc-900 leading-snug">
                                {title}
                              </h3>
                              {desc && (
                                <div className="mt-1">
                                  <p
                                    className={`text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap ${
                                      !isExpanded ? 'line-clamp-2' : ''
                                    }`}
                                  >
                                    {desc}
                                  </p>
                                  {isLongDesc && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedIdeas((prev) => ({
                                          ...prev,
                                          [idea.id]: !prev[idea.id],
                                        }))
                                      }
                                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#568203] hover:underline"
                                    >
                                      <span>
                                        {isExpanded ? 'Réduire' : 'Lire plus'}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditIdeaModal(idea)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-stone-200/60 transition-colors"
                                title="Modifier l'idée"
                              >
                                <Pencil
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePromoteIdea(idea.id, title)
                                }
                                title="Convertir en tâche du jour"
                                className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-[#FFF8B9]/60 border border-stone-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors"
                              >
                                <ArrowUpRight
                                  className="h-3.5 w-3.5 text-[#568203]"
                                  strokeWidth={1.5}
                                />
                                <span>En tâche</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteTaskOrIdea(idea.id, title, true)
                                }
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                aria-label="Supprimer l'idée"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          </div>

                          {links.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {links.map((lnk, idx) => (
                                <a
                                  key={idx}
                                  href={lnk}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-[#568203] hover:underline max-w-full"
                                >
                                  <Link2
                                    className="h-3 w-3 shrink-0"
                                    strokeWidth={1.5}
                                  />
                                  <span className="truncate max-w-[200px]">
                                    {lnk}
                                  </span>
                                  <ExternalLink
                                    className="h-2.5 w-2.5 shrink-0"
                                    strokeWidth={1.5}
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          {photos.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {photos.map((ph, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setPreviewPhoto(ph)}
                                  className="h-14 w-14 rounded-lg overflow-hidden border border-stone-200 hover:border-[#568203] transition-all"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ph}
                                    alt={title}
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 3. Tiroirs 4 & 5 : Alertes de Relance (> 3 jours) & Deadlines (< 48h) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <section className="glass-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                <AlertCircle
                  className="h-4 w-4 text-[#568203]"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Alertes de Relance Commerciale
                </h2>
                <p className="text-xs text-zinc-500">
                  Prospects sans suivi depuis plus de 3 jours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-mono font-medium text-zinc-700">
                {followUpProspects.length}
              </span>
              <button
                type="button"
                onClick={() => toggleDrawer('relances')}
                className="rounded-lg bg-stone-100 hover:bg-stone-200 p-1.5 text-zinc-600"
                title={drawers.relances ? 'Réduire le tiroir' : 'Développer le tiroir'}
              >
                {drawers.relances ? (
                  <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          {drawers.relances && (
            <div className="mt-3.5 space-y-2.5">
              {followUpProspects.length === 0 ? (
                <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4 text-center text-xs text-zinc-500">
                  Aucun prospect en attente de relance (&gt; 3 jours).
                </div>
              ) : (
                followUpProspects.map((prospect) => {
                  const elapsed = daysSince(prospect.date_dernier_contact);
                  return (
                    <div
                      key={prospect.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-stone-50/80 border border-stone-200 px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {prospect.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={prospect.logo_url}
                            alt={prospect.nom_marque}
                            className="h-8 w-8 rounded-lg object-cover border border-stone-200 shrink-0"
                          />
                        )}
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/crm/${prospect.id}`}
                              className="text-[13px] font-semibold text-zinc-900 hover:underline truncate"
                            >
                              {prospect.nom_marque}
                            </Link>
                            <CountryBadge code={prospect.pays} />
                          </div>
                          <div className="text-xs text-zinc-500">
                            Sans contact depuis{' '}
                            <strong className="text-zinc-800">
                              {elapsed} j
                            </strong>{' '}
                            • {formatEur(prospect.valeur_estimee_eur)}
                          </div>
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
                          className="btn-secondary py-1.5 px-2.5 text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>Relancé</span>
                        </button>
                        <Link
                          href={`/crm/${prospect.id}`}
                          className="btn-primary py-1.5 px-3 text-xs"
                        >
                          <span>Fiche 360°</span>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        <section className="glass-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                <Clock className="h-4 w-4 text-[#568203]" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Deadlines Production (&lt; 48h)
                </h2>
                <p className="text-xs text-zinc-500">
                  Commandes UGC proches de la date limite
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-mono font-medium text-zinc-700">
                {urgentOrders.length}
              </span>
              <button
                type="button"
                onClick={() => toggleDrawer('deadlines')}
                className="rounded-lg bg-stone-100 hover:bg-stone-200 p-1.5 text-zinc-600"
                title={drawers.deadlines ? 'Réduire le tiroir' : 'Développer le tiroir'}
              >
                {drawers.deadlines ? (
                  <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          {drawers.deadlines && (
            <div className="mt-3.5 space-y-2.5">
              {urgentOrders.length === 0 ? (
                <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4 text-center text-xs text-zinc-500">
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-stone-50/80 border border-stone-200 px-3.5 py-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-zinc-900">
                            {order.nom_pack}
                          </span>
                          <span className="rounded bg-[#FFF8B9]/70 border border-[#568203]/20 px-2 py-0.5 text-[11px] text-zinc-800">
                            {order.statut_production}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500">
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
                        className="btn-primary py-1.5 px-3 text-xs shrink-0"
                      >
                        <span>Atelier</span>
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modal: Edit Rich Idea */}
      {editingIdea && (
        <div
          style={{ zIndex: 2147483600 }}
          className="fixed inset-0 flex items-center justify-center bg-zinc-900/50 p-4"
        >
          <div className="glass-modal w-full max-w-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-base font-semibold text-zinc-900">
                Modifier l’idée
              </h3>
              <button
                onClick={() => setEditingIdea(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-800"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedIdea} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Titre de l’idée *
                </label>
                <input
                  type="text"
                  required
                  value={editIdeaTitle}
                  onChange={(e) => setEditIdeaTitle(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Description complète
                </label>
                <textarea
                  rows={4}
                  value={editIdeaDesc}
                  onChange={(e) => setEditIdeaDesc(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Liens attachés
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editIdeaLinkInput}
                    onChange={(e) => setEditIdeaLinkInput(e.target.value)}
                    placeholder="https://..."
                    className="glass-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!editIdeaLinkInput.trim()) return;
                      setEditIdeaLinks((prev) => [
                        ...prev,
                        editIdeaLinkInput.trim(),
                      ]);
                      setEditIdeaLinkInput('');
                    }}
                    className="btn-secondary text-xs"
                  >
                    + Lien
                  </button>
                </div>
                {editIdeaLinks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editIdeaLinks.map((lnk, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-zinc-700"
                      >
                        <span className="truncate max-w-[200px]">{lnk}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditIdeaLinks((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-zinc-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={editIdeaPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddIdeaPhoto(e.target.files, true)}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-700">
                    Photos ({editIdeaPhotos.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => editIdeaPhotoInputRef.current?.click()}
                    className="btn-secondary py-1 px-2.5 text-xs"
                  >
                    + Ajouter photo
                  </button>
                </div>
                {editIdeaPhotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editIdeaPhotos.map((ph, idx) => (
                      <div
                        key={idx}
                        className="relative h-14 w-14 rounded-lg overflow-hidden border border-stone-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ph}
                          alt="Photo idée"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setEditIdeaPhotos((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute top-0.5 right-0.5 rounded-full bg-zinc-900/70 p-0.5 text-white"
                        >
                          <X className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingIdea(null)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Idea Photo Preview */}
      {previewPhoto && (
        <div
          style={{ zIndex: 2147483610 }}
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 flex items-center justify-center bg-zinc-900/70 p-4"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-white p-2 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt="Aperçu plein écran"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 rounded-full bg-zinc-900/80 p-2 text-white"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
