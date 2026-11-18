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
  CommandeUgc,
  StatutProduction,
  StatutPaiement,
  MediaCreation,
  PromptScript,
  Finance,
  FocusTache,
  UrgenceNiveau,
  DriveSubfolder,
} from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { useToast } from './ToastContext';

interface StudioDataContextValue {
  isLoading: boolean;
  isLiveSupabase: boolean;
  prospects: Prospect[];
  commandes: CommandeUgc[];
  medias: MediaCreation[];
  prompts: PromptScript[];
  finances: Finance[];
  focusTaches: FocusTache[];
  monthlyGoalEur: number;
  clientSubfolders: Record<string, DriveSubfolder[]>;
  setMonthlyGoalEur: (val: number) => void;
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

  // Focus Taches & Idees (10 tasks max + urgency level)
  addFocusTache: (
    type: 'tache_jour' | 'boite_idee',
    contenu: string,
    urgence?: UrgenceNiveau
  ) => Promise<{ ok: boolean; reason?: string }>;
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
  subfolders: 'studio_h_subfolders_v2',
};

function parseUrgenceFromTask(task: FocusTache): FocusTache {
  if (task.urgence) return task;
  const match = task.contenu.match(/^\[(Critique|Haute|Normale)\]\s*(.*)$/i);
  if (match) {
    const urg = (match[1].charAt(0).toUpperCase() +
      match[1].slice(1).toLowerCase()) as UrgenceNiveau;
    return {
      ...task,
      urgence: urg,
      contenu: match[2],
    };
  }
  return {
    ...task,
    urgence: 'Normale',
  };
}

function encodeTaskContent(contenu: string, urgence?: UrgenceNiveau): string {
  const clean = contenu.replace(/^\[(Critique|Haute|Normale)\]\s*/i, '').trim();
  if (!urgence) return clean;
  return `[${urgence}] ${clean}`;
}

export function StudioDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSupabase] = useState(true);

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [commandes, setCommandes] = useState<CommandeUgc[]>([]);
  const [medias, setMedias] = useState<MediaCreation[]>([]);
  const [prompts, setPrompts] = useState<PromptScript[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [focusTaches, setFocusTaches] = useState<FocusTache[]>([]);
  const [monthlyGoalEur, setMonthlyGoalState] = useState<number>(3000);
  const [clientSubfolders, setClientSubfolders] = useState<
    Record<string, DriveSubfolder[]>
  >({});

  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    // 1. Load local cache first so user data is never lost
    try {
      const lp = localStorage.getItem(LIVE_STORAGE.prospects);
      const lc = localStorage.getItem(LIVE_STORAGE.commandes);
      const lm = localStorage.getItem(LIVE_STORAGE.medias);
      const lpr = localStorage.getItem(LIVE_STORAGE.prompts);
      const lf = localStorage.getItem(LIVE_STORAGE.finances);
      const lft = localStorage.getItem(LIVE_STORAGE.focus);

      if (lp) setProspects(JSON.parse(lp));
      if (lc) setCommandes(JSON.parse(lc));
      if (lm) setMedias(JSON.parse(lm));
      if (lpr) setPrompts(JSON.parse(lpr));
      if (lf) setFinances(JSON.parse(lf));
      if (lft) {
        const parsed = JSON.parse(lft) as FocusTache[];
        setFocusTaches(parsed.map(parseUrgenceFromTask));
      }
    } catch {
      // ignore
    }

    // 2. Sync with Supabase if permissions are open
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

      if (!pErr && pData && pData.length > 0) setProspects(pData as Prospect[]);
      if (!cErr && cData && cData.length > 0)
        setCommandes(cData as CommandeUgc[]);
      if (!mErr && mData && mData.length > 0)
        setMedias(mData as MediaCreation[]);
      if (!prErr && prData && prData.length > 0)
        setPrompts(prData as PromptScript[]);
      if (!fErr && fData && fData.length > 0) setFinances(fData as Finance[]);
      if (!ftErr && ftData && ftData.length > 0) {
        setFocusTaches((ftData as FocusTache[]).map(parseUrgenceFromTask));
      }
    } catch {
      // Keep local state if Supabase is unreachable or RLS blocked
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      [
        'studio_h_prospects_v1',
        'studio_h_commandes_v1',
        'studio_h_medias_v1',
        'studio_h_prompts_v1',
        'studio_h_finances_v1',
        'studio_h_focus_v1',
        'studio_h_subfolders_v1',
      ].forEach((k) => localStorage.removeItem(k));

      const savedGoal = localStorage.getItem(LIVE_STORAGE.goal);
      if (savedGoal) setMonthlyGoalState(Number(savedGoal) || 3000);

      const savedSubfolders = localStorage.getItem(LIVE_STORAGE.subfolders);
      if (savedSubfolders) {
        setClientSubfolders(JSON.parse(savedSubfolders));
      }
    } catch {
      // ignore
    }

    refreshAllData();
  }, [refreshAllData]);

  // Persist live state to localStorage on every change
  useEffect(() => {
    if (isLoading) return;
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
    isLoading,
    prospects,
    commandes,
    medias,
    prompts,
    finances,
    focusTaches,
    clientSubfolders,
  ]);

  const setMonthlyGoalEur = useCallback((val: number) => {
    const clean = Math.max(100, Number(val) || 3000);
    setMonthlyGoalState(clean);
    try {
      localStorage.setItem(LIVE_STORAGE.goal, String(clean));
    } catch {
      // ignore
    }
  }, []);

  // --- PROSPECTS ---
  const createProspectDriveFolder = useCallback(
    async (prospectId: string): Promise<string | null> => {
      const target = prospects.find((p) => p.id === prospectId);
      if (!target) return null;
      if (target.drive_folder_id) return target.drive_folder_id;

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
          description: `Dossier Client_${target.nom_marque.replace(/\s+/g, '_')} créé sur votre Google Drive.`,
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
        let parentId = target.drive_folder_id;
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
            notes_strategiques: data.notes_strategiques,
          })
          .select('*')
          .single();

        if (!error && inserted) {
          const real = inserted as Prospect;
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
        await supabase
          .from('prospects')
          .update({ statut, date_dernier_contact: nowIso })
          .eq('id', id);
      } catch {
        // ignore
      }

      if (statut === 'Signé' && existing && !existing.drive_folder_id) {
        const folderId = await createProspectDriveFolder(id);
        return { folderCreated: Boolean(folderId), folderId };
      }

      return { folderCreated: false, folderId: existing?.drive_folder_id };
    },
    [prospects, createProspectDriveFolder]
  );

  const updateProspect = useCallback(
    async (id: string, patch: Partial<Prospect>) => {
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );

      try {
        const supabase = createClient();
        await supabase.from('prospects').update(patch).eq('id', id);
      } catch {
        // ignore
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
        const { data: inserted, error } = await supabase
          .from('commandes_ugc')
          .insert({
            prospect_id: data.prospect_id,
            nom_pack: data.nom_pack,
            brief_produit: data.brief_produit,
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

        if (!error && inserted) {
          const real = inserted as CommandeUgc;
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
      setCommandes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );

      try {
        const supabase = createClient();
        await supabase.from('commandes_ugc').update(patch).eq('id', id);
      } catch {
        // ignore
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

        if (!error && inserted) {
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

        if (!error && inserted) {
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

  // --- FOCUS TACHES & IDEES (MAX 10 ACTIVE TASKS + URGENCY LEVEL) ---
  const addFocusTache = useCallback(
    async (
      type: 'tache_jour' | 'boite_idee',
      contenu: string,
      urgence: UrgenceNiveau = 'Normale'
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

      const cleanText = contenu.trim();
      const optimistic: FocusTache = {
        id: crypto.randomUUID(),
        type,
        contenu: cleanText,
        urgence: type === 'tache_jour' ? urgence : 'Normale',
        est_termine: false,
        created_at: new Date().toISOString(),
      };

      // Instant Optimistic UI update
      setFocusTaches((prev) => [optimistic, ...prev]);

      // Background sync to Supabase
      try {
        const supabase = createClient();
        const encodedContenu =
          type === 'tache_jour'
            ? encodeTaskContent(cleanText, urgence)
            : cleanText;

        const { data: inserted, error } = await supabase
          .from('focus_taches')
          .insert({
            type,
            contenu: encodedContenu,
            est_termine: false,
          })
          .select('*')
          .single();

        if (!error && inserted) {
          const parsed = parseUrgenceFromTask(inserted as FocusTache);
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
      const target = focusTaches.find((t) => t.id === id);
      setFocusTaches((prev) =>
        prev.map((t) => (t.id === id ? { ...t, urgence } : t))
      );

      if (target) {
        try {
          const supabase = createClient();
          await supabase
            .from('focus_taches')
            .update({
              contenu: encodeTaskContent(target.contenu, urgence),
            })
            .eq('id', id);
        } catch {
          // ignore
        }
      }
    },
    [focusTaches]
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

      const target = focusTaches.find((t) => t.id === id);

      setFocusTaches((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, type: 'tache_jour', urgence, est_termine: false }
            : t
        )
      );

      if (target) {
        try {
          const supabase = createClient();
          await supabase
            .from('focus_taches')
            .update({
              type: 'tache_jour',
              contenu: encodeTaskContent(target.contenu, urgence),
              est_termine: false,
            })
            .eq('id', id);
        } catch {
          // ignore
        }
      }

      return { ok: true };
    },
    [focusTaches]
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
        prospects,
        commandes,
        medias,
        prompts,
        finances,
        focusTaches,
        monthlyGoalEur,
        clientSubfolders,
        setMonthlyGoalEur,
        refreshAllData,
        addProspect,
        updateProspectStatus,
        updateProspect,
        deleteProspect,
        createProspectDriveFolder,
        createClientSubfolder,
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
