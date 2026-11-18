-- 1. Table Prospects & Clients
CREATE TABLE IF NOT EXISTS prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_marque TEXT NOT NULL,
  pays TEXT DEFAULT 'France',
  contact_nom TEXT,
  contact_email TEXT,
  contact_telephone TEXT,
  lien_boutique TEXT,
  liens_pubs JSONB DEFAULT '[]'::jsonb,
  liens_produits JSONB DEFAULT '[]'::jsonb,
  liens_reseaux JSONB DEFAULT '{}'::jsonb,
  statut TEXT DEFAULT 'À contacter', -- À contacter, Contacté, Démo envoyée, Négociation, Signé, Perdu
  valeur_estimee_eur NUMERIC(10,2) DEFAULT 0,
  drive_folder_id TEXT,
  notes_strategiques TEXT,
  date_dernier_contact TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contact_telephone TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS liens_pubs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS liens_produits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS liens_reseaux JSONB DEFAULT '{}'::jsonb;

-- 2. Table Commandes UGC
CREATE TABLE IF NOT EXISTS commandes_ugc (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  nom_pack TEXT NOT NULL,
  brief_produit TEXT,
  statut_production TEXT DEFAULT 'Brief reçu', -- Brief reçu, Script validé, Génération IA, Montage, Livré
  montant_eur NUMERIC(10,2) DEFAULT 0,
  statut_paiement TEXT DEFAULT 'En attente', -- En attente, Payé
  nombre_creations INTEGER DEFAULT 0,
  drive_subfolder_id TEXT,
  lien_livraison_public TEXT,
  date_limite DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table Médias & Créations (Prévisualisation privée)
CREATE TABLE IF NOT EXISTS medias_creations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commande_id UUID REFERENCES commandes_ugc(id) ON DELETE CASCADE,
  nom_fichier TEXT NOT NULL,
  type_media TEXT NOT NULL, -- 'video' ou 'image'
  drive_file_id TEXT NOT NULL,
  pret_pour_livraison BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table Bibliothèque de Prompts & Scripts
CREATE TABLE IF NOT EXISTS prompts_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  categorie TEXT NOT NULL, -- Hook vidéo, Prompt Visuel, Script Voix, Avatar IA
  niche TEXT DEFAULT 'Général',
  contenu_texte TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table Finances (Revenus & Dépenses)
CREATE TABLE IF NOT EXISTS finances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'Revenu' ou 'Dépense'
  libelle TEXT NOT NULL,
  montant_eur NUMERIC(10,2) NOT NULL,
  date_transaction DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table Tâches & Idées (10 Tâches avec Niveau d'Urgence)
CREATE TABLE IF NOT EXISTS focus_taches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'tache_jour' ou 'boite_idee'
  contenu TEXT NOT NULL,
  urgence TEXT DEFAULT 'Normale', -- 'Critique', 'Haute', 'Normale'
  est_termine BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE focus_taches ADD COLUMN IF NOT EXISTS urgence TEXT DEFAULT 'Normale';

-- 7. Permissions & Accès API Supabase (Désactive le blocage RLS pour votre usage privé)
ALTER TABLE prospects DISABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_ugc DISABLE ROW LEVEL SECURITY;
ALTER TABLE medias_creations DISABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE finances DISABLE ROW LEVEL SECURITY;
ALTER TABLE focus_taches DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
