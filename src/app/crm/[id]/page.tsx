'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  AlertCircle,
  FolderPlus,
  FolderCheck,
  ExternalLink,
  ArrowUpRight,
  GripVertical,
  X,
  Building2,
  Globe,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import type { ProspectStatut } from '@/types/database';
import {
  formatEur,
  formatFcfa,
  daysSince,
  normalizeCountryCode,
} from '@/lib/currency';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Skeleton } from '@/components/ui/Skeleton';

const KANBAN_COLUMNS: ProspectStatut[] = [
  'À contacter',
  'Contacté',
  'Démo envoyée',
  'Négociation',
  'Signé',
  'Perdu',
];

const EUROPEAN_COUNTRIES = [
  { code: 'FR', label: 'FR — France' },
  { code: 'CH', label: 'CH — Suisse' },
  { code: 'BE', label: 'BE — Belgique' },
  { code: 'UK', label: 'UK — Royaume-Uni' },
  { code: 'LU', label: 'LU — Luxembourg' },
  { code: 'DE', label: 'DE — Allemagne' },
  { code: 'IT', label: 'IT — Italie' },
  { code: 'ES', label: 'ES — Espagne' },
  { code: 'NL', label: 'NL — Pays-Bas' },
];

export default function CrmKanbanPage() {
  const {
    isLoading,
    prospects,
    addProspect,
    updateProspectStatus,
    createProspectDriveFolder,
  } = useStudioData();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ProspectStatut | null>(null);
  const [creatingDriveId, setCreatingDriveId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Prospect Form State
  const [nomMarque, setNomMarque] = useState('');
  const [pays, setPays] = useState('FR');
  const [contactNom, setContactNom] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [lienBoutique, setLienBoutique] = useState('');
  const [statut, setStatut] = useState<ProspectStatut>('À contacter');
  const [valeurEstimee, setValeurEstimee] = useState('1500');
  const [notesStrategiques, setNotesStrategiques] = useState('');

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.nom_marque.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.contact_nom || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (p.contact_email || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const code = normalizeCountryCode(p.pays);
      const matchesCountry =
        countryFilter === 'ALL' || code === countryFilter;

      return matchesSearch && matchesCountry;
    });
  }, [prospects, searchQuery, countryFilter]);

  const totalPipelineEur = useMemo(
    () =>
      filteredProspects
        .filter((p) => p.statut !== 'Perdu')
        .reduce((acc, p) => acc + Number(p.valeur_estimee_eur || 0), 0),
    [filteredProspects]
  );

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, col: ProspectStatut) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== col) {
      setDragOverCol(col);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetCol: ProspectStatut) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);
    setDragOverCol(null);

    if (!id) return;
    const prospect = prospects.find((p) => p.id === id);
    if (!prospect || prospect.statut === targetCol) return;

    toast({
      title: `Statut mis à jour : ${targetCol}`,
      description:
        targetCol === 'Signé' && !prospect.drive_folder_id
          ? `Création automatique du dossier Client_${prospect.nom_marque.replace(/\s+/g, '_')} sur Google Drive...`
          : `${prospect.nom_marque} déplacé dans "${targetCol}".`,
    });

    await updateProspectStatus(id, targetCol);
  };

  const handleManualDriveInit = async (
    e: React.MouseEvent,
    prospectId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setCreatingDriveId(prospectId);
    try {
      await createProspectDriveFolder(prospectId);
    } finally {
      setCreatingDriveId(null);
    }
  };

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomMarque.trim()) return;

    await addProspect({
      nom_marque: nomMarque.trim(),
      pays,
      contact_nom: contactNom.trim() || null,
      contact_email: contactEmail.trim() || null,
      lien_boutique: lienBoutique.trim() || null,
      statut,
      valeur_estimee_eur: Number(valeurEstimee) || 0,
      drive_folder_id: null,
      notes_strategiques: notesStrategiques.trim() || null,
    });

    toast({
      title: 'Prospect européen ajouté',
      description: `${nomMarque} a été intégré dans la colonne "${statut}".`,
    });

    setNomMarque('');
    setContactNom('');
    setContactEmail('');
    setLienBoutique('');
    setValeurEstimee('1500');
    setNotesStrategiques('');
    setIsAddModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {KANBAN_COLUMNS.map((c) => (
            <Skeleton key={c} className="h-[520px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Pipeline Summary */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Vue 02 — Acquisition & Clients Signés
          </span>
          <h1 className="mt-1 text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
            CRM & Pipeline Europe
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-card px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs text-zinc-600">
              Valeur Pipeline Actif :
            </span>
            <CurrencyDisplay
              amountEur={totalPipelineEur}
              size="sm"
              layout="inline"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Nouveau Prospect</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="h-4 w-4 text-zinc-400 absolute left-3.5 top-3"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une marque, un contact ou un email..."
            className="glass-input pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Globe
            className="h-4 w-4 text-zinc-500 shrink-0 mr-1"
            strokeWidth={1.5}
          />
          {['ALL', 'FR', 'CH', 'BE', 'UK', 'IT', 'DE', 'LU'].map((code) => (
            <button
              key={code}
              onClick={() => setCountryFilter(code)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase transition-all border ${
                countryFilter === code
                  ? 'bg-[#568203] text-white border-[#568203]/40'
                  : 'bg-stone-50/80 text-zinc-600 border-stone-200/85 hover:bg-[#FFF8B9]/60'
              }`}
            >
              {code === 'ALL' ? 'Tous Pays' : code}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colItems = filteredProspects.filter((p) => p.statut === col);
          const colTotalEur = colItems.reduce(
            (sum, item) => sum + Number(item.valeur_estimee_eur || 0),
            0
          );
          const isDropTarget = dragOverCol === col;

          return (
            <div
              key={col}
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col)}
              className={`rounded-xl p-3.5 border transition-all min-h-[420px] flex flex-col ${
                isDropTarget
                  ? 'bg-[#FFF8B9]/[0.06] border-[#568203] shadow-glow'
                  : col === 'Signé'
                    ? 'bg-[#FFF8B9]/[0.04] border-[#568203]/30 backdrop-blur-md'
                    : 'bg-stone-50/80 border-stone-200/85 backdrop-blur-md'
              }`}
            >
              {/* Column Header */}
              <div className="pb-3 mb-3 border-b border-stone-200/85">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                    {col}
                  </span>
                  <span className="rounded-md bg-[#FFF8B9]/60 border border-stone-200 px-2 py-0.5 text-[11px] font-mono text-zinc-900">
                    {colItems.length}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-zinc-500 font-mono">
                  {formatEur(colTotalEur)} • {formatFcfa(colTotalEur)}
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1">
                {colItems.length === 0 ? (
                  <div className="h-32 rounded-xl border border-dashed border-stone-200/85 flex items-center justify-center p-4 text-center text-[11px] text-zinc-400">
                    Glisser une carte ici
                  </div>
                ) : (
                  colItems.map((prospect) => {
                    const inactiveDays = daysSince(
                      prospect.date_dernier_contact
                    );
                    const isStale =
                      inactiveDays > 3 &&
                      prospect.statut !== 'Signé' &&
                      prospect.statut !== 'Perdu';
                    const countryCode = normalizeCountryCode(prospect.pays);

                    return (
                      <div
                        key={prospect.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, prospect.id)}
                        className="group rounded-xl bg-white hover:bg-white backdrop-blur-md border border-stone-200 hover:border-[#568203]/50 p-3.5 shadow-glass transition-all cursor-grab active:cursor-grabbing space-y-3"
                      >
                        {/* Top row: Brand + Country Code */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <GripVertical
                              className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5"
                              strokeWidth={1.5}
                            />
                            <Link
                              href={`/crm/${prospect.id}`}
                              className="text-sm font-semibold text-zinc-900 hover:underline leading-snug truncate"
                            >
                              {prospect.nom_marque}
                            </Link>
                          </div>

                          <span className="shrink-0 rounded bg-[#FFF8B9]/[0.08] border border-[#568203]/30 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-900">
                            {countryCode}
                          </span>
                        </div>

                        {/* Contact Name */}
                        {prospect.contact_nom && (
                          <p className="text-xs text-zinc-600 truncate">
                            {prospect.contact_nom}
                          </p>
                        )}

                        {/* Estimated Value in EUR + FCFA */}
                        <div className="rounded-lg bg-stone-50/80 border border-stone-200/85 p-2.5">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                            Valeur estimée
                          </div>
                          <div className="text-sm font-semibold text-zinc-900 mt-0.5">
                            {formatEur(prospect.valeur_estimee_eur)}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500">
                            {formatFcfa(prospect.valeur_estimee_eur)}
                          </div>
                        </div>

                        {/* Alert Indicator (> 3 days without contact) */}
                        {isStale && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-[#FFF8B9]/[0.06] border border-[#568203]/40 px-2.5 py-1.5 text-[11px] text-zinc-900">
                            <AlertCircle
                              className="h-3.5 w-3.5 shrink-0 text-zinc-900"
                              strokeWidth={1.5}
                            />
                            <span>Sans suivi depuis {inactiveDays} j</span>
                          </div>
                        )}

                        {/* Drive Folder Status / Quick Action */}
                        <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between gap-2">
                          {prospect.drive_folder_id ? (
                            <a
                              href={`https://drive.google.com/drive/folders/${prospect.drive_folder_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-zinc-700 hover:text-zinc-900"
                            >
                              <FolderCheck
                                className="h-3.5 w-3.5 text-zinc-900"
                                strokeWidth={1.5}
                              />
                              <span>Drive actif</span>
                              <ExternalLink
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled={creatingDriveId === prospect.id}
                              onClick={(e) =>
                                handleManualDriveInit(e, prospect.id)
                              }
                              className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-900 transition-colors"
                            >
                              <FolderPlus
                                className="h-3.5 w-3.5"
                                strokeWidth={1.5}
                              />
                              <span>
                                {creatingDriveId === prospect.id
                                  ? 'Création...'
                                  : 'Créer Drive'}
                              </span>
                            </button>
                          )}

                          <Link
                            href={`/crm/${prospect.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-stone-100/80 hover:bg-[#568203] border border-stone-200 px-2 py-1 text-[11px] font-medium text-zinc-900 transition-colors"
                          >
                            <span>360°</span>
                            <ArrowUpRight
                              className="h-3 w-3"
                              strokeWidth={1.5}
                            />
                          </Link>
                        </div>

                        {/* Quick Status Select for accessible one-click transitions */}
                        <div>
                          <select
                            aria-label={`Changer le statut de ${prospect.nom_marque}`}
                            value={prospect.statut}
                            onChange={(e) =>
                              updateProspectStatus(
                                prospect.id,
                                e.target.value as ProspectStatut
                              )
                            }
                            className="w-full rounded-lg bg-white border border-stone-200 px-2 py-1 text-[11px] text-zinc-700 focus:outline-none focus:border-[#568203]"
                          >
                            {KANBAN_COLUMNS.map((st) => (
                              <option
                                key={st}
                                value={st}
                                className="bg-white text-zinc-900"
                              >
                                Statut : {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Prospect */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/35 backdrop-blur-md p-4">
          <div className="glass-card w-full max-w-lg p-4 sm:p-3.5 border border-[#568203]/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-200/85">
              <div className="flex items-center gap-2.5">
                <Building2
                  className="h-5 w-5 text-zinc-900"
                  strokeWidth={1.5}
                />
                <h2 className="text-lg font-semibold text-zinc-900">
                  Ajouter un Prospect / Client Européen
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-stone-100/80"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateProspect} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Nom de la marque *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomMarque}
                    onChange={(e) => setNomMarque(e.target.value)}
                    placeholder="Ex: Maison Lumière Paris"
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Code Pays
                  </label>
                  <select
                    value={pays}
                    onChange={(e) => setPays(e.target.value)}
                    className="glass-input"
                  >
                    {EUROPEAN_COUNTRIES.map((c) => (
                      <option
                        key={c.code}
                        value={c.code}
                        className="bg-white text-zinc-900"
                      >
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Nom du contact
                  </label>
                  <input
                    type="text"
                    value={contactNom}
                    onChange={(e) => setContactNom(e.target.value)}
                    placeholder="Ex: Camille Rochefort"
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Email du contact
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@marque.eu"
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Valeur estimée (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={valeurEstimee}
                    onChange={(e) => setValeurEstimee(e.target.value)}
                    className="glass-input"
                  />
                  <span className="block mt-1 text-[11px] font-mono text-zinc-500">
                    Équivalent : {formatFcfa(Number(valeurEstimee) || 0)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                    Statut initial
                  </label>
                  <select
                    value={statut}
                    onChange={(e) =>
                      setStatut(e.target.value as ProspectStatut)
                    }
                    className="glass-input"
                  >
                    {KANBAN_COLUMNS.map((st) => (
                      <option
                        key={st}
                        value={st}
                        className="bg-white text-zinc-900"
                      >
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                  Lien boutique e-commerce
                </label>
                <input
                  type="url"
                  value={lienBoutique}
                  onChange={(e) => setLienBoutique(e.target.value)}
                  placeholder="https://marque.eu"
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1.5">
                  Notes stratégiques & Direction créative
                </label>
                <textarea
                  rows={3}
                  value={notesStrategiques}
                  onChange={(e) => setNotesStrategiques(e.target.value)}
                  placeholder="Esthétique de marque, angles publicitaires, tonalité..."
                  className="glass-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200/85">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Enregistrer le prospect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

