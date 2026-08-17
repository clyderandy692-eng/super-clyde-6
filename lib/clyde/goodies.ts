import type { Bilingual } from './formation'
import type {
  Certificate,
  GoodieRedemption,
  LessonCompletion,
  Referral,
} from './types'

/**
 * CLYDE — Boutique Goodies : le barème de points et le catalogue.
 *
 * Les points ne sont pas une monnaie parallèle qu'on créditerait à part : ils se
 * DÉDUISENT des faits déjà inscrits ailleurs (leçons validées, certificats
 * obtenus, parrainages aboutis). Seules les dépenses sont enregistrées.
 *
 * Ce choix suit celui de l'essai gratuit : un solde stocké qu'on incrémente se
 * désynchronise au premier bug, et personne ne peut plus dire d'où venaient les
 * points. Ici, un solde faux se répare en corrigeant le fait qui le nourrit.
 */

/* ============================================================
   Barème
   ============================================================ */

/** Points gagnés par leçon validée. */
export const POINTS_PER_LESSON = 5

/** Points gagnés par cours entièrement achevé, en plus des leçons. */
export const POINTS_PER_COURSE = 25

/** Points gagnés à la publication de sa page — le certificat de fondation. */
export const POINTS_FOUNDATION = 50

/** Points gagnés au certificat des 200 abonnés. */
export const POINTS_FOLLOWERS = 100

/** Points gagnés par filleul qui publie réellement sa page. */
export const POINTS_PER_REFERRAL = 40

/* ============================================================
   Catalogue
   ============================================================ */

export interface Goodie {
  id: string
  name: Bilingual
  description: Bilingual
  cost: number
  /** Emoji exclu : une pastille de texte court, cohérente avec le reste. */
  tag: Bilingual
  /**
   * Article utile en boutique, par opposition au simple objet à l'effigie.
   *
   * Sert à ordonner le catalogue : ce qui fait travailler le commerçant passe
   * avant ce qui l'habille.
   */
  useful: boolean
  /** Photo du produit — un catalogue sans image ne donne envie de rien. */
  image: string
  /**
   * Tailles proposées quand l'article se porte. Absent pour les objets :
   * demander une taille pour une planche d'autocollants n'a pas de sens.
   */
  sizes?: string[]
  /**
   * Article visible en boutique. On désactive, on ne supprime pas : un
   * échange passé doit toujours pouvoir retrouver sa fiche.
   */
  active: boolean
}

export const GOODIES: Goodie[] = [
  {
    id: 'goodie-stickers',
    name: { fr: 'Planche d’autocollants', en: 'Sticker sheet' },
    description: {
      fr: 'Vingt autocollants à coller sur les emballages, la vitrine, le comptoir.',
      en: 'Twenty stickers for packaging, your window, the counter.',
    },
    tag: { fr: 'Le premier palier', en: 'First tier' },
    cost: 40,
    useful: true,
    image: '/images/goodies/stickers.png',
    active: true,
  },
  {
    id: 'goodie-carnet',
    name: { fr: 'Carnet de commandes', en: 'Order notebook' },
    description: {
      fr: 'Cent pages pré-imprimées pour noter une commande quand le téléphone est déchargé.',
      en: 'A hundred pre-printed pages to log an order when your phone is dead.',
    },
    tag: { fr: 'Utile au comptoir', en: 'Counter-ready' },
    cost: 70,
    useful: true,
    image: '/images/goodies/carnet.png',
    active: true,
  },
  {
    id: 'goodie-tote',
    name: { fr: 'Sac en toile', en: 'Tote bag' },
    description: {
      fr: 'Toile épaisse, sérigraphie CLYDE. Pour livrer une commande sans sachet plastique.',
      en: 'Heavy canvas, CLYDE screen print. Deliver an order without a plastic bag.',
    },
    tag: { fr: 'Pour livrer', en: 'For deliveries' },
    cost: 90,
    useful: true,
    image: '/images/goodies/tote.png',
    active: true,
  },
  {
    id: 'goodie-casquette',
    name: { fr: 'Casquette', en: 'Cap' },
    description: {
      fr: 'Brodée, visière rigide. Reconnaissable sur un marché bondé.',
      en: 'Embroidered, stiff peak. Recognisable in a crowded market.',
    },
    tag: { fr: 'À porter', en: 'To wear' },
    cost: 120,
    useful: false,
    image: '/images/goodies/casquette.png',
    active: true,
  },
  {
    id: 'goodie-tshirt',
    name: { fr: 'T-shirt d’ingénieur', en: 'Engineer T-shirt' },
    description: {
      fr: 'Coton épais, votre titre d’ingénieur imprimé au dos.',
      en: 'Heavy cotton, your engineer title printed on the back.',
    },
    tag: { fr: 'Le classique', en: 'The classic' },
    cost: 150,
    useful: false,
    image: '/images/goodies/tshirt.png',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    active: true,
  },
  {
    id: 'goodie-tablier',
    name: { fr: 'Tablier', en: 'Apron' },
    description: {
      fr: 'Deux poches profondes, attaches renforcées. Pensé pour la cuisine et le salon.',
      en: 'Two deep pockets, reinforced ties. Made for kitchens and salons.',
    },
    tag: { fr: 'Métier', en: 'Trade' },
    cost: 160,
    useful: true,
    image: '/images/goodies/tablier.png',
    sizes: ['M', 'L', 'XL'],
    active: true,
  },
  {
    id: 'goodie-plaque',
    name: { fr: 'Plaque QR émaillée', en: 'Enamelled QR plate' },
    description: {
      fr: 'Votre QR gravé sur métal émaillé, vissable sur une table. Ne s’efface pas.',
      en: 'Your QR etched on enamelled metal, screws onto a table. Will not wear off.',
    },
    tag: { fr: 'Le palier haut', en: 'Top tier' },
    cost: 200,
    useful: true,
    image: '/images/goodies/plaque.png',
    active: true,
  },
]

export function findGoodie(id: string): Goodie | undefined {
  return GOODIES.find((g) => g.id === id)
}

/* ============================================================
   Solde
   ============================================================ */

/** Une ligne du relevé de points : d'où ils viennent, combien. */
export interface PointsEntry {
  reason:
    | 'lessons'
    | 'courses'
    | 'foundation'
    | 'followers'
    | 'referrals'
    | 'spent'
  /** Nombre de faits comptés — leçons, cours, filleuls. */
  count: number
  /** Négatif pour les dépenses. */
  points: number
}

export interface PointsBalance {
  earned: number
  spent: number
  balance: number
  /** Le détail, pour que le commerçant puisse vérifier le total lui-même. */
  entries: PointsEntry[]
}

/**
 * Relevé de points d'une page.
 *
 * Tout est recalculé à partir des registres passés en argument : rien n'est lu
 * depuis un état global, ce qui rend la fonction testable et réutilisable côté
 * serveur le jour où ces registres viendront de Supabase.
 */
export function pointsBalance(input: {
  businessId: string
  lessonCompletions: LessonCompletion[]
  certificates: Certificate[]
  referrals: Referral[]
  redemptions: GoodieRedemption[]
}): PointsBalance {
  const { businessId } = input

  const lessons = input.lessonCompletions.filter(
    (l) => l.business_id === businessId,
  ).length

  const mine = input.certificates.filter((c) => c.business_id === businessId)
  const courses = mine.filter((c) => c.type === 'formation').length
  const foundation = mine.filter((c) => c.type === 'fondation').length
  const followers = mine.filter((c) => c.type === '200_abonnes').length

  /* Seuls les parrainages aboutis comptent : un lien partagé ne vaut rien tant
     que le filleul n'a pas publié. Même règle que pour les jours d'essai. */
  const referrals = input.referrals.filter(
    (r) =>
      r.referrer_business_id === businessId && r.status === 'page_publiee',
  ).length

  const spent = input.redemptions
    .filter((r) => r.business_id === businessId)
    .reduce((sum, r) => sum + r.points_spent, 0)

  const raw: PointsEntry[] = [
    { reason: 'lessons', count: lessons, points: lessons * POINTS_PER_LESSON },
    { reason: 'courses', count: courses, points: courses * POINTS_PER_COURSE },
    {
      reason: 'foundation',
      count: foundation,
      points: foundation * POINTS_FOUNDATION,
    },
    {
      reason: 'followers',
      count: followers,
      points: followers * POINTS_FOLLOWERS,
    },
    {
      reason: 'referrals',
      count: referrals,
      points: referrals * POINTS_PER_REFERRAL,
    },
  ]

  const earned = raw.reduce((sum, e) => sum + e.points, 0)

  /* Les lignes vides sont retirées : un relevé qui aligne des « 0 point »
     donnerait l'impression d'un compte vide alors qu'il ne l'est pas. */
  const entries = raw.filter((e) => e.count > 0)
  if (spent > 0) {
    entries.push({ reason: 'spent', count: 0, points: -spent })
  }

  return { earned, spent, balance: earned - spent, entries }
}

/** Étiquette d'une ligne de relevé, dans la langue demandée. */
export function pointsReasonLabel(
  reason: PointsEntry['reason'],
  locale: 'fr' | 'en',
  count: number,
): string {
  if (locale === 'en') {
    switch (reason) {
      case 'lessons':
        return `${count} lesson${count > 1 ? 's' : ''} completed`
      case 'courses':
        return `${count} course${count > 1 ? 's' : ''} finished`
      case 'foundation':
        return 'Page published'
      case 'followers':
        return '200 followers'
      case 'referrals':
        return `${count} referral${count > 1 ? 's' : ''} completed`
      case 'spent':
        return 'Goodies redeemed'
    }
  }
  switch (reason) {
    case 'lessons':
      return `${count} leçon${count > 1 ? 's' : ''} validée${count > 1 ? 's' : ''}`
    case 'courses':
      return `${count} cours achevé${count > 1 ? 's' : ''}`
    case 'foundation':
      return 'Page publiée'
    case 'followers':
      return '200 abonnés'
    case 'referrals':
      return `${count} parrainage${count > 1 ? 's' : ''} abouti${count > 1 ? 's' : ''}`
    case 'spent':
      return 'Goodies échangés'
  }
}
