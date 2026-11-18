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
  ) => Promise<Prospect | null>;
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
  ) => Promise<CommandeUgc | null>;
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
  ) => Promise<PromptScript | null>;
  updatePrompt: (id: string, patch: Partial<PromptScript>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;

  // Finances
  addFinance: (data: Omit<Finance, 'id' | 'created_at'>) => Promise<Finance | null>;
  deleteFinance: (id: string) => Promise<void>;

  // Focus Taches & Idees
  addFocusTache: (
    type: 'tache_jour' | 'boite_idee',
    contenu: string
  ) => Promise<{ ok: boolean; reason?: string }>;
  toggleFocusTache: (id: string, est_termine: boolean) => Promise<void>;
  convertIdeaToTask: (id: string) => Promise<{ ok: boolean; reason?: string }>;
  deleteFocusTache: (id: string) => Promise<void>;
}

const StudioDataContext = createContext<StudioDataContextValue | undefined>(
  undefined
);

const GOAL_STORAGE_KEY = 'studio_h_monthly_goal_v2';
const SUBFOLDERS_STORAGE_KEY = 'studio_h_subfolders_v2';

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

      if (pErr || cErr || mErr || prErr || fErr || ftErr) {
        const firstErr = pErr || cErr || mErr || prErr || fErr || ftErr;
        console.error('Erreur lecture Supabase:', firstErr);
      }

      setProspects((pData as Prospect[]) || []);
      setCommandes((cData as CommandeUgc[]) || []);
      setMedias((mData as MediaCreation[]) || []);
      setPrompts((prData as PromptScript[]) || []);
      setFinances((fData as Finance[]) || []);
      setFocusTaches((ftData as FocusTache[]) || []);
    } catch (err) {
      console.error('Erreur chargement Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Purge old demo localStorage keys and fetch real Supabase data
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

      const savedGoal = localStorage.getItem(GOAL_STORAGE_KEY);
      if (savedGoal) setMonthlyGoalState(Number(savedGoal) || 3000);

      const savedSubfolders = localStorage.getItem(SUBFOLDERS_STORAGE_KEY);
      if (savedSubfolders) {
        setClientSubfolders(JSON.parse(savedSubfolders));
      }
    } catch {
      // Ignore storage error
    }

    refreshAllData();
  }, [refreshAllData]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SUBFOLDERS_STORAGE_KEY,
        JSON.stringify(clientSubfolders)
      );
    } catch {
      // ignore
    }
  }, [clientSubfolders]);

  const setMonthlyGoalEur = useCallback((val: number) => {
    const clean = Math.max(100, Number(val) || 3000);
    setMonthlyGoalState(clean);
    try {
      localStorage.setItem(GOAL_STORAGE_KEY, String(clean));
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

        const supabase = createClient();
        await supabase
          .from('prospects')
          .update({ drive_folder_id: folderId })
          .eq('id', prospectId);

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
    ): Promise<Prospect | null> => {
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

      if (error || !inserted) {
        toast({
          title: 'Erreur Supabase (prospects)',
          description: error?.message || "Impossible d'enregistrer le prospect.",
          type: 'error',
        });
        return null;
      }

      const createdProspect = inserted as Prospect;
      setProspects((prev) => [createdProspect, ...prev]);

      if (createdProspect.statut === 'Signé' && !createdProspect.drive_folder_id) {
        await createProspectDriveFolder(createdProspect.id);
      }

      return createdProspect;
    },
    [createProspectDriveFolder, toast]
  );

  const updateProspectStatus = useCallback(
    async (id: string, statut: ProspectStatut) => {
      const nowIso = new Date().toISOString();
      const existing = prospects.find((p) => p.id === id);

      // Optimistic UI update
      setProspects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, statut, date_dernier_contact: nowIso } : p
        )
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('prospects')
        .update({ statut, date_dernier_contact: nowIso })
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur synchronisation statut',
          description: error.message,
          type: 'error',
        });
      }

      if (statut === 'Signé' && existing && !existing.drive_folder_id) {
        const folderId = await createProspectDriveFolder(id);
        return { folderCreated: Boolean(folderId), folderId };
      }

      return { folderCreated: false, folderId: existing?.drive_folder_id };
    },
    [prospects, createProspectDriveFolder, toast]
  );

  const updateProspect = useCallback(
    async (id: string, patch: Partial<Prospect>) => {
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('prospects')
        .update(patch)
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur mise à jour client',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  const deleteProspect = useCallback(
    async (id: string) => {
      setProspects((prev) => prev.filter((p) => p.id !== id));
      setCommandes((prev) => prev.filter((c) => c.prospect_id !== id));

      const supabase = createClient();
      const { error } = await supabase.from('prospects').delete().eq('id', id);
      if (error) {
        toast({
          title: 'Erreur suppression prospect',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  // --- COMMANDES UGC ---
  const addCommande = useCallback(
    async (
      data: Omit<CommandeUgc, 'id' | 'created_at' | 'prospect'>
    ): Promise<CommandeUgc | null> => {
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

      if (error || !inserted) {
        toast({
          title: 'Erreur création commande',
          description: error?.message || "Impossible d'ajouter la commande.",
          type: 'error',
        });
        return null;
      }

      const created = inserted as CommandeUgc;
      setCommandes((prev) => [created, ...prev]);
      return created;
    },
    [toast]
  );

  const updateCommandeStatutProduction = useCallback(
    async (id: string, statut_production: StatutProduction) => {
      setCommandes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, statut_production } : c))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('commandes_ugc')
        .update({ statut_production })
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur statut production',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  const updateCommandeStatutPaiement = useCallback(
    async (id: string, statut_paiement: StatutPaiement) => {
      setCommandes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, statut_paiement } : c))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('commandes_ugc')
        .update({ statut_paiement })
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur statut paiement',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  const updateCommande = useCallback(
    async (id: string, patch: Partial<CommandeUgc>) => {
      setCommandes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('commandes_ugc')
        .update(patch)
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur mise à jour commande',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  const deleteCommande = useCallback(
    async (id: string) => {
      setCommandes((prev) => prev.filter((c) => c.id !== id));
      setMedias((prev) => prev.filter((m) => m.commande_id !== id));

      const supabase = createClient();
      const { error } = await supabase
        .from('commandes_ugc')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur suppression commande',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  // --- MEDIAS & CREATIONS ---
  const addMediaRecord = useCallback((media: MediaCreation) => {
    setMedias((prev) => [media, ...prev]);
  }, []);

  const toggleMediaReady = useCallback(
    async (id: string, pret_pour_livraison: boolean) => {
      setMedias((prev) =>
        prev.map((m) => (m.id === id ? { ...m, pret_pour_livraison } : m))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('medias_creations')
        .update({ pret_pour_livraison })
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur validation média',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  const deleteMedia = useCallback(
    async (id: string) => {
      setMedias((prev) => prev.filter((m) => m.id !== id));

      const supabase = createClient();
      const { error } = await supabase
        .from('medias_creations')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur suppression média',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  // --- PROMPTS & SCRIPTS ---
  const addPrompt = useCallback(
    async (
      data: Omit<PromptScript, 'id' | 'created_at'>
    ): Promise<PromptScript | null> => {
      const supabase = createClient();
      const { data: inserted, error } = await supabase
        .from('prompts_scripts')
        .insert(data)
        .select('*')
        .single();

      if (error || !inserted) {
        toast({
          title: 'Erreur ajout prompt',
          description: error?.message || "Impossible d'enregistrer le prompt.",
          type: 'error',
        });
        return null;
      }

      const created = inserted as PromptScript;
      setPrompts((prev) => [created, ...prev]);
      return created;
    },
    [toast]
  );

  const updatePrompt = useCallback(
    async (id: string, patch: Partial<PromptScript>) => {
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('prompts_scripts')
        .update(patch)
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur modification prompt',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  const deletePrompt = useCallback(
    async (id: string) => {
      setPrompts((prev) => prev.filter((p) => p.id !== id));

      const supabase = createClient();
      const { error } = await supabase
        .from('prompts_scripts')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur suppression prompt',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  // --- FINANCES ---
  const addFinance = useCallback(
    async (data: Omit<Finance, 'id' | 'created_at'>): Promise<Finance | null> => {
      const supabase = createClient();
      const { data: inserted, error } = await supabase
        .from('finances')
        .insert(data)
        .select('*')
        .single();

      if (error || !inserted) {
        toast({
          title: 'Erreur enregistrement finance',
          description:
            error?.message || "Impossible d'enregistrer la transaction.",
          type: 'error',
        });
        return null;
      }

      const created = inserted as Finance;
      setFinances((prev) => [created, ...prev]);
      return created;
    },
    [toast]
  );

  const deleteFinance = useCallback(
    async (id: string) => {
      setFinances((prev) => prev.filter((f) => f.id !== id));

      const supabase = createClient();
      const { error } = await supabase.from('finances').delete().eq('id', id);
      if (error) {
        toast({
          title: 'Erreur suppression transaction',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  // --- FOCUS TACHES & IDEES (STRICT 3 ACTIVE TASKS LIMIT) ---
  const addFocusTache = useCallback(
    async (
      type: 'tache_jour' | 'boite_idee',
      contenu: string
    ): Promise<{ ok: boolean; reason?: string }> => {
      if (type === 'tache_jour') {
        const activeDailyCount = focusTaches.filter(
          (t) => t.type === 'tache_jour' && !t.est_termine
        ).length;
        if (activeDailyCount >= 3) {
          return {
            ok: false,
            reason:
              'Limite anti-dispersion atteinte : terminez ou supprimez l’une de vos 3 actions critiques avant d’en ajouter une nouvelle.',
          };
        }
      }

      const supabase = createClient();
      const { data: inserted, error } = await supabase
        .from('focus_taches')
        .insert({
          type,
          contenu: contenu.trim(),
          est_termine: false,
        })
        .select('*')
        .single();

      if (error || !inserted) {
        return {
          ok: false,
          reason: error?.message || "Erreur d'enregistrement Supabase.",
        };
      }

      setFocusTaches((prev) => [inserted as FocusTache, ...prev]);
      return { ok: true };
    },
    [focusTaches]
  );

  const toggleFocusTache = useCallback(
    async (id: string, est_termine: boolean) => {
      setFocusTaches((prev) =>
        prev.map((t) => (t.id === id ? { ...t, est_termine } : t))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('focus_taches')
        .update({ est_termine })
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur mise à jour tâche',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

  const convertIdeaToTask = useCallback(
    async (id: string): Promise<{ ok: boolean; reason?: string }> => {
      const activeDailyCount = focusTaches.filter(
        (t) => t.type === 'tache_jour' && !t.est_termine
      ).length;

      if (activeDailyCount >= 3) {
        return {
          ok: false,
          reason:
            'Vous avez déjà 3 actions critiques actives. Terminez-en une avant de promouvoir cette idée.',
        };
      }

      setFocusTaches((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, type: 'tache_jour', est_termine: false } : t
        )
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('focus_taches')
        .update({ type: 'tache_jour', est_termine: false })
        .eq('id', id);

      if (error) {
        return { ok: false, reason: error.message };
      }

      return { ok: true };
    },
    [focusTaches]
  );

  const deleteFocusTache = useCallback(
    async (id: string) => {
      setFocusTaches((prev) => prev.filter((t) => t.id !== id));

      const supabase = createClient();
      const { error } = await supabase
        .from('focus_taches')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erreur suppression élément',
          description: error.message,
          type: 'error',
        });
      }
    },
    [toast]
  );

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
