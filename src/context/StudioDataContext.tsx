'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type {
  Prospect,
  ProspectStatut,
  ClientProduct,
  CommandeUgc,
  StatutProduction,
  StatutPaiement,
  MediaCreation,
  PromptScript,
  Finance,
  FocusTache,
  UrgenceNiveau,
  DriveSubfolder,
  GoalHistoryEntry,
  SavingsConfig,
} from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastContext';

const META_MARKER = '\n<!--STUDIO_H_META:';
const META_END = '-->';

function cleanDriveId(id: string | null | undefined): string | null {
  if (!id || id.startsWith('drv_') || id.startsWith('file_')) return null;
  return id;
}

function serializeProspectNotes(prospect: Partial<Prospect>): string {
  const baseNotes = (prospect.notes_strategiques || '')
    .split(META_MARKER)[0]
    .trim();
  const meta = {
    logo_url: prospect.logo_url || null,
    contact_telephone: prospect.contact_telephone || null,
    liens_pubs: prospect.liens_pubs || [],
    liens_produits: prospect.liens_produits || [],
    liens_reseaux: prospect.liens_reseaux || {},
    produits: prospect.produits || [],
  };
  return `${baseNotes}${META_MARKER}${JSON.stringify(meta)}${META_END}`;
}

function deserializeProspect(raw: Prospect): Prospect {
  const notesRaw = raw.notes_strategiques || '';
  const idx = notesRaw.indexOf(META_MARKER);
  const validDriveId = cleanDriveId(raw.drive_folder_id);

  if (idx === -1) {
    return {
      ...raw,
      drive_folder_id: validDriveId,
      logo_url: raw.logo_url || null,
      contact_telephone: raw.contact_telephone || null,
      liens_pubs: raw.liens_pubs || [],
      liens_produits: raw.liens_produits || [],
      liens_reseaux: raw.liens_reseaux || {},
      produits: raw.produits || [],
    };
  }
  const cleanNotes = notesRaw.slice(0, idx).trim();
  const jsonPart = notesRaw
    .slice(idx + META_MARKER.length)
    .replace(/-->$/, '')
    .trim();
  try {
    const meta = JSON.parse(jsonPart);
    return {
      ...raw,
      drive_folder_id: validDriveId,
      notes_strategiques: cleanNotes,
      logo_url: raw.logo_url ?? meta.logo_url ?? null,
      contact_telephone:
        raw.contact_telephone ?? meta.contact_telephone ?? null,
      liens_pubs: raw.liens_pubs?.length
        ? raw.liens_pubs
        : meta.liens_pubs || [],
      liens_produits: raw.liens_produits?.length
        ? raw.liens_produits
        : meta.liens_produits || [],
      liens_reseaux:
        raw.liens_reseaux && Object.keys(raw.liens_reseaux).length > 0
          ? raw.liens_reseaux
          : meta.liens_reseaux || {},
      produits: raw.produits?.length ? raw.produits : meta.produits || [],
    };
  } catch {
    return {
      ...raw,
      drive_folder_id: validDriveId,
      notes_strategiques: cleanNotes,
      produits: raw.produits || [],
    };
  }
}

function serializeCommandeBrief(cmd: Partial<CommandeUgc>): string {
  const baseBrief = (cmd.brief_produit || '').split(META_MARKER)[0].trim();
  const meta = {
    type_commande: cmd.type_commande || 'commande_client',
    produit_id: cmd.produit_id || null,
    produit_nom: cmd.produit_nom || null,
    liens_reference: cmd.liens_reference || [],
    photos_reference: cmd.photos_reference || [],
    prompts_scenes: cmd.prompts_scenes || [],
  };
  return `${baseBrief}${META_MARKER}${JSON.stringify(meta)}${META_END}`;
}

function deserializeCommande(raw: CommandeUgc): CommandeUgc {
  const briefRaw = raw.brief_produit || '';
  const idx = briefRaw.indexOf(META_MARKER);
  const validSubfolder = cleanDriveId(raw.drive_subfolder_id);

  if (idx === -1) {
    return {
      ...raw,
      type_commande: raw.type_commande || 'commande_client',
      produit_id: raw.produit_id || null,
      produit_nom: raw.produit_nom || null,
      drive_subfolder_id: validSubfolder,
      liens_reference: raw.liens_reference || [],
      photos_reference: raw.photos_reference || [],
      prompts_scenes: raw.prompts_scenes || [],
    };
  }
  const cleanBrief = briefRaw.slice(0, idx).trim();
  const jsonPart = briefRaw
    .slice(idx + META_MARKER.length)
    .replace(/-->$/, '')
    .trim();
  try {
    const meta = JSON.parse(jsonPart);
    return {
      ...raw,
      type_commande: raw.type_commande || meta.type_commande || 'commande_client',
      produit_id: raw.produit_id ?? meta.produit_id ?? null,
      produit_nom: raw.produit_nom ?? meta.produit_nom ?? null,
      drive_subfolder_id: validSubfolder,
      brief_produit: cleanBrief,
      liens_reference: raw.liens_reference?.length
        ? raw.liens_reference
        : meta.liens_reference || [],
      photos_reference: raw.photos_reference?.length
        ? raw.photos_reference
        : meta.photos_reference || [],
      prompts_scenes: raw.prompts_scenes?.length
        ? raw.prompts_scenes
        : meta.prompts_scenes || [],
    };
  } catch {
    return {
      ...raw,
      type_commande: raw.type_commande || 'commande_client',
      produit_id: raw.produit_id || null,
      produit_nom: raw.produit_nom || null,
      drive_subfolder_id: validSubfolder,
      brief_produit: cleanBrief,
      prompts_scenes: raw.prompts_scenes || [],
    };
  }
}

function serializeFocusTacheContenu(task: Partial<FocusTache>): string {
  const cleanText = (task.titre || task.contenu || '')
    .split(META_MARKER)[0]
    .replace(/^\[(Critique|Haute|Normale)\]\s*/i, '')
    .trim();
  const meta = {
    titre: cleanText,
    description: task.description || '',
    urgence: task.urgence || 'Normale',
    liens: task.liens || [],
    photos: task.photos || [],
  };
  return `${cleanText}${META_MARKER}${JSON.stringify(meta)}${META_END}`;
}

function deserializeFocusTache(raw: FocusTache): FocusTache {
  const contenuRaw = raw.contenu || '';
  const idx = contenuRaw.indexOf(META_MARKER);
  if (idx !== -1) {
    const cleanText = contenuRaw.slice(0, idx).trim();
    const jsonPart = contenuRaw
      .slice(idx + META_MARKER.length)
      .replace(/-->$/, '')
      .trim();
    try {
      const meta = JSON.parse(jsonPart);
      return {
        ...raw,
        contenu: meta.titre || cleanText,
        titre: meta.titre || cleanText,
        description: meta.description || '',
        urgence: meta.urgence || raw.urgence || 'Normale',
        liens: meta.liens || [],
        photos: meta.photos || [],
      };
    } catch {
      return {
        ...raw,
        contenu: cleanText,
        titre: cleanText,
        urgence: raw.urgence || 'Normale',
      };
    }
  }

  const match = contenuRaw.match(/^\[(Critique|Haute|Normale)\]\s*(.*)$/i);
  if (match) {
    const urg = (match[1].charAt(0).toUpperCase() +
      match[1].slice(1).toLowerCase()) as UrgenceNiveau;
    return {
      ...raw,
      urgence: urg,
      contenu: match[2],
      titre: match[2],
      description: raw.description || '',
      liens: raw.liens || [],
      photos: raw.photos || [],
    };
  }
  return {
    ...raw,
    titre: raw.titre || raw.contenu,
    description: raw.description || '',
    urgence: raw.urgence || 'Normale',
    liens: raw.liens || [],
    photos: raw.photos || [],
  };
}

interface StudioDataContextValue {
  isLoading: boolean;
  isLiveSupabase: boolean;
  rlsBlocked: boolean;
  prospects: Prospect[];
  commandes: CommandeUgc[];
  medias: MediaCreation[];
  prompts: PromptScript[];
  finances: Finance[];
  focusTaches: FocusTache[];
  monthlyGoalEur: number;
  goalHistory: GoalHistoryEntry[];
  savingsConfig: SavingsConfig;
  clientSubfolders: Record<string, DriveSubfolder[]>;
  setMonthlyGoalEur: (val: number, note?: string, realiseEur?: number) => void;
  deleteGoalHistoryEntry: (id: string) => void;
  updateSavingsConfig: (patch: Partial<SavingsConfig>) => void;
  addSavingsDeposit: (amountEur: number) => void;
  refreshAllData: () => Promise<void>;

  // Prospects
  addProspect: (
    data: Omit<Prospect, 'id' | 'created_at' | 'date_dernier_contact'>
  ) => Promise<Prospect>;
  updateProspectStatus: (
    id: string,
    statut: ProspectStatut
  ) => Promise<{ folderCreated?: boolean; folderId?: string | null }>;
  updateProspect: (id: string, patch: Partial<Prospect>) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>;
  createProspectDriveFolder: (prospectId: string) => Promise<string | null>;
  createClientSubfolder: (
    prospectId: string,
    subfolderName: string
  ) => Promise<DriveSubfolder | null>;

  // Client Products
  addClientProduct: (
    prospectId: string,
    product: Omit<ClientProduct, 'id' | 'created_at'>
  ) => Promise<ClientProduct | null>;
  updateClientProduct: (
    prospectId: string,
    productId: string,
    patch: Partial<ClientProduct>
  ) => Promise<void>;
  deleteClientProduct: (prospectId: string, productId: string) => Promise<void>;
  createProductDriveFolder: (
    prospectId: string,
    productId: string
  ) => Promise<string | null>;

  // Commandes UGC
  addCommande: (
    data: Omit<CommandeUgc, 'id' | 'created_at' | 'prospect'>
  ) => Promise<CommandeUgc>;
  updateCommandeStatutProduction: (
    id: string,
    statut_production: StatutProduction
  ) => Promise<void>;
  updateCommandeStatutPaiement: (
    id: string,
    statut_paiement: StatutPaiement
  ) => Promise<void>;
  updateCommande: (id: string, patch: Partial<CommandeUgc>) => Promise<void>;
  deleteCommande: (id: string) => Promise<void>;

  // Medias & Creations
  addMediaRecord: (media: MediaCreation) => void;
  toggleMediaReady: (id: string, pret_pour_livraison: boolean) => Promise<void>;
  deleteMedia: (id: string) => Promise<void>;

  // Prompts & Scripts
  addPrompt: (
    data: Omit<PromptScript, 'id' | 'created_at'>
  ) => Promise<PromptScript>;
  updatePrompt: (id: string, patch: Partial<PromptScript>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;

  // Finances
  addFinance: (data: Omit<Finance, 'id' | 'created_at'>) => Promise<Finance>;
  deleteFinance: (id: string) => Promise<void>;

  // Focus Taches & Idees
  addFocusTache: (
    type: 'tache_jour' | 'boite_idee',
    contenu: string,
    urgence?: UrgenceNiveau,
    extra?: {
      description?: string;
      liens?: string[];
      photos?: string[];
    }
  ) => Promise<{ ok: boolean; reason?: string }>;
  updateFocusTache: (id: string, patch: Partial<FocusTache>) => Promise<void>;
  toggleFocusTache: (id: string, est_termine: boolean) => Promise<void>;
  updateFocusTacheUrgence: (
    id: string,
    urgence: UrgenceNiveau
  ) => Promise<void>;
  convertIdeaToTask: (
    id: string,
    urgence?: UrgenceNiveau
  ) => Promise<{ ok: boolean; reason?: string }>;
  deleteFocusTache: (id: string) => Promise<void>;
}

const StudioDataContext = createContext<StudioDataContextValue | undefined>(
  undefined
);

const LIVE_STORAGE = {
  prospects: 'studio_h_live_prospects',
  commandes: 'studio_h_live_commandes',
  medias: 'studio_h_live_medias',
  prompts: 'studio_h_live_prompts',
  finances: 'studio_h_live_finances',
  focus: 'studio_h_live_focus',
  goal: 'studio_h_monthly_goal_v2',
  goalHistory: 'studio_h_goal_history_v1',
  savings: 'studio_h_savings_config_v1',
  subfolders: 'studio_h_subfolders_v2',
};

const DEFAULT_SAVINGS_CONFIG: SavingsConfig = {
  enabled: true,
  pourcentage_epargne: 20,
  base_calcul: 'benefice_net',
  objectif_epargne_eur: 10000,
  solde_actuel_eur: 0,
  nom_compte: 'Réserve Studio H',
  updated_at: new Date().toISOString(),
};

export function StudioDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveSupabase] = useState(true);
  const [rlsBlocked, setRlsBlocked] = useState(false);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [commandes, setCommandes] = useState<CommandeUgc[]>([]);
  const [medias, setMedias] = useState<MediaCreation[]>([]);
  const [prompts, setPrompts] = useState<PromptScript[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [focusTaches, setFocusTaches] = useState<FocusTache[]>([]);
  const [monthlyGoalEur, setMonthlyGoalState] = useState<number>(3000);
  const [goalHistory, setGoalHistory] = useState<GoalHistoryEntry[]>([]);
  const [savingsConfig, setSavingsConfig] = useState<SavingsConfig>(
    DEFAULT_SAVINGS_CONFIG
  );
  const [clientSubfolders, setClientSubfolders] = useState<
    Record<string, DriveSubfolder[]>
  >({});

  const refreshAllData = useCallback(async () => {
    try {
      const supabase = createClient();
      const [
        { data: pData, error: pErr },
        { data: cData, error: cErr },
        { data: mData, error: mErr },
        { data: prData, error: prErr },
        { data: fData, error: fErr },
        { data: ftData, error: ftErr },
      ] = await Promise.all([
        supabase
          .from('prospects')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('commandes_ugc')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('medias_creations')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('prompts_scripts')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('finances')
          .select('*')
          .order('date_transaction', { ascending: false }),
        supabase
          .from('focus_taches')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      const anyRlsErr = [pErr, cErr, mErr, prErr, fErr, ftErr].some(
        (e) => e && (e.code === '42501' || e.message?.includes('row-level'))
      );
      if (anyRlsErr) {
        setRlsBlocked(true);
      } else {
        setRlsBlocked(false);
      }

      if (!pErr && pData && pData.length > 0) {
        setProspects((pData as Prospect[]).map(deserializeProspect));
      }
      if (!cErr && cData && cData.length > 0) {
        setCommandes((cData as CommandeUgc[]).map(deserializeCommande));
      }
      if (!mErr && mData && mData.length > 0) {
        setMedias(mData as MediaCreation[]);
      }
      if (!prErr && prData && prData.length > 0) {
        setPrompts(prData as PromptScript[]);
      }
      if (!fErr && fData && fData.length > 0) {
        setFinances(fData as Finance[]);
      }
      if (!ftErr && ftData && ftData.length > 0) {
        setFocusTaches((ftData as FocusTache[]).map(deserializeFocusTache));
      }
    } catch {
      // Keep local cache on network error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Instant 0ms synchronous hydration from localStorage (no skeleton flash)
    try {
      const lp = localStorage.getItem(LIVE_STORAGE.prospects);
      const lc = localStorage.getItem(LIVE_STORAGE.commandes);
      const lm = localStorage.getItem(LIVE_STORAGE.medias);
      const lpr = localStorage.getItem(LIVE_STORAGE.prompts);
      const lf = localStorage.getItem(LIVE_STORAGE.finances);
      const lft = localStorage.getItem(LIVE_STORAGE.focus);

      if (lp)
        setProspects(
          (JSON.parse(lp) as Prospect[]).map(deserializeProspect)
        );
      if (lc)
        setCommandes(
          (JSON.parse(lc) as CommandeUgc[]).map(deserializeCommande)
        );
      if (lm) setMedias(JSON.parse(lm));
      if (lpr) setPrompts(JSON.parse(lpr));
      if (lf) setFinances(JSON.parse(lf));
      if (lft) {
        setFocusTaches(
          (JSON.parse(lft) as FocusTache[]).map(deserializeFocusTache)
        );
      }

      const savedGoal = localStorage.getItem(LIVE_STORAGE.goal);
      if (savedGoal) setMonthlyGoalState(Number(savedGoal) || 3000);

      const savedGoalHistory = localStorage.getItem(LIVE_STORAGE.goalHistory);
      if (savedGoalHistory) {
        setGoalHistory(JSON.parse(savedGoalHistory) as GoalHistoryEntry[]);
      }

      const savedSavings = localStorage.getItem(LIVE_STORAGE.savings);
      if (savedSavings) {
        setSavingsConfig({
          ...DEFAULT_SAVINGS_CONFIG,
          ...(JSON.parse(savedSavings) as Partial<SavingsConfig>),
        });
      }

      const savedSubfolders = localStorage.getItem(LIVE_STORAGE.subfolders);
      if (savedSubfolders) {
        const parsedSubs = JSON.parse(savedSubfolders) as Record<
          string,
          DriveSubfolder[]
        >;
        const cleanedSubs: Record<string, DriveSubfolder[]> = {};
        for (const [k, list] of Object.entries(parsedSubs)) {
          cleanedSubs[k] = (list || []).filter(
            (s) => s.id && !s.id.startsWith('drv_')
          );
        }
        setClientSubfolders(cleanedSubs);
      }
    } catch {
      // ignore
    }

    // 2. Non-blocking background sync with Supabase
    refreshAllData();
  }, [refreshAllData]);

  useEffect(() => {
    try {
      localStorage.setItem(LIVE_STORAGE.prospects, JSON.stringify(prospects));
      localStorage.setItem(LIVE_STORAGE.commandes, JSON.stringify(commandes));
      localStorage.setItem(LIVE_STORAGE.medias, JSON.stringify(medias));
      localStorage.setItem(LIVE_STORAGE.prompts, JSON.stringify(prompts));
      localStorage.setItem(LIVE_STORAGE.finances, JSON.stringify(finances));
      localStorage.setItem(LIVE_STORAGE.focus, JSON.stringify(focusTaches));
      localStorage.setItem(
        LIVE_STORAGE.subfolders,
        JSON.stringify(clientSubfolders)
      );
    } catch {
      // ignore
    }
  }, [
    prospects,
    commandes,
    medias,
    prompts,
    finances,
    focusTaches,
    clientSubfolders,
  ]);

  const setMonthlyGoalEur = useCallback(
    (val: number, note?: string, realiseEur?: number) => {
      const clean = Math.max(100, Number(val) || 3000);
      setMonthlyGoalState(clean);
      const now = new Date();
      const mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const entry: GoalHistoryEntry = {
        id: `goal_${Date.now()}`,
        mois,
        objectif_eur: clean,
        realise_eur: typeof realiseEur === 'number' ? realiseEur : undefined,
        note: note?.trim() || undefined,
        updated_at: now.toISOString(),
      };
      setGoalHistory((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        try {
          localStorage.setItem(LIVE_STORAGE.goalHistory, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      try {
        localStorage.setItem(LIVE_STORAGE.goal, String(clean));
      } catch {
        // ignore
      }
    },
    []
  );

  const deleteGoalHistoryEntry = useCallback((id: string) => {
    setGoalHistory((prev) => {
      const next = prev.filter((g) => g.id !== id);
      try {
        localStorage.setItem(LIVE_STORAGE.goalHistory, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const updateSavingsConfig = useCallback((patch: Partial<SavingsConfig>) => {
    setSavingsConfig((prev) => {
      const next: SavingsConfig = {
        ...prev,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LIVE_STORAGE.savings, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const addSavingsDeposit = useCallback((amountEur: number) => {
    if (!Number.isFinite(amountEur) || amountEur === 0) return;
    setSavingsConfig((prev) => {
      const next: SavingsConfig = {
        ...prev,
        solde_actuel_eur: Math.max(0, Number((prev.solde_actuel_eur + amountEur).toFixed(2))),
        updated_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(LIVE_STORAGE.savings, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // --- PROSPECTS ---
  const createProspectDriveFolder = useCallback(
    async (prospectId: string): Promise<string | null> => {
      const target = prospects.find((p) => p.id === prospectId);
      if (!target) return null;
      const existingRealId = cleanDriveId(target.drive_folder_id);
      if (existingRealId) return existingRealId;

      try {
        const res = await fetch('/api/drive/create-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectId: target.id,
            nomMarque: target.nom_marque,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur API Drive');

        const folderId = data.folderId as string;
        setProspects((prev) =>
          prev.map((p) =>
            p.id === prospectId ? { ...p, drive_folder_id: folderId } : p
          )
        );

        try {
          const supabase = createClient();
          await supabase
            .from('prospects')
            .update({ drive_folder_id: folderId })
            .eq('id', prospectId);
        } catch {
          // ignore
        }

        toast({
          title: 'Dossier Google Drive créé',
          description: `Dossier Client_${target.nom_marque.replace(/\s+/g, '_')} créé dans "Studio H - Clients" sur votre Google Drive.`,
          type: 'success',
        });

        return folderId;
      } catch (err) {
        toast({
          title: 'Erreur Google Drive',
          description:
            err instanceof Error
              ? err.message
              : 'Impossible de créer le dossier Drive.',
          type: 'error',
        });
        return null;
      }
    },
    [prospects, toast]
  );

  const createClientSubfolder = useCallback(
    async (
      prospectId: string,
      subfolderName: string
    ): Promise<DriveSubfolder | null> => {
      const target = prospects.find((p) => p.id === prospectId);
      if (!target || !subfolderName.trim()) return null;

      try {
        let parentId = cleanDriveId(target.drive_folder_id);
        if (!parentId) {
          parentId = await createProspectDriveFolder(prospectId);
        }

        const res = await fetch('/api/drive/create-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectId,
            nomMarque: target.nom_marque,
            parentFolderId: parentId || undefined,
            subfolderName: subfolderName.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || 'Erreur création sous-dossier');

        const newSub: DriveSubfolder = {
          id: data.folderId,
          name: data.folderName,
          webViewLink: data.webViewLink,
          createdTime: new Date().toISOString(),
        };

        setClientSubfolders((prev) => ({
          ...prev,
          [prospectId]: [newSub, ...(prev[prospectId] || [])],
        }));

        toast({
          title: 'Sous-dossier Drive créé',
          description: `Le sous-dossier "${newSub.name}" est disponible sur Google Drive.`,
          type: 'success',
        });

        return newSub;
      } catch (err) {
        toast({
          title: 'Erreur création sous-dossier',
          description:
            err instanceof Error ? err.message : 'Une erreur est survenue.',
          type: 'error',
        });
        return null;
      }
    },
    [prospects, createProspectDriveFolder, toast]
  );

  const addProspect = useCallback(
    async (
      data: Omit<Prospect, 'id' | 'created_at' | 'date_dernier_contact'>
    ): Promise<Prospect> => {
      const nowIso = new Date().toISOString();
      const optimistic: Prospect = {
        ...data,
        id: crypto.randomUUID(),
        date_dernier_contact: nowIso,
        created_at: nowIso,
      };

      setProspects((prev) => [optimistic, ...prev]);

      try {
        const supabase = createClient();
        const encodedNotes = serializeProspectNotes(data);
        const { data: inserted, error } = await supabase
          .from('prospects')
          .insert({
            nom_marque: data.nom_marque,
            pays: data.pays,
            contact_nom: data.contact_nom,
            contact_email: data.contact_email,
            lien_boutique: data.lien_boutique,
            statut: data.statut,
            valeur_estimee_eur: data.valeur_estimee_eur,
            drive_folder_id: data.drive_folder_id,
            notes_strategiques: encodedNotes,
          })
          .select('*')
          .single();

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level')) {
            setRlsBlocked(true);
          }
        } else if (inserted) {
          const real = deserializeProspect(inserted as Prospect);
          setProspects((prev) =>
            prev.map((p) => (p.id === optimistic.id ? real : p))
          );
          if (real.statut === 'Signé' && !real.drive_folder_id) {
            await createProspectDriveFolder(real.id);
          }
          return real;
        }
      } catch {
        // Optimistic entry stays saved locally
      }

      if (optimistic.statut === 'Signé' && !optimistic.drive_folder_id) {
        await createProspectDriveFolder(optimistic.id);
      }

      return optimistic;
    },
    [createProspectDriveFolder]
  );

  const updateProspectStatus = useCallback(
    async (id: string, statut: ProspectStatut) => {
      const nowIso = new Date().toISOString();
      const existing = prospects.find((p) => p.id === id);

      setProspects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, statut, date_dernier_contact: nowIso } : p
        )
      );

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('prospects')
          .update({ statut, date_dernier_contact: nowIso })
          .eq('id', id);
        if (
          error &&
          (error.code === '42501' || error.message?.includes('row-level'))
        ) {
          setRlsBlocked(true);
        }
      } catch {
        // ignore
      }

      if (
        statut === 'Signé' &&
        existing &&
        !cleanDriveId(existing.drive_folder_id)
      ) {
        const folderId = await createProspectDriveFolder(id);
        return { folderCreated: Boolean(folderId), folderId };
      }

      return {
        folderCreated: false,
        folderId: cleanDriveId(existing?.drive_folder_id),
      };
    },
    [prospects, createProspectDriveFolder]
  );

  const updateProspect = useCallback(
    async (id: string, patch: Partial<Prospect>) => {
      let merged: Prospect | undefined;
      setProspects((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            merged = { ...p, ...patch };
            return merged;
          }
          return p;
        })
      );

      if (merged) {
        try {
          const supabase = createClient();
          const encodedNotes = serializeProspectNotes(merged);
          const { error } = await supabase
            .from('prospects')
            .update({
              nom_marque: merged.nom_marque,
              pays: merged.pays,
              contact_nom: merged.contact_nom,
              contact_email: merged.contact_email,
              lien_boutique: merged.lien_boutique,
              statut: merged.statut,
              valeur_estimee_eur: merged.valeur_estimee_eur,
              drive_folder_id: merged.drive_folder_id,
              notes_strategiques: encodedNotes,
              date_dernier_contact: merged.date_dernier_contact,
            })
            .eq('id', id);
          if (
            error &&
            (error.code === '42501' || error.message?.includes('row-level'))
          ) {
            setRlsBlocked(true);
          }
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const deleteProspect = useCallback(async (id: string) => {
    setProspects((prev) => prev.filter((p) => p.id !== id));
    setCommandes((prev) => prev.filter((c) => c.prospect_id !== id));

    try {
      const supabase = createClient();
      await supabase.from('prospects').delete().eq('id', id);
    } catch {
      // ignore
    }
  }, []);

  // --- CLIENT PRODUCTS ---
  const addClientProduct = useCallback(
    async (
      prospectId: string,
      product: Omit<ClientProduct, 'id' | 'created_at'>
    ): Promise<ClientProduct | null> => {
      const target = prospects.find((p) => p.id === prospectId);
      if (!target) return null;

      const newProduct: ClientProduct = {
        ...product,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      const nextProducts = [newProduct, ...(target.produits || [])];
      await updateProspect(prospectId, { produits: nextProducts });
      return newProduct;
    },
    [prospects, updateProspect]
  );

  const updateClientProduct = useCallback(
    async (
      prospectId: string,
      productId: string,
      patch: Partial<ClientProduct>
    ) => {
      const target = prospects.find((p) => p.id === prospectId);
      if (!target) return;

      const nextProducts = (target.produits || []).map((prod) =>
        prod.id === productId ? { ...prod, ...patch } : prod
      );
      await updateProspect(prospectId, { produits: nextProducts });
    },
    [prospects, updateProspect]
  );

  const deleteClientProduct = useCallback(
    async (prospectId: string, productId: string) => {
      const target = prospects.find((p) => p.id === prospectId);
      if (!target) return;

      const nextProducts = (target.produits || []).filter(
        (prod) => prod.id !== productId
      );
      await updateProspect(prospectId, { produits: nextProducts });
    },
    [prospects, updateProspect]
  );

  const createProductDriveFolder = useCallback(
    async (prospectId: string, productId: string): Promise<string | null> => {
      const target = prospects.find((p) => p.id === prospectId);
      const product = (target?.produits || []).find((pr) => pr.id === productId);
      if (!target || !product) return null;

      const existing = cleanDriveId(product.drive_folder_id);
      if (existing) return existing;

      try {
        let parentId = cleanDriveId(target.drive_folder_id);
        if (!parentId) {
          parentId = await createProspectDriveFolder(prospectId);
        }

        const folderName = `Produit_${product.nom_produit
          .trim()
          .replace(/\s+/g, '_')}`;

        const res = await fetch('/api/drive/create-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectId: target.id,
            nomMarque: target.nom_marque,
            parentFolderId: parentId || undefined,
            subfolderName: folderName,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur API Drive');

        const folderId = data.folderId as string;
        await updateClientProduct(prospectId, productId, {
          drive_folder_id: folderId,
        });

        toast({
          title: 'Dossier Drive du produit créé',
          description: `Sous-dossier "${folderName}" créé dans le Drive de ${target.nom_marque}.`,
          type: 'success',
        });
        return folderId;
      } catch (err) {
        toast({
          title: 'Erreur Google Drive Produit',
          description:
            err instanceof Error ? err.message : 'Création impossible.',
          type: 'error',
        });
        return null;
      }
    },
    [prospects, createProspectDriveFolder, updateClientProduct, toast]
  );

  // --- COMMANDES UGC ---
  const addCommande = useCallback(
    async (
      data: Omit<CommandeUgc, 'id' | 'created_at' | 'prospect'>
    ): Promise<CommandeUgc> => {
      const optimistic: CommandeUgc = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      setCommandes((prev) => [optimistic, ...prev]);

      try {
        const supabase = createClient();
        const encodedBrief = serializeCommandeBrief(data);
        const { data: inserted, error } = await supabase
          .from('commandes_ugc')
          .insert({
            prospect_id: data.prospect_id,
            nom_pack: data.nom_pack,
            brief_produit: encodedBrief,
            statut_production: data.statut_production,
            montant_eur: data.montant_eur,
            statut_paiement: data.statut_paiement,
            nombre_creations: data.nombre_creations,
            drive_subfolder_id: data.drive_subfolder_id,
            lien_livraison_public: data.lien_livraison_public,
            date_limite: data.date_limite,
          })
          .select('*')
          .single();

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level')) {
            setRlsBlocked(true);
          }
        } else if (inserted) {
          const real = deserializeCommande(inserted as CommandeUgc);
          setCommandes((prev) =>
            prev.map((c) => (c.id === optimistic.id ? real : c))
          );
          return real;
        }
      } catch {
        // ignore
      }

      return optimistic;
    },
    []
  );

  const updateCommandeStatutProduction = useCallback(
    async (id: string, statut_production: StatutProduction) => {
      setCommandes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, statut_production } : c))
      );

      try {
        const supabase = createClient();
        await supabase
          .from('commandes_ugc')
          .update({ statut_production })
          .eq('id', id);
      } catch {
        // ignore
      }
    },
    []
  );

  const updateCommandeStatutPaiement = useCallback(
    async (id: string, statut_paiement: StatutPaiement) => {
      setCommandes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, statut_paiement } : c))
      );

      try {
        const supabase = createClient();
        await supabase
          .from('commandes_ugc')
          .update({ statut_paiement })
          .eq('id', id);
      } catch {
        // ignore
      }
    },
    []
  );

  const updateCommande = useCallback(
    async (id: string, patch: Partial<CommandeUgc>) => {
      let merged: CommandeUgc | undefined;
      setCommandes((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            merged = { ...c, ...patch };
            return merged;
          }
          return c;
        })
      );

      if (merged) {
        try {
          const supabase = createClient();
          const encodedBrief = serializeCommandeBrief(merged);
          await supabase
            .from('commandes_ugc')
            .update({
              nom_pack: merged.nom_pack,
              brief_produit: encodedBrief,
              statut_production: merged.statut_production,
              montant_eur: merged.montant_eur,
              statut_paiement: merged.statut_paiement,
              nombre_creations: merged.nombre_creations,
              drive_subfolder_id: merged.drive_subfolder_id,
              lien_livraison_public: merged.lien_livraison_public,
              date_limite: merged.date_limite,
            })
            .eq('id', id);
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const deleteCommande = useCallback(async (id: string) => {
    setCommandes((prev) => prev.filter((c) => c.id !== id));
    setMedias((prev) => prev.filter((m) => m.commande_id !== id));

    try {
      const supabase = createClient();
      await supabase.from('commandes_ugc').delete().eq('id', id);
    } catch {
      // ignore
    }
  }, []);

  // --- MEDIAS & CREATIONS ---
  const addMediaRecord = useCallback((media: MediaCreation) => {
    setMedias((prev) => [media, ...prev]);
  }, []);

  const toggleMediaReady = useCallback(
    async (id: string, pret_pour_livraison: boolean) => {
      setMedias((prev) =>
        prev.map((m) => (m.id === id ? { ...m, pret_pour_livraison } : m))
      );

      try {
        const supabase = createClient();
        await supabase
          .from('medias_creations')
          .update({ pret_pour_livraison })
          .eq('id', id);
      } catch {
        // ignore
      }
    },
    []
  );

  const deleteMedia = useCallback(async (id: string) => {
    setMedias((prev) => prev.filter((m) => m.id !== id));

    try {
      const supabase = createClient();
      await supabase.from('medias_creations').delete().eq('id', id);
    } catch {
      // ignore
    }
  }, []);

  // --- PROMPTS & SCRIPTS ---
  const addPrompt = useCallback(
    async (
      data: Omit<PromptScript, 'id' | 'created_at'>
    ): Promise<PromptScript> => {
      const optimistic: PromptScript = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      setPrompts((prev) => [optimistic, ...prev]);

      try {
        const supabase = createClient();
        const { data: inserted, error } = await supabase
          .from('prompts_scripts')
          .insert(data)
          .select('*')
          .single();

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level')) {
            setRlsBlocked(true);
          }
        } else if (inserted) {
          const real = inserted as PromptScript;
          setPrompts((prev) =>
            prev.map((p) => (p.id === optimistic.id ? real : p))
          );
          return real;
        }
      } catch {
        // ignore
      }

      return optimistic;
    },
    []
  );

  const updatePrompt = useCallback(
    async (id: string, patch: Partial<PromptScript>) => {
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );

      try {
        const supabase = createClient();
        await supabase.from('prompts_scripts').update(patch).eq('id', id);
      } catch {
        // ignore
      }
    },
    []
  );

  const deletePrompt = useCallback(async (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));

    try {
      const supabase = createClient();
      await supabase.from('prompts_scripts').delete().eq('id', id);
    } catch {
      // ignore
    }
  }, []);

  // --- FINANCES ---
  const addFinance = useCallback(
    async (data: Omit<Finance, 'id' | 'created_at'>): Promise<Finance> => {
      const optimistic: Finance = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      setFinances((prev) => [optimistic, ...prev]);

      try {
        const supabase = createClient();
        const { data: inserted, error } = await supabase
          .from('finances')
          .insert(data)
          .select('*')
          .single();

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level')) {
            setRlsBlocked(true);
          }
        } else if (inserted) {
          const real = inserted as Finance;
          setFinances((prev) =>
            prev.map((f) => (f.id === optimistic.id ? real : f))
          );
          return real;
        }
      } catch {
        // ignore
      }

      return optimistic;
    },
    []
  );

  const deleteFinance = useCallback(async (id: string) => {
    setFinances((prev) => prev.filter((f) => f.id !== id));

    try {
      const supabase = createClient();
      await supabase.from('finances').delete().eq('id', id);
    } catch {
      // ignore
    }
  }, []);

  // --- FOCUS TACHES & IDEES ---
  const addFocusTache = useCallback(
    async (
      type: 'tache_jour' | 'boite_idee',
      contenu: string,
      urgence: UrgenceNiveau = 'Normale',
      extra?: {
        description?: string;
        liens?: string[];
        photos?: string[];
      }
    ): Promise<{ ok: boolean; reason?: string }> => {
      if (type === 'tache_jour') {
        const activeDailyCount = focusTaches.filter(
          (t) => t.type === 'tache_jour' && !t.est_termine
        ).length;
        if (activeDailyCount >= 10) {
          return {
            ok: false,
            reason:
              'Limite de 10 tâches actives atteinte : terminez ou supprimez une tâche avant d’en ajouter une nouvelle.',
          };
        }
      }

      const cleanTitle = contenu.trim();
      const optimistic: FocusTache = {
        id: crypto.randomUUID(),
        type,
        contenu: cleanTitle,
        titre: cleanTitle,
        description: extra?.description?.trim() || '',
        liens: extra?.liens || [],
        photos: extra?.photos || [],
        urgence: type === 'tache_jour' ? urgence : 'Normale',
        est_termine: false,
        created_at: new Date().toISOString(),
      };

      setFocusTaches((prev) => [optimistic, ...prev]);

      try {
        const supabase = createClient();
        const encodedContenu = serializeFocusTacheContenu(optimistic);

        const { data: inserted, error } = await supabase
          .from('focus_taches')
          .insert({
            type,
            contenu: encodedContenu,
            est_termine: false,
          })
          .select('*')
          .single();

        if (error) {
          if (error.code === '42501' || error.message?.includes('row-level')) {
            setRlsBlocked(true);
          }
        } else if (inserted) {
          const parsed = deserializeFocusTache(inserted as FocusTache);
          setFocusTaches((prev) =>
            prev.map((t) => (t.id === optimistic.id ? parsed : t))
          );
        }
      } catch {
        // Optimistic item remains saved locally
      }

      return { ok: true };
    },
    [focusTaches]
  );

  const updateFocusTache = useCallback(
    async (id: string, patch: Partial<FocusTache>) => {
      let merged: FocusTache | undefined;
      setFocusTaches((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            merged = {
              ...t,
              ...patch,
              contenu: patch.titre || patch.contenu || t.contenu,
            };
            return merged;
          }
          return t;
        })
      );

      if (merged) {
        try {
          const supabase = createClient();
          await supabase
            .from('focus_taches')
            .update({
              type: merged.type,
              contenu: serializeFocusTacheContenu(merged),
              est_termine: merged.est_termine,
            })
            .eq('id', id);
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const toggleFocusTache = useCallback(
    async (id: string, est_termine: boolean) => {
      setFocusTaches((prev) =>
        prev.map((t) => (t.id === id ? { ...t, est_termine } : t))
      );

      try {
        const supabase = createClient();
        await supabase
          .from('focus_taches')
          .update({ est_termine })
          .eq('id', id);
      } catch {
        // ignore
      }
    },
    []
  );

  const updateFocusTacheUrgence = useCallback(
    async (id: string, urgence: UrgenceNiveau) => {
      await updateFocusTache(id, { urgence });
    },
    [updateFocusTache]
  );

  const convertIdeaToTask = useCallback(
    async (
      id: string,
      urgence: UrgenceNiveau = 'Haute'
    ): Promise<{ ok: boolean; reason?: string }> => {
      const activeDailyCount = focusTaches.filter(
        (t) => t.type === 'tache_jour' && !t.est_termine
      ).length;

      if (activeDailyCount >= 10) {
        return {
          ok: false,
          reason:
            'Vous avez déjà 10 tâches actives. Terminez-en une avant de convertir cette idée.',
        };
      }

      await updateFocusTache(id, {
        type: 'tache_jour',
        urgence,
        est_termine: false,
      });

      return { ok: true };
    },
    [focusTaches, updateFocusTache]
  );

  const deleteFocusTache = useCallback(async (id: string) => {
    setFocusTaches((prev) => prev.filter((t) => t.id !== id));

    try {
      const supabase = createClient();
      await supabase.from('focus_taches').delete().eq('id', id);
    } catch {
      // ignore
    }
  }, []);

  return (
    <StudioDataContext.Provider
      value={{
        isLoading,
        isLiveSupabase,
        rlsBlocked,
        prospects,
        commandes,
        medias,
        prompts,
        finances,
        focusTaches,
        monthlyGoalEur,
        goalHistory,
        savingsConfig,
        clientSubfolders,
        setMonthlyGoalEur,
        deleteGoalHistoryEntry,
        updateSavingsConfig,
        addSavingsDeposit,
        refreshAllData,
        addProspect,
        updateProspectStatus,
        updateProspect,
        deleteProspect,
        createProspectDriveFolder,
        createClientSubfolder,
        addClientProduct,
        updateClientProduct,
        deleteClientProduct,
        createProductDriveFolder,
        addCommande,
        updateCommandeStatutProduction,
        updateCommandeStatutPaiement,
        updateCommande,
        deleteCommande,
        addMediaRecord,
        toggleMediaReady,
        deleteMedia,
        addPrompt,
        updatePrompt,
        deletePrompt,
        addFinance,
        deleteFinance,
        addFocusTache,
        updateFocusTache,
        toggleFocusTache,
        updateFocusTacheUrgence,
        convertIdeaToTask,
        deleteFocusTache,
      }}
    >
      {children}
    </StudioDataContext.Provider>
  );
}

export function useStudioData() {
  const ctx = useContext(StudioDataContext);
  if (!ctx) {
    throw new Error('useStudioData doit être utilisé dans un StudioDataProvider');
  }
  return ctx;
}
