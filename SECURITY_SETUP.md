# Studio H — configuration de sécurité

## Variables d'environnement requises

Configurer dans l'environnement de déploiement (et localement dans un fichier non versionné) :

- `NEXT_PUBLIC_SUPABASE_URL` : URL HTTPS du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé anon/publishable du projet.
- `STUDIO_H_ADMIN_EMAIL` : adresse exacte du compte administrateur Supabase Auth.

Aucune valeur de secours n'est utilisée dans le code client. Ne jamais exposer une clé `service_role` dans une variable `NEXT_PUBLIC_*` ni dans le navigateur.

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

## Vérifications restantes

- Lancer `npm ci`, `npm run build` et les tests de parcours dans un environnement de préproduction.
- Tester upload et livraison Drive avec une commande de test non payante.
- Confirmer les limites de taille et les types de fichiers acceptés côté serveur avant d'ouvrir les opérations de production.
