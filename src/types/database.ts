export type ProspectStatut =
  | 'À contacter'
  | 'Contacté'
  | 'Démo envoyée'
  | 'Négociation'
  | 'Signé'
  | 'Perdu';

export type StatutProduction =
  | 'Brief reçu'
  | 'Script validé'
  | 'Génération IA'
  | 'Montage'
  | 'Livré';

export type StatutPaiement = 'En attente' | 'Payé';

export type TypeMedia = 'video' | 'image';

export type CategoriePrompt =
  | 'Hook vidéo'
  | 'Prompt Visuel'
  | 'Script Voix'
  | 'Avatar IA';

export type TypeFinance = 'Revenu' | 'Dépense';

export type TypeFocusTache = 'tache_jour' | 'boite_idee';

export interface Prospect {
  id: string;
  nom_marque: string;
  pays: string;
  contact_nom: string | null;
  contact_email: string | null;
  lien_boutique: string | null;
  statut: ProspectStatut;
  valeur_estimee_eur: number;
  drive_folder_id: string | null;
  notes_strategiques: string | null;
  date_dernier_contact: string;
  created_at: string;
}

export interface CommandeUgc {
  id: string;
  prospect_id: string;
  nom_pack: string;
  brief_produit: string | null;
  statut_production: StatutProduction;
  montant_eur: number;
  statut_paiement: StatutPaiement;
  nombre_creations: number;
  drive_subfolder_id: string | null;
  lien_livraison_public: string | null;
  date_limite: string | null;
  created_at: string;
  prospect?: Prospect;
}

export interface MediaCreation {
  id: string;
  commande_id: string;
  nom_fichier: string;
  type_media: TypeMedia;
  drive_file_id: string;
  pret_pour_livraison: boolean;
  created_at: string;
}

export interface PromptScript {
  id: string;
  titre: string;
  categorie: CategoriePrompt;
  niche: string;
  contenu_texte: string;
  created_at: string;
}

export interface Finance {
  id: string;
  type: TypeFinance;
  libelle: string;
  montant_eur: number;
  date_transaction: string;
  created_at: string;
}

export interface FocusTache {
  id: string;
  type: TypeFocusTache;
  contenu: string;
  est_termine: boolean;
  created_at: string;
}

export interface DriveSubfolder {
  id: string;
  name: string;
  webViewLink: string;
  createdTime?: string;
}

