import type { Plan } from './types'

/**
 * Source unique de vérité des offres CLYDE.
 *
 * La page tarifs et l'écran Abonnement du tableau de bord lisent tous les deux
 * ce fichier : impossible d'annoncer un prix sur la landing et d'en appliquer
 * un autre dans le produit.
 */
export interface PlanDefinition {
  id: Plan
  name: string
  /** Prix mensuel affiché. `null` = sur devis. */
  price: number | null
  tagline: string
  features: string[]
  cta: string
  href: string
  featured?: boolean
  limits: {
    /** Pages publiques appartenant au compte. `null` = illimité. */
    pages: number | null
    /** Nombre d'articles au catalogue. `null` = illimité. */
    products: number | null
    /** Modules activables simultanément. `null` = illimité. */
    modules: number | null
    /** Emplacements (tables, chambres). `null` = illimité. */
    locations: number | null
    /** Analytics détaillés : produits hésitants, comparaison de périodes. */
    analyticsPro: boolean
    /** Export PDF des planches de QR codes. */
    qrPdfExport: boolean
  }
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    tagline: 'Pour tester CLYDE et publier une première page.',
    features: [
      'Page publique avec 6 blocs',
      '1 module actif au choix',
      'Catalogue jusqu’à 20 entrées',
      'Commandes WhatsApp illimitées',
      'Analytics de base',
      'Fiche dans le Marketplace',
    ],
    cta: 'Commencer gratuitement',
    href: '/inscription',
    limits: {
      pages: 1,
      products: 20,
      modules: 1,
      locations: 10,
      analyticsPro: false,
      qrPdfExport: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9000,
    tagline: 'Pour les commerces qui veulent savoir ce qui marche.',
    features: [
      'Bibliothèque de blocs complète',
      'Tous les modules simultanément',
      'Catalogue illimité',
      'Analytics Pro : détection d’hésitation',
      'Comparaison période sur période',
      'QR codes et comptes staff illimités',
      'Export PDF des feuilles de QR',
    ],
    cta: 'Passer en Pro',
    href: '/inscription?plan=pro',
    featured: true,
    limits: {
      pages: 3,
      products: null,
      modules: null,
      locations: null,
      analyticsPro: true,
      qrPdfExport: true,
    },
  },
  {
    id: 'entreprise',
    name: 'Entreprise',
    price: null,
    tagline: 'Pour les groupes et les multi-établissements.',
    features: [
      'Tout le plan Pro',
      'Multi-établissements sous un compte',
      'Support prioritaire',
      'Accès anticipé aux nouveautés',
      'Accompagnement à la mise en place',
    ],
    cta: 'Nous contacter',
    href: '/inscription?plan=entreprise',
    limits: {
      pages: null,
      products: null,
      modules: null,
      locations: null,
      analyticsPro: true,
      qrPdfExport: true,
    },
  },
]

export function getPlan(id: Plan): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

/** Formate une limite pour l'affichage : `null` devient « illimité ». */
export function limitLabel(value: number | null): string {
  return value === null ? 'illimité' : String(value)
}

/**
 * Indique si une limite est atteinte. Une limite `null` ne l'est jamais.
 */
export function isLimitReached(used: number, limit: number | null): boolean {
  return limit !== null && used >= limit
}
