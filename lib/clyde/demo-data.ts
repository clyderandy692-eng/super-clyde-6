import { createTemplate, DEFAULT_THEME } from './blocks'
import { demoMediaUrls } from './demo-media'
import {
  BASE_TRIAL_DAYS,
  REFERRAL_RECEIVED_DAYS,
  REFERRAL_SENT_DAYS,
} from './rewards'
import { CATEGORY_MAP, DEFAULT_FOLLOWER_NOTICE } from './taxonomy'
import type {
  AbandonedCart,
  AvailabilityRule,
  Booking,
  Business,
  BusinessLocation,
  Certificate,
  Follower,
  ForumReply,
  ForumThread,
  Order,
  OrderItem,
  Page,
  PageTheme,
  Post,
  PostComment,
  Product,
  ProductOptionGroup,
  Review,
  ProductStatsDaily,
  Referral,
  Subscription,
  TrialBonus,
  User,
} from './types'

/**
 * Jeu de données de démonstration.
 * Formes strictement identiques au schéma SQL (section 18) : le passage à
 * Supabase remplace la source, pas les composants.
 */

/**
 * Ancre temporelle de la démo : aujourd'hui à midi UTC.
 *
 * Une date figée vieillissait d'un jour par jour : la fenêtre « 7 derniers
 * jours » finissait par inclure des journées sans données et affichait une
 * baisse qui n'existait pas. Midi évite par ailleurs qu'un fuseau à l'ouest
 * ou à l'est de UTC ne décale la journée.
 */
const now = (() => {
  const d = new Date()
  d.setUTCHours(12, 0, 0, 0)
  return d
})()

function iso(daysAgo: number, hour = 12, minute = 0): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(hour, minute, 0, 0)
  return d.toISOString()
}

/**
 * Horodatage compté depuis l'instant réel, et non depuis l'ancre de midi.
 *
 * Les commandes du jour doivent rester dans le passé quelle que soit l'heure
 * de consultation : une heure fixe comme « 12 h 40 » tombe dans le futur pour
 * qui ouvre la démonstration le matin.
 */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function isoAhead(daysAhead: number, hour: number, minute = 0): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() + daysAhead)
  d.setUTCHours(hour, minute, 0, 0)
  return d.toISOString()
}

function day(daysAgo: number): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

/* ============================================================
   Utilisateurs
   ============================================================ */

export const DEMO_USERS: User[] = [
  {
    id: 'u-owner-1',
    email: 'nadia@lebastos.cm',
    whatsapp_number: '+237690112233',
    name: 'Nadia Mbarga',
    neighborhood: 'Bastos',
    address: null,
    role: 'owner',
    created_at: iso(210),
  },
  {
    id: 'u-owner-2',
    email: 'sandrine@studio-eclat.cm',
    whatsapp_number: '+237677445566',
    name: 'Sandrine Ekwe',
    neighborhood: 'Bonapriso',
    address: null,
    role: 'owner',
    created_at: iso(150),
  },
  {
    id: 'u-owner-3',
    email: 'contact@hotelakwa.cm',
    whatsapp_number: '+237699887766',
    name: 'Joseph Ndoumbe',
    neighborhood: 'Akwa',
    address: null,
    role: 'owner',
    created_at: iso(300),
  },
  {
    id: 'u-cust-1',
    email: 'awa@example.com',
    whatsapp_number: '+237655001122',
    name: 'Awa Diallo',
    neighborhood: 'Mvog-Mbi',
    address: null,
    role: 'customer',
    created_at: iso(64),
  },
  {
    id: 'u-cust-2',
    email: 'karl@example.com',
    whatsapp_number: '+237678334455',
    name: 'Karl Fotso',
    neighborhood: 'Bastos',
    address: 'Rue 1.812, immeuble Kola',
    role: 'customer',
    created_at: iso(41),
  },
  {
    id: 'u-cust-3',
    email: 'leila@example.com',
    whatsapp_number: '+237691778899',
    name: 'Leïla Nkeng',
    neighborhood: 'Nlongkak',
    address: null,
    role: 'customer',
    created_at: iso(22),
  },
  {
    id: 'u-admin',
    email: 'admin@clyde.app',
    whatsapp_number: null,
    name: 'Équipe CLYDE',
    neighborhood: null,
    address: null,
    role: 'admin',
    created_at: iso(400),
  },
]

/* ============================================================
   Commerces
   ============================================================ */

interface Seed {
  business: Business
  /**
   * `option_groups` est facultatif ici, et seulement ici : la grande majorité
   * des articles n'a pas d'options, écrire `option_groups: []` sur chacun
   * n'apprendrait rien au lecteur. Le champ reste obligatoire sur `Product`
   * pour que le code applicatif ne puisse pas l'oublier — c'est l'assemblage
   * plus bas qui pose le tableau vide.
   */
  products: (Omit<Product, 'business_id' | 'option_groups'> & {
    option_groups?: ProductOptionGroup[]
  })[]
  locations?: Omit<BusinessLocation, 'business_id'>[]
}

function business(
  b: Omit<Business, 'follower_data_notice' | 'created_at' | 'referral_code'> &
    Partial<
      Pick<Business, 'follower_data_notice' | 'created_at' | 'referral_code'>
    >,
): Business {
  return {
    follower_data_notice: DEFAULT_FOLLOWER_NOTICE,
    created_at: iso(120),
    /* Code dérivé de l'identifiant plutôt que tiré au hasard : les graines
       doivent être stables d'un chargement à l'autre, sinon le lien de
       parrainage affiché en démonstration changerait à chaque rechargement. */
    referral_code: `DEMO${b.id.replace(/[^0-9]/g, '').padStart(2, '0')}`,
    ...b,
  }
}

const SEEDS: Seed[] = [
  {
    business: business({
      id: 'b-1',
      owner_id: 'u-owner-1',
      slug: 'le-bastos',
      name: 'Le Bastos',
      category: 'restaurant',
      whatsapp_number: '+237690112233',
      description:
        'Cuisine camerounaise de marché, plats du jour et grillades le soir. Terrasse ombragée.',
      currency: 'XAF',
      followers_public: true,
      listed_in_marketplace: true,
      module_locations: true,
      module_booking: true,
      city: 'Yaoundé',
      neighborhood: 'Bastos',
      /* Laissé vide sciemment : la vignette reprend alors le visuel de la page,
         ce qui reproduit le cas d'un commerçant n'ayant pas encore renseigné de
         couverture dédiée. */
      cover_url: null,
      /* Le Bastos est la vitrine du mockup de la landing : elle doit montrer
         ce qu'une page aboutie donne, photo de profil comprise. Le plat
         signature sert de portrait — c'est ce que font la plupart des
         restaurants sur WhatsApp. */
      logo_url: '/images/demo/p-1.jpg',
      created_at: iso(210),
    }),
    products: [
      {
        id: 'p-1',
        name: 'Poulet DG',
        description:
          'Poulet mijoté, plantains mûrs, légumes croquants. Le plat signature.',
        price: 6500,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Plats',
        active: true,
        available: true,
        /* Le plat signature porte les options : c'est sur lui qu'un restaurateur
           venu essayer CLYDE regardera si la plateforme sait gérer sa carte.
           Une portion obligatoire (avec supplément) et un accompagnement au
           choix couvrent les deux règles à démontrer. */
        option_groups: [
          {
            id: 'og-1',
            label: 'Portion',
            select: 'unique',
            required: true,
            options: [
              { id: 'op-1', label: 'Normale', price_delta: 0 },
              { id: 'op-2', label: 'Grande faim', price_delta: 1500 },
            ],
          },
          {
            id: 'og-2',
            label: 'Accompagnement',
            select: 'multiple',
            required: false,
            options: [
              { id: 'op-3', label: 'Plantains supplémentaires', price_delta: 500 },
              { id: 'op-4', label: 'Piment maison', price_delta: 0 },
              { id: 'op-5', label: 'Bâton de manioc', price_delta: 300 },
            ],
          },
        ],
        created_at: iso(200),
      },
      {
        id: 'p-2',
        name: 'Ndolé crevettes',
        description: 'Ndolé onctueux, crevettes fraîches, igname vapeur.',
        price: 7000,
        compare_at_price: 8000,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Plats',
        active: true,
        available: true,
        created_at: iso(198),
      },
      {
        id: 'p-3',
        name: 'Brochettes de bœuf',
        description: 'Trois brochettes marinées, sauce piment maison.',
        price: 3500,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Grillades',
        active: true,
        available: true,
        created_at: iso(190),
      },
      {
        id: 'p-4',
        name: 'Poisson braisé entier',
        description: 'Bar braisé, bâton de manioc, sauce tomate épicée.',
        price: 9000,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Grillades',
        active: true,
        available: false,
        created_at: iso(180),
      },
      {
        id: 'p-5',
        name: 'Jus de bissap',
        description: 'Hibiscus infusé, gingembre, menthe. Servi bien frais.',
        price: 1500,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Boissons',
        active: true,
        available: true,
        created_at: iso(175),
      },
      {
        id: 'p-6',
        name: 'Beignets haricots',
        description: 'Le petit-déjeuner classique, servi jusqu’à 11 h.',
        price: 1000,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Petit-déjeuner',
        active: true,
        available: true,
        created_at: iso(170),
      },
      {
        id: 'p-7',
        name: 'Table privatisée',
        description: 'Grande table de 10 couverts, sur réservation.',
        price: 15000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 120,
        category_label: 'Réservations',
        active: true,
        available: true,
        created_at: iso(120),
      },
    ],
    locations: [
      { id: 'l-1', type: 'table', label: 'Table 1', created_at: iso(200) },
      { id: 'l-2', type: 'table', label: 'Table 2', created_at: iso(200) },
      { id: 'l-3', type: 'table', label: 'Table 3', created_at: iso(200) },
      { id: 'l-4', type: 'table', label: 'Table 4', created_at: iso(200) },
      { id: 'l-5', type: 'table', label: 'Terrasse A', created_at: iso(160) },
      { id: 'l-6', type: 'table', label: 'Terrasse B', created_at: iso(160) },
    ],
  },
  {
    business: business({
      id: 'b-2',
      owner_id: 'u-owner-2',
      slug: 'studio-eclat',
      name: 'Studio Éclat',
      category: 'coiffure_beaute',
      whatsapp_number: '+237677445566',
      description:
        'Coupe, couleur, tresses et soins capillaires. Uniquement sur rendez-vous.',
      currency: 'XAF',
      followers_public: true,
      listed_in_marketplace: true,
      module_locations: false,
      module_booking: true,
      city: 'Douala',
      neighborhood: 'Bonapriso',
      cover_url: null,
      logo_url: null,
      created_at: iso(150),
    }),
    products: [
      {
        id: 'p-20',
        name: 'Coupe & brushing',
        description: 'Diagnostic, shampoing, coupe, coiffage.',
        price: 8000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 60,
        category_label: 'Coupe',
        active: true,
        available: true,
        created_at: iso(140),
      },
      {
        id: 'p-21',
        name: 'Couleur complète',
        description: 'Coloration sur mesure, soin pigmentant inclus.',
        price: 22000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 120,
        category_label: 'Couleur',
        active: true,
        available: true,
        created_at: iso(140),
      },
      {
        id: 'p-22',
        name: 'Tresses collées',
        description: 'Motif au choix, mèches fournies.',
        price: 15000,
        compare_at_price: 18000,
        media_urls: [],
        type: 'service',
        duration_minutes: 150,
        category_label: 'Tresses',
        active: true,
        available: true,
        created_at: iso(120),
      },
      {
        id: 'p-23',
        name: 'Soin profond',
        description: 'Masque vapeur, massage crânien, finition huile.',
        price: 6000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 45,
        category_label: 'Soins',
        active: true,
        available: true,
        created_at: iso(100),
      },
    ],
  },
  {
    business: business({
      id: 'b-3',
      owner_id: 'u-owner-3',
      slug: 'hotel-akwa-palace',
      name: 'Hôtel Akwa Résidence',
      category: 'hotel',
      whatsapp_number: '+237699887766',
      description:
        '24 chambres au calme, petit-déjeuner inclus, room service jusqu’à 23 h.',
      currency: 'XAF',
      followers_public: false,
      listed_in_marketplace: true,
      module_locations: true,
      module_booking: true,
      city: 'Douala',
      neighborhood: 'Akwa',
      cover_url: null,
      logo_url: null,
      created_at: iso(300),
    }),
    products: [
      {
        id: 'p-40',
        name: 'Chambre Standard',
        description: 'Lit double, climatisation, wifi fibre, 22 m².',
        price: 35000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: null,
        category_label: 'Chambres',
        active: true,
        available: true,
        created_at: iso(290),
      },
      {
        id: 'p-41',
        name: 'Suite Junior',
        description: 'Salon séparé, balcon, 38 m².',
        price: 62000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: null,
        category_label: 'Chambres',
        active: true,
        available: true,
        created_at: iso(290),
      },
      {
        id: 'p-42',
        name: 'Room service — Club sandwich',
        description: 'Servi en chambre, 20 min.',
        price: 4500,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Room service',
        active: true,
        available: true,
        created_at: iso(200),
      },
      {
        id: 'p-43',
        name: 'Blanchisserie express',
        description: 'Retour sous 6 h, par pièce.',
        price: 2000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: null,
        category_label: 'Services',
        active: true,
        available: true,
        created_at: iso(200),
      },
    ],
    locations: Array.from({ length: 8 }, (_, i) => ({
      id: `l-r${i + 1}`,
      type: 'room' as const,
      label: `Chambre ${101 + i}`,
      created_at: iso(280),
    })),
  },
  {
    business: business({
      id: 'b-4',
      owner_id: 'u-owner-1',
      slug: 'cafe-du-marche',
      name: 'Café du Marché',
      category: 'cafe',
      whatsapp_number: '+237690112233',
      description: 'Torréfaction locale, viennoiseries dès 7 h.',
      currency: 'XAF',
      followers_public: true,
      listed_in_marketplace: true,
      module_locations: true,
      module_booking: false,
      city: 'Yaoundé',
      neighborhood: 'Mvog-Mbi',
      cover_url: null,
      logo_url: null,
      created_at: iso(90),
    }),
    products: [
      {
        id: 'p-60',
        name: 'Café filtre',
        description: 'Arabica des hauts plateaux, torréfié chaque semaine.',
        price: 1200,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Boissons',
        active: true,
        available: true,
        created_at: iso(88),
      },
      {
        id: 'p-61',
        name: 'Croissant beurre',
        description: 'Sorti du four à 7 h et à 15 h.',
        price: 800,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Viennoiseries',
        active: true,
        available: true,
        created_at: iso(88),
      },
    ],
    locations: [
      { id: 'l-c1', type: 'table', label: 'Table 1', created_at: iso(80) },
      { id: 'l-c2', type: 'table', label: 'Table 2', created_at: iso(80) },
    ],
  },
  {
    business: business({
      id: 'b-5',
      owner_id: 'u-owner-2',
      slug: 'atelier-kola',
      name: 'Atelier Kola',
      category: 'boutique_mode',
      whatsapp_number: '+237677445566',
      description: 'Pièces en pagne, séries limitées, retouches sur place.',
      currency: 'XAF',
      followers_public: true,
      listed_in_marketplace: true,
      module_locations: false,
      module_booking: false,
      city: 'Douala',
      neighborhood: 'Deido',
      cover_url: null,
      logo_url: null,
      created_at: iso(70),
    }),
    products: [
      {
        id: 'p-80',
        name: 'Chemise wax — série 04',
        description: 'Coupe droite, coton imprimé, 12 pièces seulement.',
        price: 18000,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Hommes',
        active: true,
        available: true,
        created_at: iso(60),
      },
      {
        id: 'p-81',
        name: 'Robe longue Ndop',
        description: 'Motif Ndop revisité, doublure coton.',
        price: 32000,
        compare_at_price: 38000,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Femmes',
        active: true,
        available: true,
        created_at: iso(58),
      },
    ],
  },
  {
    business: business({
      id: 'b-6',
      owner_id: 'u-owner-3',
      slug: 'garage-njoya',
      name: 'Garage Njoya',
      category: 'auto_garage',
      whatsapp_number: '+237699887766',
      description: 'Diagnostic, vidange, freins. Devis en 30 minutes.',
      currency: 'XAF',
      followers_public: false,
      listed_in_marketplace: true,
      module_locations: false,
      module_booking: true,
      city: 'Yaoundé',
      neighborhood: 'Mvan',
      cover_url: null,
      logo_url: null,
      created_at: iso(55),
    }),
    products: [
      {
        id: 'p-100',
        name: 'Vidange complète',
        description: 'Huile, filtre à huile, contrôle des niveaux.',
        price: 25000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 60,
        category_label: 'Entretien',
        active: true,
        available: true,
        created_at: iso(50),
      },
      {
        id: 'p-101',
        name: 'Diagnostic électronique',
        description: 'Lecture des codes défaut, rapport écrit.',
        price: 10000,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 30,
        category_label: 'Diagnostic',
        active: true,
        available: true,
        created_at: iso(50),
      },
    ],
  },
  {
    business: business({
      id: 'b-7',
      owner_id: 'u-owner-1',
      slug: 'fleurs-de-melen',
      name: 'Fleurs de Melen',
      category: 'fleuriste',
      whatsapp_number: '+237690112233',
      description: 'Bouquets du jour, compositions pour événements.',
      currency: 'XAF',
      followers_public: true,
      listed_in_marketplace: true,
      module_locations: false,
      module_booking: true,
      city: 'Yaoundé',
      neighborhood: 'Melen',
      cover_url: null,
      logo_url: null,
      created_at: iso(45),
    }),
    products: [
      {
        id: 'p-120',
        name: 'Bouquet du jour',
        description: 'Composition selon l’arrivage du matin.',
        price: 7500,
        compare_at_price: null,
        media_urls: [],
        type: 'product',
        duration_minutes: null,
        category_label: 'Bouquets',
        active: true,
        available: true,
        created_at: iso(40),
      },
    ],
  },
  {
    business: business({
      id: 'b-8',
      owner_id: 'u-owner-2',
      slug: 'studio-lumiere',
      name: 'Studio Lumière',
      category: 'photographe_studio',
      whatsapp_number: '+237677445566',
      description: 'Portrait, mariage, packshot produit. Studio ou extérieur.',
      currency: 'EUR',
      followers_public: true,
      listed_in_marketplace: true,
      module_locations: false,
      module_booking: true,
      city: 'Douala',
      neighborhood: 'Bali',
      cover_url: null,
      logo_url: null,
      created_at: iso(30),
    }),
    products: [
      {
        id: 'p-140',
        name: 'Séance portrait',
        description: '1 h de shooting, 15 photos retouchées.',
        price: 120,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 60,
        category_label: 'Portrait',
        active: true,
        available: true,
        created_at: iso(28),
      },
      {
        id: 'p-141',
        name: 'Reportage mariage',
        description: 'Journée complète, deux photographes, galerie en ligne.',
        price: 950,
        compare_at_price: null,
        media_urls: [],
        type: 'service',
        duration_minutes: 480,
        category_label: 'Mariage',
        active: true,
        available: true,
        created_at: iso(28),
      },
    ],
  },
]

export const DEMO_BUSINESSES: Business[] = SEEDS.map((s) => s.business)

export const DEMO_PRODUCTS: Product[] = SEEDS.flatMap((s) =>
  s.products.map((p) => ({
    ...p,
    business_id: s.business.id,
    /* Les visuels sont rattachés ici, à l'unique point de passage des
       produits, pour que les graines restent lisibles. */
    media_urls: demoMediaUrls(p.id),
    option_groups: p.option_groups ?? [],
  })),
)

export const DEMO_LOCATIONS: BusinessLocation[] = SEEDS.flatMap((s) =>
  (s.locations ?? []).map((l) => ({ ...l, business_id: s.business.id })),
)

/* ============================================================
   Pages (layout_json généré depuis le template de la catégorie)
   ============================================================ */

/**
 * Habillage propre à chaque vitrine de démonstration.
 *
 * Toutes les graines partageaient le thème par défaut : le marketplace
 * alignait huit pages identiques, et les matières « verre dépoli » et
 * « contour marqué » n'apparaissaient nulle part faute d'une page qui les
 * porte. Les couleurs suivent le métier — terre cuite pour le restaurant,
 * rose poudré pour l'institut de beauté — et non l'inverse.
 */
const DEMO_THEMES: Record<string, Partial<PageTheme>> = {
  'b-1': { brand: '#C2410C', background: '#FDF8F3', ink: '#1C1917' },
  'b-2': {
    brand: '#BE185D',
    background: '#FDF2F8',
    ink: '#3B0764',
    surface: 'glass',
    font: 'playfair',
    buttonStyle: 'pill',
  },
  'b-3': {
    brand: '#0E7490',
    background: '#F0FDFA',
    ink: '#134E4A',
    surface: 'glass',
    font: 'lora',
  },
  'b-4': {
    brand: '#B45309',
    background: '#FFFBEB',
    ink: '#1C1917',
    density: 'compact',
  },
  'b-5': {
    brand: '#7C3AED',
    background: '#FAF5FF',
    ink: '#2E1065',
    surface: 'cartoon',
    font: 'space',
    buttonStyle: 'square',
  },
  'b-6': {
    brand: '#1D4ED8',
    background: '#F8FAFC',
    ink: '#0F172A',
    surface: 'cartoon',
    buttonStyle: 'square',
  },
  'b-7': {
    brand: '#15803D',
    background: '#F7FEE7',
    ink: '#1A2E05',
    font: 'lora',
    buttonStyle: 'pill',
  },
  'b-8': {
    brand: '#0F172A',
    background: '#F8FAFC',
    ink: '#0F172A',
    font: 'space',
    density: 'airy',
  },
}

export const DEMO_PAGES: Page[] = SEEDS.map((s, i) => {
  const meta = CATEGORY_MAP[s.business.category]
  return {
    id: `pg-${i + 1}`,
    business_id: s.business.id,
    theme_json: { ...DEFAULT_THEME, ...DEMO_THEMES[s.business.id] },
    layout_json: createTemplate(s.business.category, meta.family, {
      booking: s.business.module_booking,
      businessName: s.business.name,
    }),
    published: true,
  }
})

/* ============================================================
   Règles de disponibilité
   ============================================================ */

export const DEMO_AVAILABILITY: AvailabilityRule[] = [
  ...[1, 2, 3, 4, 5, 6].map((d) => ({
    id: `av-b2-${d}`,
    business_id: 'b-2',
    day_of_week: d,
    start_time: '09:00',
    end_time: '18:00',
    slot_duration_minutes: 60,
  })),
  ...[0, 1, 2, 3, 4, 5, 6].map((d) => ({
    id: `av-b3-${d}`,
    business_id: 'b-3',
    day_of_week: d,
    start_time: '08:00',
    end_time: '20:00',
    slot_duration_minutes: 60,
  })),
  ...[2, 3, 4, 5, 6].map((d) => ({
    id: `av-b1-${d}`,
    business_id: 'b-1',
    day_of_week: d,
    start_time: '18:00',
    end_time: '22:30',
    slot_duration_minutes: 30,
  })),
  ...[1, 2, 3, 4, 5].map((d) => ({
    id: `av-b6-${d}`,
    business_id: 'b-6',
    day_of_week: d,
    start_time: '08:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
  })),
  ...[1, 2, 3, 4, 5, 6].map((d) => ({
    id: `av-b8-${d}`,
    business_id: 'b-8',
    day_of_week: d,
    start_time: '10:00',
    end_time: '19:00',
    slot_duration_minutes: 60,
  })),
]

/* ============================================================
   Commandes
   ============================================================ */

interface OrderSeed {
  id: string
  business_id: string
  customer_id: string | null
  customer_name: string
  customer_phone: string
  channel: 'online' | 'qr_location'
  location_id: string | null
  status: Order['status']
  created_at: string
  items: { product_id: string; quantity: number; note?: string }[]
}

const ORDER_SEEDS: OrderSeed[] = [
  {
    id: 'o-1',
    business_id: 'b-1',
    customer_id: 'u-cust-2',
    customer_name: 'Karl Fotso',
    customer_phone: '+237678334455',
    channel: 'qr_location',
    location_id: 'l-3',
    status: 'confirmed',
    created_at: minutesAgo(160),
    items: [
      { product_id: 'p-1', quantity: 2 },
      { product_id: 'p-5', quantity: 2, note: 'Sans glace' },
    ],
  },
  {
    id: 'o-2',
    business_id: 'b-1',
    customer_id: null,
    customer_name: 'Client Table 5',
    customer_phone: '+237655997733',
    channel: 'qr_location',
    location_id: 'l-5',
    status: 'whatsapp_opened',
    created_at: minutesAgo(75),
    items: [{ product_id: 'p-3', quantity: 3 }],
  },
  {
    id: 'o-3',
    business_id: 'b-1',
    customer_id: 'u-cust-1',
    customer_name: 'Awa Diallo',
    customer_phone: '+237655001122',
    channel: 'online',
    location_id: null,
    status: 'pending',
    created_at: minutesAgo(25),
    items: [
      { product_id: 'p-2', quantity: 1 },
      { product_id: 'p-6', quantity: 4 },
    ],
  },
  {
    id: 'o-4',
    business_id: 'b-1',
    customer_id: 'u-cust-3',
    customer_name: 'Leïla Nkeng',
    customer_phone: '+237691778899',
    channel: 'online',
    location_id: null,
    status: 'confirmed',
    created_at: iso(1, 19, 10),
    items: [{ product_id: 'p-1', quantity: 1 }],
  },
  {
    id: 'o-5',
    business_id: 'b-1',
    customer_id: 'u-cust-2',
    customer_name: 'Karl Fotso',
    customer_phone: '+237678334455',
    channel: 'qr_location',
    location_id: 'l-1',
    status: 'confirmed',
    created_at: iso(2, 20, 30),
    items: [
      { product_id: 'p-4', quantity: 1 },
      { product_id: 'p-5', quantity: 3 },
    ],
  },
  {
    id: 'o-6',
    business_id: 'b-1',
    customer_id: null,
    customer_name: 'Client Terrasse B',
    customer_phone: '+237690445566',
    channel: 'qr_location',
    location_id: 'l-6',
    status: 'cancelled',
    created_at: iso(3, 21, 0),
    items: [{ product_id: 'p-3', quantity: 2 }],
  },
  {
    id: 'o-7',
    business_id: 'b-1',
    customer_id: 'u-cust-1',
    customer_name: 'Awa Diallo',
    customer_phone: '+237655001122',
    channel: 'online',
    location_id: null,
    status: 'confirmed',
    created_at: iso(5, 13, 15),
    items: [{ product_id: 'p-1', quantity: 3 }],
  },
  {
    id: 'o-8',
    business_id: 'b-3',
    customer_id: 'u-cust-3',
    customer_name: 'Leïla Nkeng',
    customer_phone: '+237691778899',
    channel: 'qr_location',
    location_id: 'l-r3',
    status: 'confirmed',
    created_at: minutesAgo(300),
    items: [{ product_id: 'p-42', quantity: 2 }],
  },
  {
    id: 'o-9',
    business_id: 'b-3',
    customer_id: null,
    customer_name: 'Chambre 105',
    customer_phone: '+237677001199',
    channel: 'qr_location',
    location_id: 'l-r5',
    status: 'pending',
    created_at: minutesAgo(215),
    items: [{ product_id: 'p-43', quantity: 3 }],
  },
  {
    id: 'o-10',
    business_id: 'b-5',
    customer_id: 'u-cust-1',
    customer_name: 'Awa Diallo',
    customer_phone: '+237655001122',
    channel: 'online',
    location_id: null,
    status: 'confirmed',
    created_at: iso(4, 16, 0),
    items: [{ product_id: 'p-81', quantity: 1 }],
  },
]

/**
 * Historique généré sur 30 jours, en complément des commandes écrites à la main.
 *
 * Les dix graines ci-dessus racontent la journée en cours — c'est ce que la
 * liste des commandes doit montrer. Mais deux écrans posent des questions qui
 * portent sur la durée : « quelle table rapporte le plus » et « à quelle heure
 * la salle se remplit ». Sept commandes ne peuvent pas y répondre : chaque
 * table n'en aurait qu'une, et le classement se lirait comme du bruit.
 *
 * Tout est déterministe (générateur congruentiel à graine fixe), sinon le
 * rendu serveur et le rendu client divergeraient à l'hydratation.
 */
const GENERATED_ORDERS: OrderSeed[] = (() => {
  const out: OrderSeed[] = []

  /* Suite pseudo-aléatoire reproductible : mêmes valeurs à chaque exécution. */
  let seed = 987654321
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)]

  /* Le service du midi et celui du soir, avec le creux de l'après-midi entre
     les deux : c'est ce relief que le panneau des heures d'affluence révèle.
     Les poids sont les chances relatives de tomber sur chaque heure. */
  const HOURS: [number, number][] = [
    [7, 3], [8, 5], [9, 3], [10, 2],
    [11, 5], [12, 10], [13, 11], [14, 6],
    [15, 2], [16, 2], [17, 3],
    [18, 6], [19, 10], [20, 9], [21, 5], [22, 2],
  ]
  const HOUR_TOTAL = HOURS.reduce((s, [, w]) => s + w, 0)
  const pickHour = (): number => {
    let r = rand() * HOUR_TOTAL
    for (const [h, w] of HOURS) {
      r -= w
      if (r <= 0) return h
    }
    return 12
  }

  /* Les terrasses tournent mieux que les tables du fond : sans cet écart, le
     classement par emplacement serait plat et n'apprendrait rien. */
  const TABLES: [string, number][] = [
    ['l-1', 3], ['l-2', 2], ['l-3', 4],
    ['l-4', 1], ['l-5', 6], ['l-6', 5],
  ]
  const TABLE_TOTAL = TABLES.reduce((s, [, w]) => s + w, 0)
  const pickTable = (): string => {
    let r = rand() * TABLE_TOTAL
    for (const [id, w] of TABLES) {
      r -= w
      if (r <= 0) return id
    }
    return 'l-1'
  }

  const MENU = ['p-1', 'p-2', 'p-3', 'p-5', 'p-6']
  const WALK_INS = [
    ['Client sur place', '+237655330011'],
    ['Client terrasse', '+237677220044'],
    ['Serge Abega', '+237690445577'],
    ['Mireille Tchana', '+237678990022'],
    ['Paul Etoa', '+237699113366'],
  ]

  let n = 0
  /* On démarre la veille : le jour courant reste raconté par les graines. */
  for (let d = 1; d <= 30; d++) {
    const weekend = [0, 6].includes(new Date(day(d)).getUTCDay())
    const count = weekend ? 5 + Math.floor(rand() * 4) : 2 + Math.floor(rand() * 4)

    for (let i = 0; i < count; i++) {
      n += 1
      /* Deux tiers des commandes viennent d'un QR de table : c'est le mode
         d'usage que ce commerce a réellement adopté. */
      const viaQr = rand() < 0.66
      const [name, phone] = pick(WALK_INS)
      const lines = Array.from(
        { length: 1 + Math.floor(rand() * 3) },
        () => ({ product_id: pick(MENU), quantity: 1 + Math.floor(rand() * 2) }),
      )

      out.push({
        id: `o-g${n}`,
        business_id: 'b-1',
        customer_id: null,
        customer_name: name,
        customer_phone: phone,
        channel: viaQr ? 'qr_location' : 'online',
        location_id: viaQr ? pickTable() : null,
        /* Une commande sur douze finit annulée — le calcul du chiffre les
           écarte, et l'écran doit pouvoir le montrer. */
        status: rand() < 0.08 ? 'cancelled' : 'confirmed',
        created_at: iso(d, pickHour(), Math.floor(rand() * 60)),
        items: lines,
      })
    }
  }
  return out
})()

const ALL_ORDER_SEEDS: OrderSeed[] = [...ORDER_SEEDS, ...GENERATED_ORDERS]

const priceOf = (id: string) =>
  DEMO_PRODUCTS.find((p) => p.id === id)?.price ?? 0

export const DEMO_ORDERS: Order[] = ALL_ORDER_SEEDS.map((o) => ({
  id: o.id,
  business_id: o.business_id,
  customer_id: o.customer_id,
  customer_name: o.customer_name,
  customer_phone: o.customer_phone,
  channel: o.channel,
  location_id: o.location_id,
  total_estimate: o.items.reduce(
    (sum, it) => sum + priceOf(it.product_id) * it.quantity,
    0,
  ),
  status: o.status,
  note: null,
  created_at: o.created_at,
}))

export const DEMO_ORDER_ITEMS: OrderItem[] = ALL_ORDER_SEEDS.flatMap((o, oi) =>
  o.items.map((it, ii) => ({
    id: `oi-${oi + 1}-${ii + 1}`,
    order_id: o.id,
    product_id: it.product_id,
    quantity: it.quantity,
    note: it.note ?? null,
    /* Les commandes de démonstration sont antérieures aux options : rien à
       figer, et inventer des choix ici ferait mentir l'historique. */
    options_summary: null,
  })),
)

/* ============================================================
   Paniers abandonnés
   ============================================================ */

/**
 * Paniers laissés sans commande.
 *
 * Ce sont des clients qui ont choisi puis se sont arrêtés avant d'envoyer.
 * Chacun porte un numéro joignable : c'est ce qui rend la relance possible,
 * et c'est la seule raison d'enregistrer la ligne.
 */
interface AbandonedSeed {
  id: string
  business_id: string
  customer_id: string | null
  customer_name: string
  customer_phone: string
  minutes: number
  reminded: boolean
  recovered: boolean
  lines: { productId: string; quantity: number }[]
}

const ABANDONED_SEEDS: AbandonedSeed[] = [
  {
    id: 'ac-1',
    business_id: 'b-1',
    customer_id: 'u-cust-2',
    customer_name: 'Karl Fotso',
    customer_phone: '+237678334455',
    minutes: 45,
    reminded: false,
    recovered: false,
    lines: [
      { productId: 'p-2', quantity: 1 },
      { productId: 'p-5', quantity: 2 },
    ],
  },
  {
    id: 'ac-2',
    business_id: 'b-1',
    customer_id: null,
    customer_name: 'Client Terrasse A',
    customer_phone: '+237655884411',
    minutes: 190,
    reminded: false,
    recovered: false,
    lines: [{ productId: 'p-1', quantity: 2 }],
  },
  {
    id: 'ac-3',
    business_id: 'b-1',
    customer_id: 'u-cust-1',
    customer_name: 'Awa Diallo',
    customer_phone: '+237655001122',
    minutes: 26 * 60,
    /* Déjà relancé, sans réponse : l'écran doit distinguer ce cas d'un panier
       jamais contacté, sinon le commerçant renvoie deux fois le même message. */
    reminded: true,
    recovered: false,
    lines: [
      { productId: 'p-3', quantity: 3 },
      { productId: 'p-6', quantity: 2 },
    ],
  },
  {
    id: 'ac-4',
    business_id: 'b-1',
    customer_id: 'u-cust-3',
    customer_name: 'Leïla Nkeng',
    customer_phone: '+237691778899',
    minutes: 50 * 60,
    reminded: true,
    /* Relancé puis commandé : la preuve que la relance rapporte. */
    recovered: true,
    lines: [{ productId: 'p-1', quantity: 1 }],
  },
  {
    id: 'ac-5',
    business_id: 'b-3',
    customer_id: null,
    customer_name: 'Chambre 102',
    customer_phone: '+237677553388',
    minutes: 120,
    reminded: false,
    recovered: false,
    lines: [{ productId: 'p-42', quantity: 2 }],
  },
]

export const DEMO_ABANDONED_CARTS: AbandonedCart[] = ABANDONED_SEEDS.map((a) => ({
  id: a.id,
  business_id: a.business_id,
  customer_id: a.customer_id,
  customer_name: a.customer_name,
  customer_phone: a.customer_phone,
  lines: a.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
  total_estimate: a.lines.reduce(
    (sum, l) => sum + priceOf(l.productId) * l.quantity,
    0,
  ),
  created_at: new Date(Date.now() - a.minutes * 60_000).toISOString(),
  /* Relance posée une heure après l'abandon : l'ordre chronologique reste
     cohérent quelle que soit l'heure de consultation. */
  reminded_at: a.reminded
    ? new Date(Date.now() - (a.minutes - 60) * 60_000).toISOString()
    : null,
  recovered_at: a.recovered
    ? new Date(Date.now() - (a.minutes - 90) * 60_000).toISOString()
    : null,
}))

/* ============================================================
   Réservations
   ============================================================ */

export const DEMO_BOOKINGS: Booking[] = [
  {
    id: 'bk-1',
    business_id: 'b-2',
    customer_id: 'u-cust-1',
    customer_name: 'Awa Diallo',
    customer_phone: '+237655001122',
    service_id: 'p-21',
    start_at: isoAhead(0, 14),
    location_id: null,
    duration_minutes: 120,
    total_estimate: 22000,
    status: 'confirmed',
    note: null,
    created_at: iso(2),
  },
  {
    id: 'bk-2',
    business_id: 'b-2',
    customer_id: null,
    customer_name: 'Mireille Tchoumi',
    customer_phone: '+237690223344',
    service_id: 'p-22',
    start_at: isoAhead(0, 16),
    location_id: null,
    duration_minutes: 150,
    total_estimate: 15000,
    status: 'pending',
    note: 'Motif au choix de la coiffeuse',
    created_at: minutesAgo(360),
  },
  {
    id: 'bk-3',
    business_id: 'b-2',
    customer_id: 'u-cust-3',
    customer_name: 'Leïla Nkeng',
    customer_phone: '+237691778899',
    service_id: 'p-20',
    start_at: isoAhead(1, 10),
    location_id: null,
    duration_minutes: 60,
    total_estimate: 8000,
    status: 'confirmed',
    note: null,
    created_at: iso(1),
  },
  {
    id: 'bk-4',
    business_id: 'b-2',
    customer_id: null,
    customer_name: 'Sonia Bella',
    customer_phone: '+237677889900',
    service_id: 'p-23',
    start_at: isoAhead(2, 11),
    location_id: null,
    duration_minutes: 45,
    total_estimate: 6000,
    status: 'pending',
    note: null,
    created_at: minutesAgo(240),
  },
  {
    id: 'bk-5',
    business_id: 'b-1',
    customer_id: 'u-cust-2',
    customer_name: 'Karl Fotso',
    customer_phone: '+237678334455',
    service_id: 'p-7',
    start_at: isoAhead(3, 19, 30),
    /* Une table privatisée se réserve à un endroit précis : l'emplacement est
       la préférence du client, il n'entre pas dans le total. */
    location_id: 'l-5',
    duration_minutes: 240,
    /* Deux fois la durée de base du service, donc deux fois son prix. */
    total_estimate: 30000,
    status: 'confirmed',
    note: '10 couverts, anniversaire',
    created_at: iso(1),
  },
  {
    id: 'bk-6',
    business_id: 'b-3',
    customer_id: null,
    customer_name: 'Paul Etoga',
    customer_phone: '+237655443322',
    service_id: 'p-40',
    start_at: isoAhead(1, 15),
    location_id: null,
    /* Une chambre n'a pas de durée de créneau : deux nuits, deux fois le prix. */
    duration_minutes: null,
    total_estimate: 70000,
    status: 'confirmed',
    note: '2 nuits',
    created_at: iso(3),
  },
  {
    id: 'bk-7',
    business_id: 'b-2',
    customer_id: 'u-cust-1',
    customer_name: 'Awa Diallo',
    customer_phone: '+237655001122',
    service_id: 'p-20',
    start_at: iso(9, 10),
    location_id: null,
    duration_minutes: 60,
    total_estimate: 8000,
    status: 'completed',
    note: null,
    created_at: iso(12),
  },
]

/* ============================================================
   Abonnés, publications, commentaires
   ============================================================ */

export const DEMO_FOLLOWERS: Follower[] = [
  {
    id: 'fo-1',
    business_id: 'b-1',
    user_id: 'u-cust-1',
    created_at: iso(60),
  },
  {
    id: 'fo-2',
    business_id: 'b-1',
    user_id: 'u-cust-2',
    created_at: iso(38),
  },
  {
    id: 'fo-3',
    business_id: 'b-1',
    user_id: 'u-cust-3',
    created_at: iso(12),
  },
  {
    id: 'fo-4',
    business_id: 'b-2',
    user_id: 'u-cust-1',
    created_at: iso(30),
  },
  {
    id: 'fo-5',
    business_id: 'b-5',
    user_id: 'u-cust-3',
    created_at: iso(8),
  },
]

export const DEMO_POSTS: Post[] = [
  {
    id: 'po-1',
    business_id: 'b-1',
    type: 'image',
    media_url: '',
    caption: 'Le poisson braisé du vendredi, arrivé ce matin du port.',
    views: 1840,
    likes: 213,
    created_at: iso(2, 17),
  },
  {
    id: 'po-2',
    business_id: 'b-1',
    type: 'image',
    media_url: '',
    caption: 'Nouvelle terrasse ouverte, 14 couverts de plus.',
    views: 1120,
    likes: 96,
    created_at: iso(9, 12),
  },
  {
    id: 'po-3',
    business_id: 'b-1',
    type: 'video',
    media_url: '',
    caption: 'Le ndolé, du premier tri des feuilles à l’assiette.',
    views: 3260,
    likes: 402,
    created_at: iso(16, 10),
  },
  {
    id: 'po-4',
    business_id: 'b-2',
    type: 'image',
    media_url: '',
    caption: 'Tresses collées, motif épi inversé.',
    views: 2410,
    likes: 318,
    created_at: iso(4, 15),
  },
]

export const DEMO_POST_COMMENTS: PostComment[] = [
  {
    id: 'pc-1',
    post_id: 'po-1',
    customer_name: 'Awa Diallo',
    content: 'Vous en aurez encore samedi midi ?',
    created_at: iso(2, 18),
  },
  {
    id: 'pc-2',
    post_id: 'po-1',
    customer_name: 'Karl Fotso',
    content: 'Le meilleur du quartier, sans discuter.',
    created_at: iso(2, 19),
  },
  {
    id: 'pc-3',
    post_id: 'po-3',
    customer_name: 'Leïla Nkeng',
    content: 'La recette complète un jour ?',
    created_at: iso(15, 9),
  },
]

/* ============================================================
   Statistiques produit agrégées (jamais lues depuis events)
   ============================================================ */

const STATS_SEED: Record<string, [number, number]> = {
  // [vues/jour approx, commandes/jour approx]
  'p-1': [58, 6],
  'p-2': [44, 2],
  'p-3': [37, 4],
  'p-4': [96, 1], // hésitation : très vu, peu commandé
  'p-5': [29, 5],
  'p-6': [18, 3],
  'p-7': [52, 1], // hésitation
  'p-20': [41, 5],
  'p-21': [68, 2], // hésitation
  'p-22': [55, 4],
  'p-23': [22, 3],
  'p-40': [74, 4],
  'p-41': [88, 1], // hésitation
  'p-42': [31, 6],
  'p-43': [14, 2],
  'p-60': [26, 7],
  'p-61': [24, 6],
  'p-80': [48, 2],
  'p-81': [62, 3],
  'p-100': [33, 3],
  'p-101': [21, 2],
  'p-120': [27, 4],
  'p-140': [39, 2],
  'p-141': [71, 1], // hésitation
}

export const DEMO_PRODUCT_STATS: ProductStatsDaily[] = (() => {
  const rows: ProductStatsDaily[] = []
  let n = 0
  for (const [productId, [baseViews, baseOrders]] of Object.entries(
    STATS_SEED,
  )) {
    for (let d = 0; d < 60; d++) {
      /* Variations déterministes, pour un rendu stable entre serveur et client.
         `d` compte les jours vers le passé : d=0 est aujourd'hui. */

      /* Saisonnalité longue et discrète : sur deux mois elle ne fait qu'un
         cycle, si bien que deux semaines voisines restent comparables et que
         la croissance de fond domine la tendance hebdomadaire. */
      const wave = 1 + 0.1 * Math.sin((d / 60) * Math.PI * 2 + baseViews)

      /* Croissance de fond : ~25 % de plus aujourd'hui qu'il y a 60 jours.
         Sans elle, la sinusoïde rendait deux semaines consécutives presque
         identiques et le tableau de bord affichait une tendance de 0 %. */
      const growth = 1 + 0.25 * ((60 - d) / 60)

      const weekend = [0, 6].includes(new Date(day(d)).getUTCDay()) ? 1.25 : 1
      const factor = wave * growth * weekend
      n += 1
      const views = Math.max(0, Math.round(baseViews * factor))
      const orders = Math.max(0, Math.round(baseOrders * factor))

      /* Ajouts au panier : bornés entre les commandes et les vues, sinon le
         tunnel afficherait une étape plus large que celle qui la précède.
         Le rapport panier/commande reste supérieur à 1, ce qui laisse
         apparaître la perte entre « ajouté » et « envoyé » — c'est
         précisément l'étape que le tunnel doit rendre visible. */
      const carts = Math.min(views, Math.max(orders, Math.round(orders * 2.4)))

      rows.push({
        id: `ps-${n}`,
        product_id: productId,
        day: day(d),
        views,
        carts,
        orders,
      })
    }
  }
  return rows
})()

/* ============================================================
   Abonnements CLYDE
   ============================================================ */

/**
 * Abonnements de démonstration — un par COMPTE, plus un par page.
 *
 * Les huit commerces de la démonstration se répartissent sur trois
 * propriétaires (trois pages pour u-owner-1 et u-owner-2, deux pour
 * u-owner-3). Les plans retenus tiennent compte de ces effectifs : un compte
 * ne peut pas détenir plus de pages que son plan n'en autorise, sinon la
 * démonstration afficherait d'entrée un quota dépassé.
 */
export const DEMO_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sb-owner-1',
    owner_id: 'u-owner-1',
    /* Trois pages (b-1, b-4, b-7) : c'est exactement la limite du plan Pro. */
    plan: 'pro',
    status: 'active',
    started_at: iso(180),
    renews_at: isoAhead(12, 0),
  },
  {
    id: 'sb-owner-2',
    owner_id: 'u-owner-2',
    /* Trois pages (b-2, b-5, b-8), également à la limite du Pro. */
    plan: 'pro',
    status: 'active',
    started_at: iso(120),
    renews_at: isoAhead(4, 0),
  },
  {
    id: 'sb-owner-3',
    owner_id: 'u-owner-3',
    /* Deux pages (b-3, b-6) et un plan Entreprise : le cas multi-établissements
       sans limite, utile pour montrer un quota illimité à l'écran. */
    plan: 'entreprise',
    status: 'active',
    started_at: iso(260),
    renews_at: isoAhead(22, 0),
  },
]

/* ============================================================
   Récompenses — essai, parrainage, certificats
   ============================================================ */

/**
 * Bonus d'essai de démonstration.
 *
 * Chaque page reçoit sa ligne `base_trial` : sans elle, la fin d'essai
 * calculée tomberait le jour même de la création et la démonstration
 * afficherait « 0 jour restant » sur des commerces actifs depuis des mois.
 *
 * Aucun palier d'abonnés n'est semé : les commerces de démonstration comptent
 * moins de vingt abonnés réels dans `DEMO_FOLLOWERS`, et inscrire un palier
 * non atteint fabriquerait un état incohérent — le tableau afficherait un
 * palier acquis que le compteur d'abonnés contredit.
 */
export const DEMO_TRIAL_BONUSES: TrialBonus[] = [
  ...['b-1', 'b-2', 'b-3', 'b-4', 'b-5', 'b-6', 'b-7', 'b-8'].map(
    (businessId, i) => ({
      id: `tb-base-${i + 1}`,
      business_id: businessId,
      reason: 'base_trial' as const,
      days: BASE_TRIAL_DAYS,
      related_business_id: null,
      related_milestone: null,
      deferred: false,
      granted_at: iso(120),
    }),
  ),
  /* Un parrainage abouti : b-1 a fait venir b-7, qui a publié. Les deux
     lignes sont écrites, comme le veut la règle — une pour le parrain, une
     pour le filleul. */
  {
    id: 'tb-ref-sent-1',
    business_id: 'b-1',
    reason: 'referral_sent',
    days: REFERRAL_SENT_DAYS,
    related_business_id: 'b-7',
    related_milestone: null,
    deferred: false,
    granted_at: iso(44),
  },
  {
    id: 'tb-ref-recv-1',
    business_id: 'b-7',
    reason: 'referral_received',
    days: REFERRAL_RECEIVED_DAYS,
    related_business_id: null,
    related_milestone: null,
    deferred: false,
    granted_at: iso(44),
  },
]

/** Parrainages de démonstration, à différentes étapes du parcours. */
export const DEMO_REFERRALS: Referral[] = [
  {
    id: 'rf-1',
    referrer_business_id: 'b-1',
    referred_business_id: 'b-7',
    referral_code: 'DEMO01',
    status: 'page_publiee',
    created_at: iso(50),
    completed_at: iso(44),
  },
  {
    /* Inscrit mais pas encore publié : aucun bonus n'a été versé, et c'est
       précisément ce que la règle impose. */
    id: 'rf-2',
    referrer_business_id: 'b-1',
    referred_business_id: null,
    referral_code: 'DEMO01',
    status: 'inscrit',
    created_at: iso(8),
    completed_at: null,
  },
]

/** Distinctions déjà inscrites au registre de démonstration. */
export const DEMO_CERTIFICATES: Certificate[] = [
  { id: 'ct-1', business_id: 'b-1', type: 'fondation', granted_at: iso(118) },
  { id: 'ct-2', business_id: 'b-2', type: 'fondation', granted_at: iso(115) },
]

/* ============================================================
   Forum
   ============================================================ */

/**
 * Fils de démonstration.
 *
 * Écrits comme de vraies questions de commerçants, avec leurs fautes de ton et
 * leur imprécision : un forum peuplé de questions parfaitement formulées se
 * repère immédiatement comme du décor, et n'encourage personne à écrire.
 */
export const DEMO_FORUM_THREADS: ForumThread[] = [
  {
    id: 'th-1',
    author_user_id: 'u-admin',
    author_business_id: null,
    category: 'annonces',
    title: 'Les paliers d’abonnés donnent maintenant des jours d’essai',
    body: 'Tous les 20 abonnés, votre page gagne 5 jours d’essai, jusqu’à 200 abonnés. Les paliers déjà franchis avant aujourd’hui ont été rattrapés : regardez votre tableau de bord, les jours sont déjà là.',
    pinned: true,
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(9, 9),
    last_activity_at: iso(2, 16, 20),
  },
  {
    id: 'th-2',
    author_user_id: 'u-owner-1',
    author_business_id: 'b-1',
    category: 'entraide',
    title: 'Comment vous faites pour les commandes le dimanche ?',
    body: 'Le restaurant est fermé le dimanche mais je reçois quand même des commandes, et les gens s’énervent quand je réponds le lundi. Est-ce qu’il y a un moyen de dire que c’est fermé, ou vous mettez juste un mot dans la description ?',
    pinned: false,
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(6, 20, 10),
    last_activity_at: iso(1, 11, 45),
  },
  {
    id: 'th-3',
    author_user_id: 'u-owner-2',
    author_business_id: 'b-2',
    category: 'vitrine',
    title: 'J’ai refait mes photos, dites-moi franchement',
    body: 'J’ai repris toutes les photos du salon au téléphone, près de la fenêtre comme le cours le disait. Avant j’avais 3 réservations par semaine, là j’en ai 11. Mais je trouve que la page fait encore vide en bas. Allez voir et dites-moi ce qui manque.',
    pinned: false,
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(4, 14),
    last_activity_at: iso(3, 8, 30),
  },
  {
    id: 'th-4',
    author_user_id: 'u-owner-3',
    author_business_id: 'b-3',
    category: 'technique',
    title: 'Un QR collé sur une table renvoie vers la mauvaise chambre',
    body: 'J’ai imprimé les QR pour les chambres mais celui de la 12 ouvre la 21. Je pense que je me suis trompé en collant. Est-ce qu’il y a une façon de scanner pour savoir vers quoi pointe une étiquette, sans devoir tout décoller ?',
    pinned: false,
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(3, 10, 15),
    last_activity_at: iso(3, 17, 5),
  },
]

/** Réponses de démonstration. */
export const DEMO_FORUM_REPLIES: ForumReply[] = [
  {
    id: 'rp-1',
    thread_id: 'th-2',
    author_user_id: 'u-owner-3',
    author_business_id: 'b-3',
    body: 'Moi je mets les horaires dans le bloc « Horaires & adresse », et j’ai ajouté une phrase dans la description : « commandes traitées du lundi au samedi ». Depuis, plus personne ne râle.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(5, 9, 20),
  },
  {
    id: 'rp-2',
    thread_id: 'th-2',
    author_user_id: 'u-owner-2',
    author_business_id: 'b-2',
    body: 'Pareil. Et le dimanche soir je réponds à tout d’un coup, même tard : les clients voient que ce n’est pas abandonné, ça suffit largement.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(1, 11, 45),
  },
  {
    id: 'rp-3',
    thread_id: 'th-3',
    author_user_id: 'u-owner-1',
    author_business_id: 'b-1',
    body: 'La page est belle. Ce qui manque en bas c’est les avis : tu as des clientes fidèles, demande-leur deux lignes. Moi c’est ce qui a changé le plus de choses.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(3, 8, 30),
  },
  {
    id: 'rp-4',
    thread_id: 'th-4',
    author_user_id: 'u-admin',
    author_business_id: null,
    body: 'Oui : dans Emplacements, le bouton « Vérifier une étiquette » ouvre le scanner et vous dit vers quel emplacement pointe le QR, sans rien décoller. Vous n’aurez qu’à échanger les deux étiquettes.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(3, 17, 5),
  },
]

/* ============================================================
   Avis clients
   ============================================================ */

/**
 * Avis de démonstration.
 *
 * Volontairement contrastés : quatre et cinq étoiles, mais aussi un avis à deux
 * étoiles laissé visible. Une vitrine de démonstration où tout le monde met
 * cinq étoiles ne montre pas au commerçant ce qui l'intéresse vraiment —
 * comment un reproche s'affiche sur sa page.
 *
 * Les avis d'articles et ceux du commerce sont ici mêlés, mais `product_id` les
 * sépare à l'affichage : la fiche du Poulet DG ne montre que les siens.
 */
export const DEMO_REVIEWS: Review[] = [
  /* --- Avis sur le commerce (b-1, Le Bastos) --- */
  {
    id: 'rv-1',
    business_id: 'b-1',
    product_id: null,
    author_user_id: 'u-cust-1',
    author_name: 'Awa Diallo',
    rating: 5,
    body: 'Commandé par WhatsApp à midi, livré au bureau en vingt minutes. C’est devenu mon adresse du vendredi.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(12),
  },
  {
    id: 'rv-2',
    business_id: 'b-1',
    product_id: null,
    author_user_id: null,
    author_name: 'Blaise',
    rating: 4,
    body: 'Très bon accueil, portions généreuses. Le seul reproche : c’est bruyant le samedi soir.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(8),
  },
  {
    id: 'rv-3',
    business_id: 'b-1',
    product_id: null,
    author_user_id: null,
    author_name: 'Sandrine M.',
    rating: 2,
    /* Un avis négatif laissé visible : le commerçant doit voir à quoi cela
       ressemble sur sa page avant que cela lui arrive pour de vrai. */
    body: 'J’ai attendu quarante minutes un vendredi soir alors qu’on m’avait annoncé quinze. Le plat était bon, mais l’attente était longue.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(5),
  },

  /* --- Avis sur des articles --- */
  {
    id: 'rv-4',
    business_id: 'b-1',
    product_id: 'p-1',
    author_user_id: 'u-cust-2',
    author_name: 'Ibrahim',
    rating: 5,
    body: 'Le meilleur Poulet DG du quartier, et la grande portion vaut vraiment ses 1 500 de plus.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(6),
  },
  {
    id: 'rv-5',
    business_id: 'b-1',
    product_id: 'p-1',
    author_user_id: null,
    author_name: 'Clarisse',
    rating: 4,
    body: 'Bien assaisonné. J’aurais aimé un peu plus de plantains.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(3),
  },
  {
    id: 'rv-6',
    business_id: 'b-1',
    product_id: 'p-4',
    author_user_id: null,
    author_name: 'Téclaire',
    rating: 5,
    body: 'Poisson braisé impeccable, cuit à point.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(2),
  },

  /* --- Un avis masqué, pour que la modération soit visible en démonstration --- */
  {
    id: 'rv-7',
    business_id: 'b-1',
    product_id: null,
    author_user_id: null,
    author_name: 'Anonyme',
    rating: 1,
    body: 'Ce restaurant est une honte, le patron est un voleur.',
    moderation: 'masque',
    moderation_note:
      'Propos injurieux visant la personne du commerçant, sans description d’un fait vécu.',
    created_at: iso(4),
  },

  /* --- Avis sur un second commerce (b-2, Studio Éclat) --- */
  {
    id: 'rv-8',
    business_id: 'b-2',
    product_id: null,
    author_user_id: 'u-cust-3',
    author_name: 'Mireille',
    rating: 5,
    body: 'Nadège prend le temps d’expliquer ce qu’elle fait. Mes tresses ont tenu cinq semaines.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(9),
  },
  {
    id: 'rv-9',
    business_id: 'b-2',
    product_id: 'p-22',
    author_user_id: null,
    author_name: 'Josiane',
    rating: 4,
    body: 'Beau travail sur les tresses collées, mais prévoyez trois heures.',
    moderation: 'visible',
    moderation_note: null,
    created_at: iso(7),
  },
]

/** Business ouvert par défaut dans le dashboard de démonstration */
export const DEMO_ACTIVE_BUSINESS_ID = 'b-1'
export const DEMO_OWNER_ID = 'u-owner-1'
export const DEMO_CUSTOMER_ID = 'u-cust-1'
