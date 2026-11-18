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
  Link2,
  Pencil,
  Sparkles,
  Copy,
  Check,
  Scissors,
  FileText,
  Layers,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import type {
  StatutProduction,
  StatutPaiement,
  MediaCreation,
  ModeDecoupagePrompt,
  CommandePromptScene,
} from '@/types/database';
import {
  formatEur,
  formatFcfa,
  getVideoPreviewUrl,
  getImagePreviewUrl,
} from '@/lib/currency';
import { fileToResizedDataUrl } from '@/lib/image-resize';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Skeleton } from '@/components/ui/Skeleton';

const PRODUCTION_STATUSES: StatutProduction[] = [
  'Brief reçu',
  'Script validé',
  'Génération IA',
  'Montage',
  'Livré',
];

const MODES_DECOUPAGE: ModeDecoupagePrompt[] = [
  'Photo → Vidéo (Découpé / Séquence)',
  'Photo → Vidéo (Continu / Non découpé)',
  'Prompt Photo / Image Clé',
  'Prompt Vidéo / Animation',
  'Script Voix / Lip-Sync',
];

function ProductionWorkshopContent() {
  const searchParams = useSearchParams();
  const initialOrderParam = searchParams.get('commande');

  const {
    isLoading,
    prospects,
    commandes,
    medias,
    prompts,
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
  const [orderTab, setOrderTab] = useState<'brief' | 'prompts' | 'livrables'>(
    'brief'
  );

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);

  const [expandedBriefs, setExpandedBriefs] = useState<Record<string, boolean>>(
    {}
  );

  // Reference links & photos on active order
  const [newRefLink, setNewRefLink] = useState('');
  const [previewRefPhoto, setPreviewRefPhoto] = useState<string | null>(null);

  // Multi-Prompts & Scene Breakdown State (Tab 2)
  const [titreScene, setTitreScene] = useState('');
  const [modeDecoupage, setModeDecoupage] = useState<ModeDecoupagePrompt>(
    'Photo → Vidéo (Découpé / Séquence)'
  );
  const [promptPhoto, setPromptPhoto] = useState('');
  const [promptVideo, setPromptVideo] = useState('');
  const [scenePhotoUrl, setScenePhotoUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit Order Brief/Title Modal
  const [isEditBriefOpen, setIsEditBriefOpen] = useState(false);
  const [editPackTitle, setEditPackTitle] = useState('');
  const [editPackBrief, setEditPackBrief] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const refPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const newOrderPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const scenePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // New Order Modal Form
  const [prospectId, setProspectId] = useState(prospects[0]?.id || '');
  const [nomPack, setNomPack] = useState('');
  const [briefProduit, setBriefProduit] = useState('');
  const [montantEur, setMontantEur] = useState('1450');
  const [nombreCreations, setNombreCreations] = useState('6');
  const [dateLimite, setDateLimite] = useState('');
  const [newOrderLinkInput, setNewOrderLinkInput] = useState('');
  const [newOrderLinks, setNewOrderLinks] = useState<string[]>([]);
  const [newOrderPhotos, setNewOrderPhotos] = useState<string[]>([]);

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

  // Copy text helper
  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({
        title: 'Prompt copié dans le presse-papiers',
      });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  // --- Multi-Prompts & Scenes Handlers ---
  const handleScenePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const dataUrl = await fileToResizedDataUrl(files[0], 700, 0.82);
      setScenePhotoUrl(dataUrl);
      toast({ title: 'Photo associée au prompt chargée' });
    } catch {
      toast({ title: 'Image invalide', type: 'error' });
    }
  };

  const handleAddScenePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !titreScene.trim()) return;
    if (!promptPhoto.trim() && !promptVideo.trim()) {
      toast({
        title: 'Saisissez au moins un prompt (Photo ou Vidéo)',
        type: 'error',
      });
      return;
    }

    const newScene: CommandePromptScene = {
      id: crypto.randomUUID(),
      titre_scene: titreScene.trim(),
      mode_decoupage: modeDecoupage,
      prompt_photo: promptPhoto.trim() || undefined,
      prompt_video: promptVideo.trim() || undefined,
      photo_url: scenePhotoUrl || undefined,
    };

    const currentScenes = activeOrder.prompts_scenes || [];
    await updateCommande(activeOrder.id, {
      prompts_scenes: [...currentScenes, newScene],
    });

    setTitreScene('');
    setPromptPhoto('');
    setPromptVideo('');
    setScenePhotoUrl('');

    toast({
      title: 'Scène & Prompt(s) ajoutés à la commande',
      description: `${newScene.titre_scene} (${newScene.mode_decoupage})`,
    });
  };

  const handleImportLibraryPrompt = (libPromptId: string) => {
    const found = prompts.find((p) => p.id === libPromptId);
    if (!found) return;
    setTitreScene(found.titre);
    if (
      found.categorie === 'Prompt Visuel' ||
      found.categorie === 'Avatar IA'
    ) {
      setPromptPhoto(found.contenu_texte);
    } else {
      setPromptVideo(found.contenu_texte);
    }
    toast({
      title: 'Prompt importé depuis votre bibliothèque',
      description: 'Vous pouvez maintenant l’adapter pour cette commande.',
    });
  };

  const handleRemoveScenePrompt = async (
    sceneId: string,
    sceneTitle: string
  ) => {
    if (!activeOrder) return;
    const ok = await confirm({
      title: `Supprimer la scène "${sceneTitle}" ?`,
      description:
        'Voulez-vous retirer ce prompt et son découpage de la commande ?',
      confirmLabel: 'Supprimer la scène',
      variant: 'danger',
    });
    if (!ok) return;

    const currentScenes = activeOrder.prompts_scenes || [];
    await updateCommande(activeOrder.id, {
      prompts_scenes: currentScenes.filter((s) => s.id !== sceneId),
    });
    toast({ title: 'Scène supprimée' });
  };

  // Reference links & photos on active order
  const handleAddOrderRefLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !newRefLink.trim()) return;
    const current = activeOrder.liens_reference || [];
    await updateCommande(activeOrder.id, {
      liens_reference: [...current, newRefLink.trim()],
    });
    setNewRefLink('');
    toast({
      title: 'Lien ajouté à la commande UGC',
    });
  };

  const handleRemoveOrderRefLink = async (idx: number, url: string) => {
    if (!activeOrder) return;
    const ok = await confirm({
      title: 'Supprimer ce lien de référence ?',
      description: `Voulez-vous retirer le lien "${url}" de cette commande UGC ?`,
      confirmLabel: 'Supprimer le lien',
      variant: 'danger',
    });
    if (!ok) return;
    const current = activeOrder.liens_reference || [];
    await updateCommande(activeOrder.id, {
      liens_reference: current.filter((_, i) => i !== idx),
    });
    toast({
      title: 'Lien retiré',
    });
  };

  const handleAddOrderRefPhotos = async (
    files: FileList | null,
    isModal = false
  ) => {
    if (!files || files.length === 0) return;
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await fileToResizedDataUrl(file, 850, 0.8);
        added.push(dataUrl);
      }
      if (isModal) {
        setNewOrderPhotos((prev) => [...prev, ...added]);
      } else if (activeOrder) {
        const current = activeOrder.photos_reference || [];
        await updateCommande(activeOrder.id, {
          photos_reference: [...current, ...added],
        });
      }
      toast({
        title: 'Photo(s) de référence ajoutée(s)',
      });
    } catch {
      toast({
        title: 'Impossible de charger la photo',
        type: 'error',
      });
    }
  };

  const handleRemoveOrderRefPhoto = async (idx: number) => {
    if (!activeOrder) return;
    const ok = await confirm({
      title: 'Supprimer cette photo de référence ?',
      description:
        'Voulez-vous retirer cette image de référence de la commande UGC ?',
      confirmLabel: 'Supprimer la photo',
      variant: 'danger',
    });
    if (!ok) return;
    const current = activeOrder.photos_reference || [];
    await updateCommande(activeOrder.id, {
      photos_reference: current.filter((_, i) => i !== idx),
    });
  };

  const openEditBriefModal = () => {
    if (!activeOrder) return;
    setEditPackTitle(activeOrder.nom_pack);
    setEditPackBrief(activeOrder.brief_produit || '');
    setIsEditBriefOpen(true);
  };

  const handleSaveEditedBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !editPackTitle.trim()) return;
    const ok = await confirm({
      title: 'Modifier le titre et la description de la commande ?',
      description: `Confirmez-vous la mise à jour du pack "${editPackTitle}" ?`,
      confirmLabel: 'Enregistrer',
      variant: 'modify',
    });
    if (!ok) return;
    await updateCommande(activeOrder.id, {
      nom_pack: editPackTitle.trim(),
      brief_produit: editPackBrief.trim() || null,
    });
    setIsEditBriefOpen(false);
    toast({
      title: 'Titre et description mis à jour',
    });
  };

  const handleChangeProdStatus = async (
    orderId: string,
    packName: string,
    newStatus: StatutProduction
  ) => {
    if (activeOrder?.statut_production === newStatus) return;
    const ok = await confirm({
      title: 'Avancer l’étape de production ?',
      description: `Voulez-vous passer la commande "${packName}" à l'étape "${newStatus}" ?`,
      confirmLabel: `Passer à "${newStatus}"`,
      variant: 'modify',
    });
    if (!ok) return;
    await updateCommandeStatutProduction(orderId, newStatus);
    toast({
      title: `Étape de production : ${newStatus}`,
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

    const finalLinks = newOrderLinkInput.trim()
      ? [...newOrderLinks, newOrderLinkInput.trim()]
      : newOrderLinks;

    const created = await addCommande({
      prospect_id: prospectId,
      nom_pack: nomPack.trim(),
      brief_produit: briefProduit.trim() || null,
      liens_reference: finalLinks,
      photos_reference: newOrderPhotos,
      prompts_scenes: [],
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
    setNewOrderLinkInput('');
    setNewOrderLinks([]);
    setNewOrderPhotos([]);
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

  const activeBrief = activeOrder?.brief_produit || '';
  const isBriefExpanded = activeOrder
    ? Boolean(expandedBriefs[activeOrder.id])
    : false;
  const isBriefLong =
    activeBrief.length > 130 || activeBrief.includes('\n');
  const activeRefLinks = activeOrder?.liens_reference || [];
  const activeRefPhotos = activeOrder?.photos_reference || [];
  const activeScenes = activeOrder?.prompts_scenes || [];
  const currentStepIdx = activeOrder
    ? PRODUCTION_STATUSES.indexOf(activeOrder.statut_production)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Vue 04 — Studio Créatif, Prompts Découpés & Livraison
          </span>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Atelier de Production UGC
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
              const ordScenesCount = ord.prompts_scenes?.length || 0;

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
                    <div className="flex items-center gap-2 min-w-0">
                      {client?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={client.logo_url}
                          alt={client.nom_marque}
                          className="h-7 w-7 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-[#FFF8B9]/70 border border-[#568203]/25 flex items-center justify-center text-xs font-bold text-[#568203] shrink-0">
                          {(client?.nom_marque || 'C').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 truncate">
                          {client?.nom_marque || 'Client Studio H'}
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-900 leading-snug truncate">
                          {ord.nom_pack}
                        </h3>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg bg-[#568203] px-2.5 py-0.5 text-[11px] font-medium text-white">
                      {ord.statut_production}
                    </span>
                  </div>

                  {ord.brief_produit && (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {ord.brief_produit}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-600 pt-2 border-t border-stone-200/70">
                    <div>
                      <span className="font-semibold text-zinc-900">
                        {formatEur(ord.montant_eur)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span>{ordScenesCount} prompt(s)</span>
                      <span>•</span>
                      <span>
                        {ordMediasCount}/{ord.nombre_creations} médias
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Active Order Workbench */}
        <div className="lg:col-span-8 space-y-5">
          {!activeOrder ? (
            <div className="glass-card p-10 text-center text-sm text-zinc-500">
              Sélectionnez une commande à gauche ou créez-en une nouvelle pour ouvrir l’atelier.
            </div>
          ) : (
            <div className="glass-card p-5 sm:p-6 space-y-5">
              {/* 1. Order Identity Header */}
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 pb-4 border-b border-stone-200/85">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {activeClient && (
                      <Link
                        href={`/crm/${activeClient.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 hover:bg-[#FFF8B9]/70 border border-stone-200 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors"
                      >
                        {activeClient.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activeClient.logo_url}
                            alt={activeClient.nom_marque}
                            className="h-4 w-4 rounded object-cover"
                          />
                        )}
                        <span>Client : {activeClient.nom_marque}</span>
                      </Link>
                    )}
                    {activeOrder.date_limite && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-stone-50 border border-stone-200 px-2.5 py-1 text-xs font-mono text-zinc-700">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Deadline : {activeOrder.date_limite}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={openEditBriefModal}
                      className="inline-flex items-center gap-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-zinc-600"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      <span>Modifier titre / brief</span>
                    </button>
                  </div>

                  <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
                    {activeOrder.nom_pack}
                  </h2>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <CurrencyDisplay
                    amountEur={activeOrder.montant_eur}
                    size="md"
                    className="sm:text-right mr-2"
                  />

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
                    <option value="En attente">Paiement : En attente</option>
                    <option value="Payé">Paiement : Payé</option>
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

              {/* 2. Visual 5-Step Production Stepper */}
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Parcours de Production (Cliquez sur une étape pour avancer)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {PRODUCTION_STATUSES.map((step, idx) => {
                    const isCurrent =
                      activeOrder.statut_production === step;
                    const isDone = idx < currentStepIdx;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() =>
                          handleChangeProdStatus(
                            activeOrder.id,
                            activeOrder.nom_pack,
                            step
                          )
                        }
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border transition-all text-left ${
                          isCurrent
                            ? 'bg-[#568203] text-white border-[#568203] shadow-sm'
                            : isDone
                              ? 'bg-[#FFF8B9]/70 text-zinc-900 border-[#568203]/30'
                              : 'bg-white text-zinc-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span className="font-mono text-[11px] opacity-75">
                          0{idx + 1}.
                        </span>
                        <span className="truncate">{step}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Internal Workbench Tabs: (1) Brief & Références | (2) Prompts IA & Découpage Photos→Vidéos | (3) Livrables Drive & Brevo */}
              <div className="flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setOrderTab('brief')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium border shrink-0 transition-all ${
                    orderTab === 'brief'
                      ? 'bg-[#568203] text-white border-[#568203]'
                      : 'bg-white text-zinc-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    1. Brief, Liens & Photos Réf. (
                    {activeRefLinks.length + activeRefPhotos.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderTab('prompts')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium border shrink-0 transition-all ${
                    orderTab === 'prompts'
                      ? 'bg-[#568203] text-white border-[#568203]'
                      : 'bg-white text-zinc-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Scissors className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    2. Prompts IA & Découpage Photos→Vidéos (
                    {activeScenes.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrderTab('livrables')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium border shrink-0 transition-all ${
                    orderTab === 'livrables'
                      ? 'bg-[#568203] text-white border-[#568203]'
                      : 'bg-white text-zinc-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>
                    3. Livrables Drive & Envoi Client ({orderMedias.length})
                  </span>
                </button>
              </div>

              {/* ================= ONGLET INTERNE 1 : BRIEF, LIENS & PHOTOS DE RÉFÉRENCE ================= */}
              {orderTab === 'brief' && (
                <div className="space-y-4">
                  {/* Description with Short Preview & "Lire plus" */}
                  <div className="rounded-xl bg-stone-50 border border-stone-200/85 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                        Description / Brief Produit & Script
                      </span>
                      <button
                        type="button"
                        onClick={openEditBriefModal}
                        className="text-xs text-[#568203] font-medium hover:underline"
                      >
                        Modifier le texte
                      </button>
                    </div>
                    {activeBrief ? (
                      <div>
                        <p
                          className={`text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap ${
                            !isBriefExpanded ? 'line-clamp-3' : ''
                          }`}
                        >
                          {activeBrief}
                        </p>
                        {isBriefLong && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedBriefs((prev) => ({
                                ...prev,
                                [activeOrder.id]: !prev[activeOrder.id],
                              }))
                            }
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#568203] hover:underline"
                          >
                            <span>
                              {isBriefExpanded
                                ? 'Réduire la description'
                                : 'Lire plus'}
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400">
                        Aucun brief détaillé saisi pour l’instant.
                      </p>
                    )}
                  </div>

                  {/* Reference Links & Photos */}
                  <div className="rounded-xl bg-stone-50/90 border border-stone-200 p-4 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
                          Liens & Photos de Référence de la Commande
                        </h3>
                        <p className="text-[11px] text-zinc-500">
                          Liens produits, pubs concurrentes, moodboard et photos produits
                        </p>
                      </div>

                      <div>
                        <input
                          ref={refPhotoInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) =>
                            handleAddOrderRefPhotos(e.target.files, false)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => refPhotoInputRef.current?.click()}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          <ImageIcon
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                          <span>+ Ajouter Photo Réf.</span>
                        </button>
                      </div>
                    </div>

                    <form
                      onSubmit={handleAddOrderRefLink}
                      className="flex gap-2"
                    >
                      <input
                        type="url"
                        value={newRefLink}
                        onChange={(e) => setNewRefLink(e.target.value)}
                        placeholder="Coller un lien (page produit, exemple TikTok/Reels, script Drive)..."
                        className="glass-input flex-1"
                      />
                      <button
                        type="submit"
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>+ Lien</span>
                      </button>
                    </form>

                    {activeRefLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {activeRefLinks.map((lnk, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-stone-200 px-2.5 py-1 text-xs"
                          >
                            <a
                              href={lnk}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-[#568203] hover:underline truncate max-w-[240px]"
                            >
                              <Link2
                                className="h-3 w-3 shrink-0"
                                strokeWidth={1.5}
                              />
                              <span className="truncate">{lnk}</span>
                              <ExternalLink
                                className="h-2.5 w-2.5 shrink-0"
                                strokeWidth={1.5}
                              />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderRefLink(idx, lnk)}
                              className="text-zinc-400 hover:text-red-600 ml-1"
                            >
                              <X className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeRefPhotos.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {activeRefPhotos.map((ph, idx) => (
                          <div
                            key={idx}
                            className="relative h-16 w-16 rounded-xl overflow-hidden border border-stone-200 bg-white group"
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewRefPhoto(ph)}
                              className="h-full w-full block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ph}
                                alt="Référence UGC"
                                className="h-full w-full object-cover"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderRefPhoto(idx)}
                              className="absolute top-0.5 right-0.5 rounded-full bg-zinc-900/75 p-0.5 text-white"
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

              {/* ================= ONGLET INTERNE 2 : PROMPTS IA & DÉCOUPAGE SCÈNES (PHOTOS -> VIDÉOS) ================= */}
              {orderTab === 'prompts' && (
                <div className="space-y-4">
                  {/* Add Scene / Multi-Prompt Form */}
                  <form
                    onSubmit={handleAddScenePrompt}
                    className="rounded-xl bg-stone-50 border border-stone-200 p-4 space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-200/80">
                      <div className="flex items-center gap-2">
                        <Sparkles
                          className="h-4 w-4 text-[#568203]"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                          Ajouter un Prompt / Scène (Photo liée à Vidéo, Découpé ou Non)
                        </span>
                      </div>

                      {prompts.length > 0 && (
                        <select
                          aria-label="Importer depuis la bibliothèque de prompts"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleImportLibraryPrompt(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="glass-input py-1 px-2.5 text-xs w-auto"
                        >
                          <option value="">
                            + Importer un modèle de ma Bibliothèque...
                          </option>
                          {prompts.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.categorie}] {p.titre}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Titre de la Scène / Plan *
                        </label>
                        <input
                          type="text"
                          required
                          value={titreScene}
                          onChange={(e) => setTitreScene(e.target.value)}
                          placeholder="Ex: Scène 1 (0-3s) — Hook Sérum Miroir"
                          className="glass-input"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Type & Mode de Découpage
                        </label>
                        <select
                          value={modeDecoupage}
                          onChange={(e) =>
                            setModeDecoupage(
                              e.target.value as ModeDecoupagePrompt
                            )
                          }
                          className="glass-input"
                        >
                          {MODES_DECOUPAGE.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Prompt Photo (Image de départ / Midjourney / Flux)
                        </label>
                        <textarea
                          rows={3}
                          value={promptPhoto}
                          onChange={(e) => setPromptPhoto(e.target.value)}
                          placeholder="Prompt ayant servi à générer la photo source..."
                          className="glass-input font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-700 mb-1">
                          Prompt Vidéo lié (Mouvement / Kling / Runway / Voix)
                        </label>
                        <textarea
                          rows={3}
                          value={promptVideo}
                          onChange={(e) => setPromptVideo(e.target.value)}
                          placeholder="Prompt d'animation de la photo vers la vidéo ou script..."
                          className="glass-input font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2.5">
                        <input
                          ref={scenePhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleScenePhotoUpload(e.target.files)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => scenePhotoInputRef.current?.click()}
                          className="btn-secondary py-1.5 px-3 text-xs"
                        >
                          <ImageIcon
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                          <span>
                            {scenePhotoUrl
                              ? 'Changer la photo source'
                              : '+ Joindre la photo source (Optionnel)'}
                          </span>
                        </button>
                        {scenePhotoUrl && (
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-stone-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={scenePhotoUrl}
                              alt="Source scène"
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setScenePhotoUrl('')}
                              className="absolute top-0 right-0 bg-zinc-900/70 text-white p-0.5"
                            >
                              <X className="h-2.5 w-2.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>

                      <button type="submit" className="btn-primary">
                        <Plus className="h-4 w-4" strokeWidth={1.5} />
                        <span>Ajouter ce prompt à la commande</span>
                      </button>
                    </div>
                  </form>

                  {/* List of Attached Prompts / Scenes */}
                  {activeScenes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-zinc-500">
                      Aucun prompt ou découpage scène enregistré sur cette commande. Utilisez le formulaire ci-dessus pour lier vos prompts Photos → Vidéos.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeScenes.map((scene, index) => (
                        <div
                          key={scene.id}
                          className="rounded-xl bg-white border border-stone-200 p-4 space-y-3 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-stone-100 border border-stone-200 px-2 py-0.5 text-xs font-mono font-semibold text-zinc-800">
                                #{index + 1}
                              </span>
                              <h4 className="text-sm font-semibold text-zinc-900">
                                {scene.titre_scene}
                              </h4>
                              <span className="rounded-lg bg-[#FFF8B9]/85 border border-[#568203]/30 px-2.5 py-0.5 text-xs font-medium text-zinc-900">
                                {scene.mode_decoupage}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveScenePrompt(
                                  scene.id,
                                  scene.titre_scene
                                )
                              }
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                              aria-label="Supprimer la scène"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                            {scene.photo_url && (
                              <div className="md:col-span-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewRefPhoto(scene.photo_url || null)
                                  }
                                  className="w-full aspect-square rounded-xl overflow-hidden border border-stone-200 block"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={scene.photo_url}
                                    alt={scene.titre_scene}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              </div>
                            )}

                            <div
                              className={`${
                                scene.photo_url
                                  ? 'md:col-span-9'
                                  : 'md:col-span-12'
                              } grid grid-cols-1 sm:grid-cols-2 gap-3`}
                            >
                              {scene.prompt_photo && (
                                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                      Prompt Photo Source
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyText(
                                          scene.prompt_photo!,
                                          `${scene.id}-photo`
                                        )
                                      }
                                      className="inline-flex items-center gap-1 text-xs font-medium text-[#568203] hover:underline"
                                    >
                                      {copiedKey === `${scene.id}-photo` ? (
                                        <>
                                          <Check
                                            className="h-3 w-3"
                                            strokeWidth={1.5}
                                          />
                                          <span>Copié</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy
                                            className="h-3 w-3"
                                            strokeWidth={1.5}
                                          />
                                          <span>Copier</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="text-xs font-mono text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                                    {scene.prompt_photo}
                                  </pre>
                                </div>
                              )}

                              {scene.prompt_video && (
                                <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                      Prompt Vidéo / Animation Lié
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyText(
                                          scene.prompt_video!,
                                          `${scene.id}-video`
                                        )
                                      }
                                      className="inline-flex items-center gap-1 text-xs font-medium text-[#568203] hover:underline"
                                    >
                                      {copiedKey === `${scene.id}-video` ? (
                                        <>
                                          <Check
                                            className="h-3 w-3"
                                            strokeWidth={1.5}
                                          />
                                          <span>Copié</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy
                                            className="h-3 w-3"
                                            strokeWidth={1.5}
                                          />
                                          <span>Copier</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="text-xs font-mono text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                                    {scene.prompt_video}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ================= ONGLET INTERNE 3 : LIVRABLES DRIVE, LECTEUR INTÉGRÉ & LIVRAISON BREVO ================= */}
              {orderTab === 'livrables' && (
                <div className="space-y-5">
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
                            <ExternalLink
                              className="h-3 w-3"
                              strokeWidth={1.5}
                            />
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
                        : 'Glissez-déposez vos créations finales MP4, MOV, PNG ou JPG ici'}
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
                        Aucun média livrable rattaché à cette commande pour l’instant.
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
                                  <Trash2
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.5}
                                  />
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
                                  {med.pret_pour_livraison
                                    ? 'Validé'
                                    : 'À vérifier'}
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
          )}
        </div>
      </div>

      {/* Modal: Create Rich UGC Order */}
      {isNewOrderOpen && (
        <div
          style={{ zIndex: 2147483600 }}
          className="fixed inset-0 flex items-center justify-center bg-zinc-900/50 p-4"
        >
          <div className="glass-card w-full max-w-xl p-5 sm:p-6 border border-stone-200 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-stone-200/85">
              <div className="flex items-center gap-2.5">
                <Video
                  className="h-5 w-5 text-[#568203]"
                  strokeWidth={1.5}
                />
                <h2 className="text-base font-semibold text-zinc-900">
                  Nouvelle Commande / Vidéo UGC
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
                  Titre du Pack / Vidéo UGC *
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
                  Description / Brief Produit & Script
                </label>
                <textarea
                  rows={3}
                  value={briefProduit}
                  onChange={(e) => setBriefProduit(e.target.value)}
                  placeholder="Instructions de production, script, avatar, format (s'affichera avec un bouton Lire plus)..."
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                  Liens de référence (Produit, Pubs, Script...)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newOrderLinkInput}
                    onChange={(e) => setNewOrderLinkInput(e.target.value)}
                    placeholder="https://..."
                    className="glass-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newOrderLinkInput.trim()) return;
                      setNewOrderLinks((prev) => [
                        ...prev,
                        newOrderLinkInput.trim(),
                      ]);
                      setNewOrderLinkInput('');
                    }}
                    className="btn-secondary text-xs"
                  >
                    + Lien
                  </button>
                </div>
                {newOrderLinks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {newOrderLinks.map((lnk, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-zinc-700"
                      >
                        <span className="truncate max-w-[200px]">{lnk}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setNewOrderLinks((prev) =>
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
                  ref={newOrderPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddOrderRefPhotos(e.target.files, true)}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-700">
                    Photos / Visuels de référence ({newOrderPhotos.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => newOrderPhotoInputRef.current?.click()}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>+ Ajouter photo</span>
                  </button>
                </div>
                {newOrderPhotos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newOrderPhotos.map((ph, idx) => (
                      <div
                        key={idx}
                        className="relative h-14 w-14 rounded-lg overflow-hidden border border-stone-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ph}
                          alt="Référence"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewOrderPhotos((prev) =>
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

      {/* Modal: Edit Active Order Title & Brief */}
      {isEditBriefOpen && (
        <div
          style={{ zIndex: 2147483600 }}
          className="fixed inset-0 flex items-center justify-center bg-zinc-900/50 p-4"
        >
          <div className="glass-card w-full max-w-lg p-5 sm:p-6 border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-base font-semibold text-zinc-900">
                Modifier le titre et la description UGC
              </h3>
              <button
                onClick={() => setIsEditBriefOpen(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-800"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedBrief} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Titre du Pack / Vidéo *
                </label>
                <input
                  type="text"
                  required
                  value={editPackTitle}
                  onChange={(e) => setEditPackTitle(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Description / Brief & Script
                </label>
                <textarea
                  rows={5}
                  value={editPackBrief}
                  onChange={(e) => setEditPackBrief(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditBriefOpen(false)}
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

      {/* Lightbox Modal for Reference Photo Preview */}
      {previewRefPhoto && (
        <div
          style={{ zIndex: 2147483610 }}
          onClick={() => setPreviewRefPhoto(null)}
          className="fixed inset-0 flex items-center justify-center bg-zinc-900/70 p-4"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-white p-2 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewRefPhoto}
              alt="Photo de référence"
              className="max-h-[80vh] w-auto object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={() => setPreviewRefPhoto(null)}
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

export default function ProductionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
      <ProductionWorkshopContent />
    </Suspense>
  );
}
