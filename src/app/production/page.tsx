'use client';

import React, { useState, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  UploadCloud,
  CheckSquare,
  Square,
  Send,
  Folder,
  ExternalLink,
  Plus,
  Trash2,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import type {
  StatutProduction,
  StatutPaiement,
  MediaCreation,
} from '@/types/database';
import {
  formatEur,
  formatFcfa,
  getVideoPreviewUrl,
  getImagePreviewUrl,
} from '@/lib/currency';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Skeleton } from '@/components/ui/Skeleton';

const PRODUCTION_STATUSES: StatutProduction[] = [
  'Brief reçu',
  'Script validé',
  'Génération IA',
  'Montage',
  'Livré',
];

function ProductionWorkshopContent() {
  const searchParams = useSearchParams();
  const initialOrderParam = searchParams.get('commande');

  const {
    isLoading,
    prospects,
    commandes,
    medias,
    addCommande,
    updateCommandeStatutProduction,
    updateCommandeStatutPaiement,
    updateCommande,
    deleteCommande,
    addMediaRecord,
    toggleMediaReady,
    deleteMedia,
  } = useStudioData();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [statusFilter, setStatusFilter] = useState<StatutProduction | 'ALL'>(
    'ALL'
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    initialOrderParam
  );
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [prospectId, setProspectId] = useState(prospects[0]?.id || '');
  const [nomPack, setNomPack] = useState('');
  const [briefProduit, setBriefProduit] = useState('');
  const [montantEur, setMontantEur] = useState('1450');
  const [nombreCreations, setNombreCreations] = useState('6');
  const [dateLimite, setDateLimite] = useState('');

  const filteredOrders = useMemo(() => {
    return commandes.filter(
      (c) => statusFilter === 'ALL' || c.statut_production === statusFilter
    );
  }, [commandes, statusFilter]);

  const activeOrder = useMemo(() => {
    if (selectedOrderId) {
      const found = commandes.find((c) => c.id === selectedOrderId);
      if (found) return found;
    }
    return filteredOrders[0] || commandes[0] || null;
  }, [selectedOrderId, commandes, filteredOrders]);

  const activeClient = useMemo(() => {
    if (!activeOrder) return null;
    return prospects.find((p) => p.id === activeOrder.prospect_id) || null;
  }, [activeOrder, prospects]);

  const orderMedias = useMemo(() => {
    if (!activeOrder) return [];
    return medias.filter((m) => m.commande_id === activeOrder.id);
  }, [medias, activeOrder]);

  const readyMediasCount = useMemo(
    () => orderMedias.filter((m) => m.pret_pour_livraison).length,
    [orderMedias]
  );

  const handleChangeProdStatus = async (
    orderId: string,
    packName: string,
    newStatus: StatutProduction
  ) => {
    const ok = await confirm({
      title: 'Modifier le statut de production ?',
      description: `Voulez-vous passer la commande "${packName}" au statut "${newStatus}" ?`,
      confirmLabel: 'Confirmer le statut',
      variant: 'modify',
    });
    if (!ok) return;
    await updateCommandeStatutProduction(orderId, newStatus);
    toast({
      title: `Statut production : ${newStatus}`,
    });
  };

  const handleChangePaymentStatus = async (
    orderId: string,
    packName: string,
    newStatus: StatutPaiement
  ) => {
    const ok = await confirm({
      title: 'Modifier le statut de paiement ?',
      description: `Confirmez-vous le passage du paiement de "${packName}" à "${newStatus}" ?`,
      confirmLabel: 'Confirmer le paiement',
      variant: 'modify',
    });
    if (!ok) return;
    await updateCommandeStatutPaiement(orderId, newStatus);
    toast({
      title: `Statut paiement : ${newStatus}`,
    });
  };

  const handleDeleteOrder = async (orderId: string, packName: string) => {
    const ok = await confirm({
      title: 'Supprimer cette commande UGC ?',
      description: `Êtes-vous sûr de vouloir supprimer définitivement la commande "${packName}" et ses médias associés ?`,
      confirmLabel: 'Supprimer la commande',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteCommande(orderId);
    toast({
      title: 'Commande supprimée',
    });
  };

  const handleDeleteMediaWithConfirm = async (
    mediaId: string,
    fileName: string
  ) => {
    const ok = await confirm({
      title: 'Supprimer ce média ?',
      description: `Voulez-vous retirer "${fileName}" de cette commande ?`,
      confirmLabel: 'Supprimer le média',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteMedia(mediaId);
    toast({
      title: 'Média supprimé',
    });
  };

  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeOrder) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const allowed = ['mp4', 'mov', 'png', 'jpg', 'jpeg', 'webm'];
        if (!allowed.includes(ext)) {
          toast({
            title: 'Format non supporté',
            description: `Le fichier ${file.name} doit être au format MP4, MOV, PNG ou JPG.`,
            type: 'error',
          });
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('commandeId', activeOrder.id);
        formData.append('nomPack', activeOrder.nom_pack);
        formData.append('nomMarque', activeClient?.nom_marque || 'Client');
        if (activeOrder.drive_subfolder_id) {
          formData.append('driveSubfolderId', activeOrder.drive_subfolder_id);
        }
        if (activeClient?.drive_folder_id) {
          formData.append('driveParentFolderId', activeClient.drive_folder_id);
        }

        const response = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Échec upload Drive');
        }

        if (
          result.driveSubfolderId &&
          result.driveSubfolderId !== activeOrder.drive_subfolder_id
        ) {
          await updateCommande(activeOrder.id, {
            drive_subfolder_id: result.driveSubfolderId,
          });
        }

        const uploadedMedia: MediaCreation = result.media;
        addMediaRecord(uploadedMedia);

        toast({
          title: 'Média envoyé sur Google Drive',
          description: `${file.name} est enregistré dans le sous-dossier de la commande.`,
          type: 'success',
        });
      }
    } catch (err) {
      toast({
        title: "Erreur lors de l'upload",
        description:
          err instanceof Error
            ? err.message
            : 'Impossible de téléverser le fichier.',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
      setIsDraggingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeliverOrder = async () => {
    if (!activeOrder) return;

    const ok = await confirm({
      title: `Livrer la commande "${activeOrder.nom_pack}" ?`,
      description: `Cette action va passer le sous-dossier Google Drive en lecture publique, envoyer l'email de livraison Brevo à ${
        activeClient?.contact_email || 'votre client'
      } et marquer la commande comme "Livré".`,
      confirmLabel: 'Confirmer et livrer au client',
      variant: 'modify',
    });
    if (!ok) return;

    setIsDelivering(true);
    try {
      const response = await fetch('/api/orders/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandeId: activeOrder.id,
          driveSubfolderId: activeOrder.drive_subfolder_id,
          driveParentFolderId: activeClient?.drive_folder_id,
          contactEmail: activeClient?.contact_email,
          contactName: activeClient?.contact_nom,
          brandName: activeClient?.nom_marque || 'Client Studio H',
          packName: activeOrder.nom_pack,
          creationsCount:
            readyMediasCount > 0
              ? readyMediasCount
              : activeOrder.nombre_creations,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la livraison');
      }

      await updateCommande(activeOrder.id, {
        statut_production: 'Livré',
        drive_subfolder_id: data.driveSubfolderId,
        lien_livraison_public: data.lienLivraisonPublic,
      });

      toast({
        title: 'Commande livrée avec succès',
        description: activeClient?.contact_email
          ? `Permissions Drive ouvertes et email Brevo envoyé à ${activeClient.contact_email}.`
          : 'Permissions Drive passées en lecture seule et lien généré.',
        type: 'success',
      });
    } catch (err) {
      toast({
        title: 'Erreur de livraison',
        description:
          err instanceof Error
            ? err.message
            : 'Impossible de finaliser la livraison.',
        type: 'error',
      });
    } finally {
      setIsDelivering(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPack.trim() || !prospectId) return;

    const created = await addCommande({
      prospect_id: prospectId,
      nom_pack: nomPack.trim(),
      brief_produit: briefProduit.trim() || null,
      statut_production: 'Brief reçu',
      montant_eur: Number(montantEur) || 0,
      statut_paiement: 'En attente',
      nombre_creations: Number(nombreCreations) || 1,
      drive_subfolder_id: null,
      lien_livraison_public: null,
      date_limite: dateLimite || null,
    });

    setSelectedOrderId(created.id);
    setNomPack('');
    setBriefProduit('');
    setIsNewOrderOpen(false);

    toast({
      title: 'Nouvelle commande ouverte dans l’atelier',
      description: `Le pack "${created.nom_pack}" est prêt pour la production.`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Skeleton className="lg:col-span-4 h-[520px]" />
          <Skeleton className="lg:col-span-8 h-[520px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Vue 04 — Studio Créatif & Livraison Automatisée
          </span>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Atelier de Production & Lecteur Média Intégré
          </h1>
        </div>

        <button
          onClick={() => {
            if (!prospectId && prospects[0]) setProspectId(prospects[0].id);
            setIsNewOrderOpen(true);
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span>Nouvelle Commande UGC</span>
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="glass-card p-3 flex items-center gap-2 overflow-x-auto">
        <SlidersHorizontal
          className="h-4 w-4 text-zinc-500 ml-2 mr-1 shrink-0"
          strokeWidth={1.5}
        />
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all shrink-0 border ${
            statusFilter === 'ALL'
              ? 'bg-[#568203] text-white border-[#568203]'
              : 'bg-transparent text-zinc-600 border-transparent hover:bg-stone-100'
          }`}
        >
          Toutes ({commandes.length})
        </button>
        {PRODUCTION_STATUSES.map((st) => {
          const count = commandes.filter(
            (c) => c.statut_production === st
          ).length;
          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all shrink-0 border ${
                statusFilter === st
                  ? 'bg-[#568203] text-white border-[#568203]'
                  : 'bg-transparent text-zinc-600 border-transparent hover:bg-stone-100'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Orders List */}
        <div className="lg:col-span-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="glass-card p-6 text-center text-xs text-zinc-500">
              Aucune commande dans ce statut de production.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const client = prospects.find((p) => p.id === ord.prospect_id);
              const isSelected = activeOrder?.id === ord.id;
              const ordMediasCount = medias.filter(
                (m) => m.commande_id === ord.id
              ).length;

              return (
                <button
                  key={ord.id}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`w-full text-left rounded-2xl p-4 border transition-all space-y-2.5 ${
                    isSelected
                      ? 'bg-[#FFF8B9]/40 border-[#568203] shadow-sm'
                      : 'bg-white hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                        {client?.nom_marque || 'Client Studio H'}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900 leading-snug mt-0.5">
                        {ord.nom_pack}
                      </h3>
                    </div>

                    <span className="shrink-0 rounded-lg bg-[#568203] px-2.5 py-0.5 text-[11px] font-medium text-white">
                      {ord.statut_production}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-600 pt-2 border-t border-stone-200/70">
                    <div>
                      <span className="font-semibold text-zinc-900">
                        {formatEur(ord.montant_eur)}
                      </span>{' '}
                      <span className="font-mono text-[11px] text-zinc-500">
                        ({formatFcfa(ord.montant_eur)})
                      </span>
                    </div>
                    <span className="font-mono text-[11px]">
                      {ordMediasCount}/{ord.nombre_creations} médias
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Active Order Detail */}
        <div className="lg:col-span-8 space-y-5">
          {!activeOrder ? (
            <div className="glass-card p-10 text-center text-sm text-zinc-500">
              Sélectionnez une commande à gauche ou créez-en une nouvelle pour ouvrir l’atelier.
            </div>
          ) : (
            <div className="glass-card p-5 sm:p-6 space-y-5">
              {/* Order Header & Controls */}
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-5 border-b border-stone-200/85">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeClient && (
                      <Link
                        href={`/crm/${activeClient.id}?tab=infos`}
                        className="rounded-lg bg-stone-100 hover:bg-[#FFF8B9]/70 border border-stone-200 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors"
                      >
                        Client : {activeClient.nom_marque}
                      </Link>
                    )}
                    {activeOrder.date_limite && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-stone-50 border border-stone-200 px-2.5 py-1 text-xs font-mono text-zinc-700">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Deadline : {activeOrder.date_limite}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
                    {activeOrder.nom_pack}
                  </h2>

                  {activeOrder.brief_produit && (
                    <p className="text-[13px] text-zinc-600 leading-relaxed max-w-2xl">
                      {activeOrder.brief_produit}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-end gap-2.5 shrink-0">
                  <CurrencyDisplay
                    amountEur={activeOrder.montant_eur}
                    size="lg"
                    className="sm:text-right"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={activeOrder.statut_production}
                      onChange={(e) =>
                        handleChangeProdStatus(
                          activeOrder.id,
                          activeOrder.nom_pack,
                          e.target.value as StatutProduction
                        )
                      }
                      className="glass-input py-1.5 px-2.5 text-xs w-auto"
                    >
                      {PRODUCTION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <select
                      value={activeOrder.statut_paiement}
                      onChange={(e) =>
                        handleChangePaymentStatus(
                          activeOrder.id,
                          activeOrder.nom_pack,
                          e.target.value as StatutPaiement
                        )
                      }
                      className="glass-input py-1.5 px-2.5 text-xs w-auto"
                    >
                      <option value="En attente">En attente</option>
                      <option value="Payé">Payé</option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteOrder(activeOrder.id, activeOrder.nom_pack)
                      }
                      className="rounded-xl border border-stone-200 p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer la commande"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Drive Subfolder & Delivery Action Bar */}
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
                    <Folder
                      className="h-4 w-4 text-[#568203]"
                      strokeWidth={1.5}
                    />
                    <span>
                      Sous-dossier Drive :{' '}
                      <span className="font-mono text-zinc-600">
                        {activeOrder.drive_subfolder_id ||
                          'Création auto au premier upload'}
                      </span>
                    </span>
                  </div>
                  {activeOrder.lien_livraison_public && (
                    <div className="flex items-center gap-2 text-xs text-zinc-700">
                      <CheckCircle2
                        className="h-3.5 w-3.5 text-[#568203]"
                        strokeWidth={1.5}
                      />
                      <span>Lien client actif :</span>
                      <a
                        href={activeOrder.lien_livraison_public}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-mono inline-flex items-center gap-1 text-[#568203]"
                      >
                        Ouvrir le dossier livré
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isDelivering}
                  onClick={handleDeliverOrder}
                  className="btn-primary shrink-0"
                >
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                  <span>
                    {isDelivering
                      ? 'Ouverture Drive & Envoi Brevo...'
                      : 'Livrer la commande au client'}
                  </span>
                </button>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFilesUpload(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                  isDraggingFile
                    ? 'border-[#568203] bg-[#FFF8B9]/40'
                    : 'border-stone-300 bg-stone-50/70 hover:border-[#568203] hover:bg-[#FFF8B9]/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".mp4,.mov,.png,.jpg,.jpeg,video/mp4,video/quicktime,image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => handleFilesUpload(e.target.files)}
                />
                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25">
                  <UploadCloud
                    className="h-5 w-5 text-[#568203]"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-[13.5px] font-medium text-zinc-900">
                  {isUploading
                    ? 'Transfert en cours vers Google Drive...'
                    : 'Glissez-déposez vos créations MP4, MOV, PNG ou JPG ici'}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Upload direct vers le sous-dossier Google Drive de la commande
                </p>
              </div>

              {/* Integrated Private Media Preview Grid & Quality Control */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-semibold text-zinc-900">
                      Prévisualisation Privée Intégrée & Contrôle Qualité
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Visionnez vos vidéos et visuels haute définition sans quitter Studio H
                    </p>
                  </div>
                  <span className="rounded-lg bg-stone-100 border border-stone-200 px-3 py-1 text-xs font-mono text-zinc-800">
                    {readyMediasCount} / {orderMedias.length} prêt
                    {readyMediasCount > 1 ? 's' : ''}
                  </span>
                </div>

                {orderMedias.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-zinc-500">
                    Aucun média rattaché à cette commande pour l’instant.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orderMedias.map((med) => (
                      <div
                        key={med.id}
                        className={`rounded-xl border overflow-hidden flex flex-col justify-between transition-all ${
                          med.pret_pour_livraison
                            ? 'bg-white border-[#568203]'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <div className="aspect-video w-full bg-stone-100 relative border-b border-stone-200/85">
                          {med.type_media === 'video' ? (
                            <iframe
                              src={getVideoPreviewUrl(med.drive_file_id)}
                              title={med.nom_fichier}
                              className="w-full h-full border-0"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={getImagePreviewUrl(med.drive_file_id)}
                              alt={med.nom_fichier}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        <div className="p-3.5 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {med.type_media === 'video' ? (
                                <Film
                                  className="h-4 w-4 text-zinc-700 shrink-0"
                                  strokeWidth={1.5}
                                />
                              ) : (
                                <ImageIcon
                                  className="h-4 w-4 text-zinc-700 shrink-0"
                                  strokeWidth={1.5}
                                />
                              )}
                              <span className="text-xs font-medium text-zinc-900 truncate">
                                {med.nom_fichier}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteMediaWithConfirm(
                                  med.id,
                                  med.nom_fichier
                                )
                              }
                              className="rounded-lg p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                              aria-label="Supprimer le média"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleMediaReady(
                                med.id,
                                !med.pret_pour_livraison
                              )
                            }
                            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium border transition-all ${
                              med.pret_pour_livraison
                                ? 'bg-[#568203] text-white border-[#568203]'
                                : 'bg-stone-50 text-zinc-700 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {med.pret_pour_livraison ? (
                                <CheckSquare
                                  className="h-4 w-4"
                                  strokeWidth={1.5}
                                />
                              ) : (
                                <Square
                                  className="h-4 w-4 text-zinc-500"
                                  strokeWidth={1.5}
                                />
                              )}
                              <span>Prêt pour livraison</span>
                            </span>
                            <span className="text-[10px] uppercase tracking-wider">
                              {med.pret_pour_livraison ? 'Validé' : 'À vérifier'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Order */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-lg p-5 sm:p-6 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-stone-200/85">
              <div className="flex items-center gap-2.5">
                <Video
                  className="h-5 w-5 text-[#568203]"
                  strokeWidth={1.5}
                />
                <h2 className="text-base font-semibold text-zinc-900">
                  Nouvelle Commande UGC
                </h2>
              </div>
              <button
                onClick={() => setIsNewOrderOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-800"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                  Client rattaché *
                </label>
                <select
                  required
                  value={prospectId}
                  onChange={(e) => setProspectId(e.target.value)}
                  className="glass-input"
                >
                  <option value="">Sélectionner un client...</option>
                  {prospects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom_marque} ({p.pays})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                  Intitulé du Pack *
                </label>
                <input
                  type="text"
                  required
                  value={nomPack}
                  onChange={(e) => setNomPack(e.target.value)}
                  placeholder="Ex: Pack 6 Créations UGC IA + 3 Hooks"
                  className="glass-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Montant (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={montantEur}
                    onChange={(e) => setMontantEur(e.target.value)}
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Nb Créations
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={nombreCreations}
                    onChange={(e) => setNombreCreations(e.target.value)}
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Date Limite
                  </label>
                  <input
                    type="date"
                    value={dateLimite}
                    onChange={(e) => setDateLimite(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                  Brief Produit
                </label>
                <textarea
                  rows={3}
                  value={briefProduit}
                  onChange={(e) => setBriefProduit(e.target.value)}
                  placeholder="Instructions de production, script, avatar, format..."
                  className="glass-input"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-stone-200/85">
                <button
                  type="button"
                  onClick={() => setIsNewOrderOpen(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
      <ProductionWorkshopContent />
    </Suspense>
  );
}
