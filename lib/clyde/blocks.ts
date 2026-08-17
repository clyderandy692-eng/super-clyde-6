import type { BusinessCategory, Block, BlockType, PageTheme } from './types'

/* ============================================================
   Registre des blocs (plan v5, section 7.4)
   Des blocs déjà structurés et responsives — jamais de primitives
   génériques type Section/Container/Grid.
   ============================================================ */

export interface BlockMeta {
  type: BlockType
  label: string
  description: string
  /** Nom d'icône lucide */
  icon: string
  /** Le bloc n'apparaît que si le module correspondant est actif */
  requiresModule?: 'booking' | 'locations'
  /** Un seul exemplaire autorisé par page */
  unique?: boolean
}

export const BLOCK_LIBRARY: BlockMeta[] = [
  {
    type: 'hero',
    label: 'Couverture',
    description: 'Grande image, titre, bouton d’action',
    icon: 'Image',
    unique: true,
  },
  {
    type: 'search',
    label: 'Barre de recherche',
    description: 'Utile dès une dizaine d’entrées au catalogue',
    icon: 'Search',
    unique: true,
  },
  {
    type: 'categories',
    label: 'Catégories',
    description: 'Étiquettes de filtre, générées depuis le catalogue',
    icon: 'Tags',
    unique: true,
  },
  {
    type: 'catalogue',
    label: 'Catalogue',
    description: 'Grille ou liste de vos produits et services',
    icon: 'LayoutGrid',
  },
  {
    type: 'carousel',
    label: 'Carrousel',
    description: 'Mise en avant défilante d’une sélection',
    icon: 'GalleryHorizontal',
  },
  {
    type: 'promo',
    label: 'Bannière promo',
    description: 'Offre limitée, reliée à un produit et son prix barré',
    icon: 'BadgePercent',
  },
  {
    type: 'booking',
    label: 'Réservation',
    description: 'Sélecteur de jour et créneaux disponibles',
    icon: 'CalendarClock',
    requiresModule: 'booking',
    unique: true,
  },
  {
    type: 'reviews',
    label: 'Avis & Témoignages',
    description: 'Étoiles et commentaires clients',
    icon: 'Star',
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Questions fréquentes en accordéon',
    icon: 'MessageCircleQuestionMark',
  },
  {
    type: 'hours_location',
    label: 'Horaires & Localisation',
    description: 'Tableau des horaires et carte',
    icon: 'MapPin',
    unique: true,
  },
  {
    type: 'video',
    label: 'Vidéo',
    description: 'Intégration d’une vidéo de présentation',
    icon: 'Play',
  },
  {
    type: 'contact',
    label: 'Contact / CTA final',
    description: 'Dernier bloc : coordonnées et bouton d’action',
    icon: 'PhoneCall',
    unique: true,
  },
  {
    type: 'identity_media',
    label: 'Logo & profil',
    description: 'Identité visuelle avec logo, profil et présentation',
    icon: 'CircleUserRound',
    unique: true,
  },
  {
    type: 'image_gallery',
    label: 'Galerie photos',
    description: 'Photos, réalisations et visuels téléversés',
    icon: 'Images',
  },
  {
    type: 'bottom_nav',
    label: 'Menu mobile',
    description: 'Navigation basse avec action centrale sur téléphone',
    icon: 'PanelBottom',
    unique: true,
  },
]

export const BLOCK_META: Record<BlockType, BlockMeta> = BLOCK_LIBRARY.reduce(
  (acc, b) => {
    acc[b.type] = b
    return acc
  },
  {} as Record<BlockType, BlockMeta>,
)

export function blockLabel(type: BlockType): string {
  return BLOCK_META[type]?.label ?? type
}

let seq = 0
export function blockId(type: BlockType): string {
  seq += 1
  return `${type}-${Date.now().toString(36)}-${seq.toString(36)}`
}

/* ============================================================
   Thème par défaut
   ============================================================ */

export const DEFAULT_THEME: PageTheme = {
  brand: '#FF6B35',
  background: '#FAFAF8',
  ink: '#1C1917',
  font: 'kanit',
  buttonStyle: 'rounded',
  density: 'normal',
}

/* ============================================================
   Blocs pré-remplis — jamais de bloc vide (plan v5, section 7.4)
   ============================================================ */

export function createBlock(type: BlockType): Block {
  const id = blockId(type)
  switch (type) {
    case 'hero':
      return {
        id,
        type: 'hero',
        variant: 'bottom',
        title: 'Bienvenue chez nous',
        subtitle: 'Une adresse, un savoir-faire, et de quoi revenir demain.',
        ctaLabel: 'Voir la carte',
        imageUrl: '',
        overlay: 45,
        height: 'md',
      }
    case 'search':
      return {
        id,
        type: 'search',
        placeholder: 'Rechercher un plat, un service…',
        showFilter: true,
      }
    case 'categories':
      /* `scroll` par défaut : la hauteur du bloc ne bouge plus quand le
         catalogue gagne des catégories, donc le catalogue reste visible. */
      return { id, type: 'categories', items: [], autoFromCatalogue: true, display: 'scroll' }
    case 'catalogue':
      return {
        id,
        type: 'catalogue',
        title: 'Notre carte',
        display: 'grid',
        columns: 2,
        showPrice: true,
        showRating: false,
        actionLabel: 'Commander',
      }
    case 'carousel':
      return {
        id,
        type: 'carousel',
        title: 'La sélection du moment',
        productIds: [],
      }
    case 'promo':
      return {
        id,
        type: 'promo',
        title: 'Offre de la semaine',
        description: 'Profitez-en jusqu’à dimanche soir.',
        productId: null,
        endsAt: null,
        ctaLabel: 'J’en profite',
      }
    case 'booking':
      return {
        id,
        type: 'booking',
        title: 'Réserver un créneau',
        description: 'Choisissez un jour, puis une heure.',
        daysAhead: 7,
        ctaLabel: 'Réserver',
      }
    case 'reviews':
      return {
        id,
        type: 'reviews',
        title: 'Ce qu’ils en disent',
        withTabs: false,
        items: [
          {
            id: 'r1',
            name: 'Aïcha',
            rating: 5,
            content: 'Accueil impeccable et service rapide. Je recommande.',
          },
          {
            id: 'r2',
            name: 'Bertrand',
            rating: 4,
            content: 'Très bon rapport qualité-prix, j’y retourne ce week-end.',
          },
        ],
      }
    case 'faq':
      return {
        id,
        type: 'faq',
        title: 'Questions fréquentes',
        items: [
          {
            id: 'f1',
            q: 'Faut-il réserver à l’avance ?',
            a: 'Ce n’est pas obligatoire, mais c’est plus sûr le week-end.',
          },
          {
            id: 'f2',
            q: 'Quels moyens de paiement acceptez-vous ?',
            a: 'Espèces et mobile money sur place.',
          },
        ],
      }
    case 'hours_location':
      return {
        id,
        type: 'hours_location',
        title: 'Nous trouver',
        address: 'Quartier Bastos, Yaoundé',
        mapQuery: 'Bastos, Yaoundé, Cameroun',
        hours: [
          { day: 'Lundi — Vendredi', value: '09:00 — 21:00' },
          { day: 'Samedi', value: '10:00 — 23:00' },
          { day: 'Dimanche', value: 'Fermé' },
        ],
      }
    case 'video':
      return {
        id,
        type: 'video',
        title: 'En vidéo',
        url: '',
        caption: 'Une minute chez nous.',
      }
    case 'contact':
      return {
        id,
        type: 'contact',
        title: 'On vous répond tout de suite',
        description: 'Une question, une demande particulière ? Écrivez-nous.',
        ctaLabel: 'Écrire sur WhatsApp',
        phone: '',
        email: '',
        socials: [],
      }
    case 'identity_media':
      return {
        id,
        type: 'identity_media',
        showLogo: true,
        showProfile: true,
        title: 'Bienvenue chez nous',
        subtitle: 'Une identité claire, une expérience qui reste en tête.',
      }
    case 'image_gallery':
      return {
        id,
        type: 'image_gallery',
        title: 'Découvrez notre univers',
        images: [],
        columns: 2,
      }
    case 'bottom_nav':
      return {
        id,
        type: 'bottom_nav',
        showOn: 'mobile',
        items: [
          { id: 'home', label: 'Accueil', href: '#top', icon: 'home' },
          /* « Agenda » plutôt que « Réserver » : à cinq entrées, chaque
             libellé dispose d'environ 64 px — un mot de 8 lettres y est
             tronqué en « Réserv… », ce qui fait amateur. */
          { id: 'booking', label: 'Agenda', href: '#booking', icon: 'calendar' },
          { id: 'create', label: 'Ajouter', href: '#catalogue', icon: 'plus' },
          { id: 'search', label: 'Explorer', href: '#catalogue', icon: 'search' },
          { id: 'more', label: 'Plus', href: '#contact', icon: 'grid' },
        ],
      }
  }
}

/* ============================================================
   Templates de démarrage par catégorie — jamais de page vide
   ============================================================ */

const TEMPLATE_BY_FAMILY: Record<string, BlockType[]> = {
  restauration: [
    'hero',
    'search',
    'categories',
    'promo',
    'catalogue',
    'reviews',
    'hours_location',
    'contact',
  ],
  hebergement: [
    'hero',
    'catalogue',
    'booking',
    'reviews',
    'faq',
    'hours_location',
    'contact',
  ],
  beaute: [
    'hero',
    'booking',
    'catalogue',
    'reviews',
    'faq',
    'hours_location',
    'contact',
  ],
  commerce: [
    'hero',
    'search',
    'categories',
    'carousel',
    'catalogue',
    'promo',
    'hours_location',
    'contact',
  ],
  services: [
    'hero',
    'catalogue',
    'booking',
    'reviews',
    'faq',
    'hours_location',
    'contact',
  ],
  evenementiel: [
    'hero',
    'carousel',
    'catalogue',
    'booking',
    'reviews',
    'hours_location',
    'contact',
  ],
}

/** Ordre de suggestion des blocs à ajouter, selon la famille */
export const SUGGESTION_ORDER: Record<string, BlockType[]> = {
  restauration: ['catalogue', 'promo', 'categories', 'hours_location'],
  hebergement: ['booking', 'catalogue', 'faq', 'reviews'],
  beaute: ['booking', 'catalogue', 'reviews', 'faq'],
  commerce: ['catalogue', 'carousel', 'search', 'promo'],
  services: ['booking', 'catalogue', 'faq', 'reviews'],
  evenementiel: ['carousel', 'booking', 'catalogue', 'reviews'],
}

const HERO_COPY: Partial<
  Record<BusinessCategory, { title: string; subtitle: string; cta: string }>
> = {
  restaurant: {
    title: 'La cuisine de la maison',
    subtitle: 'Produits du marché, plats du jour, service midi et soir.',
    cta: 'Voir le menu',
  },
  cafe: {
    title: 'Votre café du matin',
    subtitle: 'Torréfaction locale, viennoiseries sorties du four à 7 h.',
    cta: 'Voir la carte',
  },
  bar: {
    title: 'Les soirées commencent ici',
    subtitle: 'Cocktails maison, planches à partager, DJ le vendredi.',
    cta: 'Voir la carte',
  },
  hotel: {
    title: 'Dormez comme chez vous',
    subtitle: 'Chambres calmes, petit-déjeuner inclus, room service.',
    cta: 'Voir les chambres',
  },
  coiffure_beaute: {
    title: 'Votre rendez-vous beauté',
    subtitle: 'Coupe, couleur, soins — sur rendez-vous, sans attente.',
    cta: 'Réserver',
  },
  spa_bienetre: {
    title: 'Une heure pour vous',
    subtitle: 'Massages, soins du visage, hammam.',
    cta: 'Réserver un soin',
  },
  boutique_mode: {
    title: 'La nouvelle collection est là',
    subtitle: 'Pièces en série limitée, essayage en boutique.',
    cta: 'Voir la collection',
  },
  photographe_studio: {
    title: 'Des images qui vous ressemblent',
    subtitle: 'Portrait, mariage, produit — en studio ou chez vous.',
    cta: 'Voir les formules',
  },
}

const ALL_BLOCK_TYPES: BlockType[] = [
  'hero',
  'search',
  'categories',
  'catalogue',
  'carousel',
  'promo',
  'booking',
  'reviews',
  'faq',
  'hours_location',
  'video',
  'contact',
  'identity_media',
  'image_gallery',
  'bottom_nav',
]

export function createTemplate(
  category: BusinessCategory,
  family: string,
  opts: { booking: boolean; businessName: string },
): Block[] {
  const preferred = TEMPLATE_BY_FAMILY[family] ?? TEMPLATE_BY_FAMILY.services
  const types = [...preferred, ...ALL_BLOCK_TYPES.filter((type) => !preferred.includes(type))]
  const blocks: Block[] = []

  for (const type of types) {
    const block = createBlock(type)

    if (block.type === 'hero') {
      const copy = HERO_COPY[category]
      block.title = copy?.title ?? `Bienvenue chez ${opts.businessName}`
      block.subtitle =
        copy?.subtitle ??
        'Découvrez ce que nous proposons et commandez en deux clics.'
      block.ctaLabel = copy?.cta ?? 'Découvrir'
      /* Photo de profil active d'office dans la couverture : sans elle,
         n'importe quel commerce pourrait être derrière la même image. À
         gauche, comme un en-tête de profil ; le commerçant la déplace
         (gauche / centre / droite) ou la coupe depuis le constructeur de
         page. Tant qu'aucun logo n'est renseigné, le rendu n'affiche rien :
         les pages sans visuel restent intactes. */
      block.logo = { enabled: true, size: 'md', align: 'left' }
    }
    /* Chaque famille reçoit un habillage de carrousel différent : les pages
       de démonstration montrent ainsi la variété possible dans le builder,
       plutôt que six vitrines identiques. */
    if (block.type === 'carousel') {
      block.variant =
        family === 'restauration'
          ? 'caption'
          : family === 'commerce'
            ? 'card'
            : 'overlay'
    }
    /* Même logique pour le menu mobile : chaque famille inaugure un style
       différent, que le commerçant peut ensuite changer dans l'éditeur. */
    if (block.type === 'bottom_nav') {
      block.navStyle =
        family === 'restauration'
          ? 'dark-pill'
          : family === 'beaute'
            ? 'minimal'
            : family === 'commerce'
              ? 'docked'
              : 'floating'
    }
    blocks.push(block)
  }
  return blocks
}

/**
 * Blocs réellement affichables sur la page publique.
 *
 * Un bloc lié à un module coupé est retiré : mieux vaut ne rien montrer
 * qu'un formulaire de réservation qui n'aboutit nulle part. L'éditeur, lui,
 * continue de l'afficher pour que le commerçant puisse le retirer ou
 * réactiver le module.
 */
export function publicBlocks(
  blocks: Block[],
  modules: { booking: boolean; locations: boolean },
): Block[] {
  return blocks.filter((b) => {
    const required = BLOCK_META[b.type]?.requiresModule
    return !required || modules[required]
  })
}

/** Blocs déjà présents dont le type est unique — pour griser la palette */
export function usedUniqueTypes(blocks: Block[]): Set<BlockType> {
  const used = new Set<BlockType>()
  for (const b of blocks) {
    if (BLOCK_META[b.type]?.unique) used.add(b.type)
  }
  return used
}
