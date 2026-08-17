'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { BLOCK_META } from './blocks'
import { CATEGORY_MAP, FAMILIES, categoryLabel } from './taxonomy'
import type { FamilyId } from './taxonomy'
import type { BlockType, BusinessCategory } from './types'

/* ============================================================
   Bilingue FR / EN

   Un seul dictionnaire, deux objets de même forme : `Dict` est
   déduit du français, donc TypeScript refuse une clé manquante
   ou en trop côté anglais. Une bascule qui « oublie » la moitié
   des phrases est le défaut classique de ce genre de système ;
   ici il ne peut pas compiler.
   ============================================================ */

export type Locale = 'fr' | 'en'

export const LOCALES: { id: Locale; short: string; label: string }[] = [
  { id: 'fr', short: 'FR', label: 'Français' },
  { id: 'en', short: 'EN', label: 'English' },
]

const STORAGE_KEY = 'clyde.locale'

const FR = {
  nav: {
    home: 'CLYDE, accueil',
    links: {
      /* « Constructeur de page » et non « builder » : le public visé parle
         français, un anglicisme technique dans la navigation le tiendrait à
         distance. La version EN garde « builder ». */
      builder: 'Constructeur de page',
      /* Forme courte pour la barre mobile du bas : cinq entrées se partagent
         l'écran, « Constructeur de page » y serait tronqué en plein mot. */
      builderShort: 'Constructeur',
      formation: 'Formation',
      forum: 'Forum',
      /* Forme courte : ce libellé sert aussi dans la barre mobile du bas, où
         cinq entrées se partagent l'écran. « Boutique Goodies » y serait
         tronqué en plein mot. */
      goodies: 'Boutique',
      pricing: 'Tarifs',
    },
    /* « Hall d'exposition » et non « Marketplace » ni « Vitrine » : c'est
       l'endroit où un visiteur découvre ce que les ingénieurs ont fabriqué.
       « Vitrine » est déjà pris — il désigne la page d'un commerçant, et le
       réutiliser ici confondrait « la vitrine de Mama Grace » avec l'annuaire
       complet. La route reste `/marketplace` : le monde change les libellés,
       jamais les chemins. */
    marketplace: 'Hall d’exposition',
    login: 'Connexion',
    cta: 'Créer ma page',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    language: 'Langue',
    /* Hors de la page d'accueil, les liens d'ancrage ne mènent nulle part :
       la barre propose alors un retour explicite et l'espace du visiteur. */
    backHome: 'Accueil',
    backHomeLong: 'Retour à l’accueil',
    /* Menu bas, hors de l'accueil : « Retour » ramène à la page précédente,
       là où « Accueil » forcerait un aller simple vers la racine. */
    back: 'Retour',
    follows: 'Abonnements',
    account: 'Mon espace',
    /* Un visiteur connecté doit pouvoir quitter son compte depuis n'importe
       quelle page publique : sans ces libellés, la déconnexion n'existait que
       dans le tableau de bord commerçant. */
    signOut: 'Se déconnecter',
    switchAccount: 'Changer de compte',
  },

  hero: {
    badge: 'Votre espace commercial',
    titleLine1: 'Automatisez votre activité,',
    titleLine2: 'recevez vos commandes,',
    titleAccent: 'relancez vos clients.',
    subtitle:
      'Créez votre vitrine, configurez votre catalogue, activez les réservations. Vos clients commandent depuis leur téléphone\u00a0; vous recevez chaque commande sur WhatsApp avec la table ou le créneau. Contrairement aux réseaux sociaux, vous gardez l\u2019accès complet à vos abonnés et pouvez les relancer directement depuis votre tableau de bord.',
    ctaPrimary: 'Créer ma page gratuitement',
    ctaSecondary: 'Voir une page existante',
    proofs: ['Gratuit 35 jours', 'Sans carte bancaire', 'Sans code'],
    stickerWhatsapp: 'Commande reçue sur WhatsApp',
    stickerQr: 'Table 3 · scan',
    stickerGrowth: 'Commandes taguées par table',
  },

  band: {
    kicker: 'Pensé pour votre activité',
  },

  showcase: {
    kicker: 'Constructeur de page',
    title: 'Choisissez une catégorie, la page se construit facilement.',
    body: 'CLYDE charge un modèle adapté à votre activité — blocs, modules et mise en page préconfigurés. Vous remplacez le contenu, vous publiez.',
    structureTitle: 'Structure de la page',
    blocksCount: 'blocs',
    modulesTitle: 'Modules actifs sur cette page',
    chipOrder: 'Commande',
    chipLocations: 'Tables / Chambres',
    chipBooking: 'Réservation',
    modulesNote:
      'Les modules s’activent d’un clic — jamais imposés par la catégorie.',
    open: 'Ouvrir',
    previewMobile: 'Aperçu mobile',
    previewDesktop: 'Aperçu ordinateur',
  },

  bento: {
    kicker: 'Ce que fait CLYDE',
    title: 'Quatre problèmes courants. Quatre réponses concrètes.',
    builder: {
      kicker: 'Constructeur de page',
      title: 'Page publiée en moins d’une heure',
      body: 'Blocs préconfigurés — Couverture, Catalogue, Réservation, Avis. Vous remplissez, vous ajustez les couleurs, vous publiez.',
    },
    orders: {
      kicker: 'Commandes',
      title: 'Commandes directement sur WhatsApp',
      body: 'Chaque commande arrive sur votre téléphone, rédigée, avec la table et le total. Rien à recopier.',
    },
    qr: {
      kicker: 'Tables & chambres',
      title: 'Un QR code par emplacement',
      body: 'Le client scanne, commande, et la commande arrive taguée « Table 12 ».',
    },
    analytics: {
      kicker: 'Avant / Après',
      title: 'Ce qui change dans une journée de travail',
      body: 'Deux colonnes, la même journée, sans CLYDE puis avec. Sans graphique superflu.',
    },
    /* Comparaison avant/après : chaque paire décrit la même journée, sans
       CLYDE puis avec. C'est plus parlant qu'un compteur de « vues ». */
    beforeTitle: 'Sans CLYDE',
    afterTitle: 'Avec CLYDE',
    beforeAfter: [
      {
        before: '« C’est combien ? » — 40 fois par jour',
        after: 'Prix et photos visibles. Le client commande direct.',
      },
      {
        before: 'Commandes prises de tête, erreurs de table',
        after: 'Chaque commande arrive écrite, taguée « Table 12 »',
      },
      {
        before: 'Deux clients réservent la même heure',
        after: 'Créneau pris = créneau disparu. Zéro doublon.',
      },
      {
        before: 'Vous devinez ce qui se vend',
        after: 'Vous SAVEZ quoi corriger : photo, texte ou prix',
      },
    ],
    editorStructure: 'Structure',
    editorSettings: 'Réglages du bloc',
    editorBlocks: ['Couverture', 'Catégories', 'Catalogue', 'Horaires & Localisation'],
    editorRows: [
      ['Police', 'Kanit'],
      ['Colonnes', '2'],
      ['Coins', 'Arrondis'],
    ],
    waOnline: 'en ligne',
    waMessage: 'Bonjour, commande',
    waTable: 'Table 12',
    waTotal: 'Total 10 000 XAF',
    waReady: 'Prêt à envoyer ✓',
    waNote:
      'Le message est déjà écrit. Le client n’a plus qu’à appuyer sur Envoyer.',
    qrSheet: 'Feuille à imprimer',
    qrLabels: ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Terrasse 1', 'Bar 2'],
    alertProduct: 'Ndolé crevettes',
    alertBody: '2 481 vues, 7 commandes.',
    alertHint: 'Photo ou prix à revoir ?',
    alertTrend: 'Conversion +34 % vs 30 derniers jours',
    statViews: 'vues suivies',
    statConversion: 'conversion en plus',
    /* Le français insère une espace insécable avant le %, l'anglais non. */
    percentSuffix: '\u00a0%',
    strip: [
      'Hall d’exposition public pour être trouvé',
      'Abonnés non filtrés par un algorithme',
      'Réservations et rendez-vous natifs',
    ],
    seePricing: 'Voir les tarifs',
  },

  /* La couche narrative du monde CLYDE : une section dédiée, pas une voix
     diffusée partout. Le mouvement central est la rév����lation — flou vers
     net, invisible vers vu. Le reste de la page garde son ton direct. */
  revelation: {
    kicker: 'La Révélation',
    title: 'Ce que vous vendez déjà mérite d’être vu.',
    body: 'Vous ne construisez pas un profil de plus. Vous révélez ce qui, chez vous, était déjà là — juste invisible, noyé dans des commentaires et des messages éparpillés. Publiez, et regardez.',
    punch: 'Il y a 10 minutes, vous n’existiez pas en ligne. Regardez maintenant.',
    beforeLabel: 'Avant',
    afterLabel: 'Après',
    cta: 'Révéler mon commerce',
  },

  /* ----------------------------------------------------------
     L'Usine — le monde de CLYDE

     Le postulat : CLYDE est une usine, le commerçant y est
     ingénieur. Ce n'est pas une image posée sur la page d'accueil,
     c'est le vocabulaire de l'acquisition (on « rejoint », on ne
     « s'inscrit » pas), de l'intégration (la carte) et de la
     reconnaissance (le certificat).

     Règle : le monde parle au commerçant et au visiteur du
     Hall d'exposition. Il ne remplace jamais un libellé fonctionnel du
     tableau de bord — « Commandes » reste « Commandes », un jour
     de rush on ne cherche pas un mot d'univers.
     ---------------------------------------------------------- */
  factory: {
    kicker: 'L’Usine CLYDE',
    title: 'L’Usine recrute ses prochains ingénieurs.',
    body: 'CLYDE n’est pas un abonnement de plus. C’est une usine, et vous n’y êtes pas un utilisateur : vous y êtes ingénieur. Chaque commerçant tient sa propre ligne de production, avec les machines fournies par l’Usine.',

    /* L'avis de recrutement — l'artefact d'acquisition. La même voix sert en
       publicité, en prospection et ici : on invite à rejoindre, jamais à
       « essayer un outil ». */
    invite: {
      institution: 'Usine CLYDE',
      reference: 'Avis de recrutement',
      addressee: 'À l’attention du commerçant',
      body: 'Nous avons vu ce que vous construisez déjà. Nous cherchons des ingénieurs pour la prochaine promotion.',
      requirement: 'Aucune compétence technique requise.',
      motto: 'Les outils, c’est nous. Le savoir-faire, c’est vous.',
      cta: 'Rejoindre l’Usine',
      secondary: 'Visiter le Hall d’exposition',
      stamp: 'Promotion ouverte',
    },

    postsTitle: 'Les postes ouverts',
    postsNote:
      'Votre poste est attribué selon votre métier, le jour où votre page est publiée.',

    /* Les six piliers : chacun relié à une fonctionnalité réelle, jamais à une
       promesse abstraite. C'est ce qui distingue un monde d'un slogan. */
    pillarsTitle: 'Ce que fournit l’Usine',
    pillars: [
      {
        name: 'Simple',
        body: 'Inscription en deux champs, modèles prêts à l’emploi, aucune compétence technique requise.',
      },
      {
        name: 'Structuré',
        body: 'Des blocs déjà pensés, jamais de page blanche. Vous remplacez le contenu, la structure tient.',
      },
      {
        name: 'Automatisé',
        body: 'Commande envoyée sur WhatsApp sans intervention, créneaux confirmés seuls, rapports générés seuls.',
      },
      {
        name: 'Originalité',
        body: 'Couleurs, blocs, mise en page librement modifiables. Un constructeur, pas un formulaire figé.',
      },
      {
        name: 'Professionnalisme',
        body: 'Rendu soigné dès le premier modèle, certificats délivrés, Hall d’exposition qui met la production en valeur.',
      },
      {
        name: 'Moins cher',
        body: 'Pas d’hébergement à payer, pas de nom de domaine à acheter. Un seul abonnement.',
      },
    ],

    /* Les artefacts remis à l'ingénieur. Ils sont générés côté client, sans
       serveur — même mécanique que la planche de QR codes. */
    artifacts: {
      title: 'Vos papiers d’ingénieur',
      body: 'Deux documents délivrés par l’Usine, à imprimer, afficher en boutique ou partager.',
      card: 'Carte d’Ingénieur',
      cardHint: 'Votre poste, votre matricule et le QR de votre page.',
      certificate: 'Certificat de Fondation',
      certificateHint: 'Atteste la publication de votre page. Fait pour être encadré.',
      download: 'Télécharger',
      ready: 'Document prêt.',
      locked: 'Publiez votre page pour recevoir vos papiers.',
      /* Le registre des cours achevés, sous les deux documents de fondation. */
      formationsTitle: 'Formations achevées',
    },

    /* Libellés imprimés sur la Carte d'Ingénieur (PDF A6). */
    cardLabels: {
      institution: 'Usine CLYDE',
      document: 'Carte d’Ingénieur',
      post: 'Poste',
      title: 'Titre',
      id: 'Matricule',
      since: 'Intégration',
      qrHint: 'Scannez pour ouvrir la boutique',
      footer: 'Carte délivrée par l’Usine CLYDE. Elle atteste d’une page publiée, pas d’un agrément commercial.',
    },

    /* Libellés imprimés sur le Certificat de Fondation (PDF A4 paysage). */
    certificateLabels: {
      institution: 'Usine CLYDE',
      document: 'Certificat de Fondation',
      awarded: 'L’Usine CLYDE certifie que',
      statement:
        'a construit et publié sa page, et rejoint à ce titre les ingénieurs de l’Usine.',
      post: 'Poste',
      id: 'Matricule',
      date: 'Délivré le',
      signature: 'L’Usine CLYDE',
    },
  },

  modules: {
    kicker: 'Modules',
    title: 'Trois modules configurables. Un seul type de compte.',
    body: 'La catégorie suggère une configuration de départ. Vous activez ou désactivez chaque module à tout moment, sans changer de plan.',
    noteStrong: 'Un seul type de compte.',
    note: 'Pas de « plan restaurant » ni de « plan hôtel » — la même plateforme, configurée pour vous.',
    items: {
      commande: {
        name: 'Commande à distance',
        status: 'Toujours actif',
        role: 'Catalogue en ligne, panier, commande envoyée directement sur votre WhatsApp.',
        metric: 'Base',
      },
      tables: {
        name: 'Tables / Chambres',
        status: 'Activable',
        role: 'Un QR par emplacement. Chaque commande arrive taguée : table 12, chambre 204.',
        metric: 'QR natif',
      },
      reservation: {
        name: 'Réservation / Rendez-vous',
        status: 'Activable',
        role: 'Créneaux, prise de rendez-vous et confirmation automatique sur WhatsApp.',
        metric: 'Agenda',
      },
    },
  },

  comparison: {
    kicker: 'Comparatif',
    title: 'Ce que les réseaux sociaux ne remplacent pas',
    body: 'Les réseaux sociaux génèrent de la visibilité. CLYDE gère la commande, la réservation et la relation client. Les deux sont complémentaires.',
    caption:
      'Comparaison des fonctionnalités entre Facebook Page, WhatsApp Business, Skool et CLYDE',
    featureHeader: 'Fonctionnalité',
    columns: ['Facebook Page', 'WhatsApp Business', 'Skool', 'CLYDE'],
    /** Valeurs traitées comme « absent » : elles s'affichent en gris barré. */
    negatives: ['Non', 'N/A'],
    rows: [
      {
        feature: 'Page personnalisable',
        cells: ['Non', 'Non', 'Moyen', 'Constructeur de page dédié'],
      },
      {
        feature: 'Commande → WhatsApp',
        cells: ['Non', 'Manuel', 'Non', 'Automatisé'],
      },
      {
        feature: 'Commande par table / chambre',
        cells: ['Non', 'Non', 'Non', 'Natif, par QR'],
      },
      {
        feature: 'Réservation / rendez-vous',
        cells: ['Non', 'Non', 'Non', 'Natif'],
      },
      {
        feature: 'Annuaire de découverte',
        /* « Hall CLYDE » et non « Hall d'exposition CLYDE » : la cellule est
           l'une de quatre colonnes, et la ligne annonce déjà « Annuaire de
           découverte » — le nom complet y déborderait sans rien ajouter. */
        cells: ['Non', 'Non', 'Non', 'Hall CLYDE'],
      },
      {
        feature: 'Analytics exploitables',
        cells: ['Superficiel', 'Quasi inexistant', 'Basique', 'Dédié, actionnable'],
      },
      {
        feature: 'Portée sur vos abonnés',
        cells: ['Filtrée', 'N/A', 'Correcte', 'Non filtrée'],
      },
    ],
  },

  onboarding: {
    kicker: 'Mise en service',
    title: 'De l’inscription à votre lien en six étapes',
    steps: [
      { title: 'Inscription', detail: 'Email ou numéro de téléphone. Rien de plus.' },
      {
        title: 'Identité',
        detail: 'Nom, adresse clyde.app/votre-nom, devise XAF · CNY · EUR · USD.',
      },
      { title: 'Catégorie', detail: 'Un template adapté et des modules pré-cochés.' },
      { title: 'Modules', detail: 'Vous ajustez. Aucune catégorie ne vous enferme.' },
      { title: 'Catalogue', detail: 'Produits, services, créneaux, photos.' },
      { title: 'Publication', detail: 'Un lien unique, partageable partout.' },
    ],
  },

  /* Preuve sociale honnête : ces cartes sont des scénarios d'usage, pas des
     citations clients. Les présenter entre guillemets avec des noms propres
     serait un faux témoignage sur une page marketing publique — le jour où
     de vrais retours existent, ils remplaceront ces scénarios avec une
     attribution claire. */
  testimonials: {
    kicker: 'Cas d’usage',
    title: 'Quatre situations fréquentes et comment CLYDE y répond.',
    note: 'Scénarios illustratifs basés sur les usages types de la plateforme — pas des témoignages clients.',
    items: [
      {
        quote:
          'Les commandes qui se perdaient dans les commentaires Facebook arrivent désormais sur WhatsApp, avec le numéro de table. Les erreurs de service disparaissent.',
        name: 'Restaurant de quartier',
        role: 'Scénario type · module Tables',
        stat: 'Commandes taguées par table',
      },
      {
        quote:
          'Les clientes réservent seules, même à 23 h. Plus personne ne passe ses soirées à répondre « quel créneau vous arrange ? ».',
        name: 'Salon de coiffure',
        role: 'Scénario type · module Réservation',
        stat: 'Créneaux remplis sans échanges',
      },
      {
        quote:
          'Un QR dans chaque chambre transforme le room service : le client commande, la réception reçoit « Chambre 204 », c’est tout.',
        name: 'Hôtel indépendant',
        role: 'Scénario type · module Tables / Chambres',
        stat: 'Room service sans appels',
      },
      {
        quote:
          'L’alerte sur les produits très vus mais jamais commandés pointe la photo, le texte ou le prix à corriger. Les ventes suivent.',
        name: 'Boutique artisanale',
        role: 'Scénario type · Analytics Pro',
        stat: 'Hésitations détectées',
      },
    ],
    videoQuote: 'Une page montée en un dimanche après-midi.',
    videoMeta: 'Démonstration vidéo · 1 min 12',
    videoPlay: 'Lire la démonstration vidéo',
    videoSoon: 'Bientôt disponible',
  },

  pricing: {
    kicker: 'Tarifs',
    title: '35 jours gratuits. Tout inclus.',
    body: 'Sans carte bancaire. Sans commission. Vous changez de plan quand vous voulez.',
    mostChosen: 'Le plus choisi',
    onRequest: 'Sur devis',
    perMonth: '/mois',
    footnote:
      'Devises disponibles : XAF · EUR · USD · CNY. Les commandes passent par votre propre numéro WhatsApp — CLYDE ne s’interpose jamais.',
    plans: {
      free: {
        name: 'Gratuit',
        tagline: 'Pour tester CLYDE et publier une première page.',
        cta: 'Commencer gratuitement',
        features: [
          'Page publique avec 6 blocs',
          '1 module actif au choix',
          'Catalogue jusqu’à 20 entrées',
          'Commandes WhatsApp illimitées',
          'Analytics de base',
          'Fiche dans le Hall d’exposition',
        ],
      },
      pro: {
        name: 'Pro',
        tagline: 'Pour les commerces qui veulent savoir ce qui marche.',
        cta: 'Passer en Pro',
        features: [
          'Bibliothèque de blocs complète',
          'Tous les modules simultanément',
          'Catalogue illimité',
          'Analytics Pro : détection d’hésitation',
          'Comparaison période sur période',
          'QR codes et comptes staff illimités',
          'Export PDF des feuilles de QR',
        ],
      },
      entreprise: {
        name: 'Entreprise',
        tagline: 'Pour les groupes et les multi-établissements.',
        cta: 'Nous contacter',
        features: [
          'Tout le plan Pro',
          'Multi-établissements sous un compte',
          'Support prioritaire',
          'Accès anticipé aux nouveautés',
          'Accompagnement à la mise en place',
        ],
      },
    },
  },

  finalCta: {
    titleBefore: 'Votre activité mérite',
    titleAccent: 'une présence à votre image.',
    body: 'Exprimez ce qui vous rend unique, avec les outils et la visibilité que votre activité mérite.',
    ctaPrimary: 'Créer ma boutique gratuitement',
    ctaSecondary: 'Visiter le Hall d’exposition',
    footnote: 'Gratuit 35 jours · Sans carte bancaire · Sans code',
    stickers: {
      qr: 'QR',
      whatsapp: 'WhatsApp',
      theme: 'Thème',
      analytics: 'Analytics',
      booking: 'RDV',
    },
  },

  footer: {
    tagline:
      'Le constructeur de page des commerçants. Votre vitrine, vos commandes, vos réservations — sans hébergement ni code.',
    productTitle: 'Produit',
    product: {
      builder: 'Constructeur de page',
      orders: 'Commandes WhatsApp',
      qr: 'QR par table',
      booking: 'Réservations',
      analytics: 'Analytics Pro',
    },
    exploreTitle: 'Explorer',
    explore: {
  marketplace: 'Hall d’exposition',
  pricing: 'Tarifs',
  formation: 'Formation',
  forum: 'Forum',
  goodies: 'Boutique Goodies',
  signup: 'Créer ma page',
  },
  resourcesTitle: 'Ressources',
  resources: {
  help: 'Centre d’aide',
  team: 'L’équipe',
  contact: 'Nous contacter',
      privacy: 'Confidentialité',
      terms: 'Conditions',
    },
    rights: 'Tous droits réservés.',
    credo: 'Conçu pour les commerçants, pas pour les développeurs.',
  },

  marketplace: {
    badge: 'Hall d’exposition de l’Usine',
    title: 'Ce que les ingénieurs de l’Usine ont fabriqué',
    subtitle:
      'Chaque page ci-dessous a été construite par un commerçant, sans développeur. Ouvrez-en une : commandez, réservez, ou voyez ce que vous pourriez avoir.',
    searchLabel: 'Rechercher un commerce',
    searchPlaceholder: 'Nom, ville, quartier…',
    allFamilies: 'Tous les métiers',
    allCities: 'Toutes les villes',
    cityLabel: 'Ville',
    familyLabel: 'Métier',
    resultsOne: 'commerce',
    resultsMany: 'commerces',
    empty: 'Aucun commerce ne correspond à cette recherche.',
    emptyHint: 'Essayez un autre métier ou une autre ville.',
    reset: 'Effacer les filtres',
    visit: 'Voir la page',

    /* Retour des pages publiques. Un visiteur arrivé par QR code ou par un lien
       WhatsApp n'a rien derrière lui : on lui propose une découverte, pas un
       retour qui le ferait sortir du site. */
    back: 'Retour',
    discover: 'Découvrir sur CLYDE',

    /* Partage et abonnement, présents sur chaque page publique. */
    share: 'Partager',
    shareCopied: 'Lien copié',
    shareTitle: 'Partager cette page',
    shareBody: 'Envoyez le lien de la boutique à vos contacts.',
    shareWhatsapp: 'WhatsApp',
    shareFacebook: 'Facebook',
    shareInstagram: 'Instagram',
    shareCopy: 'Copier le lien',
    /* Instagram n'expose pas d'URL de partage web : la tuile copie le lien et
       le dit, plutôt que d'ouvrir une page d'erreur. */
    shareInstagramNote: 'Lien copié : collez-le dans votre story ou votre bio.',
    shareClose: 'Fermer',
    follow: 'S’abonner',
    following: 'Abonné',
    followTitle: 'Suivez cette page',
    followBody:
      'Créez votre compte visiteur en quelques secondes : vous retrouverez cette boutique dans vos abonnements.',
    followName: 'Votre nom',
    followEmail: 'Votre e-mail',
    followWhatsapp: 'Votre WhatsApp',
    followSubmit: 'Créer mon compte et suivre',
    followCancel: 'Plus tard',
    followInvalid: 'Renseignez votre nom, un e-mail valide et votre WhatsApp.',
    followClosed: 'Cette page n’accepte pas encore les abonnements.',

    /* Espace des visiteurs connectés, en tête de l'annuaire. */
    myFollowsTitle: 'Mes abonnements',
    myFollowsBody: 'Les pages que vous suivez, à portée de main.',
    myFollowsEmpty:
      'Vous ne suivez aucune page. Ouvrez une boutique puis appuyez sur « S’abonner ».',
    ctaTitle: 'L’Usine recrute — votre commerce a sa place ici',
    ctaBody:
      'Construisez votre page avec les outils de l’Usine, puis exposez-la dans ce Hall d’exposition.',
    ctaButton: 'Rejoindre l’Usine',
  },

  /* Feuille de réservation d'une prestation, ouverte depuis le catalogue.
     Une prestation ne se met pas au panier : elle occupe un créneau, donc
     elle demande une date avant un prix. */
  reserve: {
    action: 'Réserver',
    title: 'Réserver une prestation',
    dateLabel: 'Choisissez le jour',
    slotLabel: 'Choisissez l’heure',
    slotsClosed: 'Fermé ce jour-là — choisissez une autre date.',
    durationLabel: 'Durée',
    /* La table est une préférence de confort, pas un supplément : le dire
       évite au client de chercher un prix qui changerait. */
    locationLabel: 'Emplacement souhaité',
    locationAny: 'Peu importe',
    locationNote: 'Le choix de l’emplacement ne change pas le prix.',
    totalLabel: 'Total',
    submit: 'Envoyer ma demande',
    submitNoSlot: 'Choisissez une heure',
    sent: 'Votre demande de réservation est partie sur WhatsApp.',
    close: 'Fermer',
    unavailable: 'Cette prestation n’est pas réservable pour le moment.',
  },

  help: {
    badge: 'Centre d’aide',
    title: 'Comment CLYDE fonctionne',
    subtitle:
      'Les questions que les commerçants nous posent le plus souvent. Si la vôtre n’y est pas, écrivez-nous.',
    stillStuck: 'Vous ne trouvez pas votre réponse ?',
    contactCta: 'Nous contacter',
    faq: [
      {
        q: 'Combien coûte CLYDE pour commencer ?',
        a: 'Rien pendant 35 jours : vous essayez toute la plateforme, sans carte bancaire et sans engagement. Ensuite, la formule gratuite reste disponible sans limite de durée, et vous passez à une formule payante seulement si vous en avez besoin.',
      },
      {
        q: 'Ai-je besoin de savoir coder ?',
        a: 'Non. Vous choisissez votre métier, vos couleurs et vos blocs dans un éditeur visuel. CLYDE écrit la page pour vous et l’héberge.',
      },
      {
        q: 'CLYDE s’occupe-t-il de la livraison ?',
        a: 'Non. CLYDE transmet la commande sur votre WhatsApp ; la livraison, le retrait ou le service à table s’organisent directement entre vous et votre client, comme aujourd’hui.',
      },
      {
        q: 'Comment reçois-je les commandes ?',
        a: 'Sur WhatsApp. Quand un client valide son panier, CLYDE ouvre une conversation avec un message déjà rempli : les articles, les quantités, le total et la table. Vous n’avez qu’à confirmer.',
      },
      {
        q: 'Que se passe-t-il si je n’ai pas de site web ?',
        a: 'C’est le cas de la majorité de nos commerçants. CLYDE devient votre site : une adresse à partager, un QR code à imprimer, rien à installer.',
      },
      {
        q: 'Les QR codes par table, ça sert à quoi ?',
        a: 'Chaque table a son propre QR. Le client scanne, commande, et la commande arrive avec le numéro de table déjà indiqué. Plus d’erreur de service.',
      },
      {
        q: 'Puis-je changer mes prix et mon menu moi-même ?',
        a: 'Oui, à tout moment et autant de fois que vous voulez. La modification est visible immédiatement sur votre page.',
      },
      {
        q: 'Mes clients doivent-ils créer un compte ?',
        a: 'Non. Ils commandent avec leur nom et leur numéro WhatsApp, rien de plus. Moins de friction, plus de commandes.',
      },
      {
        q: 'Dans quelles devises puis-je vendre ?',
        a: 'En franc CFA, en euro, en dollar et en yuan. Les prix s’affichent dans la devise que vous choisissez.',
      },
      {
        q: 'Comment j’apparais dans l’annuaire ?',
        a: 'Votre page y est publiée dès que vous activez l’option dans vos réglages. C’est gratuit et vous pouvez la retirer quand vous voulez.',
      },
    ],
  },

  contact: {
    badge: 'Nous contacter',
    title: 'Parlons de votre commerce',
    subtitle:
      'Écrivez-nous en français ou en anglais. Nous répondons sous un jour ouvré.',
    whatsappTitle: 'WhatsApp',
    whatsappBody: 'Le plus rapide. Du lundi au samedi, 8 h – 19 h.',
    whatsappCta: 'Ouvrir WhatsApp',
    emailTitle: 'E-mail',
    emailBody: 'Pour les demandes détaillées et les factures.',
    emailCta: 'Envoyer un e-mail',
    formTitle: 'Ou laissez-nous un message',
    fields: {
      name: 'Votre nom',
      namePlaceholder: 'Nadia Mbarga',
      business: 'Votre commerce',
      businessPlaceholder: 'Le Bastos, Yaoundé',
      email: 'Adresse e-mail',
      emailPlaceholder: 'vous@exemple.cm',
      message: 'Votre message',
      messagePlaceholder: 'Dites-nous ce dont vous avez besoin…',
    },
    submit: 'Envoyer le message',
    sending: 'Envoi…',
    sent: 'Message envoyé. Nous vous répondons très vite.',
    errors: {
      name: 'Indiquez votre nom.',
      email: 'Cette adresse e-mail est invalide.',
      message: 'Votre message est un peu court.',
    },
  },

  legal: {
    /* Marqué comme modèle : ce texte n'a pas été relu par un juriste et ne
       doit pas être publié tel quel. */
    templateWarning:
      'Modèle non relu par un juriste. Faites vérifier ce texte avant toute mise en ligne définitive.',
    updated: 'Dernière mise à jour',
    privacy: {
      badge: 'Confidentialité',
      title: 'Politique de confidentialité',
      intro:
        'CLYDE est un outil qui permet à un commerçant de créer sa page et de recevoir des commandes. Cette page explique quelles données nous traitons et pourquoi.',
      sections: [
        {
          h: 'Les données que nous collectons',
          p: 'Pour un commerçant : nom, adresse e-mail, numéro WhatsApp, et le contenu de sa page (produits, prix, photos). Pour un client qui commande : nom, numéro WhatsApp et contenu du panier. Nous ne demandons jamais de données bancaires.',
        },
        {
          h: 'Pourquoi nous les traitons',
          p: 'Pour faire fonctionner le service : afficher la page, transmettre la commande au commerçant sur WhatsApp, et lui fournir des statistiques de fréquentation agrégées.',
        },
        {
          h: 'Ce que nous ne faisons pas',
          p: 'Nous ne vendons aucune donnée. Nous ne transmettons les coordonnées d’un client qu’au commerçant chez qui il a commandé, et à personne d’autre.',
        },
        {
          h: 'Les abonnés d’une page',
          p: 'Un client peut choisir de suivre un commerce pour être informé de ses nouveautés. Ce choix est explicite, et il peut se désabonner à tout moment. Le commerçant s’engage à ne pas solliciter ses abonnés plus d’une fois par semaine.',
        },
        {
          h: 'Combien de temps nous les gardons',
          p: 'Les données d’un commerce sont conservées tant que le compte existe. Les commandes sont conservées vingt-quatre mois, le temps nécessaire au suivi comptable du commerçant.',
        },
        {
          h: 'Vos droits',
          p: 'Vous pouvez demander l’accès à vos données, leur correction ou leur suppression en nous écrivant. Nous répondons sous trente jours.',
        },
      ],
    },
    terms: {
      badge: 'Conditions',
      title: 'Conditions générales d’utilisation',
      intro:
        'En créant une page sur CLYDE, vous acceptez les règles ci-dessous. Elles existent pour protéger les commerçants comme leurs clients.',
      sections: [
        {
          h: 'Ce que CLYDE fournit',
          p: 'Un éditeur de page, un hébergement, un lien public, des QR codes, et la transmission des commandes vers votre WhatsApp. CLYDE n’est ni un intermédiaire de paiement ni un livreur.',
        },
        {
          h: 'Ce dont vous restez responsable',
          p: 'L’exactitude de vos prix, la disponibilité de vos produits, la qualité de ce que vous vendez, et le respect des règles de votre métier. Une commande passée via CLYDE est un contrat entre vous et votre client.',
        },
        {
          h: 'Contenus interdits',
          p: 'Produits illégaux, contrefaçons, contenus haineux ou trompeurs. Nous retirons une page qui enfreint ces règles, sans remboursement.',
        },
        {
          h: 'Paiements entre vous et vos clients',
          p: 'Ils se font hors de CLYDE, selon ce que vous convenez avec votre client : espèces, mobile money, virement. Nous n’encaissons rien à votre place et ne garantissons aucun règlement.',
        },
        {
          h: 'Essai et abonnement au service',
          p: 'Tout nouveau compte bénéficie de 35 jours d’essai avec l’ensemble des fonctionnalités, sans carte bancaire. À l’issue de l’essai, la formule gratuite reste utilisable sans limite de durée. Une formule payante est facturée d’avance et résiliable à tout moment ; elle reste active jusqu’à la fin de la période déjà réglée.',
        },
        {
          h: 'Interruptions',
          p: 'Nous visons une disponibilité continue sans pouvoir la garantir. En cas d’interruption longue de notre fait, la période concernée est créditée sur votre abonnement.',
        },
        {
          h: 'Fermeture d’un compte',
          p: 'Vous pouvez fermer votre compte quand vous le souhaitez ; votre page est alors dépubliée. Vous pouvez exporter votre catalogue avant la fermeture.',
        },
      ],
    },
  },

  auth: {
    signup: {
      title: 'Rejoindre l’Usine CLYDE',
      subtitle:
        'Vous ne créez pas un compte de plus : vous rejoignez l’Usine comme ingénieur. Choisissez votre métier, votre page est déjà prête à recevoir des commandes.',
      asideHeading:
        'Aucune commission sur vos ventes. Vous gardez la relation avec vos clients.',
      asidePoints: [
        'Une page publique à votre nom, indexée sur Google',
        'Les commandes arrivent directement sur votre WhatsApp',
        'Modules à activer selon votre métier : tables, chambres, rendez-vous',
      ],
      footerText: 'Vous avez déjà un compte ?',
      footerLink: 'Se connecter',
      submit: 'Rejoindre l’Usine',
      created: 'Bienvenue à l’Usine. Configurons votre ligne de production.',
    },
    login: {
      title: 'Content de vous revoir',
      subtitle:
        'Connectez-vous pour retrouver votre page, vos commandes et vos statistiques.',
      asideHeading:
        'Vos clients commandent sur WhatsApp. Vous suivez tout depuis un seul écran.',
      asidePoints: [
        'Commandes, réservations et messages centralisés',
        'Votre page se modifie en direct, sans développeur',
        'QR codes par table ou par chambre, prêts à imprimer',
      ],
      footerText: 'Pas encore de page ?',
      footerLink: 'Créer un compte',
      submit: 'Se connecter',
      welcome: 'Bienvenue',
      demoDivider: 'ou testez un compte',
      passwordNote:
        "Version de démonstration : le mot de passe n'est pas encore vérifié.",
    },
    fields: {
      name: 'Votre nom',
      namePlaceholder: 'Nadia Mbarga',
      email: 'Adresse e-mail',
      emailPlaceholder: 'vous@exemple.cm',
      whatsapp: 'Numéro WhatsApp',
      whatsappNote: 'C’est sur ce numéro que vous recevrez les commandes.',
      password: 'Mot de passe',
      passwordPlaceholder: '8 caractères minimum',
    },
    errors: {
      name: 'Indiquez votre nom.',
      email: 'Cette adresse e-mail est invalide.',
      whatsapp: 'Le numéro WhatsApp est trop court.',
      signupFailed: 'Inscription impossible.',
      loginFailed: 'Connexion impossible.',
    },
  },

  /* ----------------------------------------------------------
     Parrainage — arrivée par lien
     ---------------------------------------------------------- */
  referral: {
    join: {
      title: 'Vous avez été invité à rejoindre l’Usine.',
      titleNamed: '{name} vous invite à rejoindre l’Usine.',
      subtitle:
        'Créez votre page et démarrez avec {days} jours d’essai gratuit au lieu de 35.',
      asideHeading: 'Ce que vous obtenez en arrivant par un parrain',
      asidePoints: [
        '30 jours d’essai en plus des 35 jours habituels',
        'Le commerçant qui vous a invité est récompensé lui aussi',
        'Aucune carte bancaire, aucune compétence technique',
      ],
      footerText: 'Vous avez déjà un compte ?',
      footerLink: 'Se connecter',
      offerTitle: 'Votre essai gratuit',
      daysUnit: 'jours',
      offerBreakdown: '{base} jours d’essai de base et {bonus} jours de parrainage.',
      referrerNote: 'C’est ce commerçant qui vous a invité.',
      unknownCode:
        'Ce lien de parrainage n’a pas été reconnu. Vous pouvez continuer : votre essai de 35 jours reste acquis.',
      condition:
        'Le bonus est accordé à la publication de votre page — pas seulement à l’inscription.',
      cta: 'Créer ma page',
    },
  },

  /* ----------------------------------------------------------
     Formation

     Seul l'habillage est ici. Les cours eux-mêmes vivent dans
     `formation.ts`, en paires `{ fr, en }` : du contenu éditorial
     dans le dictionnaire aurait doublé sa taille.
     ---------------------------------------------------------- */
  formation: {
    badge: 'Formation',
    title: 'On ne vous laisse pas apprendre seul.',
    subtitle:
      'Les cours de l’Usine, et ceux que des ingénieurs proposent à d’autres ingénieurs. Chaque formation achevée est inscrite à votre registre.',
    tracks: {
      usine: {
        label: 'Cours de l’Usine',
        note: 'Produits par CLYDE. Le socle : publier, vendre, lire ses chiffres.',
      },
      communaute: {
        label: 'Cours des ingénieurs',
        note: 'Proposés par des commerçants à d’autres commerçants. Le métier s’apprend aussi entre pairs.',
      },
    },
    levels: {
      debutant: 'Débutant',
      intermediaire: 'Intermédiaire',
      avance: 'Avancé',
    },
    kinds: { text: 'Texte', image: 'Image', video: 'Vidéo' },
    minutesShort: '{n} min',
    lessonsCount: '{n} leçons',
    /* Un cours ne se compte jamais « 1 leçons ». */
    lessonsCountOne: '1 leçon',
    by: 'Par',
    open: 'Ouvrir le cours',
    back: 'Toutes les formations',
    progress: '{done} / {total} leçons',
    notStarted: 'Pas commencé',
    resume: 'Reprendre',
    markDone: 'Marquer comme faite',
    markUndone: 'Leçon faite',
    certificateAward: 'Certificat délivré à la fin du cours',
    goodieAward: 'Goodie associé : {goodie}',
    completedTitle: 'Cours achevé.',
    completedBody:
      'Le certificat est inscrit à votre registre. Vous le retrouvez dans votre tableau de bord.',
    completedToast: 'Cours achevé — certificat inscrit au registre.',
    certificateHeld: 'Certificat obtenu',
    signedOut:
      'Connectez-vous pour enregistrer votre progression et recevoir vos certificats.',
    signedOutCta: 'Se connecter',
    teachTitle: 'Vous savez faire quelque chose que les autres ignorent ?',
    teachBody:
      'Un photographe qui enseigne la prise de vue, un restaurateur qui explique ses marges : n’importe quel ingénieur peut proposer une formation à la communauté.',
    teachCta: 'Proposer une formation',
  },

  /* ----------------------------------------------------------
     Forum
     ---------------------------------------------------------- */
  forum: {
    badge: 'Forum',
    title: 'Le métier s’apprend en se parlant.',
    subtitle:
      'Les questions qu’on n’ose pas poser à un support, on les pose à un confrère qui tient boutique à deux quartiers.',
    all: 'Toutes les rubriques',
    threadsCount: (n: number) =>
      n === 0 ? 'Aucun fil' : `${n} fil${n > 1 ? 's' : ''}`,
    repliesCount: (n: number) =>
      n === 0 ? 'Pas encore de réponse' : `${n} réponse${n > 1 ? 's' : ''}`,
    pinned: 'Épinglé',
    staffBadge: 'Équipe CLYDE',
    emptyCategory: 'Personne n’a encore ouvert de fil dans cette rubrique.',
    emptyCategoryCta: 'Ouvrez le premier.',
    /* Un fil masqué et un fil inexistant donnent le même écran : préciser
       lequel des deux apprendrait à un curieux qu'un message a été retiré. */
    notFound: 'Ce fil n’est pas accessible.',
    notFoundBody:
      'Il a peut-être été retiré, ou l’adresse est incorrecte. Le reste du forum vous attend.',
    /* --- Ouvrir un fil --- */
    newThread: 'Ouvrir un fil',
    newThreadTitle: 'Votre question',
    titleLabel: 'Le sujet, en une phrase',
    titlePlaceholder: 'Comment vous faites pour les commandes le dimanche ?',
    categoryLabel: 'Rubrique',
    bodyLabel: 'Expliquez votre situation',
    bodyPlaceholder:
      'Dites ce que vous avez déjà essayé : on vous répondra plus précisément.',
    publish: 'Publier',
    cancel: 'Annuler',
    titleTooShort: 'Donnez un sujet un peu plus explicite.',
    bodyTooShort: 'Quelques phrases de plus aideront ceux qui vous répondront.',
    published: 'Fil publié.',
    /* --- Répondre --- */
    replyTitle: 'Répondre',
    repliesTitle: (n: number) =>
      n === 0 ? 'Réponses' : `${n} réponse${n > 1 ? 's' : ''}`,
    replyPlaceholder: 'Ce que vous avez fait, vous, dans cette situation.',
    reply: 'Envoyer la réponse',
    replied: 'Réponse envoyée.',
    replyTooShort: 'Une réponse d’un mot n’aide personne. Développez un peu.',
    signedOut: 'Connectez-vous pour ouvrir un fil ou répondre.',
    signedOutCta: 'Se connecter',
    backToForum: 'Retour au forum',
    openThread: 'Lire le fil',
    /* --- Modération --- */
    report: 'Signaler',
    reportTitle: 'Signaler ce message',
    reportBody:
      'Dites en une phrase ce qui pose problème. Le message reste visible tant que l’équipe n’a pas tranché.',
    reportPlaceholder: 'Publicité déguisée, propos insultants, hors sujet…',
    reportSend: 'Envoyer le signalement',
    reportDone: 'Signalement transmis.',
    reportAlready: 'Vous avez déjà signalé ce message.',
    reported: 'Signalé, en attente d’arbitrage',
    hidden: 'Masqué par la modération',
    /* Montré à l'auteur seul : c'est la seule façon qu'il corrige. */
    hiddenOwn:
      'Ce message est masqué pour les autres. Vous seul le voyez encore.',
    hiddenReason: 'Motif :',
    hide: 'Masquer',
    hideReasonLabel: 'Motif communiqué à l’auteur',
    restore: 'Rétablir',
    moderationEmpty: 'Aucun signalement en attente.',
  },

  /* ----------------------------------------------------------
     Boutique Goodies
     ---------------------------------------------------------- */
  goodies: {
    badge: 'Boutique',
    title: 'Ce que vous avez gagné se porte et se pose sur un comptoir.',
    subtitle:
      'Les points viennent de ce que vous faites déjà : une leçon validée, un cours achevé, un confrère amené. Ils ne s’achètent pas.',
    balance: 'Votre solde',
    points: (n: number) => `${n} point${n > 1 ? 's' : ''}`,
    pointsShort: 'pts',
    ledgerTitle: 'D’où viennent vos points',
    ledgerEmpty:
      'Vous n’avez pas encore de points. Validez une leçon de la Formation : c’est le plus rapide.',
    ledgerCta: 'Aller à la Formation',
    scaleTitle: 'Le barème',
    scale: {
      lesson: 'Une leçon validée',
      course: 'Un cours achevé, en plus des leçons',
      foundation: 'Votre page publiée',
      followers: 'Le certificat des 200 abonnés',
      referral: 'Un confrère amené, qui publie sa page',
    },
    catalogueTitle: 'Le catalogue',
    redeem: 'Échanger',
    redeemTitle: 'Échanger contre {goodie}',
    cost: 'Coût',
    missing: (n: number) => `Il vous manque ${n} point${n > 1 ? 's' : ''}`,
    nameLabel: 'Nom du destinataire',
    phoneLabel: 'Numéro WhatsApp',
    cityLabel: 'Ville de retrait',
    addressLabel: 'Quartier ou point de repère',
    addressPlaceholder: 'Ex. : Bastos, en face de la pharmacie.',
    sizeLabel: 'Taille',
    noteLabel: 'Précision pour la remise (facultatif)',
    notePlaceholder: 'Couleur, ou un repère pour vous trouver.',
    incomplete: 'Nom, numéro et ville sont nécessaires pour la remise.',
    confirm: 'Confirmer l’échange',
    cancel: 'Annuler',
    done: 'Échange enregistré. L’équipe vous contacte sur WhatsApp.',
    failed: 'Solde insuffisant pour cet échange.',
    ordersTitle: 'Vos échanges',
    ordersEmpty: 'Vous n’avez encore rien échangé.',
    status: {
      demande: 'Demande reçue',
      preparee: 'En préparation',
      remise: 'Remis',
    },
    signedOut:
      'Connectez-vous et publiez votre page pour commencer à gagner des points.',
    signedOutCta: 'Se connecter',
    noBusiness:
      'Créez votre page pour commencer à gagner des points : c’est elle qui les porte.',
    noBusinessCta: 'Créer ma page',
  },

  /* ----------------------------------------------------------
     Équipe de développement
     ---------------------------------------------------------- */
  team: {
    badge: 'L’équipe',
    title: 'Qui construit CLYDE.',
    subtitle:
      'Une petite équipe, à Douala et Yaoundé. Nous tenons les mêmes horaires que vous : quand un commerçant écrit un samedi soir, quelqu’un lit.',
    rolesTitle: 'Ce que nous faisons',
    valuesTitle: 'Ce à quoi nous tenons',
    values: [
      {
        title: 'On teste sur un vrai comptoir.',
        body: 'Aucune fonction ne sort sans avoir été essayée dans un commerce qui reçoit de vraies commandes. Un outil pensé depuis un bureau finit toujours par demander au commerçant de changer son métier.',
      },
      {
        title: 'Le prix ne monte pas en silence.',
        body: 'Ce qui est gratuit reste gratuit. Quand un tarif change, il est annoncé sur le forum avant, pas découvert sur une facture.',
      },
      {
        title: 'Vos données vous suivent.',
        body: 'Catalogue, commandes, clients : tout s’exporte. Un commerçant qui ne peut pas partir n’est pas un client, c’est un prisonnier.',
      },
    ],
    contactTitle: 'Nous écrire',
    contactBody:
      'Une question sur l’outil se pose au forum : la réponse servira à d’autres. Pour tout le reste, la boîte est ouverte.',
    contactForum: 'Poser la question au forum',
    contactMail: 'Écrire à l’équipe',
  },

  /* ----------------------------------------------------------
     L'équipe de développement — ce que le reste du monde
     appellerait « la newsletter ».

     Le mot « newsletter » et le verbe « s'abonner » sont
     proscrits dans ces textes : on ne s'abonne pas à un
     bulletin, on rejoint l'équipe qui décide de la suite. Le
     contenu envoyé est le compte-rendu du Forum, d'où le lien
     explicite dans le sous-titre.
     ---------------------------------------------------------- */
  devTeam: {
    badge: 'Équipe de développement',
    title: 'Rejoindre l’équipe de développement',
    subtitle:
      'Vous ne vous abonnez pas à une newsletter. Vous rejoignez l’équipe qui décide de ce que l’Usine construit ensuite.',
    /* Dit ce qui arrive vraiment dans la boîte : une promesse vague ferait
       s'inscrire des gens qui se sentiraient trompés au premier envoi. */
    promise:
      'Chaque mois : ce que les ingénieurs ont proposé au Forum, ce qui a été adopté, ce qui sort bientôt. Rien d’autre.',
    nameLabel: 'Votre nom',
    namePlaceholder: 'Awa Diallo',
    whatsappLabel: 'Numéro WhatsApp',
    whatsappHint: 'C’est par là que le compte-rendu arrive.',
    whatsappPlaceholder: '+237 6 90 00 00 00',
    emailLabel: 'E-mail',
    emailOptional: 'facultatif',
    emailPlaceholder: 'awa@exemple.cm',
    submit: 'Rejoindre l’équipe',
    /* Le message de retour nomme l'engagement pris, pas l'action technique :
       « Inscription enregistrée » n'aurait rien dit de ce qui va se passer. */
    successTitle: 'Vous êtes de l’équipe.',
    successBody:
      'Le prochain compte-rendu vous arrivera sur WhatsApp. D’ici là, le Forum est ouvert : c’est là que tout se décide.',
    successForum: 'Aller au Forum',
    errorName: 'Indiquez le nom sous lequel vous voulez être connu.',
    errorWhatsapp: 'Un numéro WhatsApp valide est nécessaire pour recevoir le compte-rendu.',
    errorDuplicate: 'Ce numéro fait déjà partie de l’équipe.',
    /* Le dépliant du Forum : fermé par défaut, pour ne pas repousser vers le bas
       les fils que le visiteur est venu lire. */
    toggleOpen: 'Rejoindre l’équipe de développement',
    toggleClose: 'Fermer',
    toggleHint: 'Recevez le compte-rendu des décisions du Forum.',

    /* --- Courrier direct à l'Usine --- */
    contactTitle: 'Écrire directement à l’Usine',
    contactBody:
      'Une idée, un blocage, une demande d’aide : ce message arrive à l’administration CLYDE, pas sur le Forum public.',
    topicLabel: 'Sujet',
    topics: {
      idee: 'Une idée pour l’Usine',
      probleme: 'Un problème à signaler',
      aide: 'J’ai besoin d’aide',
      autre: 'Autre chose',
    },
    messageLabel: 'Votre message',
    messagePlaceholder:
      'Décrivez la situation. Plus c’est précis, plus la réponse sera utile.',
    contactSubmit: 'Envoyer à l’Usine',
    contactSuccess:
      'Message transmis à l’administration. La réponse arrivera sur le canal que vous avez laissé.',
    errorMessage: 'Écrivez votre message avant de l’envoyer.',
    errorChannel:
      'Laissez un numéro WhatsApp ou un e-mail, sinon personne ne pourra vous répondre.',
  },

  /* ----------------------------------------------------------
     Tableau de bord

     Les mots du métier (« Menu », « Tables ») ne sont pas ici :
     ils viennent de `useTradeWords()`, car ils dépendent de la
     catégorie du commerce et pas seulement de la langue.
     ---------------------------------------------------------- */
  dashboard: {
    common: {
      loading: 'Chargement',
      viewPage: 'Voir ma page',
      signOut: 'Se déconnecter',
      openMenu: 'Ouvrir le menu',
      navLabel: 'Sections du tableau de bord',
      online: 'Page en ligne',
      draft: 'Brouillon',
      vsPrevious: 'vs période précédente',

      /* Partage et export.
         Ces libellés servent dans plusieurs écrans (catalogue, commandes,
         clients) : les garder en commun évite trois formulations pour un
         seul geste. */
      share: {
        catalogPdf: (word: string) => `Partager mon ${word} en PDF`,
        catalogPdfHint: (word: string) =>
          `Un ${word} d’une page, à envoyer sur WhatsApp ou à mettre en statut. Le lien de votre page y figure, pour que le client commande vraiment.`,
        catalogPdfDone: 'PDF prêt. Envoyez-le sur WhatsApp.',
        catalogPdfEmpty: (word: string) =>
          `Ajoutez au moins un article pour générer votre ${word}.`,
        exportCsv: 'Exporter en CSV',
        exportOrders: 'Exporter les commandes',
        exportCustomers: 'Exporter les clients',
        /* On annonce le nombre exporté : un fichier vide téléchargé sans
           avertissement laisse croire à une panne. */
        exportDone: (n: number) =>
          `${n} ligne${n > 1 ? 's' : ''} exportée${n > 1 ? 's' : ''}.`,
        exportEmpty: 'Rien à exporter sur cette période.',
        /* En-têtes du fichier : lisibles dans Excel, sans jargon technique. */
        csvOrders: {
          date: 'Date',
          customer: 'Client',
          phone: 'WhatsApp',
          location: 'Emplacement',
          items: 'Articles',
          total: 'Total',
          status: 'Statut',
        },
        csvCustomers: {
          name: 'Nom',
          phone: 'WhatsApp',
          orders: 'Commandes',
          spent: 'Total dépensé',
          last: 'Dernière commande',
        },
      },

      /* Libellés imprimés dans le PDF du catalogue. */
      catalogPdf: {
        unavailable: 'Indisponible',
        orderVia: 'Commandez sur WhatsApp',
        page: (current: number, total: number) => `Page ${current} / ${total}`,
      },
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      add: 'Ajouter',
      close: 'Fermer',
    },
    nav: {
      home: 'Accueil',
      orders: 'Commandes',
      qrSuffix: 'et QR',
      bookings: 'Réservations',
      analytics: 'Analytics',
      modules: 'Modules',
      subscription: 'Abonnement',
    },
    overview: {
      greeting: (name: string) => `Bonjour, ${name}`,
      description: (days: number) =>
        `Voici l'activité de votre page sur les ${days} derniers jours.`,
      /* Le rituel de la Révélation : le moment unique du monde CLYDE,
         joué une seule fois, à la première publication. */
      ritual: {
        inProgress: 'Révélation en cours…',
        heading: 'Voici qui vous êtes vraiment sur CLYDE :',
        visible: (name: string) => `${name} est désormais visible.`,
        linkLabel: 'Votre lien',
        share: 'Partager ma révélation',
        download: 'Télécharger l’image',
        view: 'Voir ma page',
        close: 'Continuer',
        artifactBefore: 'Avant',
        artifactAfter: 'Après',
        artifactBanner: (name: string, title: string) =>
          `${name} est désormais ${title} sur CLYDE.`,
        shareText: (name: string, title: string, slug: string) =>
          `${name} est désormais ${title} sur CLYDE. Découvrez la page : clyde.app/r/${slug}`,
      },
      draftTitle: "Votre page n'est pas encore en ligne",
      draftBody:
        'Tant qu\u2019elle est en brouillon, vos clients ne peuvent pas y accéder ni commander.',
      publish: 'Publier ma page',
      published: 'Votre page est en ligne.',
      bonusGranted: '+{days} jours d’essai gratuit ajoutés.',
      kpiVisits: 'Visites',
      kpiOrders: 'Commandes',
      kpiRevenue: 'Chiffre estimé',
      kpiFollowers: 'Abonnés',
      todo: 'À traiter',
      allOrders: 'Toutes les commandes',
      nothingPending: 'Aucune commande en attente. Tout est à jour.',
      onSite: 'Sur place',
      online: 'En ligne',
      confirm: 'Confirmer',
      cancel: 'Annuler',
      confirmed: 'Commande confirmée.',
      cancelled: 'Commande annulée.',
      manage: 'Gérer',
      noItems: 'Aucun article — commencez ici',
      itemsOnline: (n: number) =>
        `${n} article${n > 1 ? 's' : ''} en ligne`,
      bookingsDetail: 'Créneaux et demandes reçues',
      qrDetail: 'Imprimez vos QR codes',
      analyticsDetail: 'Ce qui attire et ce qui bloque',
      activation: {
        title: 'Vos premiers pas',
        subtitle: 'Quatre étapes pour que votre page commence à vendre.',
        step1Title: 'Ajoutez au moins 3 articles',
        step1Done: (n: number) => `${n} article${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`,
        step1Action: 'Ajouter des articles',
        step2Title: 'Publiez votre page',
        step2Done: 'Page publiée',
        step2Action: 'Publier',
        step3Title: 'Téléchargez votre QR code',
        step3Done: 'QR code téléchargé',
        step3Action: 'Voir mes papiers',
        step4Title: 'Partagez votre lien',
        step4Done: 'Lien partagé',
        step4Action: 'Voir ma page',
        markDone: 'Marquer comme fait',
        undo: 'Annuler',
        allDone: 'Vos premiers pas sont terminés — votre page est prête à vendre.',
      },
    },
    orders: {
      title: 'Commandes',
      pendingCount: (n: number) =>
        `${n} commande${n > 1 ? 's' : ''} en attente de votre réponse.`,
      allClear: 'Aucune commande en attente. Tout est à jour.',
      status: {
        pending: 'À traiter',
        whatsappOpened: 'Client contacté',
        confirmed: 'Confirmée',
        cancelled: 'Annulée',
      },
      filters: {
        pending: 'À traiter',
        whatsappOpened: 'Contactés',
        confirmed: 'Confirmées',
        cancelled: 'Annulées',
        all: 'Toutes',
      },
      removedItem: 'Article retiré du catalogue',

      /* Paniers laissés en route.
         Le vocabulaire évite « abandonné », qui sonne comme un reproche fait
         au client, et parle de ce que le commerçant peut faire : relancer. */
      abandoned: {
        tab: 'Paniers laissés',
        body: 'Ces clients ont choisi leurs articles sans envoyer la commande. Un message suffit souvent.',
        empty: 'Aucun panier en attente.',
        emptyHint:
          'Un panier apparaît ici quand un client a laissé son nom et son WhatsApp sans terminer, depuis plus de 30 minutes.',
        remind: 'Relancer sur WhatsApp',
        remindAgain: 'Relancer à nouveau',
        reminded: (when: string) => `Relancé ${when}`,
        recovered: 'A commandé après relance',
        dismiss: 'Retirer de la liste',
        dismissed: 'Panier retiré de la liste.',
        opened: 'WhatsApp est ouvert, le message est prêt.',
        cartTotal: 'Panier',
        /* Le compteur des paniers récupérés est la seule preuve que la
           relance sert : sans lui, le commerçant relance à l'aveugle. */
        recoveredCount: (n: number) =>
          `${n} panier${n > 1 ? 's' : ''} récupéré${n > 1 ? 's' : ''} après relance`,
      },
      onlineChannel: 'En ligne',
      replyWhatsapp: 'Répondre sur WhatsApp',
      confirm: 'Confirmer',
      cancel: 'Annuler',
      contacted: (name: string) => `${name} a été contacté.`,
      confirmedToast: (name: string) => `Commande de ${name} confirmée.`,
      cancelledToast: (name: string) => `Commande de ${name} annulée.`,
      emptyFiltered: 'Rien dans cette liste',
      emptyFilteredBody: 'Changez de filtre pour voir les autres commandes.',
      emptyNone: 'Pas encore de commande',
      emptyNoneBody:
        'Les commandes passées depuis votre page publique ou par QR code arriveront ici.',
    },
    modules: {
      title: 'Modules',
      description:
        'Activez seulement ce dont vous vous servez : chaque module ajoute une section au menu.',
      overLimit: (planName: string, max: number) =>
        `Votre offre ${planName} n'autorise que ${max} module actif : désactivez-en un, sinon seul le premier restera pris en charge. `,
      withinLimit: (planName: string, max: number, used: number) =>
        `Offre ${planName} : ${max} module actif à la fois (${used} / ${max} utilisé). `,
      seePlans: 'Voir les offres',
      limitReached: (max: number) =>
        `Votre offre autorise ${max} module actif. Désactivez l'autre ou passez en Pro.`,
      blockedHint:
        'Désactivez l’autre module pour activer celui-ci, ou passez en Pro pour les deux en même temps.',
      enable: 'Activer',
      disable: 'Désactiver',
      toastEnabled: (name: string) => `${name} activé.`,
      toastDisabled: (name: string) => `${name} désactivé.`,
      bookingName: 'Réservations',
      bookingBlurb:
        'Vos clients demandent un créneau depuis la page publique ; vous confirmez en un geste.',
      bookingUnlock1: 'Section « Réservations » dans le menu',
      bookingUnlock2: 'Bloc « Réservation » disponible sur la page publique',
      bookingUnlock3: 'Horaires d’ouverture par jour',
      locationsName: (plural: string) => `${plural} et QR codes`,
      locationsBlurb: (singular: string) =>
        `Un QR par ${singular} : le client scanne, commande, et vous savez d'où vient la commande.`,
      locationsUnlock1: (plural: string) =>
        `Section « ${plural} et QR » dans le menu`,
      locationsUnlock2: (singular: string) =>
        `Numéro de ${singular} sur chaque commande reçue`,
      locationsShort: (plural: string) => `${plural} et QR`,
      dialogTitle: 'Votre page publique va changer',
      dialogOne: (blockLabel: string) =>
        `Le bloc « ${blockLabel} » disparaîtra de votre page en ligne. Il reste dans l'éditeur : réactivez le module et il réapparaît.`,
      dialogMany: (list: string) =>
        `Ces blocs disparaîtront de votre page en ligne : ${list}. Ils restent dans l'éditeur : réactivez le module et ils réapparaissent.`,
      cancel: 'Annuler',
      disableAnyway: 'Désactiver quand même',
    },
    subscription: {
      title: 'Abonnement',
      description: "Votre offre actuelle et ce qu'elle vous permet de faire.",
      currentPlan: 'Offre actuelle',
      perMonth: '/ mois',
      /* Sans le symbole : la carte affiche déjà « 9 000 FCFA ». */
      perUnit: '/ mois',
      renewsOn: (date: string) => `Prochain renouvellement le ${date}.`,
      noRenewal: 'Sans engagement, aucun renouvellement à prévoir.',
      goPro: 'Passer en Pro',
      backToFree: 'Revenir à Gratuit',
      contactUs: 'Nous contacter',
      yourPlan: 'Votre offre',
      activePlan: 'Offre active',
      onRequest: 'Sur devis',
      activeModules: 'Modules actifs',
      unlimited: 'illimité',
      requestSent: 'Demande envoyée',
      requestBody: 'Notre équipe vous contacte sous 24 heures ouvrées.',
      backOnFree: 'Vous êtes repassé à l’offre Gratuit.',
      proActive: 'Votre offre Pro est active.',
      demoNotice:
        "Version de démonstration : changer d'offre applique immédiatement les limites correspondantes, sans aucun paiement réel.",

      /* Quota de pages — la limite tient au COMPTE, pas à la page ouverte. */
      pagesTitle: 'Vos pages',
      pagesUsage: '{used} page(s) sur {limit}',
      pagesUnlimited: '{used} page(s) — sans limite',
      pagesFull: 'Limite atteinte. Passez à une offre plus large pour créer une nouvelle page.',
      newPage: 'Créer une page',
      downgradeBlocked:
        'Vous détenez {count} pages. Revenir à Gratuit n’en autorise qu’une seule — supprimez les autres avant de redescendre.',

      /* Essai en cours sur la page affichée. */
      trialTitle: 'Essai gratuit',
      trialLeft: '{days} jours restants',
      trialOver: 'Essai terminé.',
      trialDeferred:
        '{days} jours gagnés sont mis en réserve : ils s’appliqueront si vous revenez à l’offre Gratuit.',
    },

    /* ----------------------------------------------------------
       Récompenses — parrainage et paliers d'abonnés
       ---------------------------------------------------------- */
    rewards: {
      title: 'Parrainage et récompenses',
      description:
        'Faites venir un commerçant, gagnez des jours. Vos abonnés en rapportent aussi.',

      linkTitle: 'Votre lien de parrainage',
      linkBody:
        'Partagez-le. Quand le commerçant que vous avez amené publie sa page, vous gagnez {days} jours d’essai — et lui aussi.',
      copy: 'Copier le lien',
      copied: 'Lien copié.',
      share: 'Partager',
      codeLabel: 'Votre code',

      /* La condition est dite en clair : c'est la publication qui récompense,
         pas l'inscription. Un parrain qui l'ignore croit à une panne. */
      conditionNote:
        'Le bonus tombe à la publication de sa page, jamais à la simple inscription.',

      statsTitle: 'Vos parrainages',
      statInvited: 'Invités',
      statPublished: 'Pages publiées',
      statDaysEarned: 'Jours gagnés',
      empty: 'Aucun parrainage pour le moment. Partagez votre lien pour commencer.',
      pendingLabel: 'En attente de publication',
      completedLabel: 'Publiée',

      milestonesTitle: 'Paliers d’abonnés',
      milestonesBody:
        'Tous les {step} abonnés, votre page gagne {days} jours d’essai — jusqu’à {max} abonnés.',
      milestoneReached: 'Palier {milestone} atteint',
      milestoneNext: 'Encore {count} abonné(s) avant le palier {milestone}.',
      milestoneAllDone: 'Tous les paliers sont atteints. Bravo.',
      milestoneCertificate:
        'À {threshold} abonnés, l’Usine délivre un certificat supplémentaire.',

      historyTitle: 'Détail de vos jours gagnés',
      historyEmpty: 'Aucun bonus enregistré.',
      deferredBadge: 'En réserve',
      daysUnit: '{days} j',
    },
    analytics: {
      /* Le libellé de navigation reste « Statistiques �� (fonctionnel, pour
         celui qui cherche ses chiffres un lundi matin pressé) ; seul
         l'en-tête de page porte la voix du Miroir. */
      title: 'Ce que le Miroir vous révèle',
      description: "Ce que vos clients regardent, et ce qu'ils commandent vraiment.",
      rangeLabel: 'Période observée',
      days: (n: number) => `${n} jours`,
      overDays: (n: number) => `sur ${n} jours`,
      views: 'Visites',
      orders: 'Commandes',
      conversion: 'Conversion',
      conversionHint: 'des visites deviennent commandes',
      revenue: 'Chiffre estimé',
      chartTitle: 'Activité jour par jour',
      legendViews: 'Visites — échelle de gauche',
      legendOrders: 'Commandes — échelle de droite',
      emptyTitle: 'Aucune visite sur la période',
      emptyBody:
        'Partagez votre lien ou vos QR codes : les statistiques se remplissent dès les premières visites.',
      viewMyPage: 'Voir ma page',
      bestTitle: 'Ce qui se vend le mieux',
      bestBody: 'Vos entrées les plus commandées sur la période.',
      noOrders: 'Aucune commande sur la période.',
      hesitationTitle: 'Angles morts détectés',
      hesitationBody:
        'Très regardé, rarement commandé : le miroir voit une hésitation — pas vous. Souvent une photo, une description ou un prix à revoir.',
      lockedBody:
        "La détection d'hésitation et la comparaison de périodes font partie de l'offre Pro.",
      seePro: "Voir l'offre Pro",
      notEnough:
        'Pas assez de visites sur la période pour repérer un signal fiable.',
      /* « 412 visites · 3 commandes » */
      viewsOrders: (views: number, orders: number) =>
        `${views} visites · ${orders} commande${orders > 1 ? 's' : ''}`,
      editCatalog: (word: string) => `Modifier mon ${word}`,

      /* Tunnel de conversion */
      funnelTitle: 'Où vous perdez des clients',
      funnelBody:
        'Trois étapes : on regarde, on met au panier, on envoie. L’étape qui chute le plus est celle à corriger.',
      funnelViews: 'Ont regardé',
      funnelCarts: 'Ont mis au panier',
      funnelOrders: 'Ont commandé',
      funnelKept: (pct: string) => `${pct} de l’étape précédente`,
      funnelDropCarts:
        'Beaucoup regardent sans mettre au panier : revoyez d’abord les photos et les prix.',
      funnelDropOrders:
        'Les paniers se remplissent mais partent peu : relancez les paniers abandonnés.',
      funnelHealthy: 'Votre tunnel se tient bien sur cette période.',

      /* Performance par emplacement */
      byLocationTitle: (plural: string) => `Ce que rapporte chaque ${plural}`,
      byLocationBody:
        'Les commandes venues des QR, classées par chiffre. Le panier moyen dit lesquelles valent le service.',
      byLocationOrders: 'commandes',
      byLocationAverage: 'Panier moyen',
      byLocationEmpty: (plural: string) =>
        `Aucune commande via un QR de ${plural} sur cette période.`,
      byLocationBest: (label: string) => `${label} est votre meilleur emplacement.`,

      /* Heures d'affluence */
      hoursTitle: 'Vos heures de pointe',
      hoursBody:
        'Le nombre de commandes par heure. De quoi placer le renfort au bon moment.',
      hoursPeak: (label: string, n: number) =>
        `Pic à ${label} : ${n} commande${n > 1 ? 's' : ''}.`,
      hoursEmpty: 'Pas encore assez de commandes pour dégager des heures de pointe.',
      hoursOrders: 'Commandes',
    },
    locations: {
      /* Le genre du mot métier (« une table », « un box ») rend l'accord
         impossible à généraliser : les libellés restent neutres. */
      title: (plural: string) => `${plural} et QR`,
      description: (singular: string) =>
        `Un QR code par ${singular} : le client scanne, commande, et vous recevez la commande avec le numéro de ${singular}.`,
      moduleOffTitle: (plural: string) => `${plural} et QR`,
      moduleOffDescription: 'Ce module est désactivé pour votre commerce.',
      moduleOffHeading: 'Commande sur place désactivée',
      moduleOffBody: (singular: string, plural: string) =>
        `Activez ce module pour créer des ${plural.toLowerCase()} et imprimer un QR code par ${singular} : vos clients commandent depuis leur téléphone, sans vous appeler.`,
      enableModule: 'Activer le module',
      moduleEnabled: 'Module activé.',
      bulkCreate: 'Créer en série',
      add: 'Ajouter',
      countLabel: (n: number, word: string) => `${n} ${word}`,
      ofLimit: (limit: number, planName: string) =>
        ` sur ${limit} inclus dans l'offre ${planName}`,
      limitReachedSuffix: ' — limite atteinte',
      limitError: (planName: string, limit: number, plural: string) =>
        `Votre offre ${planName} est limitée à ${limit} ${plural.toLowerCase()}.`,
      added: (label: string) => `${label} ajouté.`,
      deleted: (label: string) => `${label} supprimé.`,
      renamed: 'Nom mis à jour.',
      bulkCreated: (n: number, plural: string) =>
        `${n} ${plural.toLowerCase()} créés.`,
      emptyTitle: (singular: string) => `Aucun ${singular} pour l’instant`,
      emptyBody:
        'Créez-les en série si vous en avez plusieurs : les numéros se suivent automatiquement.',
      nameOf: (singular: string) => `Nom du ${singular}`,
      validate: 'Valider',
      renameOf: (label: string) => `Renommer ${label}`,
      deleteOf: (label: string) => `Supprimer ${label}`,
      seeQrOf: (label: string) => `Voir le QR code de ${label}`,
      seeDownload: 'Voir et télécharger',
      bulkTitle: (plural: string) => `Créer plusieurs ${plural.toLowerCase()}`,
      bulkBody: (plural: string) =>
        `Les noms sont numérotés à la suite des ${plural.toLowerCase()} existants. Vous pourrez les renommer ensuite.`,
      howMany: 'Combien ?',
      remaining: (n: number) => `${n} restants dans votre offre.`,
      noneRemaining: 'Votre offre ne permet pas d’en ajouter davantage.',
      cancel: 'Annuler',
      create: 'Créer',
      qrBody: (singular: string) =>
        `À imprimer et poser sur le ${singular}. Le QR reste valable même si vous le renommez.`,
      order: 'Commander',
      scanHint:
        'Scannez pour voir la carte et commander depuis votre téléphone.',
      testLink: 'Tester le lien',
      downloadPng: 'Télécharger le PNG',
      qrUnavailable: 'QR code indisponible, réessayez.',
      qrDownloaded: 'QR code téléchargé.',

      /* Planche à imprimer */
      printSheet: 'Planche à imprimer',
      printSheetTitle: (plural: string) =>
        `Imprimer tous les QR de mes ${plural.toLowerCase()}`,
      printSheetBody: (plural: string) =>
        `Une planche A4 avec un QR par ${plural.toLowerCase()}, traits de découpe compris. Neuf étiquettes par page.`,
      printSheetPages: (n: number) =>
        `${n} page${n > 1 ? 's' : ''} à imprimer`,
      printSheetGenerate: 'Générer le PDF',
      printSheetGenerating: 'Préparation du PDF…',
      printSheetDone: 'PDF prêt, téléchargement lancé.',
      printSheetFailed: 'Le PDF n’a pas pu être créé. Réessayez.',
      printSheetFooter: (url: string) => `Commandez en ligne : ${url}`,
      printSheetEmpty: (plural: string) =>
        `Créez au moins un emplacement pour imprimer une planche de ${plural.toLowerCase()}.`,

      /* Vérification par scan */
      verify: 'Vérifier un QR',
      verifyTitle: 'Vérifier un QR collé',
      verifyBody:
        'Scannez une étiquette déjà en place : on vous dit à quel emplacement elle renvoie.',
      verifyStart: 'Ouvrir la caméra',
      verifyStop: 'Arrêter',
      verifyAiming: 'Visez le QR code…',
      verifyDenied:
        'Accès à la caméra refusé. Autorisez-la dans votre navigateur, puis réessayez.',
      verifyUnsupported:
        'Votre navigateur ne permet pas la lecture de QR. Comparez le lien affiché sous chaque code.',
      verifyMatch: (label: string) => `C’est bien ${label}.`,
      verifyForeign:
        'Ce QR ne mène pas à votre boutique. Il vient probablement d’un autre commerce.',
      verifyUnknown:
        'Ce QR pointe vers un emplacement supprimé. Remplacez l’étiquette.',
      verifyAgain: 'Scanner un autre',
      verifyOtherLocation: (label: string) =>
        `Attention : cette étiquette renvoie vers ${label}.`,
    },
    catalog: {
      countOne: (n: number) => `${n} entrée`,
      countMany: (n: number) => `${n} entrées`,
      ofLimit: (limit: number) => ` sur ${limit} incluses dans votre plan`,
      limitError: (limit: number) =>
        `Votre plan est limité à ${limit} entrées. Passez en Pro pour un catalogue illimité.`,
      add: 'Ajouter',
      search: 'Rechercher',
      searchLabel: 'Rechercher dans le catalogue',
      limitBanner: (limit: number) =>
        `Vous avez atteint la limite de ${limit} entrées de votre plan. `,
      seePlans: 'Voir les plans',
      saved: 'Modifications enregistrées.',
      created: 'Entrée ajoutée à votre page.',
      deleted: 'Entrée supprimée.',
      deleteTitle: (name: string) => `Supprimer « ${name} » ?`,
      deleteBody:
        'Cette entrée disparaîtra de votre page publique. Cette action est définitive.',
      cancel: 'Annuler',
      delete: 'Supprimer',
      hidden: 'Masqué',
      hideFromPage: (name: string) => `Masquer ${name} de ma page`,
      showOnPage: (name: string) => `Afficher ${name} sur ma page`,
      edit: (name: string) => `Modifier ${name}`,
      deleteOne: (name: string) => `Supprimer ${name}`,
      noResults: 'Aucun résultat pour cette recherche.',
      emptyTitle: (word: string) => `Votre ${word} est vide`,
      emptyBody:
        'Ajoutez votre première entrée : elle apparaîtra aussitôt sur votre page publique.',
      editEntry: 'Modifier l’entrée',
      newEntry: 'Nouvelle entrée',
      formHint: 'Les changements sont visibles immédiatement sur votre page.',
      name: 'Nom',
      /* Exemples volontairement locaux : ils parlent aux commerces visés. */
      namePlaceholder: 'Poulet DG',
      price: (currency: string) => `Prix (${currency})`,
      pricePlaceholder: '3500',
      description: 'Description',
      optional: '(optionnel)',
      descriptionPlaceholder: 'Plantains, poulet mijoté, légumes de saison',
      photoLink: 'Lien de la photo',
      visibleOnPage: 'Visible sur ma page',
      promoPrice: (currency: string) => `Prix barré — promotion (${currency})`,
      promoHint:
        'Laissez vide pour aucune remise. Rempli, votre page affiche le prix barré et l’étiquette de réduction.',
      promoBadge: (percent: number) => `-${percent} %`,
      availableLabel: 'Disponible à la commande',
      unavailableBadge: 'Indisponible',
      availableHint:
        'Coupez cette option pour garder l’article visible sans qu’il puisse être commandé.',
      errorPromo: 'Le prix barré doit être supérieur au prix de vente.',
      errorName: 'Donnez un nom à cette entrée.',
      errorPrice: 'Indiquez un prix valide.',
      save: 'Enregistrer',
      addToPage: 'Ajouter à ma page',
      options: {
        title: 'Choix proposés au client',
        hint: 'Par exemple « Portion » avec petite et grande, ou « Sauce » au choix. Le supplément s’ajoute au prix.',
        addGroup: 'Ajouter un choix',
        groupLabel: 'Nom du choix',
        groupLabelPlaceholder: 'Portion',
        removeGroup: 'Supprimer ce choix',
        selectUnique: 'Une seule réponse',
        selectMultiple: 'Plusieurs réponses',
        requiredLabel: 'Réponse obligatoire',
        requiredHint: 'Le client ne peut pas commander sans avoir répondu.',
        optionLabel: 'Intitulé',
        optionLabelPlaceholder: 'Grande',
        optionDelta: (currency: string) => `Supplément (${currency})`,
        addOption: 'Ajouter une réponse',
        removeOption: 'Retirer cette réponse',
        emptyGroup: 'Ajoutez au moins une réponse, sinon ce choix ne s’affichera pas.',
        errorGroupLabel: 'Donnez un nom à chaque choix.',
        errorOptionLabel: 'Chaque réponse doit avoir un intitulé.',
        errorDelta: 'Les suppléments doivent être des montants valides.',
      },
    },
    bookings: {
      title: 'Réservations',
      pendingOne: (n: number) => `${n} demande attend votre confirmation.`,
      pendingMany: (n: number) => `${n} demandes attendent votre confirmation.`,
      allClear: 'Aucune demande en attente. Votre agenda est à jour.',
      filters: {
        pending: 'À confirmer',
        upcoming: 'À venir',
        completed: 'Honorées',
        cancelled: 'Annulées',
        all: 'Toutes',
      },
      status: {
        pending: 'À confirmer',
        confirmed: 'Confirmée',
        completed: 'Honorée',
        cancelled: 'Annulée',
      },
      emptyFilteredTitle: 'Rien dans cette liste',
      emptyFilteredBody:
        'Changez de filtre pour voir les autres réservations.',
      emptyTitle: 'Pas encore de réservation',
      emptyBody:
        'Les demandes envoyées depuis le bloc « Réservation » de votre page publique arriveront ici.',
      countOne: (n: number) => `${n} réservation`,
      countMany: (n: number) => `${n} réservations`,
      today: "Aujourd'hui",
      tomorrow: 'Demain',
      yesterday: 'Hier',
      requestedAt: (ago: string) => `demandé ${ago}`,
      replyOnWhatsapp: 'Répondre sur WhatsApp',
      confirm: 'Confirmer',
      markCompleted: 'Marquer honorée',
      cancel: 'Annuler',
      confirmedToast: (name: string) => `Réservation de ${name} confirmée.`,
      completedToast: (name: string) => `${name} est passé(e).`,
      cancelledToast: (name: string) => `Réservation de ${name} annulée.`,
      slotsSaved: 'Créneaux enregistrés.',
      openingTitle: 'Créneaux d’ouverture',
      openingBody:
        'Les heures proposées au client sur votre page publique. Un jour fermé n’accepte aucune demande.',
      save: 'Enregistrer',
      /* Index 0 = dimanche, pour indexer directement getDay(). */
      dayNames: [
        'Dimanche',
        'Lundi',
        'Mardi',
        'Mercredi',
        'Jeudi',
        'Vendredi',
        'Samedi',
      ],
      opensAt: (day: string) => `Ouverture ${day}`,
      closesAt: (day: string) => `Fermeture ${day}`,
      slotLength: (day: string) => `Durée des créneaux ${day}`,
      to: 'à',
      slotOf: (minutes: number) => `créneaux de ${minutes} min`,
      closed: 'Fermé',
    },
  },
}

export type Dict = typeof FR

const EN: Dict = {
  nav: {
    home: 'CLYDE, home',
    links: {
      builder: 'The builder',
  builderShort: 'Builder',
  formation: 'Training',
  forum: 'Forum',
  goodies: 'Shop',
  pricing: 'Pricing',
  },
    marketplace: 'Showroom',
    login: 'Log in',
    cta: 'Build my page',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    language: 'Language',
    backHome: 'Home',
    backHomeLong: 'Back to home',
    back: 'Back',
    follows: 'Following',
    account: 'My space',
    signOut: 'Sign out',
    switchAccount: 'Switch account',
  },

  hero: {
    badge: 'Your commercial space',
    titleLine1: 'Automate your business,',
    titleLine2: 'receive your orders,',
    titleAccent: 're-engage your customers.',
    subtitle:
      'Set up your storefront, configure your catalogue and activate bookings. Customers order from their phone; you receive every order on WhatsApp with the table or time slot. Unlike social networks, you keep full access to your subscribers and can re-engage them directly from your CLYDE dashboard.',
    ctaPrimary: 'Create my page for free',
    ctaSecondary: 'See an existing page',
    proofs: ['Free for 35 days', 'No credit card', 'No code'],
    stickerWhatsapp: 'Order on WhatsApp',
    stickerQr: 'Table 3 · scan',
    stickerGrowth: '+34% orders',
  },

  band: {
    kicker: 'Built around your trade',
  },

  showcase: {
    kicker: 'The page builder',
    title: 'Choose a category — the page builds itself for you.',
    body: 'No blank canvas and no layout theory to learn. CLYDE starts from a template made for your trade, with blocks already filled in and already responsive — all you do is swap the content.',
    structureTitle: 'Page structure',
    blocksCount: 'blocks',
    modulesTitle: 'Modules live on this page',
    chipOrder: 'Ordering',
    chipLocations: 'Tables / Rooms',
    chipBooking: 'Booking',
    modulesNote:
      'Modules switch on in one click — your category never forces them on you.',
    open: 'Open',
    previewMobile: 'Mobile preview',
    previewDesktop: 'Desktop preview',
  },

  bento: {
    kicker: 'What CLYDE does',
    title: 'No more chaos. Just sales.',
    builder: {
      kicker: 'Page builder',
      title: 'Page published in under an hour',
      body: 'Blocks already designed and already responsive — Cover, Catalogue, Booking, Reviews… You pick them, you fill them in, you tune the colours. Never a blank page.',
    },
    orders: {
      kicker: 'Orders',
      title: 'On WhatsApp, with zero friction',
      body: 'The order lands on your WhatsApp already written out, with the table and the total.',
    },
    qr: {
      kicker: 'Tables & rooms',
      title: 'One QR code per spot',
      body: 'The customer scans, orders, and the order arrives tagged “Table 12”.',
    },
    analytics: {
      kicker: 'Before / After',
      title: 'What changes in a working day',
      body: 'Nobody switches tools for charts. You switch because you’re tired of running in circles. Here is, very concretely, what changes in a day.',
    },
    beforeTitle: 'Without CLYDE',
    afterTitle: 'With CLYDE',
    beforeAfter: [
      {
        before: '“How much is it?” — 40 times a day',
        after: 'Prices and photos visible. Customers order directly.',
      },
      {
        before: 'Orders taken by voice, wrong tables',
        after: 'Every order arrives written, tagged “Table 12”',
      },
      {
        before: 'Two customers book the same hour',
        after: 'Taken slot = gone slot. Zero double booking.',
      },
      {
        before: 'You guess what sells',
        after: 'You KNOW what to fix: photo, copy or price',
      },
    ],
    editorStructure: 'Structure',
    editorSettings: 'Block settings',
    editorBlocks: ['Cover', 'Categories', 'Catalogue', 'Hours & Location'],
    editorRows: [
      ['Typeface', 'Kanit'],
      ['Columns', '2'],
      ['Corners', 'Rounded'],
    ],
    waOnline: 'online',
    waMessage: 'Hello, order for',
    waTable: 'Table 12',
    waTotal: 'Total 10,000 XAF',
    waReady: 'Ready to send ✓',
    waNote: 'The message is already written. The customer just hits Send.',
    qrSheet: 'Sheet to print',
    qrLabels: ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Terrace 1', 'Bar 2'],
    alertProduct: 'Prawn ndolé',
    alertBody: '2,481 views, 7 orders.',
    alertHint: 'Photo or price to rework?',
    alertTrend: 'Conversion +34% vs last 30 days',
    statViews: 'views tracked',
    statConversion: 'extra conversion',
    percentSuffix: '%',
    strip: [
      'A public Showroom so people find you',
      'Followers no algorithm filters out',
      'Bookings and appointments built in',
    ],
    seePricing: 'See pricing',
  },

  revelation: {
    kicker: 'The Revelation',
    title: 'What you already sell deserves to be seen.',
    body: 'You are not building yet another profile. You are revealing what was already there — just invisible, buried in scattered comments and messages. Publish, and watch.',
    punch: '10 minutes ago, you did not exist online. Look now.',
    beforeLabel: 'Before',
    afterLabel: 'After',
    cta: 'Reveal my shop',
  },

  factory: {
    kicker: 'The CLYDE Factory',
    title: 'The Factory is hiring its next engineers.',
    body: 'CLYDE is not one more subscription. It is a factory, and you are not a user here: you are an engineer. Every shop owner runs their own production line, on machines the Factory provides.',

    invite: {
      institution: 'CLYDE Factory',
      reference: 'Recruitment notice',
      addressee: 'To the attention of the shop owner',
      body: 'We have seen what you already build. We are looking for engineers for the next intake.',
      requirement: 'No technical skill required.',
      motto: 'The tools are ours. The craft is yours.',
      cta: 'Join the Factory',
      secondary: 'Visit the Showroom',
      stamp: 'Intake open',
    },

    postsTitle: 'Open positions',
    postsNote:
      'Your position is assigned from your trade, the day your page goes live.',

    pillarsTitle: 'What the Factory provides',
    pillars: [
      {
        name: 'Simple',
        body: 'Two fields to sign up, ready-made templates, no technical skill required.',
      },
      {
        name: 'Structured',
        body: 'Blocks already thought through, never a blank page. Swap the content, the structure holds.',
      },
      {
        name: 'Automated',
        body: 'Orders land on WhatsApp untouched, slots confirm themselves, reports write themselves.',
      },
      {
        name: 'Originality',
        body: 'Colours, blocks and layout freely editable. A builder, not a locked form.',
      },
      {
        name: 'Professional',
        body: 'Polished from the first template, certificates issued, a Showroom that puts your work forward.',
      },
      {
        name: 'Cheaper',
        body: 'No hosting to pay for, no domain name to buy. One subscription.',
      },
    ],

    artifacts: {
      title: 'Your engineer papers',
      body: 'Two documents issued by the Factory — print them, display them in the shop, or share them.',
      card: 'Engineer Card',
      cardHint: 'Your position, your ID number and the QR code of your page.',
      certificate: 'Certificate of Foundation',
      certificateHint: 'Certifies that your page is live. Made to be framed.',
      download: 'Download',
      ready: 'Document ready.',
      locked: 'Publish your page to receive your papers.',
      formationsTitle: 'Courses completed',
    },

    cardLabels: {
      institution: 'CLYDE Factory',
      document: 'Engineer Card',
      post: 'Position',
      title: 'Title',
      id: 'ID number',
      since: 'Joined',
      qrHint: 'Scan to open the shop',
      footer:
        'Card issued by the CLYDE Factory. It certifies a published page, not a trading licence.',
    },

    certificateLabels: {
      institution: 'CLYDE Factory',
      document: 'Certificate of Foundation',
      awarded: 'The CLYDE Factory certifies that',
      statement:
        'has built and published its page, and thereby joins the engineers of the Factory.',
      post: 'Position',
      id: 'ID number',
      date: 'Issued on',
      signature: 'The CLYDE Factory',
    },
  },

  modules: {
    kicker: 'Modules',
    title: 'Three configurable modules. One account type.',
    body: 'Your category only suggests a template and pre-checks a few modules. A hotel can take appointments. A salon can sell products. A bakery can run QR ordering per table. Switch anything on or off whenever you like.',
    noteStrong: 'One kind of account.',
    note: 'No “restaurant plan” or “hotel plan” — the same platform, set up for you.',
    items: {
      commande: {
        name: 'Remote ordering',
        status: 'Always on',
        role: 'Online catalogue, cart, and the order sent straight to your WhatsApp.',
        metric: 'Core',
      },
      tables: {
        name: 'Tables / Rooms',
        status: 'Optional',
        role: 'One QR per spot. Every order arrives tagged: table 12, room 204.',
        metric: 'Native QR',
      },
      reservation: {
        name: 'Booking / Appointments',
        status: 'Optional',
        role: 'Time slots, appointment booking, and automatic confirmation on WhatsApp.',
        metric: 'Calendar',
      },
    },
  },

  comparison: {
    kicker: 'Comparison',
    title: 'What social networks do not replace',
    body: 'Social attracts. CLYDE welcomes. WhatsApp closes. Every tool in its place.',
    caption:
      'Feature comparison between Facebook Page, WhatsApp Business, Skool and CLYDE',
    featureHeader: 'Feature',
    columns: ['Facebook Page', 'WhatsApp Business', 'Skool', 'CLYDE'],
    negatives: ['No', 'N/A'],
    rows: [
      {
        feature: 'Customisable page',
        cells: ['No', 'No', 'Partly', 'Dedicated page builder'],
      },
      {
        feature: 'Order → WhatsApp',
        cells: ['No', 'Manual', 'No', 'Automated'],
      },
      {
        feature: 'Ordering per table / room',
        cells: ['No', 'No', 'No', 'Native, by QR'],
      },
      {
        feature: 'Booking / appointments',
        cells: ['No', 'No', 'No', 'Native'],
      },
      {
        feature: 'Discovery directory',
        cells: ['No', 'No', 'No', 'CLYDE Showroom'],
      },
      {
        feature: 'Analytics you can act on',
        cells: ['Shallow', 'Nearly none', 'Basic', 'Dedicated, actionable'],
      },
      {
        feature: 'Reach on your followers',
        cells: ['Filtered', 'N/A', 'Decent', 'Unfiltered'],
      },
    ],
  },

  onboarding: {
    kicker: 'Setup',
    title: 'From sign-up to your link in six steps',
    steps: [
      { title: 'Sign-up', detail: 'Email or phone number. Nothing else.' },
      {
        title: 'Identity',
        detail: 'Name, clyde.app/your-name address, currency XAF · CNY · EUR · USD.',
      },
      { title: 'Category', detail: 'A fitting template and pre-checked modules.' },
      { title: 'Modules', detail: 'You adjust. No category boxes you in.' },
      { title: 'Catalogue', detail: 'Products, services, time slots, photos.' },
      { title: 'Publish', detail: 'One link, shareable anywhere.' },
    ],
  },

  testimonials: {
    kicker: 'Use cases',
    title: 'Four common situations and how CLYDE addresses them.',
    note: 'Illustrative scenarios based on typical platform usage — not customer testimonials.',
    items: [
      {
        quote:
          'Orders that used to get lost in Facebook comments now land on WhatsApp with the table number. Service mistakes disappear.',
        name: 'Neighbourhood restaurant',
        role: 'Typical scenario · Tables module',
        stat: 'Orders tagged per table',
      },
      {
        quote:
          'Clients book on their own, even at 11pm. Nobody spends their evenings asking “which slot suits you?” anymore.',
        name: 'Hair salon',
        role: 'Typical scenario · Booking module',
        stat: 'Slots filled without back-and-forth',
      },
      {
        quote:
          'One QR per room transforms room service: the guest orders, the front desk receives “Room 204”, and that is it.',
        name: 'Independent hotel',
        role: 'Typical scenario · Tables / Rooms module',
        stat: 'Room service without calls',
      },
      {
        quote:
          'The alert on items viewed a lot but never ordered points at the photo, copy or price to fix. Sales follow.',
        name: 'Craft boutique',
        role: 'Typical scenario · Analytics Pro',
        stat: 'Hesitations detected',
      },
    ],
    videoQuote: 'A page put together in one Sunday afternoon.',
    videoMeta: 'Video walkthrough · 1 min 12',
    videoPlay: 'Play the video walkthrough',
    videoSoon: 'Coming soon',
  },

  pricing: {
    kicker: 'Pricing',
    title: '35 days free. Everything included.',
    body: 'No credit card. No commission. Change plan whenever you want.',
    mostChosen: 'Most chosen',
    onRequest: 'On request',
    perMonth: '/month',
    footnote:
      'Currencies available: XAF · EUR · USD · CNY. Orders go through your own WhatsApp number — CLYDE never sits in between.',
    plans: {
      free: {
        name: 'Free',
        tagline: 'To try CLYDE out and publish a first page.',
        cta: 'Start for free',
        features: [
          'Public page with 6 blocks',
          '1 active module of your choice',
          'Catalogue up to 20 entries',
          'Unlimited WhatsApp orders',
          'Basic analytics',
          'Listing in the Showroom',
        ],
      },
      pro: {
        name: 'Pro',
        tagline: 'For businesses that want to know what works.',
        cta: 'Go Pro',
        features: [
          'Full block library',
          'All modules at once',
          'Unlimited catalogue',
          'Analytics Pro: hesitation detection',
          'Period-over-period comparison',
          'Unlimited QR codes and staff accounts',
          'PDF export of QR sheets',
        ],
      },
      entreprise: {
        name: 'Enterprise',
        tagline: 'For groups and multi-location businesses.',
        cta: 'Contact us',
        features: [
          'Everything in Pro',
          'Multiple locations under one account',
          'Priority support',
          'Early access to new features',
          'Hands-on setup support',
        ],
      },
    },
  },

  finalCta: {
    titleBefore: 'Your business deserves',
    titleAccent: 'a presence that feels like you.',
    body: 'Express what makes you unique, with the tools and visibility your business deserves.',
    ctaPrimary: 'Create my shop for free',
    ctaSecondary: 'Visit the Showroom',
    footnote: 'Free for 35 days · No credit card · No code',
    stickers: {
      qr: 'QR',
      whatsapp: 'WhatsApp',
      theme: 'Theme',
      analytics: 'Analytics',
      booking: 'Booking',
    },
  },

  footer: {
    tagline:
      'The page builder for shop owners. Your storefront, your orders, your bookings — no hosting, no code.',
    productTitle: 'Product',
    product: {
      builder: 'Page builder',
      orders: 'WhatsApp orders',
      qr: 'QR per table',
      booking: 'Bookings',
      analytics: 'Analytics Pro',
    },
    exploreTitle: 'Explore',
    explore: {
  marketplace: 'Showroom',
  pricing: 'Pricing',
  formation: 'Training',
  forum: 'Forum',
  goodies: 'Goodies shop',
  signup: 'Build my page',
  },
  resourcesTitle: 'Resources',
  resources: {
  help: 'Help centre',
  team: 'The team',
  contact: 'Contact us',
      privacy: 'Privacy',
      terms: 'Terms',
    },
    rights: 'All rights reserved.',
    credo: 'Made for shop owners, not for developers.',
  },

  marketplace: {
    badge: 'Factory Showroom',
    title: 'What the engineers of the Factory have built',
    subtitle:
      'Every page below was built by a shop owner, with no developer. Open one: order, book, or see what yours could look like.',
    searchLabel: 'Search for a business',
    searchPlaceholder: 'Name, city, neighbourhood…',
    allFamilies: 'All trades',
    allCities: 'All cities',
    cityLabel: 'City',
    familyLabel: 'Trade',
    resultsOne: 'business',
    resultsMany: 'businesses',
    empty: 'No business matches this search.',
    emptyHint: 'Try another trade or another city.',
    reset: 'Clear filters',
    visit: 'View page',

    back: 'Back',
    discover: 'Discover on CLYDE',

    share: 'Share',
    shareCopied: 'Link copied',
    shareTitle: 'Share this page',
    shareBody: 'Send the shop link to your contacts.',
    shareWhatsapp: 'WhatsApp',
    shareFacebook: 'Facebook',
    shareInstagram: 'Instagram',
    shareCopy: 'Copy link',
    shareInstagramNote: 'Link copied — paste it in your story or bio.',
    shareClose: 'Close',
    follow: 'Follow',
    following: 'Following',
    followTitle: 'Follow this page',
    followBody:
      'Create your visitor account in seconds — this shop will then sit in your following list.',
    followName: 'Your name',
    followEmail: 'Your email',
    followWhatsapp: 'Your WhatsApp',
    followSubmit: 'Create account and follow',
    followCancel: 'Maybe later',
    followInvalid: 'Enter your name, a valid email and your WhatsApp number.',
    followClosed: 'This page does not accept followers yet.',

    myFollowsTitle: 'Pages I follow',
    myFollowsBody: 'The pages you follow, one tap away.',
    myFollowsEmpty:
      'You are not following any page yet. Open a shop and tap “Follow”.',
    ctaTitle: 'The Factory is hiring — your business belongs here',
    ctaBody: 'Build your page with the Factory tools, then display it in this Showroom.',
    ctaButton: 'Join the Factory',
  },

  reserve: {
    action: 'Book',
    title: 'Book a service',
    dateLabel: 'Pick a day',
    slotLabel: 'Pick a time',
    slotsClosed: 'Closed that day — pick another date.',
    durationLabel: 'Duration',
    locationLabel: 'Preferred spot',
    locationAny: 'No preference',
    locationNote: 'Choosing a spot does not change the price.',
    totalLabel: 'Total',
    submit: 'Send my request',
    submitNoSlot: 'Pick a time',
    sent: 'Your booking request has been sent on WhatsApp.',
    close: 'Close',
    unavailable: 'This service cannot be booked right now.',
  },

  help: {
    badge: 'Help centre',
    title: 'How CLYDE works',
    subtitle:
      'The questions shop owners ask us most. If yours is not here, write to us.',
    stillStuck: 'Cannot find your answer?',
    contactCta: 'Contact us',
    faq: [
      {
        q: 'How much does CLYDE cost to start?',
        a: 'Nothing for 35 days: you try the whole platform, no credit card and no commitment. After that, the free plan remains available with no time limit, and you only upgrade if you need to.',
      },
      {
        q: 'Do I need to know how to code?',
        a: 'No. You pick your trade, your colours and your blocks in a visual editor. CLYDE writes the page for you and hosts it.',
      },
      {
        q: 'Does CLYDE handle delivery?',
        a: 'No. CLYDE passes the order to your WhatsApp; delivery, pickup or table service is arranged directly between you and your customer, just like today.',
      },
      {
        q: 'How do I receive orders?',
        a: 'On WhatsApp. When a customer confirms their basket, CLYDE opens a chat with the message already filled in: items, quantities, total and table. All you do is confirm.',
      },
      {
        q: 'What if I have no website?',
        a: 'That is true of most of our shop owners. CLYDE becomes your site: one link to share, one QR code to print, nothing to install.',
      },
      {
        q: 'What are per-table QR codes for?',
        a: 'Each table gets its own QR. The customer scans, orders, and the order arrives with the table number already on it. No more mixed-up service.',
      },
      {
        q: 'Can I change my prices and menu myself?',
        a: 'Yes, at any time and as often as you like. The change shows on your page immediately.',
      },
      {
        q: 'Do my customers need an account?',
        a: 'No. They order with their name and WhatsApp number, nothing else. Less friction, more orders.',
      },
      {
        q: 'Which currencies can I sell in?',
        a: 'CFA franc, euro, US dollar and yuan. Prices display in the currency you choose.',
      },
      {
        q: 'How do I appear in the directory?',
        a: 'Your page is listed as soon as you switch the option on in your settings. It is free, and you can remove it whenever you want.',
      },
    ],
  },

  contact: {
    badge: 'Contact us',
    title: 'Let us talk about your business',
    subtitle: 'Write to us in French or English. We reply within one working day.',
    whatsappTitle: 'WhatsApp',
    whatsappBody: 'The fastest way. Monday to Saturday, 8am – 7pm.',
    whatsappCta: 'Open WhatsApp',
    emailTitle: 'Email',
    emailBody: 'For detailed enquiries and invoices.',
    emailCta: 'Send an email',
    formTitle: 'Or leave us a message',
    fields: {
      name: 'Your name',
      namePlaceholder: 'Nadia Mbarga',
      business: 'Your business',
      businessPlaceholder: 'Le Bastos, Yaoundé',
      email: 'Email address',
      emailPlaceholder: 'you@example.cm',
      message: 'Your message',
      messagePlaceholder: 'Tell us what you need…',
    },
    submit: 'Send message',
    sending: 'Sending…',
    sent: 'Message sent. We will get back to you shortly.',
    errors: {
      name: 'Please enter your name.',
      email: 'This email address is invalid.',
      message: 'Your message is a little short.',
    },
  },

  legal: {
    templateWarning:
      'Template not reviewed by a lawyer. Have this text checked before publishing it for real.',
    updated: 'Last updated',
    privacy: {
      badge: 'Privacy',
      title: 'Privacy policy',
      intro:
        'CLYDE is a tool that lets a shop owner build a page and receive orders. This page explains which data we process and why.',
      sections: [
        {
          h: 'The data we collect',
          p: 'For a shop owner: name, email address, WhatsApp number, and the contents of their page (products, prices, photos). For a customer placing an order: name, WhatsApp number and basket contents. We never ask for banking details.',
        },
        {
          h: 'Why we process it',
          p: 'To run the service: display the page, pass the order to the shop owner on WhatsApp, and give them aggregated traffic statistics.',
        },
        {
          h: 'What we do not do',
          p: 'We do not sell any data. We pass a customer’s contact details only to the business they ordered from, and to nobody else.',
        },
        {
          h: 'Page followers',
          p: 'A customer may choose to follow a business to hear about what is new. That choice is explicit, and they can unsubscribe at any time. The shop owner undertakes not to contact followers more than once a week.',
        },
        {
          h: 'How long we keep it',
          p: 'A business’s data is kept as long as the account exists. Orders are kept for twenty-four months, the period the shop owner needs for their bookkeeping.',
        },
        {
          h: 'Your rights',
          p: 'You can ask to access your data, correct it or delete it by writing to us. We reply within thirty days.',
        },
      ],
    },
    terms: {
      badge: 'Terms',
      title: 'Terms of use',
      intro:
        'By building a page on CLYDE, you accept the rules below. They exist to protect shop owners and their customers alike.',
      sections: [
        {
          h: 'What CLYDE provides',
          p: 'A page editor, hosting, a public link, QR codes, and delivery of orders to your WhatsApp. CLYDE is neither a payment intermediary nor a courier.',
        },
        {
          h: 'What stays your responsibility',
          p: 'The accuracy of your prices, the availability of your products, the quality of what you sell, and compliance with the rules of your trade. An order placed through CLYDE is a contract between you and your customer.',
        },
        {
          h: 'Prohibited content',
          p: 'Illegal goods, counterfeits, hateful or misleading content. We take down a page that breaks these rules, without refund.',
        },
        {
          h: 'Payments between you and your customers',
          p: 'They happen outside CLYDE, on whatever terms you agree with your customer: cash, mobile money, transfer. We collect nothing on your behalf and guarantee no payment.',
        },
        {
          h: 'Trial and service subscription',
          p: 'Every new account gets a 35-day trial with all features, no credit card required. After the trial, the free plan can be used with no time limit. A paid plan is billed in advance and can be cancelled at any time; it stays active until the end of the period already paid for.',
        },
        {
          h: 'Interruptions',
          p: 'We aim for continuous availability without being able to guarantee it. If a long outage is our fault, the affected period is credited to your subscription.',
        },
        {
          h: 'Closing an account',
          p: 'You may close your account whenever you wish; your page is then unpublished. You can export your catalogue before closing.',
        },
      ],
    },
  },

  auth: {
    signup: {
      title: 'Join the CLYDE Factory',
      subtitle:
        'You are not creating one more account: you are joining the Factory as an engineer. Pick your trade, and your page is already set up to take orders.',
      asideHeading:
        'No commission on your sales. You keep the relationship with your customers.',
      asidePoints: [
        'A public page in your name, indexed by Google',
        'Orders land straight on your WhatsApp',
        'Modules you switch on for your trade: tables, rooms, appointments',
      ],
      footerText: 'Already have an account?',
      footerLink: 'Log in',
      submit: 'Join the Factory',
      created: 'Welcome to the Factory. Let’s set up your production line.',
    },
    login: {
      title: 'Good to see you again',
      subtitle:
        'Log in to get back to your page, your orders and your numbers.',
      asideHeading:
        'Your customers order on WhatsApp. You follow everything from one screen.',
      asidePoints: [
        'Orders, bookings and messages in one place',
        'Your page changes live, with no developer',
        'QR codes per table or per room, ready to print',
      ],
      footerText: 'No page yet?',
      footerLink: 'Create an account',
      submit: 'Log in',
      welcome: 'Welcome',
      demoDivider: 'or try a demo account',
      passwordNote: 'Demo version: the password is not checked yet.',
    },
    fields: {
      name: 'Your name',
      namePlaceholder: 'Nadia Mbarga',
      email: 'Email address',
      emailPlaceholder: 'you@example.cm',
      whatsapp: 'WhatsApp number',
      whatsappNote: 'This is the number your orders will arrive on.',
      password: 'Password',
      passwordPlaceholder: '8 characters minimum',
    },
    errors: {
      name: 'Please enter your name.',
      email: 'That email address is not valid.',
      whatsapp: 'That WhatsApp number is too short.',
      signupFailed: 'Could not create the account.',
      loginFailed: 'Could not log you in.',
    },
  },

  referral: {
    join: {
      title: 'You have been invited to join the Factory.',
      titleNamed: '{name} invites you to join the Factory.',
      subtitle:
        'Create your page and start with {days} free trial days instead of 35.',
      asideHeading: 'What you receive when joining through a referral',
      asidePoints: [
        '30 extra trial days on top of the usual 35',
        'The merchant who invited you is rewarded too',
        'No credit card and no technical skills required',
      ],
      footerText: 'Already have an account?',
      footerLink: 'Log in',
      offerTitle: 'Your free trial',
      daysUnit: 'days',
      offerBreakdown: '{base} base trial days plus {bonus} referral days.',
      referrerNote: 'This is the merchant who invited you.',
      unknownCode:
        'This referral link was not recognized. You can continue: your 35-day trial remains available.',
      condition:
        'The bonus is granted when your page goes live — not on sign-up alone.',
      cta: 'Create my page',
    },
  },

  formation: {
    badge: 'Training',
    title: 'We do not leave you to learn alone.',
    subtitle:
      'The Factory’s own courses, and those engineers offer to other engineers. Every course you finish is entered in your register.',
    tracks: {
      usine: {
        label: 'Factory courses',
        note: 'Produced by CLYDE. The groundwork: publish, sell, read your numbers.',
      },
      communaute: {
        label: 'Engineer courses',
        note: 'Offered by merchants to other merchants. The trade is also learned between peers.',
      },
    },
    levels: {
      debutant: 'Beginner',
      intermediaire: 'Intermediate',
      avance: 'Advanced',
    },
    kinds: { text: 'Text', image: 'Image', video: 'Video' },
    minutesShort: '{n} min',
    lessonsCount: '{n} lessons',
    lessonsCountOne: '1 lesson',
    by: 'By',
    open: 'Open course',
    back: 'All courses',
    progress: '{done} / {total} lessons',
    notStarted: 'Not started',
    resume: 'Resume',
    markDone: 'Mark as done',
    markUndone: 'Lesson done',
    certificateAward: 'Certificate awarded on completion',
    goodieAward: 'Goodie included: {goodie}',
    completedTitle: 'Course completed.',
    completedBody:
      'The certificate is entered in your register. You will find it in your dashboard.',
    completedToast: 'Course completed — certificate entered in the register.',
    certificateHeld: 'Certificate earned',
    signedOut:
      'Log in to save your progress and receive your certificates.',
    signedOutCta: 'Log in',
    teachTitle: 'Do you know something the others do not?',
    teachBody:
      'A photographer teaching product shots, a restaurateur explaining margins: any engineer can offer a course to the community.',
    teachCta: 'Offer a course',
  },

  forum: {
    badge: 'Forum',
    title: 'The trade is learned by talking.',
    subtitle:
      'The questions you would not dare put to a support desk, you put to a peer who runs a shop two neighbourhoods away.',
    all: 'All sections',
    threadsCount: (n: number) =>
      n === 0 ? 'No threads' : `${n} thread${n > 1 ? 's' : ''}`,
    repliesCount: (n: number) =>
      n === 0 ? 'No replies yet' : `${n} repl${n > 1 ? 'ies' : 'y'}`,
    pinned: 'Pinned',
    staffBadge: 'CLYDE team',
    emptyCategory: 'Nobody has opened a thread in this section yet.',
    emptyCategoryCta: 'Open the first one.',
    notFound: 'This thread is not available.',
    notFoundBody:
      'It may have been taken down, or the address is wrong. The rest of the forum is waiting for you.',
    newThread: 'Open a thread',
    newThreadTitle: 'Your question',
    titleLabel: 'The subject, in one sentence',
    titlePlaceholder: 'How do you handle Sunday orders?',
    categoryLabel: 'Section',
    bodyLabel: 'Explain your situation',
    bodyPlaceholder:
      'Say what you have already tried: you will get a sharper answer.',
    publish: 'Publish',
    cancel: 'Cancel',
    titleTooShort: 'Give the subject a little more detail.',
    bodyTooShort: 'A few more sentences will help those who answer you.',
    published: 'Thread published.',
    replyTitle: 'Reply',
    repliesTitle: (n: number) =>
      n === 0 ? 'Replies' : `${n} repl${n > 1 ? 'ies' : 'y'}`,
    replyPlaceholder: 'What you did yourself, in that situation.',
    reply: 'Send reply',
    replied: 'Reply sent.',
    replyTooShort: 'A one-word reply helps nobody. Say a little more.',
    signedOut: 'Log in to open a thread or reply.',
    signedOutCta: 'Log in',
    backToForum: 'Back to the forum',
    openThread: 'Read the thread',
    report: 'Report',
    reportTitle: 'Report this message',
    reportBody:
      'Say in one sentence what the problem is. The message stays visible until the team has ruled on it.',
    reportPlaceholder: 'Disguised advertising, insults, off topic…',
    reportSend: 'Send report',
    reportDone: 'Report sent.',
    reportAlready: 'You have already reported this message.',
    reported: 'Reported, awaiting a ruling',
    hidden: 'Hidden by moderation',
    hiddenOwn: 'This message is hidden from others. Only you still see it.',
    hiddenReason: 'Reason:',
    hide: 'Hide',
    hideReasonLabel: 'Reason given to the author',
    restore: 'Restore',
    moderationEmpty: 'No reports awaiting a ruling.',
  },

  goodies: {
    badge: 'Shop',
    title: 'What you earned can be worn and set on a counter.',
    subtitle:
      'Points come from what you already do: a lesson completed, a course finished, a peer brought in. They cannot be bought.',
    balance: 'Your balance',
    points: (n: number) => `${n} point${n > 1 ? 's' : ''}`,
    pointsShort: 'pts',
    ledgerTitle: 'Where your points come from',
    ledgerEmpty:
      'You have no points yet. Complete one lesson in Training: that is the quickest way.',
    ledgerCta: 'Go to Training',
    scaleTitle: 'The scale',
    scale: {
      lesson: 'A lesson completed',
      course: 'A course finished, on top of its lessons',
      foundation: 'Your page published',
      followers: 'The 200 followers certificate',
      referral: 'A peer brought in, who publishes their page',
    },
    catalogueTitle: 'The catalogue',
    redeem: 'Redeem',
    redeemTitle: 'Redeem for {goodie}',
    cost: 'Cost',
    missing: (n: number) => `You are ${n} point${n > 1 ? 's' : ''} short`,
    nameLabel: 'Recipient name',
    phoneLabel: 'WhatsApp number',
    cityLabel: 'Collection city',
    addressLabel: 'Neighbourhood or landmark',
    addressPlaceholder: 'E.g.: Bastos, across from the pharmacy.',
    sizeLabel: 'Size',
    noteLabel: 'Detail for the handover (optional)',
    notePlaceholder: 'Colour, or a landmark to find you.',
    incomplete: 'Name, number and city are required for the handover.',
    confirm: 'Confirm redemption',
    cancel: 'Cancel',
    done: 'Redemption recorded. The team will contact you on WhatsApp.',
    failed: 'Not enough points for this redemption.',
    ordersTitle: 'Your redemptions',
    ordersEmpty: 'You have not redeemed anything yet.',
    status: {
      demande: 'Request received',
      preparee: 'Being prepared',
      remise: 'Handed over',
    },
    signedOut: 'Log in and publish your page to start earning points.',
    signedOutCta: 'Log in',
    noBusiness:
      'Create your page to start earning points: the page is what carries them.',
    noBusinessCta: 'Create my page',
  },

  team: {
    badge: 'The team',
    title: 'Who builds CLYDE.',
    subtitle:
      'A small team, in Douala and Yaoundé. We keep the same hours you do: when a merchant writes on a Saturday night, someone reads it.',
    rolesTitle: 'What we do',
    valuesTitle: 'What we hold to',
    values: [
      {
        title: 'We test on a real counter.',
        body: 'No feature ships without being tried in a shop taking real orders. A tool designed from an office always ends up asking the merchant to change their trade.',
      },
      {
        title: 'The price does not rise quietly.',
        body: 'What is free stays free. When a price changes, it is announced on the forum beforehand, not discovered on an invoice.',
      },
      {
        title: 'Your data follows you.',
        body: 'Catalogue, orders, customers: everything exports. A merchant who cannot leave is not a customer, they are a prisoner.',
      },
    ],
    contactTitle: 'Write to us',
    contactBody:
      'A question about the tool belongs on the forum: the answer will serve others too. For everything else, the inbox is open.',
    contactForum: 'Ask on the forum',
    contactMail: 'Email the team',
  },

  devTeam: {
    badge: 'Development team',
    title: 'Join the development team',
    subtitle:
      'You are not subscribing to a newsletter. You are joining the team that decides what the Factory builds next.',
    promise:
      'Every month: what engineers proposed on the Forum, what was adopted, what ships next. Nothing else.',
    nameLabel: 'Your name',
    namePlaceholder: 'Awa Diallo',
    whatsappLabel: 'WhatsApp number',
    whatsappHint: 'This is where the report arrives.',
    whatsappPlaceholder: '+237 6 90 00 00 00',
    emailLabel: 'Email',
    emailOptional: 'optional',
    emailPlaceholder: 'awa@example.cm',
    submit: 'Join the team',
    successTitle: 'You are on the team.',
    successBody:
      'The next report will reach you on WhatsApp. Until then, the Forum is open — that is where everything is decided.',
    successForum: 'Go to the Forum',
    errorName: 'Tell us the name you want to be known by.',
    errorWhatsapp: 'A valid WhatsApp number is needed to receive the report.',
    errorDuplicate: 'This number is already on the team.',
    toggleOpen: 'Join the development team',
    toggleClose: 'Close',
    toggleHint: 'Get the report of the Forum’s decisions.',

    contactTitle: 'Write directly to the Factory',
    contactBody:
      'An idea, a blocker, a request for help: this message goes to CLYDE administration, not to the public Forum.',
    topicLabel: 'Subject',
    topics: {
      idee: 'An idea for the Factory',
      probleme: 'A problem to report',
      aide: 'I need help',
      autre: 'Something else',
    },
    messageLabel: 'Your message',
    messagePlaceholder:
      'Describe the situation. The more precise it is, the more useful the answer.',
    contactSubmit: 'Send to the Factory',
    contactSuccess:
      'Message sent to administration. The answer will come through the channel you left.',
    errorMessage: 'Write your message before sending it.',
    errorChannel:
      'Leave a WhatsApp number or an email, otherwise nobody can reply to you.',
  },

  dashboard: {
    common: {
      loading: 'Loading',
      viewPage: 'View my page',
      signOut: 'Sign out',
      openMenu: 'Open menu',
      navLabel: 'Dashboard sections',
      online: 'Page live',
      draft: 'Draft',
      vsPrevious: 'vs previous period',

      share: {
        catalogPdf: (word: string) => `Share my ${word} as a PDF`,
        catalogPdfHint: (word: string) =>
          `A one-page ${word} to send on WhatsApp or post as a status. Your page link is on it, so customers can actually order.`,
        catalogPdfDone: 'PDF ready. Send it on WhatsApp.',
        catalogPdfEmpty: (word: string) =>
          `Add at least one item to generate your ${word}.`,
        exportCsv: 'Export as CSV',
        exportOrders: 'Export orders',
        exportCustomers: 'Export customers',
        exportDone: (n: number) => `${n} row${n > 1 ? 's' : ''} exported.`,
        exportEmpty: 'Nothing to export for this period.',
        csvOrders: {
          date: 'Date',
          customer: 'Customer',
          phone: 'WhatsApp',
          location: 'Location',
          items: 'Items',
          total: 'Total',
          status: 'Status',
        },
        csvCustomers: {
          name: 'Name',
          phone: 'WhatsApp',
          orders: 'Orders',
          spent: 'Total spent',
          last: 'Last order',
        },
      },

      catalogPdf: {
        unavailable: 'Unavailable',
        orderVia: 'Order on WhatsApp',
        page: (current: number, total: number) => `Page ${current} / ${total}`,
      },
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      close: 'Close',
    },
    nav: {
      home: 'Home',
      orders: 'Orders',
      qrSuffix: 'and QR',
      bookings: 'Bookings',
      analytics: 'Analytics',
      modules: 'Modules',
      subscription: 'Subscription',
    },
    overview: {
      greeting: (name: string) => `Hello, ${name}`,
      description: (days: number) =>
        `Here is how your page performed over the last ${days} days.`,
      ritual: {
        inProgress: 'Revelation in progress…',
        heading: 'Here is who you really are on CLYDE:',
        visible: (name: string) => `${name} is now visible.`,
        linkLabel: 'Your link',
        share: 'Share my revelation',
        download: 'Download the image',
        view: 'View my page',
        close: 'Continue',
        artifactBefore: 'Before',
        artifactAfter: 'After',
        artifactBanner: (name: string, title: string) =>
          `${name} is now ${title} on CLYDE.`,
        shareText: (name: string, title: string, slug: string) =>
          `${name} is now ${title} on CLYDE. See the page: clyde.app/r/${slug}`,
      },
      draftTitle: 'Your page is not live yet',
      draftBody:
        'While it stays a draft, your customers cannot open it or place an order.',
      publish: 'Publish my page',
      published: 'Your page is live.',
      bonusGranted: '+{days} free trial days added.',
      kpiVisits: 'Visits',
      kpiOrders: 'Orders',
      kpiRevenue: 'Estimated revenue',
      kpiFollowers: 'Followers',
      todo: 'Needs attention',
      allOrders: 'All orders',
      nothingPending: 'No pending orders. You are all caught up.',
      onSite: 'On site',
      online: 'Online',
      confirm: 'Confirm',
      cancel: 'Cancel',
      confirmed: 'Order confirmed.',
      cancelled: 'Order cancelled.',
      manage: 'Manage',
      noItems: 'No items yet — start here',
      itemsOnline: (n: number) => `${n} item${n > 1 ? 's' : ''} live`,
      bookingsDetail: 'Slots and incoming requests',
      qrDetail: 'Print your QR codes',
      analyticsDetail: 'What draws people in, and what stalls',
      activation: {
        title: 'Your first steps',
        subtitle: 'Four steps before your page can start selling.',
        step1Title: 'Add at least 3 items',
        step1Done: (n: number) => `${n} item${n > 1 ? 's' : ''} added`,
        step1Action: 'Add items',
        step2Title: 'Publish your page',
        step2Done: 'Page published',
        step2Action: 'Publish',
        step3Title: 'Download your QR code',
        step3Done: 'QR code downloaded',
        step3Action: 'View my papers',
        step4Title: 'Share your link',
        step4Done: 'Link shared',
        step4Action: 'View my page',
        markDone: 'Mark as done',
        undo: 'Undo',
        allDone: 'Your first steps are done — your page is ready to sell.',
      },
    },
    orders: {
      title: 'Orders',
      pendingCount: (n) =>
        `${n} order${n > 1 ? 's' : ''} waiting for your reply.`,
      allClear: 'No pending orders. You are all caught up.',
      status: {
        pending: 'To handle',
        whatsappOpened: 'Customer contacted',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
      },
      filters: {
        pending: 'To handle',
        whatsappOpened: 'Contacted',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        all: 'All',
      },
      removedItem: 'Item removed from the catalogue',

      abandoned: {
        tab: 'Left carts',
        body: 'These customers picked their items without sending the order. A message is often enough.',
        empty: 'No carts waiting.',
        emptyHint:
          'A cart shows up here when a customer left their name and WhatsApp without finishing, more than 30 minutes ago.',
        remind: 'Follow up on WhatsApp',
        remindAgain: 'Follow up again',
        reminded: (when: string) => `Followed up ${when}`,
        recovered: 'Ordered after follow-up',
        dismiss: 'Remove from list',
        dismissed: 'Cart removed from the list.',
        opened: 'WhatsApp is open, the message is ready.',
        cartTotal: 'Cart',
        recoveredCount: (n: number) =>
          `${n} cart${n > 1 ? 's' : ''} recovered after follow-up`,
      },
      onlineChannel: 'Online',
      replyWhatsapp: 'Reply on WhatsApp',
      confirm: 'Confirm',
      cancel: 'Cancel',
      contacted: (name) => `${name} has been contacted.`,
      confirmedToast: (name) => `${name}'s order confirmed.`,
      cancelledToast: (name) => `${name}'s order cancelled.`,
      emptyFiltered: 'Nothing in this list',
      emptyFilteredBody: 'Switch filter to see the other orders.',
      emptyNone: 'No orders yet',
      emptyNoneBody:
        'Orders placed from your public page or by QR code will land here.',
    },
    modules: {
      title: 'Modules',
      description:
        'Turn on only what you actually use: each module adds a section to the menu.',
      overLimit: (planName: string, max: number) =>
        `Your ${planName} plan allows only ${max} active module: turn one off, otherwise only the first stays supported. `,
      withinLimit: (planName: string, max: number, used: number) =>
        `${planName} plan: ${max} active module at a time (${used} / ${max} used). `,
      seePlans: 'See the plans',
      limitReached: (max: number) =>
        `Your plan allows ${max} active module. Turn the other one off or upgrade to Pro.`,
      blockedHint:
        'Turn the other module off to enable this one, or upgrade to Pro to run both at once.',
      enable: 'Enable',
      disable: 'Disable',
      toastEnabled: (name: string) => `${name} turned on.`,
      toastDisabled: (name: string) => `${name} turned off.`,
      bookingName: 'Bookings',
      bookingBlurb:
        'Customers request a slot from your public page; you confirm in one tap.',
      bookingUnlock1: '“Bookings” section in the menu',
      bookingUnlock2: '“Booking” block available on the public page',
      bookingUnlock3: 'Opening hours per day',
      locationsName: (plural: string) => `${plural} and QR codes`,
      locationsBlurb: (singular: string) =>
        `One QR per ${singular}: the customer scans, orders, and you know where the order came from.`,
      locationsUnlock1: (plural: string) =>
        `“${plural} and QR” section in the menu`,
      locationsUnlock2: (singular: string) =>
        `${singular.charAt(0).toUpperCase()}${singular.slice(1)} number on every incoming order`,
      locationsShort: (plural: string) => `${plural} and QR`,
      dialogTitle: 'Your public page will change',
      dialogOne: (blockLabel: string) =>
        `The “${blockLabel}” block will disappear from your live page. It stays in the editor: turn the module back on and it comes back.`,
      dialogMany: (list: string) =>
        `These blocks will disappear from your live page: ${list}. They stay in the editor: turn the module back on and they come back.`,
      cancel: 'Cancel',
      disableAnyway: 'Disable anyway',
    },
    subscription: {
      title: 'Subscription',
      description: 'Your current plan and what it lets you do.',
      currentPlan: 'Current plan',
      perMonth: '/ month',
      perUnit: '/ month',
      renewsOn: (date: string) => `Next renewal on ${date}.`,
      noRenewal: 'No commitment, no renewal to expect.',
      goPro: 'Upgrade to Pro',
      backToFree: 'Back to Free',
      contactUs: 'Contact us',
      yourPlan: 'Your plan',
      activePlan: 'Active plan',
      onRequest: 'On request',
      activeModules: 'Active modules',
      unlimited: 'unlimited',
      requestSent: 'Request sent',
      requestBody: 'Our team will get back to you within 24 business hours.',
      backOnFree: 'You are back on the Free plan.',
      proActive: 'Your Pro plan is active.',
      demoNotice:
        'Demo version: switching plans applies the matching limits right away, with no real payment.',

      pagesTitle: 'Your pages',
      pagesUsage: '{used} of {limit} pages',
      pagesUnlimited: '{used} page(s) — no limit',
      pagesFull: 'Limit reached. Move to a larger plan to create another page.',
      newPage: 'Create a page',
      downgradeBlocked:
        'You own {count} pages. The Free plan allows only one — remove the others before moving down.',

      trialTitle: 'Free trial',
      trialLeft: '{days} days left',
      trialOver: 'Trial ended.',
      trialDeferred:
        '{days} earned days are held in reserve: they apply if you return to the Free plan.',
    },

    rewards: {
      title: 'Referrals and rewards',
      description:
        'Bring a merchant in and earn days. Your followers earn you days too.',

      linkTitle: 'Your referral link',
      linkBody:
        'Share it. When the merchant you brought in publishes their page, you earn {days} trial days — and so do they.',
      copy: 'Copy link',
      copied: 'Link copied.',
      share: 'Share',
      codeLabel: 'Your code',

      conditionNote:
        'The bonus lands when their page goes live, never on sign-up alone.',

      statsTitle: 'Your referrals',
      statInvited: 'Invited',
      statPublished: 'Pages published',
      statDaysEarned: 'Days earned',
      empty: 'No referrals yet. Share your link to get started.',
      pendingLabel: 'Awaiting publication',
      completedLabel: 'Published',

      milestonesTitle: 'Follower milestones',
      milestonesBody:
        'Every {step} followers, your page earns {days} trial days — up to {max} followers.',
      milestoneReached: 'Milestone {milestone} reached',
      milestoneNext: '{count} more follower(s) to reach milestone {milestone}.',
      milestoneAllDone: 'Every milestone reached. Well done.',
      milestoneCertificate:
        'At {threshold} followers, the Factory issues an extra certificate.',

      historyTitle: 'Breakdown of your earned days',
      historyEmpty: 'No bonus recorded yet.',
      deferredBadge: 'In reserve',
      daysUnit: '{days}d',
    },
    analytics: {
      title: 'What the Mirror reveals to you',
      description: 'What your customers look at, and what they actually order.',
      rangeLabel: 'Period observed',
      days: (n: number) => `${n} days`,
      overDays: (n: number) => `over ${n} days`,
      views: 'Views',
      orders: 'Orders',
      conversion: 'Conversion',
      conversionHint: 'of views become orders',
      revenue: 'Estimated revenue',
      chartTitle: 'Day-by-day activity',
      legendViews: 'Views — left scale',
      legendOrders: 'Orders — right scale',
      emptyTitle: 'No views in this period',
      emptyBody:
        'Share your link or your QR codes: analytics fill up from the very first visits.',
      viewMyPage: 'View my page',
      bestTitle: 'What sells best',
      bestBody: 'Your most ordered entries in this period.',
      noOrders: 'No orders in this period.',
      hesitationTitle: 'Blind spots detected',
      hesitationBody:
        'Viewed a lot, rarely ordered: the mirror sees a hesitation — you don’t. Often a photo, a description or a price worth revisiting.',
      lockedBody:
        'Hesitation detection and period-over-period comparison are part of the Pro plan.',
      seePro: 'See the Pro plan',
      notEnough:
        'Not enough views in this period to spot a reliable signal.',
      viewsOrders: (views: number, orders: number) =>
        `${views} view${views > 1 ? 's' : ''} · ${orders} order${orders > 1 ? 's' : ''}`,
      editCatalog: (word: string) => `Edit my ${word}`,

      funnelTitle: 'Where you lose customers',
      funnelBody:
        'Three steps: they look, they add to cart, they send. The step that drops the most is the one to fix.',
      funnelViews: 'Looked',
      funnelCarts: 'Added to cart',
      funnelOrders: 'Ordered',
      funnelKept: (pct: string) => `${pct} of the previous step`,
      funnelDropCarts:
        'Many look without adding to cart: review your photos and prices first.',
      funnelDropOrders:
        'Carts fill up but few are sent: follow up on abandoned carts.',
      funnelHealthy: 'Your funnel holds up well over this period.',

      byLocationTitle: (plural: string) => `What each ${plural} brings in`,
      byLocationBody:
        'Orders that came from QR codes, ranked by revenue. The average basket tells you which ones are worth the service.',
      byLocationOrders: 'orders',
      byLocationAverage: 'Average basket',
      byLocationEmpty: (plural: string) =>
        `No orders through a ${plural} QR code over this period.`,
      byLocationBest: (label: string) => `${label} is your best location.`,

      hoursTitle: 'Your peak hours',
      hoursBody:
        'Orders per hour, so you can put extra hands where they matter.',
      hoursPeak: (label: string, n: number) =>
        `Peak at ${label}: ${n} order${n > 1 ? 's' : ''}.`,
      hoursEmpty: 'Not enough orders yet to reveal peak hours.',
      hoursOrders: 'Orders',
    },
    locations: {
      title: (plural: string) => `${plural} and QR`,
      description: (singular: string) =>
        `One QR code per ${singular}: the customer scans, orders, and you receive the order with the ${singular} number.`,
      moduleOffTitle: (plural: string) => `${plural} and QR`,
      moduleOffDescription: 'This module is turned off for your business.',
      moduleOffHeading: 'On-site ordering turned off',
      moduleOffBody: (singular: string, plural: string) =>
        `Turn this module on to create ${plural.toLowerCase()} and print one QR code per ${singular}: your customers order from their phone, without calling you.`,
      enableModule: 'Turn the module on',
      moduleEnabled: 'Module turned on.',
      bulkCreate: 'Create in bulk',
      add: 'Add',
      countLabel: (n: number, word: string) => `${n} ${word}`,
      ofLimit: (limit: number, planName: string) =>
        ` of ${limit} included in the ${planName} plan`,
      limitReachedSuffix: ' — limit reached',
      limitError: (planName: string, limit: number, plural: string) =>
        `Your ${planName} plan is limited to ${limit} ${plural.toLowerCase()}.`,
      added: (label: string) => `${label} added.`,
      deleted: (label: string) => `${label} deleted.`,
      renamed: 'Name updated.',
      bulkCreated: (n: number, plural: string) =>
        `${n} ${plural.toLowerCase()} created.`,
      emptyTitle: (singular: string) => `No ${singular} yet`,
      emptyBody:
        'Create them in bulk if you have several: the numbers follow on automatically.',
      nameOf: (singular: string) => `${singular} name`,
      validate: 'Confirm',
      renameOf: (label: string) => `Rename ${label}`,
      deleteOf: (label: string) => `Delete ${label}`,
      seeQrOf: (label: string) => `View the QR code for ${label}`,
      seeDownload: 'View and download',
      bulkTitle: (plural: string) => `Create several ${plural.toLowerCase()}`,
      bulkBody: (plural: string) =>
        `Names are numbered following on from your existing ${plural.toLowerCase()}. You can rename them afterwards.`,
      howMany: 'How many?',
      remaining: (n: number) => `${n} left in your plan.`,
      noneRemaining: 'Your plan does not allow adding any more.',
      cancel: 'Cancel',
      create: 'Create',
      qrBody: (singular: string) =>
        `Print it and place it on the ${singular}. The QR stays valid even if you rename it.`,
      order: 'Order',
      scanHint: 'Scan to see the menu and order from your phone.',
      testLink: 'Test the link',
      downloadPng: 'Download the PNG',
      qrUnavailable: 'QR code unavailable, please try again.',
      qrDownloaded: 'QR code downloaded.',

      printSheet: 'Printable sheet',
      printSheetTitle: (plural: string) =>
        `Print every QR for my ${plural.toLowerCase()}`,
      printSheetBody: (plural: string) =>
        `An A4 sheet with one QR per ${plural.toLowerCase()}, cut lines included. Nine labels per page.`,
      printSheetPages: (n: number) => `${n} page${n > 1 ? 's' : ''} to print`,
      printSheetGenerate: 'Generate the PDF',
      printSheetGenerating: 'Preparing the PDF…',
      printSheetDone: 'PDF ready, download started.',
      printSheetFailed: 'The PDF could not be created. Please try again.',
      printSheetFooter: (url: string) => `Order online: ${url}`,
      printSheetEmpty: (plural: string) =>
        `Create at least one location to print a sheet of ${plural.toLowerCase()}.`,

      verify: 'Check a QR',
      verifyTitle: 'Check a QR already in place',
      verifyBody:
        'Scan a label already on a table: we tell you which location it points to.',
      verifyStart: 'Open the camera',
      verifyStop: 'Stop',
      verifyAiming: 'Point at the QR code…',
      verifyDenied:
        'Camera access denied. Allow it in your browser, then try again.',
      verifyUnsupported:
        'Your browser cannot read QR codes. Compare the link shown under each code instead.',
      verifyMatch: (label: string) => `That is ${label}, correct.`,
      verifyForeign:
        'This QR does not lead to your storefront. It probably belongs to another business.',
      verifyUnknown:
        'This QR points to a location that no longer exists. Replace the label.',
      verifyAgain: 'Scan another',
      verifyOtherLocation: (label: string) =>
        `Careful: this label points to ${label}.`,
    },
    catalog: {
      countOne: (n: number) => `${n} entry`,
      countMany: (n: number) => `${n} entries`,
      ofLimit: (limit: number) => ` of ${limit} included in your plan`,
      limitError: (limit: number) =>
        `Your plan is limited to ${limit} entries. Upgrade to Pro for an unlimited catalog.`,
      add: 'Add',
      search: 'Search',
      searchLabel: 'Search the catalog',
      limitBanner: (limit: number) =>
        `You have reached your plan's limit of ${limit} entries. `,
      seePlans: 'See the plans',
      saved: 'Changes saved.',
      created: 'Entry added to your page.',
      deleted: 'Entry deleted.',
      deleteTitle: (name: string) => `Delete “${name}”?`,
      deleteBody:
        'This entry will disappear from your public page. This action is permanent.',
      cancel: 'Cancel',
      delete: 'Delete',
      hidden: 'Hidden',
      hideFromPage: (name: string) => `Hide ${name} from my page`,
      showOnPage: (name: string) => `Show ${name} on my page`,
      edit: (name: string) => `Edit ${name}`,
      deleteOne: (name: string) => `Delete ${name}`,
      noResults: 'No results for this search.',
      emptyTitle: (word: string) => `Your ${word} is empty`,
      emptyBody:
        'Add your first entry: it will show up on your public page right away.',
      editEntry: 'Edit entry',
      newEntry: 'New entry',
      formHint: 'Changes are visible on your page immediately.',
      name: 'Name',
      namePlaceholder: 'Poulet DG',
      price: (currency: string) => `Price (${currency})`,
      pricePlaceholder: '3500',
      description: 'Description',
      optional: '(optional)',
      descriptionPlaceholder: 'Plantains, slow-cooked chicken, seasonal vegetables',
      photoLink: 'Photo link',
      visibleOnPage: 'Visible on my page',
      promoPrice: (currency: string) => `Compare-at price — sale (${currency})`,
      promoHint:
        'Leave empty for no discount. When filled, your page shows the struck-through price and a discount badge.',
      promoBadge: (percent: number) => `-${percent}%`,
      availableLabel: 'Available to order',
      unavailableBadge: 'Unavailable',
      availableHint:
        'Turn this off to keep the item visible while blocking new orders.',
      errorPromo: 'The compare-at price must be higher than the selling price.',
      errorName: 'Give this entry a name.',
      errorPrice: 'Enter a valid price.',
      save: 'Save',
      addToPage: 'Add to my page',
      options: {
        title: 'Choices offered to the customer',
        hint: 'For example “Portion” with small and large, or “Sauce” to pick from. The surcharge is added to the price.',
        addGroup: 'Add a choice',
        groupLabel: 'Choice name',
        groupLabelPlaceholder: 'Portion',
        removeGroup: 'Remove this choice',
        selectUnique: 'One answer only',
        selectMultiple: 'Several answers',
        requiredLabel: 'Answer required',
        requiredHint: 'The customer cannot order without answering.',
        optionLabel: 'Label',
        optionLabelPlaceholder: 'Large',
        optionDelta: (currency: string) => `Surcharge (${currency})`,
        addOption: 'Add an answer',
        removeOption: 'Remove this answer',
        emptyGroup: 'Add at least one answer, otherwise this choice will not appear.',
        errorGroupLabel: 'Give every choice a name.',
        errorOptionLabel: 'Every answer needs a label.',
        errorDelta: 'Surcharges must be valid amounts.',
      },
    },
    bookings: {
      title: 'Bookings',
      pendingOne: (n: number) => `${n} request is awaiting your confirmation.`,
      pendingMany: (n: number) =>
        `${n} requests are awaiting your confirmation.`,
      allClear: 'No pending requests. Your calendar is up to date.',
      filters: {
        pending: 'To confirm',
        upcoming: 'Upcoming',
        completed: 'Completed',
        cancelled: 'Cancelled',
        all: 'All',
      },
      status: {
        pending: 'To confirm',
        confirmed: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
      emptyFilteredTitle: 'Nothing in this list',
      emptyFilteredBody: 'Change the filter to see other bookings.',
      emptyTitle: 'No bookings yet',
      emptyBody:
        'Requests sent from the “Booking” block on your public page will arrive here.',
      countOne: (n: number) => `${n} booking`,
      countMany: (n: number) => `${n} bookings`,
      today: 'Today',
      tomorrow: 'Tomorrow',
      yesterday: 'Yesterday',
      requestedAt: (ago: string) => `requested ${ago}`,
      replyOnWhatsapp: 'Reply on WhatsApp',
      confirm: 'Confirm',
      markCompleted: 'Mark as completed',
      cancel: 'Cancel',
      confirmedToast: (name: string) => `Booking for ${name} confirmed.`,
      completedToast: (name: string) => `${name} showed up.`,
      cancelledToast: (name: string) => `Booking for ${name} cancelled.`,
      slotsSaved: 'Opening hours saved.',
      openingTitle: 'Opening hours',
      openingBody:
        'The times offered to customers on your public page. A closed day accepts no requests.',
      save: 'Save',
      dayNames: [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ],
      opensAt: (day: string) => `Opening time on ${day}`,
      closesAt: (day: string) => `Closing time on ${day}`,
      slotLength: (day: string) => `Slot length on ${day}`,
      to: 'to',
      slotOf: (minutes: number) => `${minutes} min slots`,
      closed: 'Closed',
    },
  },
}

const DICTS: Record<Locale, Dict> = { fr: FR, en: EN }

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Dict
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function isLocale(value: string | null): value is Locale {
  return value === 'fr' || value === 'en'
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  /* On démarre toujours en français, la langue rendue par le serveur : lire
     localStorage pendant le premier rendu provoquerait une différence
     d'hydratation. La préférence est appliquée juste après le montage. */
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved) && saved !== 'fr') setLocaleState(saved)
  }, [])

  /* `lang` sur <html> n'est pas décoratif : il pilote la synthèse vocale, la
     césure et la traduction automatique du navigateur. */
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* Navigation privée : la bascule marche, elle ne survit pas au rechargement. */
    }
  }, [])

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t: DICTS[locale] }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  /* Hors provider on renvoie le français plutôt que de casser le rendu :
     un composant isolé (test, story) reste affichable. */
  return ctx ?? { locale: 'fr', setLocale: () => {}, t: FR }
}

/** Le dictionnaire de la langue courante. */
export function useT(): Dict {
  return useLocaleContext().t
}

/** La langue courante et sa bascule. */
export function useLocale(): { locale: Locale; setLocale: (l: Locale) => void } {
  const { locale, setLocale } = useLocaleContext()
  return { locale, setLocale }
}

/* ============================================================
   Noms de catégories

   Les libellés français vivent dans `taxonomy.ts`, avec le reste
   des métadonnées métier. On ne duplique donc ici que l'anglais :
   `categoryLabel()` reste la source pour le français, et la carte
   ci-dessous est typée sur `BusinessCategory` pour qu'une nouvelle
   catégorie sans traduction bloque la compilation.
   ============================================================ */

const CATEGORY_EN: Record<BusinessCategory, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bar: 'Bar / Lounge',
  boulangerie_patisserie: 'Bakery & Pastry',
  traiteur: 'Caterer',
  hotel: 'Hotel',
  location_courte_duree: 'Short-stay rental',
  coiffure_beaute: 'Hair & Beauty',
  spa_bienetre: 'Spa & Wellness',
  sport_coaching: 'Coaching / Gym',
  boutique_mode: 'Boutique / Fashion',
  epicerie: 'Grocery / Corner shop',
  fleuriste: 'Florist',
  electronique_reparation: 'Electronics & Repair',
  service_pro: 'Professional service',
  artisan: 'Craftsperson',
  pressing: 'Dry cleaning / Laundry',
  auto_garage: 'Auto / Garage',
  immobilier: 'Estate agency',
  photographe_studio: 'Photographer / Studio',
  evenementiel: 'Events / Venue hire',
  autre: 'Other',
}

/* ============================================================
   Vocabulaire métier

   Chaque métier nomme son catalogue et ses emplacements à sa
   façon : un restaurant a un « Menu » et des « Tables », un hôtel
   des « Chambres ». Le français vit dans `taxonomy.ts` ; on ne
   duplique ici que l'anglais, typé sur `BusinessCategory` pour
   qu'une catégorie sans traduction bloque la compilation.

   Le pluriel est explicite : ajouter « s » marchait pour « Table »
   mais donnait « Bureaus » au lieu de « Offices ».
   ============================================================ */

interface TradeWords {
  catalog: string
  location: string
  locationPlural: string
}

const TRADE_EN: Record<BusinessCategory, TradeWords> = {
  restaurant: { catalog: 'Menu', location: 'Table', locationPlural: 'Tables' },
  cafe: { catalog: 'Menu', location: 'Table', locationPlural: 'Tables' },
  bar: { catalog: 'Drinks list', location: 'Table', locationPlural: 'Tables' },
  boulangerie_patisserie: {
    catalog: 'Counter',
    location: 'Counter',
    locationPlural: 'Counters',
  },
  traiteur: {
    catalog: 'Packages',
    location: 'Event',
    locationPlural: 'Events',
  },
  hotel: {
    catalog: 'Rooms & services',
    location: 'Room',
    locationPlural: 'Rooms',
  },
  location_courte_duree: {
    catalog: 'Properties',
    location: 'Property',
    locationPlural: 'Properties',
  },
  coiffure_beaute: {
    catalog: 'Services',
    location: 'Station',
    locationPlural: 'Stations',
  },
  spa_bienetre: {
    catalog: 'Treatments',
    location: 'Room',
    locationPlural: 'Rooms',
  },
  sport_coaching: {
    catalog: 'Sessions',
    location: 'Studio',
    locationPlural: 'Studios',
  },
  boutique_mode: {
    catalog: 'Collection',
    location: 'Fitting room',
    locationPlural: 'Fitting rooms',
  },
  epicerie: {
    catalog: 'Aisles',
    location: 'Counter',
    locationPlural: 'Counters',
  },
  fleuriste: {
    catalog: 'Arrangements',
    location: 'Workshop',
    locationPlural: 'Workshops',
  },
  electronique_reparation: {
    catalog: 'Products & repairs',
    location: 'Workshop',
    locationPlural: 'Workshops',
  },
  service_pro: {
    catalog: 'Services',
    location: 'Office',
    locationPlural: 'Offices',
  },
  artisan: {
    catalog: 'Portfolio',
    location: 'Workshop',
    locationPlural: 'Workshops',
  },
  pressing: {
    catalog: 'Pricing',
    location: 'Counter',
    locationPlural: 'Counters',
  },
  auto_garage: {
    catalog: 'Services',
    location: 'Bay',
    locationPlural: 'Bays',
  },
  immobilier: {
    catalog: 'Listings',
    location: 'Office',
    locationPlural: 'Offices',
  },
  photographe_studio: {
    catalog: 'Packages',
    location: 'Studio',
    locationPlural: 'Studios',
  },
  evenementiel: {
    catalog: 'Services',
    location: 'Venue',
    locationPlural: 'Venues',
  },
  autre: {
    catalog: 'Catalogue',
    location: 'Location',
    locationPlural: 'Locations',
  },
}

const FAMILY_EN: Record<FamilyId, { label: string; blurb: string }> = {
  restauration: {
    label: 'Food & Drink',
    blurb: 'Menu, order at table, evening service',
  },
  hebergement: {
    label: 'Hotels & Stays',
    blurb: 'Rooms, room service, stays',
  },
  beaute: {
    label: 'Beauty & Wellness',
    blurb: 'Services, time slots, loyalty',
  },
  commerce: {
    label: 'Retail & Shops',
    blurb: 'Catalogue, stock, new arrivals',
  },
  services: {
    label: 'Services & Trades',
    blurb: 'Quotes, appointments, callouts',
  },
  evenementiel: {
    label: 'Events & Creative',
    blurb: 'Portfolio, services, availability',
  },
}

/**
 * Le vocabulaire du métier dans la langue courante.
 *
 * Renvoie une fonction et non un objet : l'appelant connaît la catégorie du
 * commerce affiché, qui peut changer d'une carte à l'autre dans une liste.
 */
export function useTradeWords(): (id: BusinessCategory) => TradeWords {
  const { locale } = useLocaleContext()
  return useCallback(
    (id: BusinessCategory) => {
      if (locale === 'en') return TRADE_EN[id] ?? TRADE_EN.autre
      const meta = CATEGORY_MAP[id] ?? CATEGORY_MAP.autre
      return {
        catalog: meta.catalogWord,
        location: meta.locationWord,
        locationPlural: meta.locationWordPlural,
      }
    },
    [locale],
  )
}

/** Nom et accroche d'une famille de métiers dans la langue courante. */
export function useFamilyMeta(): (
  id: FamilyId,
) => { label: string; blurb: string } {
  const { locale } = useLocaleContext()
  return useCallback(
    (id: FamilyId) => {
      if (locale === 'en') return FAMILY_EN[id]
      const f = FAMILIES.find((x) => x.id === id)
      return { label: f?.label ?? '', blurb: f?.blurb ?? '' }
    },
    [locale],
  )
}

/* ============================================================
   Noms des blocs de page

   Même principe : le français vit dans `blocks.ts` avec les
   métadonnées, on ne duplique ici que l'anglais.
   ============================================================ */

const BLOCK_EN: Record<BlockType, { label: string; description: string }> = {
  hero: {
    label: 'Cover',
    description: 'Large image, headline, call to action',
  },
  search: {
    label: 'Search bar',
    description: 'Worth adding once the catalogue passes a dozen entries',
  },
  categories: {
    label: 'Categories',
    description: 'Filter tags, generated from your catalogue',
  },
  catalogue: {
    label: 'Catalogue',
    description: 'Grid or list of your products and services',
  },
  carousel: {
    label: 'Carousel',
    description: 'Scrolling highlight of a selection',
  },
  promo: {
    label: 'Promo banner',
    description: 'Limited offer, tied to a product and its struck-out price',
  },
  booking: {
    label: 'Booking',
    description: 'Day picker and available time slots',
  },
  reviews: {
    label: 'Reviews & Testimonials',
    description: 'Stars and customer comments',
  },
  faq: {
    label: 'FAQ',
    description: 'Frequently asked questions in an accordion',
  },
  hours_location: {
    label: 'Hours & Location',
    description: 'Opening hours table and map',
  },
  video: {
    label: 'Video',
    description: 'Embed a presentation video',
  },
  contact: {
    label: 'Contact / final CTA',
    description: 'Closing block: details and a call to action',
  },
  identity_media: {
    label: 'Logo & profile',
    description: 'Brand identity with logo and profile presentation',
  },
  image_gallery: {
    label: 'Photo gallery',
    description: 'Uploaded photos and visual highlights',
  },
  bottom_nav: {
    label: 'Mobile menu',
    description: 'Bottom navigation with a central action on phones',
  },
}

/** Nom et description d'un bloc dans la langue courante. */
export function useBlockMeta(): (
  type: BlockType,
) => { label: string; description: string } {
  const { locale } = useLocaleContext()
  return useCallback(
    (type: BlockType) => {
      if (locale === 'en') return BLOCK_EN[type]
      const m = BLOCK_META[type]
      return { label: m?.label ?? type, description: m?.description ?? '' }
    },
    [locale],
  )
}

/**
 * Nom de catégorie dans la langue courante.
 *
 * À utiliser partout où `categoryLabel()` était appelé dans un composant
 * client : cette dernière ne connaît que le français.
 */
export function useCategoryLabel(): (id: BusinessCategory) => string {
  const { locale } = useLocaleContext()
  return useCallback(
    (id: BusinessCategory) =>
      locale === 'en' ? (CATEGORY_EN[id] ?? CATEGORY_EN.autre) : categoryLabel(id),
    [locale],
  )
}
