import type {
  AnalyticsEvent,
  EventType,
  Order,
  Product,
  ProductStatsDaily,
} from './types'

/** Début de journée local, pour comparer des jours et non des instants. */
function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** Clé `AAAA-MM-JJ` en heure locale (`toISOString` décalerait le jour). */
export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

/**
 * Les `days` derniers jours, du plus ancien au plus récent, aujourd'hui inclus.
 */
export function lastDays(days: number): Date[] {
  const today = startOfDay(new Date())
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    return d
  })
}

function isWithin(iso: string, days: number): boolean {
  const limit = startOfDay(new Date())
  limit.setDate(limit.getDate() - (days - 1))
  return new Date(iso).getTime() >= limit.getTime()
}

export function countEvents(
  events: AnalyticsEvent[],
  type: EventType,
  days: number,
): number {
  return events.filter((e) => e.event_type === type && isWithin(e.created_at, days))
    .length
}

/** Étiquette d'axe : « 05 août » ou « 05 Aug » selon la langue. */
function dayLabel(d: Date, locale: 'fr' | 'en'): string {
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

/** Série journalière d'un type d'événement, prête pour un graphique. */
export function eventSeries(
  events: AnalyticsEvent[],
  type: EventType,
  days: number,
  locale: 'fr' | 'en' = 'fr',
): { day: string; label: string; value: number }[] {
  const buckets = new Map<string, number>()
  for (const e of events) {
    if (e.event_type !== type) continue
    const key = dayKey(new Date(e.created_at))
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return lastDays(days).map((d) => ({
    day: dayKey(d),
    label: dayLabel(d, locale),
    value: buckets.get(dayKey(d)) ?? 0,
  }))
}

/** Visiteurs distincts sur la période, via l'identifiant de session. */
export function uniqueVisitors(events: AnalyticsEvent[], days: number): number {
  const sessions = new Set<string>()
  for (const e of events) {
    if (e.event_type === 'page_view' && isWithin(e.created_at, days)) {
      sessions.add(e.session_id)
    }
  }
  return sessions.size
}

export function ordersWithin(orders: Order[], days: number): Order[] {
  return orders.filter((o) => isWithin(o.created_at, days))
}

/** Les commandes annulées ne comptent pas dans le chiffre estimé. */
export function revenueEstimate(orders: Order[]): number {
  return orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_estimate, 0)
}

/** Variation en pourcentage entre deux périodes. `null` si rien à comparer. */
export function trend(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

/** Compte sur la période précédente de même durée, pour la comparaison. */
export function countEventsPrevious(
  events: AnalyticsEvent[],
  type: EventType,
  days: number,
): number {
  const end = startOfDay(new Date())
  end.setDate(end.getDate() - (days - 1))
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return events.filter((e) => {
    if (e.event_type !== type) return false
    const t = new Date(e.created_at).getTime()
    return t >= start.getTime() && t < end.getTime()
  }).length
}

/* ------------------------------------------------------------
   Vues issues des statistiques produits.

   Les événements analytics ne contiennent que le trafic de la session
   en cours. L'historique consolidé vit dans product_stats_daily, qui
   est donc la source des totaux et des courbes de tendance.
   ------------------------------------------------------------ */

/**
 * Totaux vues et commandes sur la période, puis sur la période précédente de
 * même durée.
 *
 * Les analytics lisent tout ici plutôt que de mélanger les sources : compter
 * les visites dans product_stats_daily et les commandes dans la table
 * `orders` donnerait un taux de conversion calculé sur deux périmètres
 * différents, donc faux.
 */
export function statTotals(
  stats: ProductStatsDaily[],
  days: number,
): { views: number; orders: number } {
  return stats
    .filter((s) => isWithin(s.day, days))
    .reduce(
      (acc, s) => ({ views: acc.views + s.views, orders: acc.orders + s.orders }),
      { views: 0, orders: 0 },
    )
}

export function statTotalsPrevious(
  stats: ProductStatsDaily[],
  days: number,
): { views: number; orders: number } {
  const end = startOfDay(new Date())
  end.setDate(end.getDate() - (days - 1))
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return stats.reduce(
    (acc, s) => {
      const t = new Date(s.day).getTime()
      if (t < start.getTime() || t >= end.getTime()) return acc
      return { views: acc.views + s.views, orders: acc.orders + s.orders }
    },
    { views: 0, orders: 0 },
  )
}

/**
 * Chiffre estimé à partir des mêmes statistiques consolidées que le nombre de
 * commandes : quantité commandée par article multipliée par son prix.
 *
 * Croiser les deux sources donnerait un écran incohérent — « 846 commandes »
 * issues des stats à côté d'un chiffre calculé sur les seules commandes
 * détaillées, soit une centaine de francs par commande.
 */
export function revenueFromStats(
  products: Product[],
  stats: ProductStatsDaily[],
  days: number,
): number {
  const price = new Map(products.map((p) => [p.id, p.price]))
  return stats
    .filter((s) => isWithin(s.day, days))
    .reduce((sum, s) => sum + s.orders * (price.get(s.product_id) ?? 0), 0)
}

/** Série journalière vues/commandes, prête pour un graphique. */
export function statSeries(
  stats: ProductStatsDaily[],
  days: number,
  locale: 'fr' | 'en' = 'fr',
): { day: string; label: string; views: number; orders: number }[] {
  const buckets = new Map<string, { views: number; orders: number }>()
  for (const s of stats) {
    const key = dayKey(new Date(s.day))
    const acc = buckets.get(key) ?? { views: 0, orders: 0 }
    acc.views += s.views
    acc.orders += s.orders
    buckets.set(key, acc)
  }
  return lastDays(days).map((d) => {
    const acc = buckets.get(dayKey(d)) ?? { views: 0, orders: 0 }
    return {
      day: dayKey(d),
      label: dayLabel(d, locale),
      views: acc.views,
      orders: acc.orders,
    }
  })
}

/**
 * Produits très consultés mais peu commandés : le signal le plus actionnable
 * du tableau de bord. Un fort écart suggère un prix, une photo ou une
 * description qui fait hésiter.
 */
export function hesitationSignals(
  products: Product[],
  stats: ProductStatsDaily[],
  days = 30,
): { product: Product; views: number; orders: number; rate: number }[] {
  const byProduct = new Map<string, { views: number; orders: number }>()
  for (const s of stats) {
    if (!isWithin(s.day, days)) continue
    const acc = byProduct.get(s.product_id) ?? { views: 0, orders: 0 }
    acc.views += s.views
    acc.orders += s.orders
    byProduct.set(s.product_id, acc)
  }

  return products
    .map((product) => {
      const acc = byProduct.get(product.id) ?? { views: 0, orders: 0 }
      return {
        product,
        views: acc.views,
        orders: acc.orders,
        rate: acc.views === 0 ? 0 : acc.orders / acc.views,
      }
    })
    /* Sous 12 vues, le taux n'est pas significatif. */
    .filter((r) => r.views >= 12)
    .sort((a, b) => a.rate - b.rate)
}

/* ------------------------------------------------------------
   Tunnel de conversion — vue, panier, commande
   ------------------------------------------------------------ */

export interface FunnelStage {
  key: 'views' | 'carts' | 'orders'
  value: number
  /** Part de l'étape initiale, entre 0 et 1. */
  shareOfTop: number
  /** Part conservée depuis l'étape précédente, entre 0 et 1. */
  keptFromPrevious: number
}

/**
 * Les trois étapes du parcours, avec ce qui survit à chacune.
 *
 * Un taux de conversion global dit qu'on perd des clients, jamais où. La
 * distinction compte : beaucoup de vues sans ajout au panier renvoie au prix
 * ou à la photo, beaucoup d'ajouts sans commande renvoie au dernier écran.
 */
export function conversionFunnel(
  stats: ProductStatsDaily[],
  days: number,
): FunnelStage[] {
  const totals = stats
    .filter((s) => isWithin(s.day, days))
    .reduce(
      (acc, s) => ({
        views: acc.views + s.views,
        /* `carts` est absent des lignes écrites avant son introduction : on
           retombe sur les commandes, ce qui neutralise l'étape plutôt que
           d'afficher un panier vide sous des commandes bien réelles. */
        carts: acc.carts + (s.carts ?? s.orders),
        orders: acc.orders + s.orders,
      }),
      { views: 0, carts: 0, orders: 0 },
    )

  const top = totals.views
  const order: FunnelStage['key'][] = ['views', 'carts', 'orders']
  return order.map((key, i) => {
    const value = totals[key]
    const previous = i === 0 ? value : totals[order[i - 1]]
    return {
      key,
      value,
      shareOfTop: top === 0 ? 0 : value / top,
      keptFromPrevious: previous === 0 ? 0 : value / previous,
    }
  })
}

/* ------------------------------------------------------------
   Performance par emplacement
   ------------------------------------------------------------ */

export interface LocationPerformance {
  locationId: string
  label: string
  orders: number
  revenue: number
  /** Panier moyen — c'est lui qui distingue une table utile d'une table qui tourne. */
  average: number
}

/**
 * Ce que rapporte chaque table, chambre ou box.
 *
 * Le nombre de commandes seul est trompeur : une terrasse qui enchaîne les
 * cafés peut passer devant une salle qui sert des repas complets. Le panier
 * moyen est donc rendu à côté, et non déduit par le lecteur.
 */
export function locationPerformance(
  orders: Order[],
  locations: { id: string; label: string }[],
  days: number,
): LocationPerformance[] {
  const byLocation = new Map<string, { orders: number; revenue: number }>()

  for (const o of orders) {
    /* Les annulées sortent du calcul, comme dans revenueEstimate : une table
       créditée de commandes annulées passerait en tête à tort. */
    if (o.status === 'cancelled') continue
    if (!o.location_id) continue
    if (!isWithin(o.created_at, days)) continue
    const acc = byLocation.get(o.location_id) ?? { orders: 0, revenue: 0 }
    acc.orders += 1
    acc.revenue += o.total_estimate
    byLocation.set(o.location_id, acc)
  }

  return locations
    .map((l) => {
      const acc = byLocation.get(l.id) ?? { orders: 0, revenue: 0 }
      return {
        locationId: l.id,
        label: l.label,
        orders: acc.orders,
        revenue: acc.revenue,
        average: acc.orders === 0 ? 0 : Math.round(acc.revenue / acc.orders),
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

/* ------------------------------------------------------------
   Heures d'affluence
   ------------------------------------------------------------ */

export interface HourBucket {
  hour: number
  /** « 12 h » en français, « 12:00 » en anglais. */
  label: string
  orders: number
  revenue: number
}

/**
 * Répartition des commandes sur les heures de la journée.
 *
 * Sert à décider d'un renfort ou d'une préparation : un pic à 13 h et un
 * second à 20 h ne se gèrent pas avec la même équipe. Les heures sans aucune
 * commande sur toute la période sont retirées — afficher 4 h du matin à zéro
 * écrase visuellement les heures qui comptent.
 */
export function ordersByHour(
  orders: Order[],
  days: number,
  locale: 'fr' | 'en' = 'fr',
): HourBucket[] {
  const buckets = new Map<number, { orders: number; revenue: number }>()

  for (const o of orders) {
    if (o.status === 'cancelled') continue
    if (!isWithin(o.created_at, days)) continue
    /* Heure locale du commerçant : c'est son service qu'il organise, pas UTC. */
    const hour = new Date(o.created_at).getHours()
    const acc = buckets.get(hour) ?? { orders: 0, revenue: 0 }
    acc.orders += 1
    acc.revenue += o.total_estimate
    buckets.set(hour, acc)
  }

  if (buckets.size === 0) return []

  const hours = [...buckets.keys()].sort((a, b) => a - b)
  const first = hours[0]
  const last = hours[hours.length - 1]

  /* Plage continue entre la première et la dernière heure servie : un creux
     interne (l'après-midi d'un restaurant) doit rester visible comme un creux,
     pas être compressé hors du graphique. */
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const hour = first + i
    const acc = buckets.get(hour) ?? { orders: 0, revenue: 0 }
    return {
      hour,
      label: locale === 'en' ? `${String(hour).padStart(2, '0')}:00` : `${hour} h`,
      orders: acc.orders,
      revenue: acc.revenue,
    }
  })
}

/** Heure la plus chargée, pour l'énoncer en clair plutôt que la faire lire. */
export function peakHour(buckets: HourBucket[]): HourBucket | null {
  if (buckets.length === 0) return null
  return buckets.reduce((best, b) => (b.orders > best.orders ? b : best))
}

/**
 * Produits classés par nombre de vues — le versant « attention » du
 * classement, là où `topSellers` classe par commandes.
 *
 * Sert la section « les plus regardés » des analytics et le rapport exporté :
 * un produit très regardé mais peu commandé mérite une meilleure photo ou un
 * autre prix, et ce classement est le seul endroit où cet écart se voit.
 * `carts` (mises au panier) donne l'étape intermédiaire : regardé → ajouté →
 * commandé.
 */
export function mostViewed(
  products: Product[],
  stats: ProductStatsDaily[],
  days = 30,
): { product: Product; views: number; carts: number; orders: number }[] {
  const byProduct = new Map<string, { views: number; carts: number; orders: number }>()
  for (const s of stats) {
    if (!isWithin(s.day, days)) continue
    const acc = byProduct.get(s.product_id) ?? { views: 0, carts: 0, orders: 0 }
    acc.views += s.views
    acc.carts += s.carts
    acc.orders += s.orders
    byProduct.set(s.product_id, acc)
  }
  return products
    .map((product) => ({
      product,
      ...(byProduct.get(product.id) ?? { views: 0, carts: 0, orders: 0 }),
    }))
    .filter((r) => r.views > 0)
    .sort((a, b) => b.views - a.views)
}

/** Meilleures ventes sur la période. */
export function topSellers(
  products: Product[],
  stats: ProductStatsDaily[],
  days = 30,
): { product: Product; orders: number }[] {
  const byProduct = new Map<string, number>()
  for (const s of stats) {
    if (!isWithin(s.day, days)) continue
    byProduct.set(s.product_id, (byProduct.get(s.product_id) ?? 0) + s.orders)
  }
  return products
    .map((product) => ({ product, orders: byProduct.get(product.id) ?? 0 }))
    .filter((r) => r.orders > 0)
    .sort((a, b) => b.orders - a.orders)
}
