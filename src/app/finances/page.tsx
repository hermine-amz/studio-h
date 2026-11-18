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
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import type { TypeFinance } from '@/types/database';
import { formatEur, formatFcfa } from '@/lib/currency';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Skeleton } from '@/components/ui/Skeleton';

export default function FinancesPage() {
  const { isLoading, finances, commandes, prospects, addFinance, deleteFinance } =
    useStudioData();
  const { toast } = useToast();

  // Quick Form State
  const [type, setType] = useState<TypeFinance>('Dépense');
  const [libelle, setLibelle] = useState('');
  const [montantEur, setMontantEur] = useState('');
  const [dateTransaction, setDateTransaction] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Manual Revenues + Paid Orders Synchronization
  const manualRevenus = useMemo(
    () => finances.filter((f) => f.type === 'Revenu'),
    [finances]
  );

  const paidOrdersNotInFinances = useMemo(() => {
    return commandes.filter((c) => {
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
    ].sort((a, b) => b.date_transaction.localeCompare(a.date_transaction));
  }, [manualRevenus, paidOrdersNotInFinances, prospects]);

  const depenses = useMemo(
    () =>
      finances
        .filter((f) => f.type === 'Dépense')
        .sort((a, b) => b.date_transaction.localeCompare(a.date_transaction)),
    [finances]
  );

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
      depenses.reduce((sum, item) => sum + Number(item.montant_eur || 0), 0),
    [depenses]
  );

  const beneficeNetEur = totalRevenusEur - totalDepensesEur;

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(montantEur);
    if (!libelle.trim() || !amount || amount <= 0) return;

    await addFinance({
      type,
      libelle: libelle.trim(),
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          Vue 06 — Pilotage Financier Bimonétaire (EUR / XOF)
        </span>
        <h1 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
          Trésorerie & Rentabilité
        </h1>
      </div>

      {/* 1. Three Synthesis KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Total Collected Revenues */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Revenus Totaux Encaissés
            </span>
            <div className="rounded-xl bg-[#FFF8B9]/[0.06] border border-stone-300 p-2">
              <TrendingUp className="h-5 w-5 text-zinc-900" strokeWidth={1.5} />
            </div>
          </div>
          <CurrencyDisplay amountEur={totalRevenusEur} size="xl" />
          <p className="text-xs text-zinc-500">
            Inclut les factures encaissées et commandes payées
          </p>
        </div>

        {/* Total Expenses (AI Tool Subscriptions) */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Dépenses Totales (Outils IA & Infra)
            </span>
            <div className="rounded-xl bg-stone-100/80 border border-stone-200 p-2">
              <TrendingDown
                className="h-5 w-5 text-zinc-900"
                strokeWidth={1.5}
              />
            </div>
          </div>
          <CurrencyDisplay amountEur={totalDepensesEur} size="xl" />
          <p className="text-xs text-zinc-500">
            Abonnements ElevenLabs, Runway, Kling, Midjourney, Cloud
          </p>
        </div>

        {/* Net Profit */}
        <div className="glass-card-avocado p-4 space-y-3 border border-[#568203]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
              Bénéfice Net Réel Studio H
            </span>
            <div className="rounded-xl bg-[#568203] border border-[#568203]/40 p-2 shadow-glow">
              <Wallet className="h-5 w-5 text-zinc-900" strokeWidth={1.5} />
            </div>
          </div>
          <CurrencyDisplay amountEur={beneficeNetEur} size="xl" />
          <p className="text-xs text-zinc-700">
            Marge nette disponible (Taux fixe : 1 € = 655,957 FCFA)
          </p>
        </div>
      </div>

      {/* 2. Quick Add Transaction Form */}
      <section className="glass-card p-4">
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Ajouter rapidement un Revenu ou une Dépense
        </h2>
        <form
          onSubmit={handleAddTransaction}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
        >
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TypeFinance)}
              className="glass-input"
            >
              <option value="Dépense" className="bg-white">
                Dépense
              </option>
              <option value="Revenu" className="bg-white">
                Revenu
              </option>
            </select>
          </div>

          <div className="lg:col-span-4">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1.5">
              Libellé de l’opération *
            </label>
            <input
              type="text"
              required
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder={
                type === 'Dépense'
                  ? 'Ex: Abonnement Runway Gen-3 Unlimited'
                  : 'Ex: Acompte Client Pack UGC'
              }
              className="glass-input"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1.5">
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
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-600 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={dateTransaction}
              onChange={(e) => setDateTransaction(e.target.value)}
              className="glass-input"
            />
          </div>

          <div className="lg:col-span-2">
            <button type="submit" className="btn-primary w-full">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. Double Table: Revenues & Recurring AI Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Table 1: Revenus Encaissés */}
        <section className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200/85">
            <div className="flex items-center gap-2.5">
              <ArrowUpRight
                className="h-5 w-5 text-zinc-900"
                strokeWidth={1.5}
              />
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Journal des Revenus Encaissés
                </h2>
                <p className="text-xs text-zinc-500">
                  Synchronisé avec les commandes payées et saisies manuelles
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-[#568203] border border-[#568203]/30 px-2.5 py-1 text-xs font-mono text-zinc-900">
              {combinedRevenus.length} entrée{combinedRevenus.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2.5">
            {combinedRevenus.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200/85 p-4 text-center text-xs text-zinc-500">
                Aucun revenu encaissé enregistré.
              </div>
            ) : (
              combinedRevenus.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-200 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 truncate">
                        {rev.libelle}
                      </span>
                      {rev.isSyncedOrder && (
                        <span className="inline-flex items-center gap-1 rounded bg-[#FFF8B9]/[0.06] border border-stone-300 px-1.5 py-0.5 text-[10px] text-zinc-900">
                          <CheckCircle2
                            className="h-3 w-3"
                            strokeWidth={1.5}
                          />
                          Sync Commande
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-zinc-500 mt-0.5">
                      {rev.date_transaction}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-zinc-900">
                        + {formatEur(rev.montant_eur)}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500">
                        {formatFcfa(rev.montant_eur)}
                      </div>
                    </div>

                    {!rev.isSyncedOrder && (
                      <button
                        onClick={() => deleteFinance(rev.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-stone-100/80"
                        aria-label="Supprimer le revenu"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Table 2: Dépenses & Abonnements IA */}
        <section className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200/85">
            <div className="flex items-center gap-2.5">
              <ArrowDownRight
                className="h-5 w-5 text-zinc-900"
                strokeWidth={1.5}
              />
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Dépenses & Abonnements Outils IA
                </h2>
                <p className="text-xs text-zinc-500">
                  Suivi des coûts fixes et crédits de génération
                </p>
              </div>
            </div>
            <span className="rounded-lg bg-stone-100/80 border border-stone-200 px-2.5 py-1 text-xs font-mono text-zinc-900">
              {depenses.length} dépense{depenses.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2.5">
            {depenses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200/85 p-4 text-center text-xs text-zinc-500">
                Aucune dépense enregistrée.
              </div>
            ) : (
              depenses.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 border border-stone-200 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-900 truncate">
                      {dep.libelle}
                    </div>
                    <div className="text-xs font-mono text-zinc-500 mt-0.5">
                      {dep.date_transaction}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-zinc-900">
                        - {formatEur(dep.montant_eur)}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500">
                        {formatFcfa(dep.montant_eur)}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteFinance(dep.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-stone-100/80"
                      aria-label="Supprimer la dépense"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

