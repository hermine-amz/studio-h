-- 1. Table Prospects & Clients
CREATE TABLE IF NOT EXISTS prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_marque TEXT NOT NULL,
  pays TEXT DEFAULT 'France',
  contact_nom TEXT,
  contact_email TEXT,
  lien_boutique TEXT,
  statut TEXT DEFAULT 'À contacter', -- À contacter, Contacté, Démo envoyée, Négociation, Signé, Perdu
  valeur_estimee_eur NUMERIC(10,2) DEFAULT 0,
  drive_folder_id TEXT,
  notes_strategiques TEXT,
  date_dernier_contact TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 6. Table Tâches & Idées (Anti-dispersion)
CREATE TABLE IF NOT EXISTS focus_taches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'tache_jour' ou 'boite_idee'
  contenu TEXT NOT NULL,
  est_termine BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Permissions & Accès API Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
