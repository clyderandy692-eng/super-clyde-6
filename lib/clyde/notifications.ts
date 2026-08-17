import type {
  AdminMessage,
  Booking,
  Business,
  Follower,
  ForumReport,
  GoodieRedemption,
  Order,
  Product,
  Review,
  ReviewReport,
  TeamMember,
  User,
} from './types'

/* ============================================================
   Notifications — dérivées des données, jamais stockées

   Une notification n'est pas un fait de plus à écrire : c'est une LECTURE
   des faits déjà inscrits (commandes, avis, stocks…). La dériver à chaque
   affichage garantit qu'elle disparaît d'elle-même quand le fait est traité
   — une commande confirmée sort de la liste sans qu'on ait à « marquer lu ».
   Une table de notifications, elle, se désynchronise au premier oubli.
   ============================================================ */

/**
 * Trois niveaux, du plus pressant au plus doux — la hiérarchie visuelle
 * demandée : rouge d'abord, vert ensuite, bleu enfin.
 *
 * - `urgent` (rouge) : de l'argent ou une réputation se joue maintenant —
 *   commande en attente, plainte, article indisponible.
 * - `action` (vert) : à traiter sans presser — nouvel avis, réservation.
 * - `info` (bleu) : bonne nouvelle, rien à faire — nouvel abonné.
 */
export type NotificationLevel = 'urgent' | 'action' | 'info'

export interface AppNotification {
  id: string
  level: NotificationLevel
  title: string
  detail: string
  created_at: string
  /** Écran où se traite la notification. */
  href: string
}

const LEVEL_ORDER: Record<NotificationLevel, number> = {
  urgent: 0,
  action: 1,
  info: 2,
}

/** Rouge avant vert avant bleu ; à niveau égal, le plus récent d'abord. */
export function sortNotifications(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => {
    const byLevel = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
    if (byLevel !== 0) return byLevel
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/* ------------------------------------------------------------
   Côté vendeur
   ------------------------------------------------------------ */

export function vendorNotifications(input: {
  businessId: string
  orders: Order[]
  bookings: Booking[]
  reviews: Review[]
  products: Product[]
  followers: Follower[]
  users: User[]
}): AppNotification[] {
  const { businessId, orders, bookings, reviews, products, followers, users } = input
  const list: AppNotification[] = []

  /* Commandes en attente : chaque minute d'attente est une vente qui peut
     partir ailleurs. */
  for (const o of orders) {
    if (o.business_id !== businessId || o.status !== 'pending') continue
    list.push({
      id: `order-${o.id}`,
      level: 'urgent',
      title: 'Commande en attente',
      detail: `${o.customer_name} — à confirmer`,
      created_at: o.created_at,
      href: '/tableau-de-bord/commandes',
    })
  }

  /* Avis : une note basse est une plainte (rouge), le reste un avis à
     remercier (vert). Les avis masqués par la modération ne sonnent pas. */
  for (const r of reviews) {
    if (r.business_id !== businessId || r.moderation === 'masque') continue
    if (r.rating <= 2) {
      list.push({
        id: `complaint-${r.id}`,
        level: 'urgent',
        title: 'Plainte client',
        detail: `${r.author_name} — note ${r.rating}/5`,
        created_at: r.created_at,
        /* Pas d'écran « avis » dédié : l'accueil du tableau de bord les
           montre, et un lien qui mène à un 404 vaut pire que pas de lien. */
        href: '/tableau-de-bord',
      })
    } else {
      list.push({
        id: `review-${r.id}`,
        level: 'action',
        title: 'Nouvel avis',
        detail: `${r.author_name} — note ${r.rating}/5`,
        created_at: r.created_at,
        href: '/tableau-de-bord',
      })
    }
  }

  /* Article indisponible : encore visible sur la page mais non commandable —
     l'état exact d'un « bientôt en rupture » dans ce modèle sans quantités. */
  for (const p of products) {
    if (p.business_id !== businessId || !p.active || p.available) continue
    list.push({
      id: `stock-${p.id}`,
      level: 'urgent',
      title: 'Article indisponible',
      detail: `${p.name} — visible mais non commandable`,
      created_at: p.created_at,
      href: '/tableau-de-bord/catalogue',
    })
  }

  /* Réservations à confirmer : vert — un créneau se négocie, une commande
     s'expédie. */
  for (const b of bookings) {
    if (b.business_id !== businessId || b.status !== 'pending') continue
    list.push({
      id: `booking-${b.id}`,
      level: 'action',
      title: 'Réservation à confirmer',
      detail: `${b.customer_name ?? 'Client'} — créneau demandé`,
      created_at: b.created_at,
      href: '/tableau-de-bord/reservations',
    })
  }

  /* Nouveaux abonnés : bleu, une bonne nouvelle qui ne demande rien. */
  const names = new Map(users.map((u) => [u.id, u.name]))
  for (const f of followers) {
    if (f.business_id !== businessId) continue
    list.push({
      id: `follower-${f.id}`,
      level: 'info',
      title: 'Nouvel abonné',
      detail: names.get(f.user_id) ?? 'Un client vous suit',
      created_at: f.created_at,
      href: '/tableau-de-bord/abonnes',
    })
  }

  return sortNotifications(list)
}

/* ------------------------------------------------------------
   Côté administration
   ------------------------------------------------------------ */

export function adminNotifications(input: {
  forumReports: ForumReport[]
  reviewReports: ReviewReport[]
  adminMessages: AdminMessage[]
  redemptions: GoodieRedemption[]
  teamMembers: TeamMember[]
  businesses: Business[]
}): AppNotification[] {
  const { forumReports, reviewReports, adminMessages, redemptions, teamMembers, businesses } = input
  const list: AppNotification[] = []

  /* Signalements non arbitrés : la file qui justifie d'ouvrir la console. */
  for (const r of forumReports) {
    if (r.resolved_at !== null) continue
    list.push({
      id: `forum-report-${r.id}`,
      level: 'urgent',
      title: 'Signalement forum',
      detail: r.reason,
      created_at: r.created_at,
      href: '/admin#moderation',
    })
  }
  for (const r of reviewReports) {
    if (r.resolved_at !== null) continue
    list.push({
      id: `review-report-${r.id}`,
      level: 'urgent',
      title: "Signalement d'avis",
      detail: r.reason,
      created_at: r.created_at,
      href: '/admin#moderation',
    })
  }

  /* Courrier non lu : quelqu'un attend une réponse de l'Usine. */
  for (const m of adminMessages) {
    if (m.read_at !== null) continue
    list.push({
      id: `mail-${m.id}`,
      level: 'urgent',
      title: "Courrier à l'Usine",
      detail: `${m.sender_name} — ${m.topic}`,
      created_at: m.created_at,
      href: '/admin#courrier',
    })
  }

  /* Goodies à préparer / remettre : un engagement pris envers un membre. */
  for (const g of redemptions) {
    if (g.status === 'remise') continue
    list.push({
      id: `goodie-${g.id}`,
      level: 'action',
      title: 'Goodie à remettre',
      detail: g.status === 'demande' ? 'À préparer' : 'Prêt, à remettre',
      created_at: g.created_at,
      href: '/admin#echanges',
    })
  }

  /* Recrues et ouvertures : le pouls de la plateforme, aucun geste attendu. */
  for (const m of teamMembers) {
    list.push({
      id: `team-${m.id}`,
      level: 'info',
      title: 'Nouvelle recrue',
      detail: m.name,
      created_at: m.created_at,
      href: '/admin',
    })
  }
  for (const b of businesses) {
    list.push({
      id: `business-${b.id}`,
      level: 'info',
      title: 'Nouveau commerce',
      detail: b.name,
      created_at: b.created_at,
      href: '/admin/abonnes',
    })
  }

  return sortNotifications(list)
}
