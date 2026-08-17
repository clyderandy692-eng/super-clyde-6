import type {
  Business,
  Plan,
  Subscription,
  TrialBonus,
  TrialBonusReason,
} from './types'

/**
 * CLYDE — récompenses : essai gratuit, parrainage, paliers d'abonnés.
 *
 * Toutes les règles chiffrées vivent ici, et nulle part ailleurs. Un seuil
 * recopié dans un composant finit toujours par diverger de celui annoncé sur la
 * landing.
 */

/* ============================================================
   Barème
   ============================================================ */

/** Essai accordé à toute nouvelle page. Repris tel quel sur la landing. */
export const BASE_TRIAL_DAYS = 35

/** Jours gagnés par le parrain, à la publication de son filleul. */
export const REFERRAL_SENT_DAYS = 30

/** Jours gagnés par le filleul, en plus de son essai de base. */
export const REFERRAL_RECEIVED_DAYS = 30

/** Un palier tous les 20 abonnés. */
export const MILESTONE_STEP = 20

/** Dernier palier récompensé : au-delà, plus de bonus. */
export const MILESTONE_MAX = 200

/** Jours gagnés à chaque palier franchi. */
export const MILESTONE_DAYS = 5

/** Seuil qui donne droit au certificat des 200 abonnés. */
export const CERTIFICATE_FOLLOWER_THRESHOLD = 200

/**
 * Nombre de pages autorisées par plan. `null` = illimité.
 *
 * Vit ici plutôt que dans `plans.ts` parce que c'est une règle de récompense
 * appliquée au compte, alors que les limites de `plans.ts` (articles, modules,
 * emplacements) s'appliquent à une page.
 */
export const PAGES_PER_PLAN: Record<Plan, number | null> = {
  free: 1,
  pro: 3,
  entreprise: null,
}

/** Les dix paliers possibles : 20, 40 … 200. */
export const MILESTONES: number[] = Array.from(
  { length: MILESTONE_MAX / MILESTONE_STEP },
  (_, i) => (i + 1) * MILESTONE_STEP,
)

/** Total maximal de jours gagnables par paliers : 10 × 5 = 50. */
export const MILESTONE_MAX_DAYS = MILESTONES.length * MILESTONE_DAYS

/* ============================================================
   Codes de parrainage
   ============================================================ */

/**
 * Alphabet sans caractères ambigus.
 *
 * Ni O/0, ni I/1/L : ces codes se dictent de vive voix et se recopient à la
 * main sur un téléphone — c'est l'usage réel au marché.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * Fabrique un code de parrainage unique.
 *
 * `taken` reçoit les codes déjà attribués : la génération réessaie plutôt que
 * de risquer une collision, qui rattacherait un filleul au mauvais parrain.
 */
export function generateReferralCode(taken: Set<string> = new Set()): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    }
    if (!taken.has(code)) return code
  }
  /* Après 50 échecs, on suffixe l'horodatage : un code laid reste préférable à
     un doublon silencieux. */
  return `R${Date.now().toString(36).toUpperCase().slice(-5)}`
}

/** Lien de parrainage à partager, chemin relatif. */
export function referralPath(code: string): string {
  return `/rejoindre?ref=${encodeURIComponent(code)}`
}

/**
 * Lien de parrainage complet, à copier ou à envoyer.
 *
 * `origin` est passé par l'appelant (jamais lu depuis `window` ici) pour que la
 * fonction reste utilisable au rendu serveur.
 */
export function referralLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}${referralPath(code)}`
}

/* ============================================================
   Report du code entre l'arrivée et la création de la page
   ============================================================ */

/**
 * Clé de report du code de parrainage.
 *
 * Entre le clic sur le lien et la création effective de la page, le visiteur
 * passe par l'inscription puis les six étapes de l'onboarding. Le code doit
 * survivre à ces navigations : le garder en mémoire vive le perdrait au premier
 * rechargement, et le parrain ne serait jamais crédité.
 */
const PENDING_REFERRAL_KEY = 'clyde.pending_referral'

/** Retient le code présenté à l'arrivée. Sans effet côté serveur. */
export function rememberPendingReferral(code: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      PENDING_REFERRAL_KEY,
      code.trim().toUpperCase(),
    )
  } catch {
    /* Navigation privée ou stockage refusé : le parrainage ne sera pas
       rattaché, ce qui reste préférable à une inscription qui échoue. */
  }
}

/** Lit le code en attente, sans le consommer. */
export function peekPendingReferral(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(PENDING_REFERRAL_KEY)
  } catch {
    return null
  }
}

/**
 * Lit le code en attente et l'efface.
 *
 * Appelé à la création de la page : sans cet effacement, la page suivante du
 * même commerçant serait rattachée au même parrain.
 */
export function consumePendingReferral(): string | null {
  const code = peekPendingReferral()
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(PENDING_REFERRAL_KEY)
    } catch {
      /* Sans importance : le code sera simplement relu une fois. */
    }
  }
  return code
}

/* ============================================================
   Essai gratuit
   ============================================================ */

/** Jours effectivement acquis : les bonus en réserve ne comptent pas. */
export function activeBonusDays(bonuses: TrialBonus[]): number {
  return bonuses.reduce((sum, b) => (b.deferred ? sum : sum + b.days), 0)
}

/** Jours mis en réserve, en attente d'un retour au plan gratuit. */
export function deferredBonusDays(bonuses: TrialBonus[]): number {
  return bonuses.reduce((sum, b) => (b.deferred ? sum + b.days : sum), 0)
}

/**
 * Date de fin d'essai d'une page.
 *
 * Recalculée à chaque appel depuis la création de la page et la somme de ses
 * bonus. Rien n'est stocké : c'est ce qui rend le calcul auditable, et
 * réparable si une ligne de bonus était écrite en trop.
 */
export function trialEndsAt(
  business: Pick<Business, 'created_at'>,
  bonuses: TrialBonus[],
): Date {
  const start = new Date(business.created_at).getTime()
  return new Date(start + activeBonusDays(bonuses) * 86_400_000)
}

/**
 * Jours d'essai restants, jamais négatifs.
 *
 * `now` est injectable pour rendre le calcul testable sans dépendre de l'heure
 * de la machine.
 */
export function trialDaysLeft(
  business: Pick<Business, 'created_at'>,
  bonuses: TrialBonus[],
  now: Date = new Date(),
): number {
  const end = trialEndsAt(business, bonuses).getTime()
  const diff = end - now.getTime()
  return diff <= 0 ? 0 : Math.ceil(diff / 86_400_000)
}

/** L'essai court-il encore ? */
export function isTrialActive(
  business: Pick<Business, 'created_at'>,
  bonuses: TrialBonus[],
  now: Date = new Date(),
): boolean {
  return trialDaysLeft(business, bonuses, now) > 0
}

/* ============================================================
   Limites de pages
   ============================================================ */

export interface PageQuota {
  used: number
  /** `null` = illimité. */
  limit: number | null
  reached: boolean
  plan: Plan
}

/**
 * État du quota de pages d'un compte.
 *
 * Le plan est lu sur le propriétaire, non sur une page : c'est tout l'objet du
 * passage de `business_id` à `owner_id` sur `Subscription`.
 */
export function pageQuota(
  ownerId: string | null,
  businesses: Pick<Business, 'owner_id'>[],
  subscriptions: Pick<Subscription, 'owner_id' | 'plan' | 'status'>[],
): PageQuota {
  const plan = ownerPlan(ownerId, subscriptions)
  const limit = PAGES_PER_PLAN[plan]
  const used = ownerId
    ? businesses.filter((b) => b.owner_id === ownerId).length
    : 0
  return { used, limit, reached: limit !== null && used >= limit, plan }
}

/**
 * Plan actif d'un compte.
 *
 * Un abonnement `cancelled` ne donne plus aucun droit ; un `past_due` les
 * conserve, le temps de régulariser — couper l'accès d'un commerçant sur un
 * retard de paiement de quelques jours lui ferait fermer boutique.
 */
export function ownerPlan(
  ownerId: string | null,
  subscriptions: Pick<Subscription, 'owner_id' | 'plan' | 'status'>[],
): Plan {
  if (!ownerId) return 'free'
  const sub = subscriptions.find((s) => s.owner_id === ownerId)
  if (!sub || sub.status === 'cancelled') return 'free'
  return sub.plan
}

/* ============================================================
   Paliers d'abonnés
   ============================================================ */

/**
 * Paliers franchis mais pas encore récompensés.
 *
 * On compare les paliers atteints à ceux déjà inscrits au registre : un palier
 * ne se paie qu'une fois. Le calcul se fait par différence d'ensembles plutôt
 * qu'en suivant un compteur — un abonné qui se désabonne puis revient ne doit
 * pas rouvrir un droit déjà honoré.
 */
export function pendingMilestones(
  followerCount: number,
  bonuses: Pick<TrialBonus, 'reason' | 'related_milestone'>[],
): number[] {
  const rewarded = new Set(
    bonuses
      .filter((b) => b.reason === 'follower_milestone')
      .map((b) => b.related_milestone),
  )
  return MILESTONES.filter((m) => followerCount >= m && !rewarded.has(m))
}

/** Prochain palier à atteindre, ou `null` au-delà du dernier. */
export function nextMilestone(followerCount: number): number | null {
  const next = MILESTONES.find((m) => m > followerCount)
  return next ?? null
}

/** Abonnés restants avant le prochain palier, ou `null` s'il n'y en a plus. */
export function followersToNextMilestone(
  followerCount: number,
): number | null {
  const next = nextMilestone(followerCount)
  return next === null ? null : next - followerCount
}

/* ============================================================
   Libellés
   ============================================================ */

/** Étiquette lisible d'un motif de bonus, dans la langue demandée. */
export function bonusReasonLabel(
  reason: TrialBonusReason,
  locale: 'fr' | 'en',
  milestone?: number | null,
): string {
  if (locale === 'en') {
    switch (reason) {
      case 'base_trial':
        return 'Free trial'
      case 'referral_sent':
        return 'Referral completed'
      case 'referral_received':
        return 'Welcome bonus'
      case 'follower_milestone':
        return milestone ? `${milestone} followers` : 'Follower milestone'
    }
  }
  switch (reason) {
    case 'base_trial':
      return 'Essai gratuit'
    case 'referral_sent':
      return 'Parrainage abouti'
    case 'referral_received':
      return 'Bonus de bienvenue'
    case 'follower_milestone':
      return milestone ? `${milestone} abonnés` : 'Palier d’abonnés'
  }
}
