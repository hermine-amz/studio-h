'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Calendar,
  PieChart,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import type { TypeFinance, CategorieDepense } from '@/types/database';
import { formatEur, formatFcfa } from '@/lib/currency';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { DataTablePagination } from '@/components/ui/DataTablePagination';
import { Skeleton } from '@/components/ui/Skeleton';

type PeriodFilter =
  | 'jour'
  | 'semaine'
  | 'mois'
  | '30j'
  | '90j'
  | 'annee'
  | 'tout'
  | 'custom';

const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: 'semaine', label: 'Cette semaine' },
  { id: 'mois', label: 'Ce mois' },
  { id: '30j', label: '30 jours' },
  { id: '90j', label: '90 jours' },
  { id: 'annee', label: 'Cette année' },
  { id: 'tout', label: 'Depuis le début' },
  { id: 'custom', label: 'Calendrier personnalisé' },
];

const EXPENSE_CATEGORIES: CategorieDepense[] = [
  'Voix IA',
  'Vidéo IA',
  'Image IA',
  'Avatar / Lip-Sync',
  'Logiciel / Cloud',
  'Autre',
];

function parseExpenseLabel(rawLibelle: string): {
  category: CategorieDepense;
  cleanLabel: string;
} {
  const match = rawLibelle.match(
    /^\[(Voix IA|Vidéo IA|Image IA|Avatar \/ Lip-Sync|Logiciel \/ Cloud|Autre)\]\s*(.*)$/i
  );
  if (match) {
    return {
      category: match[1] as CategorieDepense,
      cleanLabel: match[2],
    };
  }
  return {
    category: 'Logiciel / Cloud',
    cleanLabel: rawLibelle,
  };
}

export default function FinancesPage() {
  const {
    isLoading,
    finances,
    commandes,
    prospects,
    addFinance,
    deleteFinance,
  } = useStudioData();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [period, setPeriod] = useState<PeriodFilter>('tout');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<
    CategorieDepense | 'ALL'
  >('ALL');

  // Data Table Pagination & Search for Revenues and Expenses
  const [revSearch, setRevSearch] = useState('');
  const [revPage, setRevPage] = useState(1);
  const [revPageSize, setRevPageSize] = useState(10);

  const [depSearch, setDepSearch] = useState('');
  const [depPage, setDepPage] = useState(1);
  const [depPageSize, setDepPageSize] = useState(10);

  // Quick Form State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [type, setType] = useState<TypeFinance>('Dépense');
  const [categorieDepense, setCategorieDepense] =
    useState<CategorieDepense>('Vidéo IA');
  const [libelle, setLibelle] = useState('');
  const [montantEur, setMontantEur] = useState('');
  const [dateTransaction, setDateTransaction] = useState(
    new Date().toISOString().split('T')[0]
  );

  const isDateInSelectedPeriod = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const dayOfWeek = now.getDay() || 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    days30Ago.setHours(0, 0, 0, 0);
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    days90Ago.setHours(0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return (dateStr: string): boolean => {
      if (!dateStr) return true;
      const cleanDate = dateStr.split('T')[0];
      if (period === 'tout') return true;
      if (period === 'jour') return cleanDate === todayStr;

      const d = new Date(`${cleanDate}T12:00:00`);
      if (isNaN(d.getTime())) return true;

      if (period === 'semaine') return d >= startOfWeek;
      if (period === 'mois') return d >= startOfMonth;
      if (period === '30j') return d >= days30Ago;
      if (period === '90j') return d >= days90Ago;
      if (period === 'annee') return d >= startOfYear;
      if (period === 'custom') {
        if (customStart && cleanDate < customStart) return false;
        if (customEnd && cleanDate > customEnd) return false;
        return true;
      }
      return true;
    };
  }, [period, customStart, customEnd]);

  const manualRevenus = useMemo(
    () => finances.filter((f) => f.type === 'Revenu'),
    [finances]
  );

  const paidOrdersNotInFinances = useMemo(() => {
    return commandes.filter((c) => {
      if (c.type_commande === 'essai_gratuit') return false;
      if (c.statut_paiement !== 'Payé') return false;
      const alreadyLogged = manualRevenus.some((r) =>
        r.libelle.toLowerCase().includes(c.nom_pack.toLowerCase())
      );
      return !alreadyLogged;
    });
  }, [commandes, manualRevenus]);

  const combinedRevenus = useMemo(() => {
    const syncedFromOrders = paidOrdersNotInFinances.map((ord) => {
      const client = prospects.find((p) => p.id === ord.prospect_id);
      return {
        id: `sync-${ord.id}`,
        type: 'Revenu' as const,
        libelle: `Commande Payée — ${client?.nom_marque || 'Client'} (${ord.nom_pack})`,
        montant_eur: Number(ord.montant_eur || 0),
        date_transaction: ord.created_at.split('T')[0],
        isSyncedOrder: true,
      };
    });

    return [
      ...manualRevenus.map((r) => ({ ...r, isSyncedOrder: false })),
      ...syncedFromOrders,
    ]
      .filter((item) => isDateInSelectedPeriod(item.date_transaction))
      .sort((a, b) => b.date_transaction.localeCompare(a.date_transaction));
  }, [
    manualRevenus,
    paidOrdersNotInFinances,
    prospects,
    isDateInSelectedPeriod,
  ]);

  const depensesAllPeriod = useMemo(
    () =>
      finances
        .filter(
          (f) => f.type === 'Dépense' && isDateInSelectedPeriod(f.date_transaction)
        )
        .map((f) => {
          const parsed = parseExpenseLabel(f.libelle);
          return {
            ...f,
            parsedCategory: parsed.category,
            cleanLabel: parsed.cleanLabel,
          };
        })
        .sort((a, b) => b.date_transaction.localeCompare(a.date_transaction)),
    [finances, isDateInSelectedPeriod]
  );

  const depenses = useMemo(
    () =>
      depensesAllPeriod.filter(
        (d) =>
          (expenseCategoryFilter === 'ALL' ||
            d.parsedCategory === expenseCategoryFilter) &&
          (!depSearch.trim() ||
            d.cleanLabel.toLowerCase().includes(depSearch.toLowerCase()))
      ),
    [depensesAllPeriod, expenseCategoryFilter, depSearch]
  );

  const filteredRevenus = useMemo(
    () =>
      combinedRevenus.filter(
        (r) =>
          !revSearch.trim() ||
          r.libelle.toLowerCase().includes(revSearch.toLowerCase())
      ),
    [combinedRevenus, revSearch]
  );

  const paginatedRevenus = useMemo(() => {
    const start = (revPage - 1) * revPageSize;
    return filteredRevenus.slice(start, start + revPageSize);
  }, [filteredRevenus, revPage, revPageSize]);

  const paginatedDepenses = useMemo(() => {
    const start = (depPage - 1) * depPageSize;
    return depenses.slice(start, start + depPageSize);
  }, [depenses, depPage, depPageSize]);

  const totalRevenusEur = useMemo(
    () =>
      combinedRevenus.reduce(
        (sum, item) => sum + Number(item.montant_eur || 0),
        0
      ),
    [combinedRevenus]
  );

  const totalDepensesEur = useMemo(
    () =>
      depensesAllPeriod.reduce(
        (sum, item) => sum + Number(item.montant_eur || 0),
        0
      ),
    [depensesAllPeriod]
  );

  const beneficeNetEur = totalRevenusEur - totalDepensesEur;

  const expenseRatioPct =
    totalRevenusEur > 0
      ? Math.min(100, Math.round((totalDepensesEur / totalRevenusEur) * 100))
      : 0;
  const netMarginPct = totalRevenusEur > 0 ? Math.max(0, 100 - expenseRatioPct) : 0;

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(montantEur);
    if (!libelle.trim() || !amount || amount <= 0) return;

    const finalLabel =
      type === 'Dépense'
        ? `[${categorieDepense}] ${libelle.trim()}`
        : libelle.trim();

    await addFinance({
      type,
      libelle: finalLabel,
      montant_eur: amount,
      date_transaction:
        dateTransaction || new Date().toISOString().split('T')[0],
    });

    toast({
      title: `${type} enregistré`,
      description: `${libelle} : ${formatEur(amount)} (${formatFcfa(amount)})`,
      type: 'success',
    });

    setLibelle('');
    setMontantEur('');
  };

  const handleDeleteTransaction = async (
    id: string,
    label: string,
    txType: string
  ) => {
    const ok = await confirm({
      title: `Supprimer ce ${txType.toLowerCase()} ?`,
      description: `Voulez-vous supprimer définitivement l'écriture "${label}" de votre trésorerie ?`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;

    await deleteFinance(id);
    toast({
      title: 'Écriture supprimée',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Vue 06 — Pilotage Financier Bimonétaire (EUR / XOF)
          </span>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Trésorerie & Rentabilité
          </h1>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="glass-card p-3.5 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Calendar
            className="h-4 w-4 text-[#568203] shrink-0 ml-1 mr-1"
            strokeWidth={1.5}
          />
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0 border ${
                period === opt.id
                  ? 'bg-[#568203] text-white border-[#568203] shadow-sm'
                  : 'bg-stone-50 text-zinc-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="pt-3 border-t border-stone-200/80 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-600">Du :</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="glass-input w-40 py-1.5"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-600">Au :</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="glass-input w-40 py-1.5"
              />
            </div>
            <span className="text-xs text-zinc-500">
              Période personnalisée active ({combinedRevenus.length} revenus,{' '}
              {depensesAllPeriod.length} dépenses)
            </span>
          </div>
        )}
      </div>

      {/* 1. Three Synthesis KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Revenus Encaissés (
              {PERIOD_OPTIONS.find((p) => p.id === period)?.label})
            </span>
            <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
              <TrendingUp
                className="h-4 w-4 text-[#568203]"
                strokeWidth={1.5}
              />
            </div>
          </div>
          <CurrencyDisplay amountEur={totalRevenusEur} size="xl" />
          <p className="text-xs text-zinc-500">
            Inclut les factures encaissées et commandes payées sur la période
          </p>
        </div>

        <div className="glass-card p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Dépenses Totales (
              {PERIOD_OPTIONS.find((p) => p.id === period)?.label})
            </span>
            <div className="rounded-xl bg-stone-100 border border-stone-200 p-2">
              <TrendingDown
                className="h-4 w-4 text-zinc-700"
                strokeWidth={1.5}
              />
            </div>
          </div>
          <CurrencyDisplay amountEur={totalDepensesEur} size="xl" />
          <p className="text-xs text-zinc-500">
            Abonnements outils IA & charges sur la période sélectionnée
          </p>
        </div>

        <div className="glass-card-avocado p-5 space-y-2.5 border border-[#568203]/35">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
              Bénéfice Net Réel Studio H
            </span>
            <div className="rounded-xl bg-[#568203] p-2">
              <Wallet className="h-4 w-4 text-white" strokeWidth={1.5} />
            </div>
          </div>
          <CurrencyDisplay amountEur={beneficeNetEur} size="xl" />
          <p className="text-xs text-zinc-600">
            Marge nette sur la période (1 € = 655,957 FCFA)
          </p>
        </div>
      </div>

      {/* Visual Breakdown Bar: Revenues vs AI Expenses */}
      <section className="glass-card p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-zinc-800">
            <PieChart
              className="h-4 w-4 text-[#568203]"
              strokeWidth={1.5}
            />
            <span>
              Répartition Rentabilité vs Coûts Outils IA sur la période
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <span className="text-[#568203] font-semibold">
              Marge Nette : {netMarginPct}%
            </span>
            <span className="text-zinc-500">
              Poids Outils IA : {expenseRatioPct}% du CA
            </span>
          </div>
        </div>

        <div className="h-3 w-full rounded-full bg-stone-200 overflow-hidden flex">
          <div
            style={{ width: `${netMarginPct}%` }}
            className="h-full bg-[#568203] transition-all duration-500"
            title={`Marge Nette : ${netMarginPct}%`}
          />
          <div
            style={{ width: `${expenseRatioPct}%` }}
            className="h-full bg-[#FFF8B9] border-l border-stone-300 transition-all duration-500"
            title={`Dépenses IA : ${expenseRatioPct}%`}
          />
        </div>
      </section>

      {/* 2. Quick Add Transaction Form (Collapsible, with Expense Category) */}
      <section className="glass-card p-5">
        <div
          onClick={() => setIsQuickAddOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsQuickAddOpen((prev) => !prev);
            }
          }}
          className={`flex items-center justify-between gap-3 cursor-pointer select-none ${
            isQuickAddOpen ? 'mb-3.5 pb-3 border-b border-stone-200/80' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-xl bg-[#FFF8B9]/75 border border-[#568203]/25 p-2 shrink-0">
              <Plus className="h-4 w-4 text-[#568203]" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-zinc-900 truncate">
                Ajouter rapidement un Revenu ou une Dépense
              </h2>
              <p className="text-xs text-zinc-500 truncate">
                Saisie rapide d’abonnement outil IA, charge ou encaissement manuel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsQuickAddOpen((prev) => !prev);
            }}
            className="btn-secondary py-1.5 px-2.5 text-xs shrink-0"
            aria-expanded={isQuickAddOpen}
          >
            <span>{isQuickAddOpen ? 'Réduire' : 'Ouvrir'}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                isQuickAddOpen ? 'rotate-180' : ''
              }`}
              strokeWidth={1.5}
            />
          </button>
        </div>
        {isQuickAddOpen && (
          <form
            onSubmit={handleAddTransaction}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end"
          >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeFinance)}
              className="glass-input"
            >
              <option value="Dépense">Dépense</option>
              <option value="Revenu">Revenu</option>
            </select>
          </div>

          {type === 'Dépense' && (
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1">
                Catégorie IA
              </label>
              <select
                value={categorieDepense}
                onChange={(e) =>
                  setCategorieDepense(e.target.value as CategorieDepense)
                }
                className="glass-input"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            className={
              type === 'Dépense' ? 'lg:col-span-3' : 'lg:col-span-5'
            }
          >
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1">
              Libellé de l’opération *
            </label>
            <input
              type="text"
              required
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder={
                type === 'Dépense'
                  ? 'Ex: Abonnement Runway Gen-3 / Kling'
                  : 'Ex: Acompte Client Pack UGC'
              }
              className="glass-input"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1">
              Montant (€) *
            </label>
            <input
              type="number"
              required
              min={1}
              step="0.01"
              value={montantEur}
              onChange={(e) => setMontantEur(e.target.value)}
              placeholder="Ex: 99"
              className="glass-input"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={dateTransaction}
              onChange={(e) => setDateTransaction(e.target.value)}
              className="glass-input"
            />
          </div>

          <div className="lg:col-span-1">
            <button
              type="submit"
              className="btn-primary w-full"
              title="Enregistrer"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <span className="lg:hidden">Enregistrer</span>
            </button>
          </div>
          </form>
        )}
      </section>

      {/* 3. Double Table: Revenues & Categorized Recurring AI Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <section className="glass-card p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/85">
            <div className="flex items-center gap-2.5">
              <ArrowUpRight
                className="h-5 w-5 text-[#568203]"
                strokeWidth={1.5}
              />
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Journal des Revenus Encaissés
                </h2>
                <p className="text-xs text-zinc-500">
                  Synchronisé avec les commandes payées et saisies manuelles
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-[#568203] px-2.5 py-1 text-xs font-mono text-white">
              {combinedRevenus.length}
            </span>
          </div>

          <div className="pb-1">
            <input
              type="text"
              value={revSearch}
              onChange={(e) => {
                setRevSearch(e.target.value);
                setRevPage(1);
              }}
              placeholder="Filtrer les revenus par libellé ou client..."
              className="glass-input py-1.5 text-xs"
            />
          </div>

          <div className="space-y-2">
            {filteredRevenus.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-xs text-zinc-500">
                Aucun revenu encaissé sur cette période.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/90 text-[11px] uppercase tracking-wider text-zinc-500">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Libellé</th>
                        <th className="py-2.5 px-3 text-right">Montant (€ / FCFA)</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/75 text-xs">
                      {paginatedRevenus.map((rev) => (
                        <tr key={rev.id} className="hover:bg-[#FFF8B9]/20">
                          <td className="py-3 px-3 font-mono text-zinc-500 whitespace-nowrap">
                            {rev.date_transaction}
                          </td>
                          <td className="py-3 px-3 font-medium text-zinc-900">
                            <div className="flex items-center gap-1.5">
                              <span>{rev.libelle}</span>
                              {rev.isSyncedOrder && (
                                <span className="inline-flex items-center gap-1 rounded bg-[#FFF8B9]/80 border border-[#568203]/25 px-1.5 py-0.5 text-[10px] text-zinc-800 shrink-0">
                                  <CheckCircle2
                                    className="h-3 w-3 text-[#568203]"
                                    strokeWidth={1.5}
                                  />
                                  Sync
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="font-semibold text-zinc-900">
                              + {formatEur(rev.montant_eur)}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {formatFcfa(rev.montant_eur)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {!rev.isSyncedOrder && (
                              <button
                                onClick={() =>
                                  handleDeleteTransaction(
                                    rev.id,
                                    rev.libelle,
                                    'Revenu'
                                  )
                                }
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                aria-label="Supprimer le revenu"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <DataTablePagination
                  totalItems={filteredRevenus.length}
                  currentPage={revPage}
                  pageSize={revPageSize}
                  onPageChange={setRevPage}
                  onPageSizeChange={setRevPageSize}
                  itemLabel="revenus"
                />
              </>
            )}
          </div>
        </section>

        <section className="glass-card p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/85">
            <div className="flex items-center gap-2.5">
              <ArrowDownRight
                className="h-5 w-5 text-zinc-700"
                strokeWidth={1.5}
              />
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Dépenses & Abonnements Outils IA
                </h2>
                <p className="text-xs text-zinc-500">
                  Classées par catégorie (Voix IA, Vidéo IA, Image IA, Cloud...)
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-mono text-zinc-800">
              {depenses.length}
            </span>
          </div>

          {/* Expense Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setExpenseCategoryFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border shrink-0 transition-colors ${
                expenseCategoryFilter === 'ALL'
                  ? 'bg-[#568203] text-white border-[#568203]'
                  : 'bg-stone-50 text-zinc-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              Toutes
            </button>
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setExpenseCategoryFilter(cat)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border shrink-0 transition-colors ${
                  expenseCategoryFilter === cat
                    ? 'bg-[#568203] text-white border-[#568203]'
                    : 'bg-stone-50 text-zinc-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pb-1">
            <input
              type="text"
              value={depSearch}
              onChange={(e) => {
                setDepSearch(e.target.value);
                setDepPage(1);
              }}
              placeholder="Filtrer les dépenses par outil ou libellé..."
              className="glass-input py-1.5 text-xs"
            />
          </div>

          <div className="space-y-2">
            {depenses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 p-5 text-center text-xs text-zinc-500">
                Aucune dépense dans cette catégorie sur la période.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/90 text-[11px] uppercase tracking-wider text-zinc-500">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Catégorie & Outil</th>
                        <th className="py-2.5 px-3 text-right">Montant (€ / FCFA)</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200/75 text-xs">
                      {paginatedDepenses.map((dep) => (
                        <tr key={dep.id} className="hover:bg-[#FFF8B9]/20">
                          <td className="py-3 px-3 font-mono text-zinc-500 whitespace-nowrap">
                            {dep.date_transaction}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF8B9]/80 border border-[#568203]/25 px-2 py-0.5 text-[10px] font-medium text-zinc-900">
                                <Tag
                                  className="h-2.5 w-2.5 text-[#568203]"
                                  strokeWidth={1.5}
                                />
                                {dep.parsedCategory}
                              </span>
                              <span className="font-medium text-zinc-900">
                                {dep.cleanLabel}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="font-semibold text-zinc-900">
                              - {formatEur(dep.montant_eur)}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {formatFcfa(dep.montant_eur)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() =>
                                handleDeleteTransaction(
                                  dep.id,
                                  dep.cleanLabel,
                                  'Dépense'
                                )
                              }
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                              aria-label="Supprimer la dépense"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <DataTablePagination
                  totalItems={depenses.length}
                  currentPage={depPage}
                  pageSize={depPageSize}
                  onPageChange={setDepPage}
                  onPageSizeChange={setDepPageSize}
                  itemLabel="dépenses"
                />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
