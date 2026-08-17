# Super Clyde 3 — plateforme de présence locale

Super Clyde 3 est une plateforme francophone mobile-first conçue pour les commerces, artisans, indépendants et services locaux. Elle leur permet de créer une présence publique claire sans devoir construire un site complexe : une page partageable, une offre lisible, des produits, des abonnements, une communauté, des formations et des outils de progression réunis dans un même espace.

## Description de la plateforme

Super Clyde 3 relie trois besoins qui sont souvent séparés : être découvert, être compris et être contacté. Le visiteur explore les pages publiques et la marketplace ; le commerçant construit sa vitrine, publie ses contenus, suit son activité et accède à la boutique et aux formations ; l'administration supervise les comptes, la modération, les commandes, les bonus et le système de parrainage.

L'expérience est pensée d'abord pour le mobile, avec une navigation contextuelle, un constructeur avec aperçu proche d'un vrai téléphone et des parcours adaptés au rôle de la personne connectée. La plateforme doit rester simple à parcourir tout en permettant une évolution progressive vers des fonctionnalités professionnelles plus avancées.

## World building

Dans l'univers de Super Clyde 3, chaque commerce n'est pas une simple fiche dans un annuaire : c'est un lieu vivant. Sa page publique est sa vitrine, son quartier est son contexte, ses visiteurs forment sa communauté et ses actions de publication construisent sa réputation. La plateforme agit comme une rue numérique accueillante où les commerces peuvent être trouvés, compris et recommandés.

Le monde de Super Clyde 3 repose sur quatre principes narratifs :

- **La vitrine** : chaque commerce possède un espace public reconnaissable, partageable et évolutif.
- **Le quartier** : la marketplace rapproche les commerces locaux des visiteurs et des autres membres.
- **La progression** : les formations, publications, abonnements et bonus donnent au commerçant des étapes concrètes pour avancer.
- **L'entraide** : la communauté et le parrainage transforment les utilisateurs en relais de confiance plutôt qu'en simples comptes.

Le ton de la marque est direct, utile, chaleureux et local. Super Clyde 3 ne promet pas une technologie spectaculaire : il donne aux personnes qui font vivre un quartier les outils pour être visibles, crédibles et autonomes.

### Cartographie de l'univers

- **Accueil** : porte d'entrée, proposition de valeur et création de page.
- **Vitrine publique** (`/r/[slug]`) : page partageable d'un commerce.
- **Constructeur** (`/tableau-de-bord/page`) : blocs, thème, aperçu mobile et publication.
- **Marketplace** : découverte des commerces et des pages publiques.
- **Formation** (`/formation`) : apprentissage progressif de la visibilité et de la vente.
- **Boutique** (`/goodies`) : objets et avantages liés à l'univers Super Clyde 3.
- **Communauté** (`/forum`) : échanges et retours entre membres.
- **Administration** (`/admin`) : supervision des comptes, de la modération, des commandes, des formations et du parrainage.

## Stack technique

- Next.js App Router, React, TypeScript et Tailwind CSS.
- Zustand pour l'état de démonstration et la persistance locale structurée.
- Composants accessibles inspirés de shadcn/ui et icônes Lucide.
- Routes publiques, authentification simulée de projet et tableaux de bord par rôle.

## Rôles

- `owner` : commerçant, avec dashboard, page, produits, formation, boutique et liens de parrainage.
- `customer` : visiteur/client avec accès aux parcours publics et à son espace.
- `admin` : supervision complète de la plateforme via `/admin`.

## Parrainage et bonus

Un lien `/rejoindre?ref=CODE` retient le code reçu, enregistre au maximum une visite en attente par code, puis rattache cette ligne à la page créée. Le bonus n'est pas accordé à l'inscription seule : il est déclenché lors de la première publication de la page filleule. L'auto-parrainage est bloqué par comparaison du propriétaire, et une ligne de visite est promue plutôt que dupliquée.

L'administration affiche le tunnel `lien_partage → inscrit → page_publiee`, les commerces concernés et le total des jours de bonus liés. Toute évolution future des bonus doit préserver l'idempotence : une publication déjà traitée ne doit jamais générer une seconde récompense.

## Navigation adaptative

Le header public convertit les ancres en liens `/#section` hors de l'accueil. Le menu mobile remplace « Accueil » par « Retour » sur les pages annexes et garde un repli vers `/` lorsqu'il n'existe pas d'historique. Les liens Formation et Boutique sont visibles dans le dashboard commerçant et ne polluent pas l'accueil d'un visiteur non connecté.

## Constructeur mobile

L'aperçu mobile utilise une largeur proche d'un téléphone réel et réduit ses marges internes sur petit écran. Le dock inférieur du constructeur porte les actions `Accueil`, `Structure`, `Ajouter`, `Réglages` et `Plus` afin d'éviter deux barres empilées.

## Règles de maintenance

1. Lire les composants voisins avant toute modification.
2. Conserver les types métier dans `lib/clyde/types.ts` et les mutations dans `lib/clyde/store.ts`.
3. Ne jamais écrire dans le store avant son hydratation ; `StoreHydrator` déclenche la relecture à la racine.
4. Vérifier mobile (416×890) et desktop (1345×989) après chaque changement visuel.
5. Ne pas ajouter de données sensibles dans les graines de démonstration.
6. Toute action admin réelle devra ajouter une mutation auditable, idempotente et protégée par le rôle `admin`.

## Développement

```bash
pnpm dev
pnpm exec tsc --noEmit
```

Le projet se poursuit via le dépôt GitHub relié à Vercel. Chaque changement important doit être documenté dans ce fichier ou dans le composant concerné.
