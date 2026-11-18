'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Folder,
  FolderPlus,
  ExternalLink,
  TrendingUp,
  Package,
  Film,
  Calculator,
  FileText,
  CheckCircle2,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  Globe,
  Mail,
  User,
  Phone,
  Megaphone,
  ShoppingBag,
  Share2,
  Trash2,
  Save,
  Layers,
  Link2,
} from 'lucide-react';
import { useStudioData } from '@/context/StudioDataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import {
  formatEur,
  formatFcfa,
  normalizeCountryCode,
  getVideoPreviewUrl,
  getImagePreviewUrl,
} from '@/lib/currency';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { Skeleton } from '@/components/ui/Skeleton';
import type {
  StatutProduction,
  StatutPaiement,
  ProspectStatut,
} from '@/types/database';

function Client360Content() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = params?.id || '';
  const initialTab =
    searchParams.get('tab') === 'infos' ? 'infos' : 'infos';

  const {
    isLoading,
    prospects,
    commandes,
    medias,
    clientSubfolders,
    updateProspect,
    deleteProspect,
    createProspectDriveFolder,
    createClientSubfolder,
    addCommande,
  } = useStudioData();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'infos' | '360'>(initialTab);

  const client = useMemo(
    () => prospects.find((p) => p.id === clientId),
    [prospects, clientId]
  );

  const clientOrders = useMemo(
    () => commandes.filter((c) => c.prospect_id === clientId),
    [commandes, clientId]
  );

  const clientMedias = useMemo(() => {
    const orderIds = new Set(clientOrders.map((c) => c.id));
    return medias.filter((m) => orderIds.has(m.commande_id));
  }, [medias, clientOrders]);

  // 4 Top KPIs
  const totalRevenueEur = useMemo(
    () =>
      clientOrders.reduce((acc, c) => acc + Number(c.montant_eur || 0), 0),
    [clientOrders]
  );
  const totalOrdersCount = clientOrders.length;
  const totalCreationsDelivered = useMemo(
    () =>
      clientOrders.reduce(
        (acc, c) => acc + Number(c.nombre_creations || 0),
        0
      ),
    [clientOrders]
  );
  const averageBasketEur = useMemo(
    () => (totalOrdersCount > 0 ? totalRevenueEur / totalOrdersCount : 0),
    [totalRevenueEur, totalOrdersCount]
  );

  // Editable Contact & Socials state
  const [nomMarque, setNomMarque] = useState('');
  const [pays, setPays] = useState('FR');
  const [statut, setStatut] = useState<ProspectStatut>('À contacter');
  const [valeurEstimee, setValeurEstimee] = useState('0');
  const [contactNom, setContactNom] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTelephone, setContactTelephone] = useState('');
  const [lienBoutique, setLienBoutique] = useState('');

  // Social networks
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [autresReseaux, setAutresReseaux] = useState('');

  // Dynamic Links: Facebook Ads & Concerned Products
  const [newAdUrl, setNewAdUrl] = useState('');
  const [newProductUrl, setNewProductUrl] = useState('');

  // Strategic Notepad
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (client) {
      setNomMarque(client.nom_marque || '');
      setPays(client.pays || 'FR');
      setStatut(client.statut);
      setValeurEstimee(String(client.valeur_estimee_eur || 0));
      setContactNom(client.contact_nom || '');
      setContactEmail(client.contact_email || '');
      setContactTelephone(client.contact_telephone || '');
      setLienBoutique(client.lien_boutique || '');
      setInstagram(client.liens_reseaux?.instagram || '');
      setTiktok(client.liens_reseaux?.tiktok || '');
      setFacebook(client.liens_reseaux?.facebook || '');
      setLinkedin(client.liens_reseaux?.linkedin || '');
      setAutresReseaux(client.liens_reseaux?.autres || '');
      setNotes(client.notes_strategiques || '');
    }
  }, [client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subfolder creation state
  const [isSubfolderOpen, setIsSubfolderOpen] = useState(false);
  const [subfolderName, setSubfolderName] = useState('');
  const [isCreatingSub, setIsCreatingSub] = useState(false);

  // New Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [nomPack, setNomPack] = useState('');
  const [briefProduit, setBriefProduit] = useState('');
  const [montantEur, setMontantEur] = useState('1450');
  const [nombreCreations, setNombreCreations] = useState('6');
  const [statutProduction, setStatutProduction] =
    useState<StatutProduction>('Brief reçu');
  const [statutPaiement, setStatutPaiement] =
    useState<StatutPaiement>('En attente');
  const [dateLimite, setDateLimite] = useState('');

  // Save Contact & Socials with Confirmation Modal
  const handleSaveContactAndSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    const ok = await confirm({
      title: `Enregistrer les modifications de ${client.nom_marque} ?`,
      description:
        'Voulez-vous mettre à jour les coordonnées (email, numéro, boutique) et les liens des réseaux sociaux de ce prospect ?',
      confirmLabel: 'Enregistrer les modifications',
      variant: 'modify',
    });

    if (!ok) return;

    await updateProspect(client.id, {
      nom_marque: nomMarque.trim() || client.nom_marque,
      pays,
      statut,
      valeur_estimee_eur: Number(valeurEstimee) || 0,
      contact_nom: contactNom.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_telephone: contactTelephone.trim() || null,
      lien_boutique: lienBoutique.trim() || null,
      liens_reseaux: {
        instagram: instagram.trim() || undefined,
        tiktok: tiktok.trim() || undefined,
        facebook: facebook.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        autres: autresReseaux.trim() || undefined,
      },
      notes_strategiques: notes.trim() || null,
    });

    toast({
      title: 'Fiche prospect mise à jour',
      description: 'Les coordonnées, réseaux sociaux et notes ont été enregistrés.',
    });
  };

  // Add Facebook Ad Link
  const handleAddAdLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newAdUrl.trim()) return;

    const currentAds = client.liens_pubs || [];
    const updatedAds = [...currentAds, newAdUrl.trim()];
    await updateProspect(client.id, { liens_pubs: updatedAds });
    setNewAdUrl('');
    toast({
      title: 'Lien publicitaire ajouté',
      description: 'Le lien de pub Facebook / Ad Library a été rattaché au prospect.',
    });
  };

  // Remove Facebook Ad Link (with confirmation modal)
  const handleRemoveAdLink = async (index: number, url: string) => {
    if (!client) return;
    const ok = await confirm({
      title: 'Supprimer ce lien publicitaire ?',
      description: `Voulez-vous retirer le lien "${url}" de la fiche de ${client.nom_marque} ?`,
      confirmLabel: 'Supprimer le lien',
      variant: 'danger',
    });
    if (!ok) return;

    const currentAds = client.liens_pubs || [];
    const updatedAds = currentAds.filter((_, idx) => idx !== index);
    await updateProspect(client.id, { liens_pubs: updatedAds });
    toast({
      title: 'Lien publicitaire supprimé',
    });
  };

  // Add Product Link
  const handleAddProductLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newProductUrl.trim()) return;

    const currentProds = client.liens_produits || [];
    const updatedProds = [...currentProds, newProductUrl.trim()];
    await updateProspect(client.id, { liens_produits: updatedProds });
    setNewProductUrl('');
    toast({
      title: 'Lien produit ajouté',
      description: 'Le produit concerné a été rattaché au prospect.',
    });
  };

  // Remove Product Link (with confirmation modal)
  const handleRemoveProductLink = async (index: number, url: string) => {
    if (!client) return;
    const ok = await confirm({
      title: 'Supprimer ce lien produit ?',
      description: `Voulez-vous retirer le produit "${url}" de la fiche de ${client.nom_marque} ?`,
      confirmLabel: 'Supprimer le produit',
      variant: 'danger',
    });
    if (!ok) return;

    const currentProds = client.liens_produits || [];
    const updatedProds = currentProds.filter((_, idx) => idx !== index);
    await updateProspect(client.id, { liens_produits: updatedProds });
    toast({
      title: 'Lien produit supprimé',
    });
  };

  const handleSaveNotes = async () => {
    if (!client) return;
    const ok = await confirm({
      title: 'Enregistrer le bloc-notes stratégique ?',
      description: `Confirmez-vous la modification des notes stratégiques de ${client.nom_marque} ?`,
      confirmLabel: 'Enregistrer les notes',
      variant: 'modify',
    });
    if (!ok) return;

    await updateProspect(client.id, { notes_strategiques: notes });
    toast({
      title: 'Bloc-notes stratégique sauvegardé',
    });
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    const ok = await confirm({
      title: `Supprimer définitivement ${client.nom_marque} ?`,
      description: `Cette action supprimera le prospect "${client.nom_marque}" ainsi que toutes ses commandes et créations associées.`,
      confirmLabel: 'Supprimer le prospect',
      variant: 'danger',
    });
    if (!ok) return;

    await deleteProspect(client.id);
    toast({
      title: 'Prospect supprimé',
    });
    router.push('/crm');
  };

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !subfolderName.trim()) return;
    setIsCreatingSub(true);
    try {
      await createClientSubfolder(client.id, subfolderName.trim());
      setSubfolderName('');
      setIsSubfolderOpen(false);
    } finally {
      setIsCreatingSub(false);
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !nomPack.trim()) return;

    await addCommande({
      prospect_id: client.id,
      nom_pack: nomPack.trim(),
      brief_produit: briefProduit.trim() || null,
      statut_production: statutProduction,
      montant_eur: Number(montantEur) || 0,
      statut_paiement: statutPaiement,
      nombre_creations: Number(nombreCreations) || 1,
      drive_subfolder_id: null,
      lien_livraison_public: null,
      date_limite: dateLimite || null,
    });

    toast({
      title: 'Commande UGC créée',
      description: `Le pack "${nomPack}" a été rattaché à ${client.nom_marque}.`,
    });

    setNomPack('');
    setBriefProduit('');
    setIsOrderModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="glass-card p-8 text-center space-y-4">
        <p className="text-base font-medium text-zinc-900">
          Prospect ou client introuvable dans la base Studio H.
        </p>
        <Link href="/crm" className="btn-primary inline-flex">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Retour au Pipeline Europe</span>
        </Link>
      </div>
    );
  }

  const subfolders = clientSubfolders[client.id] || [];
  const adLinks = client.liens_pubs || [];
  const productLinks = client.liens_produits || [];

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Client Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href="/crm"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Retour au Pipeline CRM Europe</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
              {client.nom_marque}
            </h1>
            <span className="rounded-lg bg-[#568203] px-2.5 py-0.5 text-xs font-mono font-semibold uppercase text-white">
              {normalizeCountryCode(client.pays)}
            </span>
            <span className="rounded-lg bg-[#FFF8B9]/80 border border-[#568203]/25 px-2.5 py-0.5 text-xs font-medium text-zinc-900">
              {client.statut}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 pt-0.5">
            {client.contact_nom && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                {client.contact_nom}
              </span>
            )}
            {client.contact_email && (
              <a
                href={`mailto:${client.contact_email}`}
                className="inline-flex items-center gap-1.5 hover:text-[#568203]"
              >
                <Mail className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                {client.contact_email}
              </a>
            )}
            {client.contact_telephone && (
              <a
                href={`tel:${client.contact_telephone}`}
                className="inline-flex items-center gap-1.5 hover:text-[#568203]"
              >
                <Phone
                  className="h-3.5 w-3.5 text-zinc-400"
                  strokeWidth={1.5}
                />
                {client.contact_telephone}
              </a>
            )}
            {client.lien_boutique && (
              <a
                href={client.lien_boutique}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#568203] font-medium hover:underline"
              >
                <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Boutique</span>
                <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Nouvelle Commande UGC</span>
          </button>
          <button
            onClick={handleDeleteClient}
            className="btn-secondary text-red-600 hover:bg-red-50 border-red-200"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            <span>Supprimer</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs: Onglet 1 (Coordonnées, Pubs FB, Produits & Réseaux) / Onglet 2 (Vue 360° & Commandes) */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('infos')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all border shrink-0 ${
            activeTab === 'infos'
              ? 'bg-[#568203] text-white border-[#568203] shadow-sm'
              : 'bg-white text-zinc-700 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Link2 className="h-4 w-4" strokeWidth={1.5} />
          <span>Coordonnées, Pubs Facebook, Produits & Réseaux</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('360')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all border shrink-0 ${
            activeTab === '360'
              ? 'bg-[#568203] text-white border-[#568203] shadow-sm'
              : 'bg-white text-zinc-700 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Layers className="h-4 w-4" strokeWidth={1.5} />
          <span>Vue 360°, Drive, Commandes & Créations ({clientOrders.length})</span>
        </button>
      </div>

      {/* ================= ONGLET 1 : COORDONNÉES, PUBS FACEBOOK, PRODUITS & RÉSEAUX SOCIAUX ================= */}
      {activeTab === 'infos' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (7 cols): Coordonnées, Email, Numéro & Réseaux Sociaux */}
            <form
              onSubmit={handleSaveContactAndSocials}
              className="lg:col-span-7 glass-card p-5 space-y-5"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                    <User
                      className="h-4 w-4 text-[#568203]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-zinc-900">
                      Coordonnées & Réseaux Sociaux du Prospect
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Email, téléphone/WhatsApp, boutique et profils sociaux
                    </p>
                  </div>
                </div>

                <button type="submit" className="btn-primary">
                  <Save className="h-4 w-4" strokeWidth={1.5} />
                  <span>Enregistrer</span>
                </button>
              </div>

              {/* Brand, Country, Status, Value */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Nom de la marque
                  </label>
                  <input
                    type="text"
                    required
                    value={nomMarque}
                    onChange={(e) => setNomMarque(e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={pays}
                    onChange={(e) => setPays(e.target.value)}
                    className="glass-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Valeur estimée (€)
                  </label>
                  <input
                    type="number"
                    value={valeurEstimee}
                    onChange={(e) => setValeurEstimee(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              {/* Contact Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Nom de l’interlocuteur
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
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Adresse Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@marque.eu"
                    className="glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Numéro Téléphone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={contactTelephone}
                    onChange={(e) => setContactTelephone(e.target.value)}
                    placeholder="+33 6 00 00 00 00"
                    className="glass-input"
                  />
                </div>
              </div>

              {/* E-commerce Store Link */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Lien de la boutique en ligne
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={lienBoutique}
                    onChange={(e) => setLienBoutique(e.target.value)}
                    placeholder="https://marque.eu"
                    className="glass-input flex-1"
                  />
                  {lienBoutique && (
                    <a
                      href={lienBoutique}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
              </div>

              {/* Social Media Links */}
              <div className="pt-3 border-t border-stone-200/80 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  <Share2
                    className="h-4 w-4 text-[#568203]"
                    strokeWidth={1.5}
                  />
                  <span>Réseaux Sociaux de la Marque</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">
                      Instagram
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="https://instagram.com/marque"
                        className="glass-input flex-1"
                      />
                      {instagram && (
                        <a
                          href={instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary px-2.5"
                          title="Ouvrir Instagram"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">
                      TikTok
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={tiktok}
                        onChange={(e) => setTiktok(e.target.value)}
                        placeholder="https://tiktok.com/@marque"
                        className="glass-input flex-1"
                      />
                      {tiktok && (
                        <a
                          href={tiktok}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary px-2.5"
                          title="Ouvrir TikTok"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">
                      Page Facebook
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder="https://facebook.com/marque"
                        className="glass-input flex-1"
                      />
                      {facebook && (
                        <a
                          href={facebook}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary px-2.5"
                          title="Ouvrir Facebook"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">
                      LinkedIn / Autre réseau
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/company/marque"
                        className="glass-input flex-1"
                      />
                      {linkedin && (
                        <a
                          href={linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary px-2.5"
                          title="Ouvrir LinkedIn"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes stratégiques */}
              <div className="pt-3 border-t border-stone-200/80">
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Notes stratégiques & Angle d’approche
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations sur leurs publicités actuelles, faiblesses de leurs hooks, proposition de valeur..."
                  className="glass-input"
                />
              </div>
            </form>

            {/* Right Column (5 cols): Liens des Pubs Facebook & Liens des Produits Concernés */}
            <div className="lg:col-span-5 space-y-5">
              {/* 1. Liens Pubs Facebook / Meta Ad Library */}
              <section className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                      <Megaphone
                        className="h-4 w-4 text-[#568203]"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-zinc-900">
                        Liens des Publicités (Pubs Facebook / Ads)
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Meta Ad Library, TikTok Ads ou posts sponsorisés
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs font-mono text-zinc-700">
                    {adLinks.length}
                  </span>
                </div>

                <form onSubmit={handleAddAdLink} className="flex gap-2">
                  <input
                    type="url"
                    value={newAdUrl}
                    onChange={(e) => setNewAdUrl(e.target.value)}
                    placeholder="Coller un lien Meta Ad Library / Pub Facebook..."
                    className="glass-input flex-1"
                  />
                  <button type="submit" className="btn-primary">
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                    <span>Ajouter</span>
                  </button>
                </form>

                <div className="space-y-2">
                  {adLinks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-zinc-400">
                      Aucun lien de publicité enregistré pour ce prospect.
                    </div>
                  ) : (
                    adLinks.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 border border-stone-200/90 px-3.5 py-2.5"
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs font-medium text-[#568203] hover:underline truncate flex-1"
                        >
                          <Megaphone
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.5}
                          />
                          <span className="truncate">{url}</span>
                          <ExternalLink
                            className="h-3 w-3 shrink-0"
                            strokeWidth={1.5}
                          />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRemoveAdLink(idx, url)}
                          className="rounded-lg p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label="Supprimer ce lien de pub"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* 2. Liens des Produits Concernés (Optionnel) */}
              <section className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                      <ShoppingBag
                        className="h-4 w-4 text-[#568203]"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-zinc-900">
                        Liens des Produits Concernés (Optionnel)
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Pages produits ciblées pour les scripts et vidéos UGC
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-xs font-mono text-zinc-700">
                    {productLinks.length}
                  </span>
                </div>

                <form onSubmit={handleAddProductLink} className="flex gap-2">
                  <input
                    type="url"
                    value={newProductUrl}
                    onChange={(e) => setNewProductUrl(e.target.value)}
                    placeholder="Coller l'URL d'une fiche produit..."
                    className="glass-input flex-1"
                  />
                  <button type="submit" className="btn-primary">
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                    <span>Ajouter</span>
                  </button>
                </form>

                <div className="space-y-2">
                  {productLinks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-zinc-400">
                      Aucun produit spécifique rattaché (optionnel).
                    </div>
                  ) : (
                    productLinks.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 border border-stone-200/90 px-3.5 py-2.5"
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-xs font-medium text-zinc-800 hover:text-[#568203] hover:underline truncate flex-1"
                        >
                          <ShoppingBag
                            className="h-3.5 w-3.5 shrink-0 text-[#568203]"
                            strokeWidth={1.5}
                          />
                          <span className="truncate">{url}</span>
                          <ExternalLink
                            className="h-3 w-3 shrink-0"
                            strokeWidth={1.5}
                          />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRemoveProductLink(idx, url)}
                          className="rounded-lg p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label="Supprimer ce lien produit"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ================= ONGLET 2 : VUE 360°, DRIVE, COMMANDES & CRÉATIONS ================= */}
      {activeTab === '360' && (
        <div className="space-y-5">
          {/* 1. Four Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card-avocado p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Chiffre d’Affaires Généré</span>
                <TrendingUp
                  className="h-4 w-4 text-[#568203]"
                  strokeWidth={1.5}
                />
              </div>
              <CurrencyDisplay amountEur={totalRevenueEur} size="lg" />
            </div>

            <div className="glass-card p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Nombre Total de Commandes</span>
                <Package className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
              </div>
              <div className="text-xl font-bold text-zinc-900">
                {totalOrdersCount}
              </div>
              <div className="text-xs text-zinc-500">
                Packs UGC commandés par {client.nom_marque}
              </div>
            </div>

            <div className="glass-card p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Total Créations Produites</span>
                <Film className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
              </div>
              <div className="text-xl font-bold text-zinc-900">
                {totalCreationsDelivered}
              </div>
              <div className="text-xs text-zinc-500">
                Somme des vidéos & visuels IA livrés
              </div>
            </div>

            <div className="glass-card p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <span>Panier Moyen Client</span>
                <Calculator
                  className="h-4 w-4 text-zinc-700"
                  strokeWidth={1.5}
                />
              </div>
              <CurrencyDisplay amountEur={averageBasketEur} size="lg" />
            </div>
          </div>

          {/* 2. Drive Tree & Strategic Notepad */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Arborescence Google Drive */}
            <section className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/85">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                    <Folder
                      className="h-4 w-4 text-[#568203]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-zinc-900">
                      Arborescence Google Drive
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Dossier racine client et sous-dossiers de projets
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSubfolderOpen((prev) => !prev)}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>+ Sous-dossier</span>
                </button>
              </div>

              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider">
                    Dossier Racine Client
                  </div>
                  <div className="text-sm font-mono font-medium text-zinc-900">
                    Client_{client.nom_marque.replace(/\s+/g, '_')}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    ID : {client.drive_folder_id || 'Non initialisé'}
                  </div>
                </div>

                {client.drive_folder_id ? (
                  <a
                    href={`https://drive.google.com/drive/folders/${client.drive_folder_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs shrink-0"
                  >
                    <span>Ouvrir sur Drive</span>
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </a>
                ) : (
                  <button
                    onClick={() => createProspectDriveFolder(client.id)}
                    className="btn-primary text-xs shrink-0"
                  >
                    <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Initialiser Drive</span>
                  </button>
                )}
              </div>

              {isSubfolderOpen && (
                <form
                  onSubmit={handleCreateSubfolder}
                  className="rounded-xl bg-stone-50 border border-[#568203]/30 p-3 flex gap-2"
                >
                  <input
                    type="text"
                    required
                    value={subfolderName}
                    onChange={(e) => setSubfolderName(e.target.value)}
                    placeholder="Nom du sous-dossier (ex: 01_Rushes_Avatars_IA)"
                    className="glass-input flex-1"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingSub}
                    className="btn-primary shrink-0"
                  >
                    {isCreatingSub ? 'Création...' : 'Créer'}
                  </button>
                </form>
              )}

              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-600">
                  Sous-dossiers actifs ({subfolders.length})
                </div>
                {subfolders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-zinc-400">
                    Aucun sous-dossier créé pour ce client.
                  </div>
                ) : (
                  subfolders.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-xl bg-stone-50/80 border border-stone-200/85 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder
                          className="h-4 w-4 text-[#568203] shrink-0"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs font-mono text-zinc-900 truncate">
                          {sub.name}
                        </span>
                      </div>
                      <a
                        href={sub.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900"
                      >
                        <span>Ouvrir</span>
                        <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                      </a>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Bloc-Notes Stratégique (Avec confirmation modal) */}
            <section className="glass-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-stone-200/85">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-[#FFF8B9]/70 border border-[#568203]/25 p-2">
                      <FileText
                        className="h-4 w-4 text-[#568203]"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-zinc-900">
                        Bloc-notes Stratégique & Direction Artistique
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Préférences visuelles, avatars IA, tonalité et angles gagnants
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="btn-primary py-1.5 px-3 text-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Enregistrer</span>
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notez ici les directives visuelles de la marque, les hooks qui ont obtenu le meilleur ROAS, les contraintes de prononciation..."
                  className="glass-input leading-relaxed resize-none"
                />
              </div>
            </section>
          </div>

          {/* 3. Historique Complet des Commandes */}
          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/85">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Historique Complet des Commandes UGC
                </h2>
                <p className="text-xs text-zinc-500">
                  Toutes les commandes rattachées à {client.nom_marque}
                </p>
              </div>
              <span className="rounded-lg bg-stone-100 border border-stone-200 px-3 py-1 text-xs font-mono text-zinc-800">
                {clientOrders.length} commande{clientOrders.length > 1 ? 's' : ''}
              </span>
            </div>

            {clientOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-zinc-500">
                Aucune commande enregistrée pour ce client pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200/85 text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="py-3 px-3.5">Pack Commandé</th>
                      <th className="py-3 px-3.5">Statut Production</th>
                      <th className="py-3 px-3.5">Paiement</th>
                      <th className="py-3 px-3.5">Créations</th>
                      <th className="py-3 px-3.5">Montant (€ / FCFA)</th>
                      <th className="py-3 px-3.5">Date Limite</th>
                      <th className="py-3 px-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 text-[13px]">
                    {clientOrders.map((ord) => (
                      <tr
                        key={ord.id}
                        className="hover:bg-stone-50/80 transition-colors"
                      >
                        <td className="py-3 px-3.5 font-medium text-zinc-900">
                          <div>{ord.nom_pack}</div>
                          {ord.brief_produit && (
                            <div className="text-xs text-zinc-500 line-clamp-1 max-w-md">
                              {ord.brief_produit}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-zinc-800">
                            {ord.statut_production}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`rounded-lg px-2.5 py-1 text-xs border ${
                              ord.statut_paiement === 'Payé'
                                ? 'bg-[#568203] text-white border-[#568203]'
                                : 'bg-stone-100 text-zinc-700 border-stone-200'
                            }`}
                          >
                            {ord.statut_paiement}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-xs text-zinc-900">
                          {ord.nombre_creations}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-zinc-900">
                            {formatEur(ord.montant_eur)}
                          </div>
                          <div className="text-xs font-mono text-zinc-500">
                            {formatFcfa(ord.montant_eur)}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-xs font-mono text-zinc-700">
                          {ord.date_limite || '—'}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <Link
                            href={`/production?commande=${ord.id}`}
                            className="btn-secondary py-1.5 px-3 text-xs"
                          >
                            <span>Atelier</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 4. Galerie de toutes ses créations */}
          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/85">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">
                  Galerie Intégrale des Créations du Client
                </h2>
                <p className="text-xs text-zinc-500">
                  Prévisualisation privée de tous les médias produits pour{' '}
                  {client.nom_marque}
                </p>
              </div>
              <span className="rounded-lg bg-stone-100 border border-stone-200 px-3 py-1 text-xs font-mono text-zinc-800">
                {clientMedias.length} média{clientMedias.length > 1 ? 's' : ''}
              </span>
            </div>

            {clientMedias.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-zinc-500">
                Aucun média uploadé pour ce client.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientMedias.map((med) => (
                  <div
                    key={med.id}
                    className="rounded-xl bg-white border border-stone-200 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="aspect-video w-full bg-stone-100 relative overflow-hidden border-b border-stone-200/85">
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

                    <div className="p-3.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {med.type_media === 'video' ? (
                          <VideoIcon
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

                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium border ${
                          med.pret_pour_livraison
                            ? 'bg-[#568203] text-white border-[#568203]'
                            : 'bg-stone-100 text-zinc-600 border-stone-200'
                        }`}
                      >
                        {med.pret_pour_livraison ? 'Prêt' : 'En révision'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal: New Order for this client */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-lg p-5 sm:p-6 border border-stone-200 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-900 pb-3.5 mb-4 border-b border-stone-200/85">
              Nouvelle Commande UGC — {client.nom_marque}
            </h3>

            <form onSubmit={handleAddOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                  Nom du Pack *
                </label>
                <input
                  type="text"
                  required
                  value={nomPack}
                  onChange={(e) => setNomPack(e.target.value)}
                  placeholder="Ex: Pack Scale Meta — 6 Vidéos UGC IA"
                  className="glass-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Montant HT (€)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={montantEur}
                    onChange={(e) => setMontantEur(e.target.value)}
                    className="glass-input"
                  />
                  <span className="block mt-1 text-[11px] font-mono text-zinc-500">
                    {formatFcfa(Number(montantEur) || 0)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Nombre de créations
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={nombreCreations}
                    onChange={(e) => setNombreCreations(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Statut Production
                  </label>
                  <select
                    value={statutProduction}
                    onChange={(e) =>
                      setStatutProduction(e.target.value as StatutProduction)
                    }
                    className="glass-input"
                  >
                    {[
                      'Brief reçu',
                      'Script validé',
                      'Génération IA',
                      'Montage',
                      'Livré',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Paiement
                  </label>
                  <select
                    value={statutPaiement}
                    onChange={(e) =>
                      setStatutPaiement(e.target.value as StatutPaiement)
                    }
                    className="glass-input"
                  >
                    <option value="En attente">En attente</option>
                    <option value="Payé">Payé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-700 mb-1">
                    Date limite
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
                  Brief Produit & Directives
                </label>
                <textarea
                  rows={3}
                  value={briefProduit}
                  onChange={(e) => setBriefProduit(e.target.value)}
                  placeholder="Détails produit, bénéfices clés, hooks attendus..."
                  className="glass-input"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3.5 border-t border-stone-200/85">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
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

export default function Client360Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Client360Content />
    </Suspense>
  );
}
