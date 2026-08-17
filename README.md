# Super Clyde — guide de reprise pour un agent IA

## 1. Mission du produit

Super Clyde est une plateforme mobile-first pour les commerces et services locaux. Le produit permet de créer une vitrine publique partageable, présenter un catalogue, recevoir des demandes, développer une communauté et suivre la progression d'un commerce.

Le produit doit rester centré sur le MVP : **vitrine publique, catalogue, contact/commande, QR partageable et activation commerçant**. La formation, le forum, les goodies et les fonctions de gamification existent dans le prototype mais ne doivent pas détourner l'expérience principale.

## 2. État du projet

Ce dépôt contient un prototype fonctionnel riche, actuellement basé sur Zustand et une persistance locale structurée. Il n'est pas encore prêt pour une production multi-utilisateur : les données ne sont pas dans une base distante et l'authentification reste une simulation de démonstration.

Travail déjà présent :

- constructeur de page multi-blocs avec aperçu mobile/desktop ;
- sélection d'un bloc directement dans l'aperçu ;
- historique Undo/Redo avec Ctrl/Cmd+Z et Ctrl/Cmd+Shift+Z ;
- score de complétion de vitrine ;
- catalogue et panier mobile ;
- produits goodies avec images et bon de livraison ;
- export/suppression des données d'un compte client ;
- consentement daté et copie de la notice pour les abonnements ;
- 39 tests Vitest et workflow GitHub Actions ;
- en-têtes de sécurité de base dans `next.config.mjs`.

## 3. Stack et commandes

- Next.js App Router 16, React, TypeScript ;
- Tailwind CSS et composants inspirés de shadcn/ui ;
- Zustand pour le store local ;
- Vitest pour les tests ;
- Lucide pour les icônes.

```bash
pnpm install
pnpm dev
pnpm exec tsc --noEmit
pnpm test
pnpm test:watch
```

Ne jamais utiliser `npm` si `pnpm` est disponible. Ne jamais ajouter une API payante ou une base distante sans décision explicite du propriétaire.

## 4. Routes principales

- `/` : accueil ;
- `/connexion`, `/inscription` : accès de démonstration ;
- `/r/[slug]` : vitrine publique d'un commerce ;
- `/tableau-de-bord` : dashboard commerçant ;
- `/tableau-de-bord/page` : constructeur ;
- `/espace-client` : espace visiteur, abonnements et droits sur les données ;
- `/formation` : parcours de formation ;
- `/forum` : communauté ;
- `/goodies` : boutique de récompenses ;
- `/admin` : console d'administration.

## 5. Architecture à respecter

### Store et types

- Types métier : `lib/clyde/types.ts`.
- Store et mutations : `lib/clyde/store.ts`.
- Règles de bonus et quotas : `lib/clyde/rewards.ts`.
- Options produit : `lib/clyde/options.ts`.
- Données de démonstration : fichiers `lib/clyde/*` associés, jamais dans un composant UI.
- Conformité/export : `lib/clyde/privacy.ts`.
- Blocs et rendu : `components/clyde/page/blocks.tsx` et `components/clyde/page/renderer.tsx`.
- Éditeur : `components/clyde/dashboard/page-editor.tsx`.

Respecter le flux d'hydratation : ne pas écrire dans le store avant l'hydratation Zustand. Toute mutation doit être idempotente quand elle peut être rejouée.

### Consentement et données personnelles

`Follower` contient :

- `consent_at` : date ISO du consentement ;
- `consent_notice` : copie du texte accepté ;
- `consent_source` : `page` ou `import`.

Les abonnements historiques sont marqués `import` sans date inventée. `exportUserData()` centralise l'export JSON et `deleteUserAccount()` retire les relations personnelles tout en anonymisant les pièces commerciales nécessaires. Un propriétaire ne doit pas être supprimé automatiquement, afin de ne pas orpheliner ses vitrines.

## 6. Constructeur de page

Le constructeur doit être traité comme un outil de production, pas comme une simple galerie :

- sauvegarder l'état via le store ;
- utiliser `commit()` pour toute modification afin de préserver Undo/Redo ;
- utiliser `wrapBlock` pour la sélection dans l'aperçu ;
- conserver la compatibilité mobile ;
- tester les seuils 856 px, 1198 px, 1400 px et mobile 390 px.

### Format catalogue inspiré des références mobiles

Le prototype sait déjà gérer les données de base : `compare_at_price`, `option_groups`, disponibilité, panier/quantité, catégories et navigation basse. En revanche, le format exact des captures n'est pas encore entièrement générable. Il manque notamment :

1. un rail de catégories vertical fixe à gauche ;
2. une carte produit dense avec ventes du mois, badge promotion, prix promo/prix barré et ajout direct ;
3. une barre de panier avec économies et seuil minimum ;
4. un écran de confirmation livraison/retrait avec créneau, frais et total ;
5. des recommandations « acheté avec » configurables.

Ne pas déclarer ce format terminé avant d'avoir ajouté ces capacités au type, à l'éditeur et au renderer.

## 7. Tests et CI

Les tests sont dans `lib/clyde/__tests__/` :

- `rewards.test.ts` : idempotence, anti-auto-parrainage, bonus, quotas ;
- `store.test.ts` : consentement, export et suppression ;
- `options.test.ts` : options obligatoires et sélection ;
- `vitest.config.ts` : alias `@/`.

Le workflow `.github/workflows/ci.yml` exécute le type-check et `pnpm test` sur push et pull request. Toute nouvelle règle métier doit recevoir au moins un test de cas nominal et un test de régression.

## 8. Priorités recommandées

### P0 — avant base distante

1. Ajouter le format catalogue mobile de référence décrit ci-dessus.
2. Ajouter un vrai statut brouillon/publié dans le modèle local et une action de publication explicite.
3. Ajouter une checklist d'activation dashboard : créer trois produits, ajouter photos, renseigner WhatsApp, publier, partager le QR.
4. Remplacer les analytics fictives par des événements clairement marqués comme démonstration, ou les retirer de la promesse.

### P1 — quand la base sera autorisée

1. Migrer les données vers Neon/Postgres avec accès par propriétaire.
2. Remplacer l'authentification simulée par une authentification réelle.
3. Ajouter les contraintes serveur pour quotas, bonus, consentement et suppression.
4. Ajouter stockage média durable, export serveur et journal d'audit.
5. Ajouter paiement et notifications uniquement après validation du modèle économique.

## 9. Règles pour le prochain agent IA

1. Lire `AGENTS.md`, ce README et les fichiers voisins avant de modifier.
2. Ne pas réintroduire `localStorage` directement : passer par le store existant tant que la migration distante n'est pas validée.
3. Ne pas inventer les noms d'API internes : lire les signatures avant d'écrire des tests ou des appels.
4. Ne pas supprimer une donnée historique sans migration explicite.
5. Ne pas ajouter OAuth, paiement, base distante ou API externe sans accord.
6. Préserver l'accessibilité : labels, clavier, états disabled, annonces d'erreur et alt text.
7. Vérifier les changements UI dans le navigateur et lancer `pnpm exec tsc --noEmit` puis `pnpm test`.
8. Documenter les décisions importantes ici et dans les commentaires proches du code.
9. Pour une évolution importante, commencer par un plan court listant fichiers, risques et critères d'acceptation.
10. Ne jamais présenter une fonctionnalité comme production-ready tant qu'elle dépend du store local ou de données de démonstration.

## 10. Critères d'acceptation généraux

Un changement est prêt lorsque :

- le type-check passe ;
- les tests passent ;
- le parcours principal est vérifié dans le navigateur ;
- le mobile et le desktop ne se chevauchent pas ;
- les données personnelles sont minimisées et exportables ;
- les règles métier sont testées ;
- le README est mis à jour si l'architecture ou le statut change.

## 11. Git et livraison

Le dépôt de référence demandé pour la suite est :

`https://github.com/clyderandy692-eng/olmost-final-clyde`

Le travail doit être commité avec un message descriptif, puis poussé sur la branche de travail indiquée par Git. Vérifier `git status`, le diff, les tests et le remote avant de livrer.

Dernier état local documenté : le prototype a été enrichi avec conformité des données, tests Vitest, CI, goodies illustrés, checkout de livraison, constructeur avec Undo/Redo et sélection au clic.

## 12. Limites connues

- persistance locale uniquement ;
- auth simulée ;
- analytics non connectées à une source réelle ;
- pas de paiement réel ;
- pas de notification serveur ;
- CRUD admin durable impossible sans stockage distant ;
- format catalogue de référence encore incomplet.

Ces limites doivent être dites explicitement dans toute démo, levée de fonds ou discussion avec un premier client.
