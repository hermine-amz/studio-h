# Studio H — configuration de sécurité

## Variables d'environnement requises

Configurer dans l'environnement de déploiement (et localement dans un fichier non versionné) :

- `NEXT_PUBLIC_SUPABASE_URL` : URL HTTPS du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé anon/publishable du projet.
- `STUDIO_H_ADMIN_EMAIL` : adresse exacte du compte administrateur Supabase Auth.

Aucune valeur de secours n'est utilisée dans le code client. Ne jamais exposer une clé `service_role` dans une variable `NEXT_PUBLIC_*` ni dans le navigateur.

## Ordre d'installation SQL

1. `schema.sql` crée les tables et active RLS en mode fermé : aucun accès applicatif n'est accordé à `anon` ou `authenticated` à ce stade.
2. Le fichier `supabase/migrations/20261118000000_studio_h_admin_rls.sql` accorde ensuite le CRUD au rôle `authenticated`, limité par une politique email administrateur.

Ne pas relancer `schema.sql` après la migration RLS sans réappliquer ensuite la migration : le script de schéma révoque volontairement les droits applicatifs pour rester fermé par défaut.

## Migration RLS

Le fichier `supabase/migrations/20261118000000_studio_h_admin_rls.sql` est un modèle à relire. Remplacer chaque occurrence de `__STUDIO_H_ADMIN_EMAIL__` par l'adresse exacte du compte admin avant exécution. Le modèle refuse volontairement de s'exécuter tant que le marqueur n'a pas été remplacé.

**Ne pas appliquer avant :**
1. Export/backup de la base.
2. Vérification que le compte existe dans Supabase Auth et que son email est confirmé.
3. Vérification que les six tables listées sont bien les tables utilisées par l'application.
4. Test de connexion admin et test de refus pour une session anonyme / un autre utilisateur.

Cette migration n'est pas exécutée par le déploiement GitHub et ne modifie aucune donnée tant qu'elle n'est pas appliquée manuellement.

## Portée

Le middleware valide la session Supabase côté serveur avec `getUser()`, puis autorise uniquement l'email administrateur configuré. Les routes API sont aussi couvertes par le middleware. Les routes d'authentification Supabase restent gérées par Supabase Auth.

## Routes Google Drive et livraison

- L'upload exige une session admin Supabase vérifiée côté serveur.
- Les fichiers acceptés sont JPG, PNG, WEBP, GIF, MP4, MOV et WEBM. Le type MIME, l'extension et la signature binaire sont contrôlés.
- La limite applicative d'upload est de 100 Mo. **La plateforme d'hébergement peut imposer une limite de corps HTTP plus basse** (notamment les fonctions serverless) : vérifier cette limite en préproduction. Pour les vidéos UGC volumineuses, prévoir un upload direct/resumable vers Google Drive plutôt qu'un transit par la fonction Next.js.
- Les métadonnées de marque, le nom du pack, le dossier Drive et l'adresse e-mail sont relus depuis Supabase ; le navigateur ne peut plus choisir librement le dossier de destination.
- Une livraison est refusée si le paiement n'est pas marqué `Payé`, si la fiche client ou son e-mail manque, ou si toutes les créations prévues ne sont pas marquées `pret_pour_livraison = true`.
- Le lien Drive reste accessible à toute personne qui le possède, conformément au mode de livraison actuel. Ne partager que des créations validées et destinées au client.

## Vérifications restantes

- Lancer `npm ci`, `npm run build` et les tests de parcours dans un environnement de préproduction.
- Tester upload et livraison Drive avec une commande de test non payante, puis une commande payée de test avec tous les médias marqués prêts.
- Vérifier la limite réelle du fournisseur d'hébergement ; les fichiers vidéo de plus de cette limite nécessiteront un flux direct/resumable.
- Vérifier que les noms de champs et les statuts utilisés dans la base de production correspondent au schéma fourni.
