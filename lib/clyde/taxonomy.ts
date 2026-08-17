import type { BusinessCategory, Currency } from './types'

/* ============================================================
   Catégories et familles (plan v5, section 6)
   La catégorie ne restreint jamais une fonctionnalité : elle
   suggère un template et pré-coche des modules.
   ============================================================ */

export interface CategoryMeta {
  id: BusinessCategory
  label: string
  family: FamilyId
  /** Modules pré-cochés à l'onboarding */
  suggests: { locations: boolean; booking: boolean }
  /** Vocabulaire du catalogue, adapté au métier */
  catalogWord: string
  locationWord: string
  /** Pluriel explicite : « Bureau » fait « Bureaux », pas « Bureaus ». */
  locationWordPlural: string
}

export type FamilyId =
  | 'restauration'
  | 'hebergement'
  | 'beaute'
  | 'commerce'
  | 'services'
  | 'evenementiel'

export const FAMILIES: { id: FamilyId; label: string; blurb: string }[] = [
  {
    id: 'restauration',
    label: 'Restauration & Boissons',
    blurb: 'Menu, commande à table, service du soir',
  },
  {
    id: 'hebergement',
    label: 'Hôtellerie & Hébergement',
    blurb: 'Chambres, room service, séjours',
  },
  {
    id: 'beaute',
    label: 'Beauté & Bien-être',
    blurb: 'Prestations, créneaux, fidélité',
  },
  {
    id: 'commerce',
    label: 'Commerce & Boutique',
    blurb: 'Catalogue, stock, nouveautés',
  },
  {
    id: 'services',
    label: 'Services & Artisanat',
    blurb: 'Devis, rendez-vous, interventions',
  },
  {
    id: 'evenementiel',
    label: 'Événementiel & Créatif',
    blurb: 'Portfolio, prestations, disponibilités',
  },
]

export const CATEGORIES: CategoryMeta[] = [
  // Restauration & Boissons
  {
    id: 'restaurant',
    label: 'Restaurant',
    family: 'restauration',
    suggests: { locations: true, booking: true },
    catalogWord: 'Menu',
    locationWord: 'Table',
    locationWordPlural: 'Tables',
  },
  {
    id: 'cafe',
    label: 'Café',
    family: 'restauration',
    suggests: { locations: true, booking: false },
    catalogWord: 'Carte',
    locationWord: 'Table',
    locationWordPlural: 'Tables',
  },
  {
    id: 'bar',
    label: 'Bar / Lounge',
    family: 'restauration',
    suggests: { locations: true, booking: true },
    catalogWord: 'Carte',
    locationWord: 'Table',
    locationWordPlural: 'Tables',
  },
  {
    id: 'boulangerie_patisserie',
    label: 'Boulangerie-Pâtisserie',
    family: 'restauration',
    suggests: { locations: false, booking: false },
    catalogWord: 'Vitrine',
    locationWord: 'Comptoir',
    locationWordPlural: 'Comptoirs',
  },
  {
    id: 'traiteur',
    label: 'Traiteur',
    family: 'restauration',
    suggests: { locations: false, booking: true },
    catalogWord: 'Formules',
    locationWord: 'Événement',
    locationWordPlural: 'Événements',
  },
  // Hôtellerie & Hébergement
  {
    id: 'hotel',
    label: 'Hôtel',
    family: 'hebergement',
    suggests: { locations: true, booking: true },
    catalogWord: 'Chambres & services',
    locationWord: 'Chambre',
    locationWordPlural: 'Chambres',
  },
  {
    id: 'location_courte_duree',
    label: 'Location courte durée',
    family: 'hebergement',
    suggests: { locations: true, booking: true },
    catalogWord: 'Logements',
    locationWord: 'Logement',
    locationWordPlural: 'Logements',
  },
  // Beauté & Bien-être
  {
    id: 'coiffure_beaute',
    label: 'Coiffure & Beauté',
    family: 'beaute',
    suggests: { locations: false, booking: true },
    catalogWord: 'Prestations',
    locationWord: 'Poste',
    locationWordPlural: 'Postes',
  },
  {
    id: 'spa_bienetre',
    label: 'Spa & Bien-être',
    family: 'beaute',
    suggests: { locations: true, booking: true },
    catalogWord: 'Soins',
    locationWord: 'Cabine',
    locationWordPlural: 'Cabines',
  },
  {
    id: 'sport_coaching',
    label: 'Coaching sportif / Salle',
    family: 'beaute',
    suggests: { locations: false, booking: true },
    catalogWord: 'Séances',
    locationWord: 'Salle',
    locationWordPlural: 'Salles',
  },
  // Commerce & Boutique
  {
    id: 'boutique_mode',
    label: 'Boutique / Mode',
    family: 'commerce',
    suggests: { locations: false, booking: false },
    catalogWord: 'Collection',
    locationWord: 'Cabine',
    locationWordPlural: 'Cabines',
  },
  {
    id: 'epicerie',
    label: 'Épicerie / Supérette',
    family: 'commerce',
    suggests: { locations: false, booking: false },
    catalogWord: 'Rayons',
    locationWord: 'Comptoir',
    locationWordPlural: 'Comptoirs',
  },
  {
    id: 'fleuriste',
    label: 'Fleuriste',
    family: 'commerce',
    suggests: { locations: false, booking: true },
    catalogWord: 'Compositions',
    locationWord: 'Atelier',
    locationWordPlural: 'Ateliers',
  },
  {
    id: 'electronique_reparation',
    label: 'Électronique & Réparation',
    family: 'commerce',
    suggests: { locations: false, booking: true },
    catalogWord: 'Produits & réparations',
    locationWord: 'Atelier',
    locationWordPlural: 'Ateliers',
  },
  // Services & Artisanat
  {
    id: 'service_pro',
    label: 'Service professionnel',
    family: 'services',
    suggests: { locations: false, booking: true },
    catalogWord: 'Prestations',
    locationWord: 'Bureau',
    locationWordPlural: 'Bureaux',
  },
  {
    id: 'artisan',
    label: 'Artisan',
    family: 'services',
    suggests: { locations: false, booking: true },
    catalogWord: 'Réalisations',
    locationWord: 'Atelier',
    locationWordPlural: 'Ateliers',
  },
  {
    id: 'pressing',
    label: 'Pressing / Blanchisserie',
    family: 'services',
    suggests: { locations: false, booking: false },
    catalogWord: 'Tarifs',
    locationWord: 'Comptoir',
    locationWordPlural: 'Comptoirs',
  },
  {
    id: 'auto_garage',
    label: 'Auto / Garage',
    family: 'services',
    suggests: { locations: false, booking: true },
    catalogWord: 'Interventions',
    locationWord: 'Baie',
    locationWordPlural: 'Baies',
  },
  {
    id: 'immobilier',
    label: 'Agence immobilière',
    family: 'services',
    suggests: { locations: false, booking: true },
    catalogWord: 'Biens',
    locationWord: 'Bureau',
    locationWordPlural: 'Bureaux',
  },
  // Événementiel & Créatif
  {
    id: 'photographe_studio',
    label: 'Photographe / Studio',
    family: 'evenementiel',
    suggests: { locations: false, booking: true },
    catalogWord: 'Formules',
    locationWord: 'Studio',
    locationWordPlural: 'Studios',
  },
  {
    id: 'evenementiel',
    label: 'Événementiel / Location de salle',
    family: 'evenementiel',
    suggests: { locations: true, booking: true },
    catalogWord: 'Prestations',
    locationWord: 'Salle',
    locationWordPlural: 'Salles',
  },
  {
    id: 'autre',
    label: 'Autre',
    family: 'services',
    suggests: { locations: false, booking: false },
    catalogWord: 'Catalogue',
    locationWord: 'Emplacement',
    locationWordPlural: 'Emplacements',
  },
]

export const CATEGORY_MAP: Record<BusinessCategory, CategoryMeta> =
  CATEGORIES.reduce(
    (acc, c) => {
      acc[c.id] = c
      return acc
    },
    {} as Record<BusinessCategory, CategoryMeta>,
  )

export function categoryLabel(id: BusinessCategory): string {
  return CATEGORY_MAP[id]?.label ?? 'Autre'
}

export function familyLabel(id: FamilyId): string {
  return FAMILIES.find((f) => f.id === id)?.label ?? ''
}

export function categoriesByFamily(family: FamilyId): CategoryMeta[] {
  return CATEGORIES.filter((c) => c.family === family)
}

/* ============================================================
   Devises
   ============================================================ */

export const CURRENCIES: {
  id: Currency
  label: string
  symbol: string
  zeroDecimal: boolean
}[] = [
  { id: 'XAF', label: 'Franc CFA', symbol: 'FCFA', zeroDecimal: true },
  { id: 'CNY', label: 'Yuan', symbol: '¥', zeroDecimal: false },
  { id: 'EUR', label: 'Euro', symbol: '€', zeroDecimal: false },
  { id: 'USD', label: 'Dollar US', symbol: '$', zeroDecimal: false },
]

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  XAF: 'fr-FR',
  CNY: 'zh-CN',
  EUR: 'fr-FR',
  USD: 'en-US',
}

export function formatPrice(value: number, currency: Currency): string {
  const zeroDecimal = currency === 'XAF'
  try {
    return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: zeroDecimal ? 0 : 2,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

/* ============================================================
   Palettes professionnelles suggérées (plan v5, section 7.4)
   ============================================================ */

export interface Palette {
  id: string
  label: string
  brand: string
  background: string
  ink: string
  /** Familles pour lesquelles la palette est mise en avant */
  fits: FamilyId[]
}

export const PALETTES: Palette[] = [
  {
    id: 'clyde',
    label: 'CLYDE',
    brand: '#FF6B35',
    background: '#FAFAF8',
    ink: '#1C1917',
    fits: ['restauration', 'commerce', 'services'],
  },
  {
    id: 'braise',
    label: 'Braise',
    brand: '#C1440E',
    background: '#FFF8F0',
    ink: '#2B1B12',
    fits: ['restauration'],
  },
  {
    id: 'laiton',
    label: 'Laiton',
    brand: '#B08556',
    background: '#F7F4EE',
    ink: '#23201A',
    fits: ['hebergement', 'evenementiel'],
  },
  {
    id: 'nuit',
    label: 'Nuit',
    brand: '#E4B363',
    background: '#191A20',
    ink: '#F5F3EE',
    fits: ['hebergement', 'restauration'],
  },
  {
    id: 'rose-poudre',
    label: 'Rose poudré',
    brand: '#C96480',
    background: '#FDF7F7',
    ink: '#2A1B21',
    fits: ['beaute'],
  },
  {
    id: 'eucalyptus',
    label: 'Eucalyptus',
    brand: '#3F7D63',
    background: '#F5F8F5',
    ink: '#1A231D',
    fits: ['beaute', 'commerce'],
  },
  {
    id: 'indigo',
    label: 'Indigo',
    brand: '#3B4F9E',
    background: '#F6F7FB',
    ink: '#191C2B',
    fits: ['services', 'commerce'],
  },
  {
    id: 'graphite',
    label: 'Graphite',
    brand: '#4B4B4B',
    background: '#F4F4F3',
    ink: '#171717',
    fits: ['services', 'evenementiel'],
  },
]

export function palettesFor(family: FamilyId): Palette[] {
  const fit = PALETTES.filter((p) => p.fits.includes(family))
  const rest = PALETTES.filter((p) => !p.fits.includes(family))
  return [...fit, ...rest]
}

/* ============================================================
   Polices proposées dans l'éditeur — liste courte et curatée
   ============================================================ */

export const FONT_CHOICES: {
  id: 'kanit' | 'inter' | 'playfair' | 'space' | 'lora'
  label: string
  stack: string
  mood: string
}[] = [
  {
    id: 'kanit',
    label: 'Kanit',
    stack: 'var(--font-kanit), system-ui, sans-serif',
    mood: 'Affirmée, moderne',
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: '"Inter", system-ui, sans-serif',
    mood: 'Neutre, lisible',
  },
  {
    id: 'playfair',
    label: 'Playfair',
    stack: '"Playfair Display", Georgia, serif',
    mood: 'Élégante, haut de gamme',
  },
  {
    id: 'space',
    label: 'Space Grotesk',
    stack: '"Space Grotesk", system-ui, sans-serif',
    mood: 'Technique, actuelle',
  },
  {
    id: 'lora',
    label: 'Lora',
    stack: '"Lora", Georgia, serif',
    mood: 'Chaleureuse, artisanale',
  },
]

export const DEFAULT_FOLLOWER_NOTICE =
  'Nous utilisons votre contact pour vous informer de nos nouveautés et offres. Nous ne partageons jamais vos informations et ne vous solliciterons pas plus d’une fois par semaine.'
