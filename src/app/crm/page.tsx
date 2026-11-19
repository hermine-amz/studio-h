'use client';

import React, { useState, useMemo, useRef } from 'react';
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
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Trash2,
  Image as ImageIcon,
  List,
  Columns,
  Eye,
  Megaphone,
  ShoppingBag,
  Share2,
  User,
  ArrowUpDown,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import type { Prospect, ProspectStatut } from '@/types/database';
import { formatEur, formatFcfa, daysSince } from '@/lib/currency';
import { resolveIso2Code, getCountryByCode } from '@/lib/countries';
import {
  CountryBadge,
  CountrySelect,
  CountryFilterDropdown,
} from '@/components/ui/CountryFlag';
import { DataTablePagination } from '@/components/ui/DataTablePagination';
import { fileToResizedDataUrl } from '@/lib/image-resize';
import {
  isValidEmail,
  isValidOptionalUrl,
  normalizeUrl,
} from '@/lib/validation';
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

type SortField = 'nom_marque' | 'pays' | 'statut' | 'valeur' | 'suivi';

export default function CrmPage() {
  const {
    isLoading,
    prospects,
    addProspect,
    updateProspect,
    updateProspectStatus,
    deleteProspect,
    createProspectDriveFolder,
  } = useStudioData();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<ProspectStatut | 'ALL'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  // Data Table Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('suivi');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Quick Preview Modal State
  const [quickPreviewId, setQuickPreviewId] = useState<string | null>(null);
  const [quickNewAdUrl, setQuickNewAdUrl] = useState('');
  const [quickNewProdUrl, setQuickNewProdUrl] = useState('');

  const quickProspect = useMemo(
    () => prospects.find((p) => p.id === quickPreviewId) || null,
    [prospects, quickPreviewId]
  );

  // Drag & Drop (for Kanban toggle)
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ProspectStatut | null>(null);
  const [creatingDriveId, setCreatingDriveId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // New Prospect Form State
  const [nomMarque, setNomMarque] = useState('');
  const [pays, setPays] = useState('FR');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [contactNom, setContactNom] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTelephone, setContactTelephone] = useState('');
  const [lienBoutique, setLienBoutique] = useState('');
  const [statut, setStatut] = useState<ProspectStatut>('À contacter');
  const [valeurEstimee, setValeurEstimee] = useState('1500');
  const [notesStrategiques, setNotesStrategiques] = useState('');

  const [lienPubInitial, setLienPubInitial] = useState('');
  const [lienProduitInitial, setLienProduitInitial] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [prospectFormErrors, setProspectFormErrors] = useState<{
    nomMarque?: string;
    contactEmail?: string;
    lienBoutique?: string;
  }>({});

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const dataUrl = await fileToResizedDataUrl(files[0], 260, 0.85);
      setLogoUrl(dataUrl);
      toast({
        title: 'Logo client chargé',
      });
    } catch {
      toast({
        title: 'Format de logo invalide',
        type: 'error',
      });
    }
  };

  const filteredAndSortedProspects = useMemo(() => {
    const list = prospects.filter((p) => {
      const matchesStatus =
        statusFilter === 'ALL' || p.statut === statusFilter;
      const countryInfo = getCountryByCode(p.pays);
      const matchesSearch =
        !searchQuery.trim() ||
        p.nom_marque.toLowerCase().includes(searchQuery.toLowerCase()) ||
        countryInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.contact_nom || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (p.contact_email || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const code = resolveIso2Code(p.pays);
      const matchesCountry =
        countryFilter === 'ALL' || code === countryFilter;

      return matchesStatus && matchesSearch && matchesCountry;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'nom_marque') {
        cmp = a.nom_marque.localeCompare(b.nom_marque);
      } else if (sortField === 'pays') {
        cmp = resolveIso2Code(a.pays).localeCompare(resolveIso2Code(b.pays));
      } else if (sortField === 'statut') {
        cmp = a.statut.localeCompare(b.statut);
      } else if (sortField === 'valeur') {
        cmp =
          Number(a.valeur_estimee_eur || 0) - Number(b.valeur_estimee_eur || 0);
      } else {
        cmp =
          new Date(a.date_dernier_contact).getTime() -
          new Date(b.date_dernier_contact).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [
    prospects,
    statusFilter,
    searchQuery,
    countryFilter,
    sortField,
    sortAsc,
  ]);

  const paginatedProspects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedProspects.slice(start, start + pageSize);
  }, [filteredAndSortedProspects, currentPage, pageSize]);

  const totalPipelineEur = useMemo(
    () =>
      filteredAndSortedProspects
        .filter((p) => p.statut !== 'Perdu')
        .reduce((acc, p) => acc + Number(p.valeur_estimee_eur || 0), 0),
    [filteredAndSortedProspects]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const requestStatusChange = async (
    id: string,
    targetCol: ProspectStatut
  ) => {
    const prospect = prospects.find((p) => p.id === id);
    if (!prospect || prospect.statut === targetCol) return;

    const ok = await confirm({
      title: `Modifier le statut de ${prospect.nom_marque} ?`,
      description: `Voulez-vous déplacer "${prospect.nom_marque}" du statut "${prospect.statut}" vers "${targetCol}" ?${
        targetCol === 'Signé' && !prospect.drive_folder_id
          ? ' Cela créera également son dossier client Google Drive.'
          : ''
      }`,
      confirmLabel: 'Confirmer le changement',
      variant: 'modify',
    });

    if (!ok) return;

    toast({
      title: `Statut mis à jour : ${targetCol}`,
      description: `${prospect.nom_marque} est désormais dans "${targetCol}".`,
    });

    await updateProspectStatus(id, targetCol);
  };

  const handleDeleteProspect = async (id: string, brandName: string) => {
    const ok = await confirm({
      title: `Supprimer le prospect ${brandName} ?`,
      description: `Êtes-vous sûr de vouloir supprimer définitivement "${brandName}" ainsi que ses données associées ?`,
      confirmLabel: 'Supprimer définitivement',
      variant: 'danger',
    });
    if (!ok) return;

    if (quickPreviewId === id) setQuickPreviewId(null);
    await deleteProspect(id);
    toast({
      title: 'Prospect supprimé',
      description: `${brandName} a été retiré du pipeline.`,
    });
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

  const handleQuickAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProspect) return;
    if (!quickNewAdUrl.trim() || !isValidOptionalUrl(quickNewAdUrl)) {
      toast({
        title: 'Lien publicitaire invalide',
        description:
          'Veuillez saisir une URL valide (ex: https://www.facebook.com/ads/library/...).',
        type: 'error',
      });
      return;
    }
    const current = quickProspect.liens_pubs || [];
    await updateProspect(quickProspect.id, {
      liens_pubs: [...current, normalizeUrl(quickNewAdUrl)],
    });
    setQuickNewAdUrl('');
    toast({ title: 'Lien Pub Facebook ajouté' });
  };

  const handleQuickAddProd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProspect) return;
    if (!quickNewProdUrl.trim() || !isValidOptionalUrl(quickNewProdUrl)) {
      toast({
        title: 'Lien produit invalide',
        description:
          'Veuillez saisir une URL valide (ex: https://marque.eu/products/...).',
        type: 'error',
      });
      return;
    }
    const current = quickProspect.liens_produits || [];
    await updateProspect(quickProspect.id, {
      liens_produits: [...current, normalizeUrl(quickNewProdUrl)],
    });
    setQuickNewProdUrl('');
    toast({ title: 'Lien Produit ajouté' });
  };

  const handleCreateProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      nomMarque?: string;
      contactEmail?: string;
      lienBoutique?: string;
    } = {};

    if (!nomMarque.trim()) {
      errors.nomMarque = 'Le nom de la marque est obligatoire.';
    }
    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      errors.contactEmail =
        "L'adresse email du contact est invalide (ex: contact@marque.eu).";
    }
    if (!isValidOptionalUrl(lienBoutique)) {
      errors.lienBoutique =
        "L'URL de la boutique est invalide (ex: https://marque.eu).";
    }

    if (Object.keys(errors).length > 0) {
      setProspectFormErrors(errors);
      toast({
        title: 'Vérifiez le formulaire',
        description: Object.values(errors)[0],
        type: 'error',
      });
      return;
    }
    setProspectFormErrors({});

    const created = await addProspect({
      nom_marque: nomMarque.trim(),
      pays: resolveIso2Code(pays),
      logo_url: logoUrl.trim() || null,
      contact_nom: contactNom.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_telephone: contactTelephone.trim() || null,
      lien_boutique: lienBoutique.trim() || null,
      liens_pubs: lienPubInitial.trim() ? [lienPubInitial.trim()] : [],
      liens_produits: lienProduitInitial.trim()
        ? [lienProduitInitial.trim()]
        : [],
      liens_reseaux: {
        instagram: instagramUrl.trim() || undefined,
        tiktok: tiktokUrl.trim() || undefined,
        facebook: facebookUrl.trim() || undefined,
      },
      statut,
      valeur_estimee_eur: Number(valeurEstimee) || 0,
      drive_folder_id: null,
      notes_strategiques: notesStrategiques.trim() || null,
    });

    toast({
      title: 'Prospect créé avec succès',
      description: `${created.nom_marque} a été ajouté à votre Data Table.`,
    });

    setNomMarque('');
    setLogoUrl('');
    setContactNom('');
    setContactEmail('');
    setContactTelephone('');
    setLienBoutique('');
    setLienPubInitial('');
    setLienProduitInitial('');
    setInstagramUrl('');
    setTiktokUrl('');
    setFacebookUrl('');
    setValeurEstimee('1500');
    setNotesStrategiques('');
    setIsAddModalOpen(false);
    setQuickPreviewId(created.id);
  };

  const getStatusBadgeStyle = (st: ProspectStatut) => {
    if (st === 'Signé')
      return 'bg-[#568203] text-white border-[#568203] font-semibold';
    if (st === 'Négociation' || st === 'Démo envoyée')
      return 'bg-[#FFF8B9] text-zinc-900 border-[#568203]/30 font-medium';
    if (st === 'Perdu')
      return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-stone-100 text-zinc-700 border-stone-200';
  };

  const renderBrandAvatar = (p: Prospect, size: 'sm' | 'md' = 'sm') => {
    const dim = size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';
    if (p.logo_url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.logo_url}
          alt={p.nom_marque}
          className={`${dim} rounded-xl object-cover border border-stone-200 shrink-0`}
        />
      );
    }
    return (
      <div
        className={`${dim} rounded-xl bg-[#FFF8B9]/75 border border-[#568203]/25 flex items-center justify-center font-bold text-[#568203] shrink-0`}
      >
        {p.nom_marque.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Pipeline Summary */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Vue 02 — Acquisition & Clients Signés
          </span>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Prospects & Clients International
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="glass-card px-4 py-2 flex items-center gap-2.5">
            <span className="text-xs text-zinc-500">Pipeline Actif :</span>
            <CurrencyDisplay
              amountEur={totalPipelineEur}
              size="sm"
              layout="inline"
            />
          </div>

          <div className="inline-flex rounded-xl bg-white border border-stone-300 p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#568203] text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <List className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Data Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[#568203] text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Kanban</span>
            </button>
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

      {/* Filter Bar (Search + Single Searchable Country Dropdown + Status Tabs) */}
      <div className="glass-card overflow-visible relative z-20 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="h-4 w-4 text-zinc-400 absolute left-3.5 top-2.5"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Rechercher une marque, un pays, un contact ou un email..."
              className="glass-input pl-9"
            />
          </div>

          <CountryFilterDropdown
            value={countryFilter}
            onChange={(code) => {
              setCountryFilter(code);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Status Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 border-t border-stone-200/75">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border shrink-0 transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#568203] text-white border-[#568203]'
                : 'bg-white text-zinc-600 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Tous les statuts ({prospects.length})
          </button>
          {KANBAN_COLUMNS.map((st) => {
            const count = prospects.filter((p) => p.statut === st).length;
            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border shrink-0 transition-colors ${
                  statusFilter === st
                    ? 'bg-[#568203] text-white border-[#568203]'
                    : 'bg-white text-zinc-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= VUE DATA TABLE (DEFAULT) ================= */}
      {viewMode === 'list' && (
        <section className="glass-card p-4 sm:p-5">
          {filteredAndSortedProspects.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-zinc-500">
                Aucun prospect ou client trouvé.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Ajouter votre premier prospect</span>
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200/90 bg-stone-50/90 text-[11px] uppercase tracking-wider text-zinc-600">
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('nom_marque')}
                          className="inline-flex items-center gap-1 font-semibold hover:text-[#568203]"
                        >
                          <span>Marque</span>
                          <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('pays')}
                          className="inline-flex items-center gap-1 font-semibold hover:text-[#568203]"
                        >
                          <span>Pays</span>
                          <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </th>
                      <th className="py-3.5 px-4">Contact (Email / Tél)</th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('statut')}
                          className="inline-flex items-center gap-1 font-semibold hover:text-[#568203]"
                        >
                          <span>Statut</span>
                          <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('valeur')}
                          className="inline-flex items-center gap-1 font-semibold hover:text-[#568203]"
                        >
                          <span>Valeur (€ / FCFA)</span>
                          <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </th>
                      <th className="py-3.5 px-4">Liens & Drive</th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleSort('suivi')}
                          className="inline-flex items-center gap-1 font-semibold hover:text-[#568203]"
                        >
                          <span>Suivi</span>
                          <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/75 text-[13px]">
                    {paginatedProspects.map((prospect) => {
                      const inactiveDays = daysSince(
                        prospect.date_dernier_contact
                      );
                      const isStale =
                        inactiveDays > 3 &&
                        prospect.statut !== 'Signé' &&
                        prospect.statut !== 'Perdu';
                      const adsCount = prospect.liens_pubs?.length || 0;
                      const prodsCount = prospect.liens_produits?.length || 0;

                      return (
                        <tr
                          key={prospect.id}
                          onClick={() => setQuickPreviewId(prospect.id)}
                          className="hover:bg-[#FFF8B9]/25 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {renderBrandAvatar(prospect, 'sm')}
                              <div className="min-w-0">
                                <span className="font-semibold text-zinc-900 hover:text-[#568203] block truncate">
                                  {prospect.nom_marque}
                                </span>
                                {prospect.lien_boutique && (
                                  <span className="text-xs text-zinc-400 truncate block max-w-[180px]">
                                    {prospect.lien_boutique}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <CountryBadge code={prospect.pays} showName />
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 text-xs">
                              <div className="font-medium text-zinc-800">
                                {prospect.contact_nom || '—'}
                              </div>
                              {prospect.contact_email && (
                                <div className="text-zinc-500 truncate max-w-[180px]">
                                  {prospect.contact_email}
                                </div>
                              )}
                              {prospect.contact_telephone && (
                                <div className="text-zinc-500 font-mono text-[11px]">
                                  {prospect.contact_telephone}
                                </div>
                              )}
                            </div>
                          </td>

                          <td
                            className="py-3.5 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              aria-label={`Statut de ${prospect.nom_marque}`}
                              value={prospect.statut}
                              onChange={(e) =>
                                requestStatusChange(
                                  prospect.id,
                                  e.target.value as ProspectStatut
                                )
                              }
                              className={`rounded-lg border px-2.5 py-1 text-xs focus:outline-none cursor-pointer ${getStatusBadgeStyle(
                                prospect.statut
                              )}`}
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
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-zinc-900">
                              {formatEur(prospect.valeur_estimee_eur)}
                            </div>
                            <div className="text-[11px] font-mono text-zinc-500">
                              {formatFcfa(prospect.valeur_estimee_eur)}
                            </div>
                          </td>

                          <td
                            className="py-3.5 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              {adsCount > 0 && (
                                <span className="rounded-md bg-[#FFF8B9]/80 border border-[#568203]/25 px-2 py-0.5 text-[11px] font-medium text-zinc-800">
                                  {adsCount} pub{adsCount > 1 ? 's' : ''} FB
                                </span>
                              )}
                              {prodsCount > 0 && (
                                <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] text-zinc-700">
                                  {prodsCount} produit{prodsCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {prospect.drive_folder_id ? (
                                <a
                                  href={`https://drive.google.com/drive/folders/${prospect.drive_folder_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2 py-0.5 text-[11px] font-medium text-[#568203]"
                                >
                                  <FolderCheck
                                    className="h-3 w-3"
                                    strokeWidth={1.5}
                                  />
                                  <span>Drive</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  disabled={creatingDriveId === prospect.id}
                                  onClick={(e) =>
                                    handleManualDriveInit(e, prospect.id)
                                  }
                                  className="inline-flex items-center gap-1 rounded-md bg-white hover:bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] text-zinc-500"
                                >
                                  <FolderPlus
                                    className="h-3 w-3"
                                    strokeWidth={1.5}
                                  />
                                  <span>
                                    {creatingDriveId === prospect.id
                                      ? '...'
                                      : '+ Drive'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isStale ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#FFF8B9]/75 border border-[#568203]/30 px-2 py-0.5 text-[11px] font-medium text-zinc-900">
                                <AlertCircle
                                  className="h-3 w-3 text-[#568203]"
                                  strokeWidth={1.5}
                                />
                                {inactiveDays} j
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-500">
                                Il y a {inactiveDays} j
                              </span>
                            )}
                          </td>

                          <td
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQuickPreviewId(prospect.id)}
                                className="btn-secondary py-1.5 px-2.5 text-xs"
                                title="Aperçu rapide en modal"
                              >
                                <Eye
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                                <span>Aperçu</span>
                              </button>
                              <Link
                                href={`/crm/${prospect.id}`}
                                className="btn-primary py-1.5 px-2.5 text-xs"
                              >
                                <span>Fiche 360°</span>
                                <ArrowUpRight
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                              </Link>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteProspect(
                                    prospect.id,
                                    prospect.nom_marque
                                  )
                                }
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <DataTablePagination
                totalItems={filteredAndSortedProspects.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="prospects & clients"
              />
            </>
          )}
        </section>
      )}

      {/* ================= VUE KANBAN (OPTIONAL TOGGLE) ================= */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colItems = filteredAndSortedProspects.filter(
              (p) => p.statut === col
            );
            const colTotalEur = colItems.reduce(
              (sum, item) => sum + Number(item.valeur_estimee_eur || 0),
              0
            );
            const isDropTarget = dragOverCol === col;

            return (
              <div
                key={col}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverCol !== col) setDragOverCol(col);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  const id =
                    e.dataTransfer.getData('text/plain') || draggedId;
                  setDraggedId(null);
                  setDragOverCol(null);
                  if (id) await requestStatusChange(id, col);
                }}
                className={`w-72 shrink-0 rounded-2xl p-3.5 border transition-all min-h-[420px] flex flex-col ${
                  isDropTarget
                    ? 'bg-[#FFF8B9]/40 border-[#568203]'
                    : col === 'Signé'
                      ? 'glass-card-avocado'
                      : 'glass-card'
                }`}
              >
                <div className="pb-2.5 mb-3 border-b border-stone-200/75">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                      {col}
                    </span>
                    <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-mono text-zinc-700">
                      {colItems.length}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500 font-mono">
                    {formatEur(colTotalEur)} • {formatFcfa(colTotalEur)}
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  {colItems.map((prospect) => (
                    <div
                      key={prospect.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedId(prospect.id);
                        e.dataTransfer.setData('text/plain', prospect.id);
                      }}
                      onClick={() => setQuickPreviewId(prospect.id)}
                      className="rounded-xl bg-white hover:bg-stone-50 border border-stone-200 hover:border-[#568203]/45 p-3.5 shadow-sm cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical
                            className="h-4 w-4 text-zinc-400 shrink-0"
                            strokeWidth={1.5}
                          />
                          {renderBrandAvatar(prospect, 'sm')}
                          <span className="text-[13.5px] font-semibold text-zinc-900 truncate">
                            {prospect.nom_marque}
                          </span>
                        </div>
                        <CountryBadge code={prospect.pays} />
                      </div>

                      <div className="rounded-lg bg-stone-50 border border-stone-200/80 p-2.5">
                        <div className="text-[13.5px] font-semibold text-zinc-900">
                          {formatEur(prospect.valeur_estimee_eur)}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          {formatFcfa(prospect.valeur_estimee_eur)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL : APERÇU RAPIDE DU PROSPECT / CLIENT ================= */}
      {quickProspect && (
        <div
          style={{ zIndex: 2147483600 }}
          onClick={() => setQuickPreviewId(null)}
          className="fixed inset-0 flex items-center justify-center bg-zinc-900/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-modal w-full max-w-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-stone-200">
              <div className="flex items-center gap-3">
                {renderBrandAvatar(quickProspect, 'md')}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {quickProspect.nom_marque}
                    </h2>
                    <CountryBadge code={quickProspect.pays} showName />
                    <span
                      className={`rounded-md border px-2.5 py-0.5 text-xs ${getStatusBadgeStyle(
                        quickProspect.statut
                      )}`}
                    >
                      {quickProspect.statut}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Aperçu Rapide — Coordonnées, Pubs Facebook, Produits & Réseaux
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickPreviewId(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-stone-100"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Coordinates & Value Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Coordonnées Directes
                </div>
                <div className="space-y-1.5 text-xs text-zinc-700">
                  <div className="flex items-center gap-2">
                    <User
                      className="h-3.5 w-3.5 text-zinc-400"
                      strokeWidth={1.5}
                    />
                    <span className="font-medium">
                      {quickProspect.contact_nom || 'Contact non renseigné'}
                    </span>
                  </div>
                  {quickProspect.contact_email && (
                    <a
                      href={`mailto:${quickProspect.contact_email}`}
                      className="flex items-center gap-2 text-[#568203] hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{quickProspect.contact_email}</span>
                    </a>
                  )}
                  {quickProspect.contact_telephone && (
                    <a
                      href={`tel:${quickProspect.contact_telephone}`}
                      className="flex items-center gap-2 text-[#568203] hover:underline font-mono"
                    >
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{quickProspect.contact_telephone}</span>
                    </a>
                  )}
                  {quickProspect.lien_boutique && (
                    <a
                      href={quickProspect.lien_boutique}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[#568203] font-medium hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span className="truncate">
                        {quickProspect.lien_boutique}
                      </span>
                      <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 flex flex-col justify-between space-y-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Valeur Estimée & Statut
                  </div>
                  <CurrencyDisplay
                    amountEur={quickProspect.valeur_estimee_eur}
                    size="lg"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">
                    Changer le statut :
                  </label>
                  <select
                    value={quickProspect.statut}
                    onChange={(e) =>
                      requestStatusChange(
                        quickProspect.id,
                        e.target.value as ProspectStatut
                      )
                    }
                    className="glass-input py-1.5 text-xs"
                  >
                    {KANBAN_COLUMNS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Social Media Pills */}
            {quickProspect.liens_reseaux &&
              Object.values(quickProspect.liens_reseaux).some(Boolean) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                    <Share2
                      className="h-3.5 w-3.5 text-[#568203]"
                      strokeWidth={1.5}
                    />
                    <span>Réseaux Sociaux</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickProspect.liens_reseaux.instagram && (
                      <a
                        href={quickProspect.liens_reseaux.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary py-1.5 px-3 text-xs"
                      >
                        <span>Instagram</span>
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    )}
                    {quickProspect.liens_reseaux.tiktok && (
                      <a
                        href={quickProspect.liens_reseaux.tiktok}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary py-1.5 px-3 text-xs"
                      >
                        <span>TikTok</span>
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    )}
                    {quickProspect.liens_reseaux.facebook && (
                      <a
                        href={quickProspect.liens_reseaux.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary py-1.5 px-3 text-xs"
                      >
                        <span>Facebook</span>
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    )}
                    {quickProspect.liens_reseaux.linkedin && (
                      <a
                        href={quickProspect.liens_reseaux.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary py-1.5 px-3 text-xs"
                      >
                        <span>LinkedIn</span>
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Quick Facebook Ads Links & Product Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                    <Megaphone
                      className="h-3.5 w-3.5 text-[#568203]"
                      strokeWidth={1.5}
                    />
                    Pubs Facebook ({quickProspect.liens_pubs?.length || 0})
                  </span>
                </div>

                <form onSubmit={handleQuickAddAd} noValidate className="flex gap-1.5">
                  <input
                    type="url"
                    value={quickNewAdUrl}
                    onChange={(e) => setQuickNewAdUrl(e.target.value)}
                    placeholder="Ajouter un lien pub..."
                    className="glass-input py-1.5 text-xs flex-1"
                  />
                  <button type="submit" className="btn-primary py-1.5 px-2.5">
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </form>

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(quickProspect.liens_pubs || []).map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-lg bg-white border border-stone-200 px-2.5 py-1.5 text-xs text-[#568203] hover:underline"
                    >
                      <span className="truncate">{url}</span>
                      <ExternalLink
                        className="h-3 w-3 shrink-0"
                        strokeWidth={1.5}
                      />
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                    <ShoppingBag
                      className="h-3.5 w-3.5 text-[#568203]"
                      strokeWidth={1.5}
                    />
                    Produits ciblés ({quickProspect.liens_produits?.length || 0})
                  </span>
                </div>

                <form onSubmit={handleQuickAddProd} noValidate className="flex gap-1.5">
                  <input
                    type="url"
                    value={quickNewProdUrl}
                    onChange={(e) => setQuickNewProdUrl(e.target.value)}
                    placeholder="Ajouter un lien produit..."
                    className="glass-input py-1.5 text-xs flex-1"
                  />
                  <button type="submit" className="btn-primary py-1.5 px-2.5">
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </form>

                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(quickProspect.liens_produits || []).map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-lg bg-white border border-stone-200 px-2.5 py-1.5 text-xs text-zinc-800 hover:text-[#568203] hover:underline"
                    >
                      <span className="truncate">{url}</span>
                      <ExternalLink
                        className="h-3 w-3 shrink-0"
                        strokeWidth={1.5}
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {quickProspect.notes_strategiques && (
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Notes Stratégiques
                </div>
                <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {quickProspect.notes_strategiques}
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() =>
                  handleDeleteProspect(
                    quickProspect.id,
                    quickProspect.nom_marque
                  )
                }
                className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Supprimer</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickPreviewId(null)}
                  className="btn-secondary"
                >
                  Fermer
                </button>
                <Link
                  href={`/crm/${quickProspect.id}`}
                  className="btn-primary"
                >
                  <span>Ouvrir la Fiche 360° complète</span>
                  <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL : CRÉATION RAPIDE D'UN PROSPECT (AVEC TOUS LES PAYS & DRAPEAUX) ================= */}
      {isAddModalOpen && (
        <div
          style={{ zIndex: 2147483600 }}
          className="fixed inset-0 flex items-center justify-center bg-zinc-900/50 p-4"
        >
          <div className="glass-modal w-full max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-stone-200/80">
              <div className="flex items-center gap-2.5">
                <Building2
                  className="h-5 w-5 text-[#568203]"
                  strokeWidth={1.5}
                />
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    Création Rapide d’un Prospect / Client
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Logo optionnel, choix de tous les pays avec drapeau et liens
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-stone-100"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateProspect} noValidate className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 pb-2">
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoFileChange(e.target.files)}
                  />
                  {logoUrl ? (
                    <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-stone-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt="Logo client"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="absolute top-0.5 right-0.5 rounded-full bg-zinc-900/70 p-0.5 text-white"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="h-14 w-14 rounded-xl border border-dashed border-stone-300 bg-stone-50 hover:border-[#568203] flex flex-col items-center justify-center text-[10px] text-zinc-500 gap-0.5"
                    >
                      <ImageIcon
                        className="h-4 w-4 text-zinc-400"
                        strokeWidth={1.5}
                      />
                      <span>Logo</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 flex-1 w-full">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                      Nom de la marque *
                    </label>
                    <input
                      type="text"
                      value={nomMarque}
                      onChange={(e) => {
                        setNomMarque(e.target.value);
                        if (prospectFormErrors.nomMarque) {
                          setProspectFormErrors((prev) => ({
                            ...prev,
                            nomMarque: undefined,
                          }));
                        }
                      }}
                      placeholder="Ex: Maison Lumière Paris"
                      className={`glass-input ${
                        prospectFormErrors.nomMarque
                          ? 'border-red-400 bg-red-50/40'
                          : ''
                      }`}
                    />
                    {prospectFormErrors.nomMarque && (
                      <p className="mt-1 text-[11px] font-medium text-red-600">
                        {prospectFormErrors.nomMarque}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                      Pays (Tous pays)
                    </label>
                    <CountrySelect value={pays} onChange={setPays} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Nom du contact
                  </label>
                  <input
                    type="text"
                    value={contactNom}
                    onChange={(e) => setContactNom(e.target.value)}
                    placeholder="Camille Rochefort"
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    inputMode="email"
                    value={contactEmail}
                    onChange={(e) => {
                      setContactEmail(e.target.value);
                      if (prospectFormErrors.contactEmail) {
                        setProspectFormErrors((prev) => ({
                          ...prev,
                          contactEmail: undefined,
                        }));
                      }
                    }}
                    placeholder="contact@marque.eu"
                    className={`glass-input ${
                      prospectFormErrors.contactEmail
                        ? 'border-red-400 bg-red-50/40'
                        : ''
                    }`}
                  />
                  {prospectFormErrors.contactEmail && (
                    <p className="mt-1 text-[11px] font-medium text-red-600">
                      {prospectFormErrors.contactEmail}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Téléphone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={contactTelephone}
                    onChange={(e) => setContactTelephone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
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
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
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
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                  Lien boutique e-commerce
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={lienBoutique}
                  onChange={(e) => {
                    setLienBoutique(e.target.value);
                    if (prospectFormErrors.lienBoutique) {
                      setProspectFormErrors((prev) => ({
                        ...prev,
                        lienBoutique: undefined,
                      }));
                    }
                  }}
                  placeholder="https://marque.eu"
                  className={`glass-input ${
                    prospectFormErrors.lienBoutique
                      ? 'border-red-400 bg-red-50/40'
                      : ''
                  }`}
                />
                {prospectFormErrors.lienBoutique && (
                  <p className="mt-1 text-[11px] font-medium text-red-600">
                    {prospectFormErrors.lienBoutique}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFields((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-zinc-800"
                >
                  <span>
                    + Ajouter des liens Pubs Facebook, Produits & Réseaux Sociaux (Optionnel)
                  </span>
                  {showAdvancedFields ? (
                    <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>

                {showAdvancedFields && (
                  <div className="mt-3.5 pt-3.5 border-t border-stone-200/80 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                        Lien Pub Facebook / Meta Ad Library
                      </label>
                      <input
                        type="url"
                        value={lienPubInitial}
                        onChange={(e) => setLienPubInitial(e.target.value)}
                        placeholder="https://www.facebook.com/ads/library/?id=..."
                        className="glass-input"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                        Lien du Produit concerné (Optionnel)
                      </label>
                      <input
                        type="url"
                        value={lienProduitInitial}
                        onChange={(e) => setLienProduitInitial(e.target.value)}
                        placeholder="https://marque.eu/products/serum-eclat"
                        className="glass-input"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                          Instagram
                        </label>
                        <input
                          type="url"
                          value={instagramUrl}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                          placeholder="https://instagram.com/..."
                          className="glass-input"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                          TikTok
                        </label>
                        <input
                          type="url"
                          value={tiktokUrl}
                          onChange={(e) => setTiktokUrl(e.target.value)}
                          placeholder="https://tiktok.com/@..."
                          className="glass-input"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-600 mb-1">
                          Page Facebook
                        </label>
                        <input
                          type="url"
                          value={facebookUrl}
                          onChange={(e) => setFacebookUrl(e.target.value)}
                          placeholder="https://facebook.com/..."
                          className="glass-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                  Notes stratégiques & Direction créative
                </label>
                <textarea
                  rows={2}
                  value={notesStrategiques}
                  onChange={(e) => setNotesStrategiques(e.target.value)}
                  placeholder="Esthétique de marque, angles publicitaires, tonalité..."
                  className="glass-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Créer le prospect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
