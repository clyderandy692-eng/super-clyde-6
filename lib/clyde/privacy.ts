/**
 * CLYDE — droits des personnes sur leurs données.
 *
 * Trois obligations, jusqu'ici absentes : savoir ce qui est détenu (accès),
 * l'emporter (portabilité), et partir (effacement). Le texte de consentement
 * affiché avant l'abonnement ne remplissait aucune des trois — il annonçait un
 * engagement sans laisser de trace, ni de sortie.
 *
 * Ce module ne contient que des fonctions pures : la lecture de l'état et son
 * écriture restent dans le store. C'est ce qui permet de les tester sans
 * navigateur, et de les réutiliser à l'identique quand la base remplacera la
 * couche de démonstration.
 */

import type {
  Booking,
  Follower,
  Order,
  Review,
  TeamMember,
  User,
} from './types'

/**
 * Ce qu'un export contient.
 *
 * Volontairement structuré par origine plutôt qu'à plat : une personne qui lit
 * son export doit pouvoir répondre à « qui a mes données, et pourquoi », ce
 * qu'une liste de champs mélangés ne permet pas.
 */
export interface UserDataExport {
  /** Date de génération — un export sans date ne prouve rien. */
  generated_at: string
  format_version: 1
  account: {
    id: string
    name: string | null
    email: string | null
    whatsapp_number: string | null
    neighborhood: string | null
    address: string | null
    role: string
    created_at: string
  }
  /** Les vitrines suivies, avec la preuve de consentement de chacune. */
  subscriptions: {
    business_id: string
    business_name: string
    followed_at: string
    /** Absent sur les abonnements antérieurs à la traçabilité du consentement. */
    consent_at: string | null
    consent_notice: string | null
    consent_source: 'page' | 'import'
  }[]
  orders: {
    id: string
    business_name: string
    total_estimate: number
    status: string
    created_at: string
  }[]
  bookings: {
    id: string
    business_name: string
    start_at: string
    status: string
  }[]
  reviews: { id: string; business_name: string; rating: number; body: string | null; created_at: string }[]
  /** Inscription à l'équipe de développement, si elle existe. */
  team_membership: { source: string; created_at: string } | null
}

/**
 * Assemble l'export d'une personne.
 *
 * Les noms de commerce sont résolus ici plutôt que laissés sous forme
 * d'identifiants : `bu_3f2a` ne dit rien à la personne qui lit son propre
 * dossier, et un export illisible ne satisfait pas le droit d'accès.
 */
export function buildUserDataExport(input: {
  user: User
  followers: Follower[]
  orders: Order[]
  bookings: Booking[]
  reviews: Review[]
  teamMembers: TeamMember[]
  businessName: (id: string) => string
  now?: Date
}): UserDataExport {
  const { user, businessName } = input
  return {
    generated_at: (input.now ?? new Date()).toISOString(),
    format_version: 1,
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsapp_number: user.whatsapp_number,
      neighborhood: user.neighborhood,
      address: user.address,
      role: user.role,
      created_at: user.created_at,
    },
    subscriptions: input.followers
      .filter((f) => f.user_id === user.id)
      .map((f) => ({
        business_id: f.business_id,
        business_name: businessName(f.business_id),
        followed_at: f.created_at,
        consent_at: f.consent_at ?? null,
        consent_notice: f.consent_notice ?? null,
        /* Un abonnement sans trace est déclaré `import` et non `page` : mentir
           sur la provenance d'un consentement est pire que l'avouer manquant. */
        consent_source: f.consent_source ?? 'import',
      })),
    orders: input.orders
      .filter((o) => o.customer_id === user.id)
      .map((o) => ({
        id: o.id,
        business_name: businessName(o.business_id),
        total_estimate: o.total_estimate,
        status: o.status,
        created_at: o.created_at,
      })),
    bookings: input.bookings
      .filter((b) => b.customer_id === user.id)
      .map((b) => ({
        id: b.id,
        business_name: businessName(b.business_id),
        start_at: b.start_at,
        status: b.status,
      })),
    reviews: input.reviews
      .filter((r) => r.author_user_id === user.id)
      .map((r) => ({
        id: r.id,
        business_name: businessName(r.business_id),
        rating: r.rating,
        body: r.body,
        created_at: r.created_at,
      })),
    team_membership: (() => {
      const member = input.teamMembers.find((m) => m.user_id === user.id)
      return member ? { source: member.source, created_at: member.created_at } : null
    })(),
  }
}

/** Nom de fichier daté : un export téléchargé deux fois ne doit pas s'écraser. */
export function exportFileName(user: Pick<User, 'id'>, now: Date = new Date()): string {
  return `clyde-mes-donnees-${user.id}-${now.toISOString().slice(0, 10)}.json`
}

/**
 * Remplace l'identité d'un client dans une pièce comptable.
 *
 * L'effacement ne peut pas emporter les commandes : elles appartiennent aussi
 * au commerçant, qui doit garder son historique de ventes. On retire donc le
 * nom et le numéro, en gardant la ligne et son montant.
 */
export const ANONYMOUS_NAME = 'Client supprimé'

export function anonymizeCustomer<T extends { customer_id: string | null; customer_name: string; customer_phone: string }>(
  record: T,
): T {
  return { ...record, customer_id: null, customer_name: ANONYMOUS_NAME, customer_phone: '' }
}
