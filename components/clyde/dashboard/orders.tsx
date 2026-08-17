'use client'

import { useMemo, useState } from 'react'
import {
  Check,
  Download,
  Inbox,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocale, useT } from '@/lib/clyde/i18n'
import type { Dict } from '@/lib/clyde/i18n'
import { useClyde } from '@/lib/clyde/store'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { foldAccents, relativeTime } from '@/lib/clyde/text'
import {
  buildCartReminderMessage,
  buildOrderReplyMessage,
  normalizePhone,
  whatsappLink,
} from '@/lib/clyde/whatsapp'
import type {
  AbandonedCart,
  Currency,
  Order,
  OrderStatus,
  Product,
} from '@/lib/clyde/types'
import { SectionHeader } from './shell'
import { useOwnerContext } from './use-owner'

/**
 * Les commandes CLYDE se concluent sur WhatsApp : le client commande depuis
 * la page publique, le commerçant le rappelle pour confirmer. Cet écran est
 * donc organisé autour de l'attente du client, pas autour d'un tunnel de
 * paiement.
 */

/* Les couleurs restent statiques ; les libellés viennent du dictionnaire, car
   ils changent avec la langue. */
const STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'bg-primary/10 text-primary',
  whatsapp_opened: 'bg-accent text-accent-foreground',
  confirmed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground line-through decoration-1',
}

/**
 * Onglets de l'écran.
 *
 * « Paniers laissés » n'est pas un statut de commande mais une autre nature
 * d'objet : rien n'a été envoyé. Il vit néanmoins ici, à côté des commandes,
 * parce que c'est le même geste du commerçant — regarder ce qui attend une
 * réponse — et qu'un onglet de plus coûte moins qu'une page de plus.
 */
const FILTER_KEYS: Array<OrderStatus | 'all' | 'abandoned'> = [
  'pending',
  'whatsapp_opened',
  'confirmed',
  'cancelled',
  'all',
  'abandoned',
]

/** Seuil d'abandon : en deçà, le client est probablement encore en train de choisir. */
const ABANDON_DELAY_MS = 30 * 60_000

export function Orders() {
  /* La coquille du tableau de bord garantit un commerce actif avant de
     monter cette section. */
  const { business, locationWord } = useOwnerContext()
  const t = useT()
  const { locale } = useLocale()
  const d = t.dashboard.orders

  /* Libellés d'onglets dans l'ordre voulu, traduits. */
  const filterLabel: Record<OrderStatus | 'all' | 'abandoned', string> = {
    pending: d.filters.pending,
    whatsapp_opened: d.filters.whatsappOpened,
    confirmed: d.filters.confirmed,
    cancelled: d.filters.cancelled,
    all: d.filters.all,
    abandoned: d.abandoned.tab,
  }
  const allOrders = useClyde((s) => s.orders)
  const allItems = useClyde((s) => s.orderItems)
  const allProducts = useClyde((s) => s.products)
  const allLocations = useClyde((s) => s.locations)
  const setOrderStatus = useClyde((s) => s.setOrderStatus)
  const allAbandoned = useClyde((s) => s.abandonedCarts)
  const markCartReminded = useClyde((s) => s.markCartReminded)
  const dismissAbandonedCart = useClyde((s) => s.dismissAbandonedCart)

  const [filter, setFilter] = useState<OrderStatus | 'all' | 'abandoned'>(
    'pending',
  )

  const orders = useMemo(() => {
    if (!business) return []
    return allOrders
      .filter((o) => o.business_id === business.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [allOrders, business])

  /**
   * Paniers à relancer.
   *
   * Le seuil de 30 minutes écarte le client encore en train de choisir : le
   * relancer pendant qu'il hésite serait intrusif et contre-productif. Les
   * paniers récupérés restent visibles, en bas et grisés, pour que le
   * commerçant voie que ses relances aboutissent.
   */
  const abandoned = useMemo(() => {
    if (!business) return []
    const cutoff = Date.now() - ABANDON_DELAY_MS
    return allAbandoned
      .filter(
        (c) =>
          c.business_id === business.id &&
          c.lines.length > 0 &&
          new Date(c.created_at).getTime() <= cutoff,
      )
      .sort((a, b) => {
        /* Ce qui attend une action d'abord, l'historique ensuite. */
        if (!a.recovered_at !== !b.recovered_at) return a.recovered_at ? 1 : -1
        return b.created_at.localeCompare(a.created_at)
      })
  }, [allAbandoned, business])

  /* Un compteur par statut : le commerçant voit d'un coup d'œil ce qui
     l'attend, sans avoir à ouvrir chaque onglet. */
  const counts = useMemo(() => {
    const base: Record<string, number> = { all: orders.length }
    for (const o of orders) base[o.status] = (base[o.status] ?? 0) + 1
    /* Le compteur ne montre que les paniers encore à relancer : compter les
       récupérés gonflerait un chiffre qui ne demande plus rien. */
    base.abandoned = abandoned.filter((c) => !c.recovered_at).length
    return base
  }, [orders, abandoned])

  const visible = useMemo(
    () =>
      filter === 'all' || filter === 'abandoned'
        ? orders
        : orders.filter((o) => o.status === filter),
    [orders, filter],
  )

  /* Statut en clair dans le fichier : « confirmed » ne veut rien dire pour
     quelqu'un qui relit ses ventes dans un tableur. */
  const statusLabelFor = (status: OrderStatus) => filterLabel[status]

  /**
   * Export des commandes.
   *
   * Une ligne par commande, articles regroupés dans une seule cellule : le
   * commerçant veut relire son chiffre d'affaires, pas reconstituer une base
   * relationnelle. Le fichier suit l'onglet affiché, pour que « exporter »
   * corresponde à ce qui est sous les yeux.
   */
  async function handleExportOrders() {
    if (!business) return
    if (visible.length === 0) {
      toast.error(t.dashboard.common.share.exportEmpty)
      return
    }

    const { buildCsv, downloadCsv, safeFilename, todayStamp } = await import(
      '@/lib/clyde/export'
    )
    const h = t.dashboard.common.share.csvOrders

    const rows = visible.map((o) => {
      const items = allItems
        .filter((it) => it.order_id === o.id)
        .map((it) => {
          const name =
            allProducts.find((p) => p.id === it.product_id)?.name ??
            d.removedItem
          return `${it.quantity}x ${name}`
        })
        .join(' · ')

      return [
        /* Date lisible dans la langue du commerçant, pas un horodatage ISO. */
        new Date(o.created_at).toLocaleString(locale),
        o.customer_name,
        o.customer_phone,
        allLocations.find((l) => l.id === o.location_id)?.label ?? '',
        items,
        /* Montant brut, sans symbole : une colonne calculable dans le tableur.
           Formaté, il deviendrait du texte et les totaux seraient impossibles. */
        o.total_estimate,
        statusLabelFor(o.status),
      ]
    })

    downloadCsv(
      buildCsv(
        [h.date, h.customer, h.phone, h.location, h.items, h.total, h.status],
        rows,
      ),
      `${safeFilename(d.title, business.slug)}-${todayStamp()}.csv`,
    )
    toast.success(t.dashboard.common.share.exportDone(rows.length))
  }

  /**
   * Export des clients.
   *
   * Il n'y a pas de fichier client dans CLYDE : la clientèle se déduit des
   * commandes, regroupées par numéro WhatsApp. C'est le numéro qui identifie
   * une personne ici, un même client pouvant écrire son nom différemment
   * d'une fois à l'autre.
   */
  async function handleExportCustomers() {
    if (!business) return

    const byPhone = new Map<
      string,
      { name: string; phone: string; orders: number; spent: number; last: string }
    >()

    for (const o of orders) {
      const key = normalizePhone(o.customer_phone)
      /* Une commande sans numéro ne désigne personne de joignable : elle
         compte dans le chiffre d'affaires, pas dans le fichier clients. */
      if (!key) continue
      const entry = byPhone.get(key)
      if (entry) {
        entry.orders += 1
        entry.spent += o.total_estimate
        /* On garde la commande la plus récente comme dernière trace. */
        if (o.created_at > entry.last) {
          entry.last = o.created_at
          entry.name = o.customer_name
        }
      } else {
        byPhone.set(key, {
          name: o.customer_name,
          phone: o.customer_phone,
          orders: 1,
          spent: o.total_estimate,
          last: o.created_at,
        })
      }
    }

    /* Les meilleurs clients en tête : c'est l'ordre dans lequel on lit ce
       fichier quand on cherche qui remercier ou relancer. */
    const list = [...byPhone.values()].sort((a, b) => b.spent - a.spent)

    if (list.length === 0) {
      toast.error(t.dashboard.common.share.exportEmpty)
      return
    }

    const { buildCsv, downloadCsv, safeFilename, todayStamp } = await import(
      '@/lib/clyde/export'
    )
    const h = t.dashboard.common.share.csvCustomers

    downloadCsv(
      buildCsv(
        [h.name, h.phone, h.orders, h.spent, h.last],
        list.map((c) => [
          c.name,
          c.phone,
          c.orders,
          c.spent,
          new Date(c.last).toLocaleDateString(locale),
        ]),
      ),
      `${safeFilename(t.dashboard.common.share.exportCustomers, business.slug)}-${todayStamp()}.csv`,
    )
    toast.success(t.dashboard.common.share.exportDone(list.length))
  }

  if (!business) return null

  const pending = counts.pending ?? 0

  return (
    <div>
      <SectionHeader
        title={d.title}
        description={pending > 0 ? d.pendingCount(pending) : d.allClear}
      />

      {/* Les données sont au commerçant : il doit pouvoir les sortir pour sa
          comptabilité sans nous le demander. Deux boutons discrets, en
          secondaire — c'est un geste occasionnel, pas l'action principale. */}
      <div className="flex flex-wrap gap-2 pb-5">
        <Button variant="outline" size="sm" onClick={handleExportOrders}>
          <Download className="size-4" aria-hidden="true" />
          {t.dashboard.common.share.exportOrders}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCustomers}>
          <Download className="size-4" aria-hidden="true" />
          {t.dashboard.common.share.exportCustomers}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pb-6" role="tablist">
        {FILTER_KEYS.map((key) => {
          const count = counts[key] ?? 0
          const active = filter === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {filterLabel[key]}
              <span
                className={cn(
                  'text-xs tabular-nums',
                  active ? 'opacity-70' : 'opacity-60',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filter === 'abandoned' ? (
        <AbandonedList
          carts={abandoned}
          products={allProducts}
          currency={business.currency}
          whatsappNumber={business.whatsapp_number}
          locale={locale}
          labels={d.abandoned}
          onRemind={markCartReminded}
          onDismiss={(id) => {
            dismissAbandonedCart(id)
            toast.success(d.abandoned.dismissed)
          }}
        />
      ) : visible.length === 0 ? (
        <EmptyState hasAny={orders.length > 0} labels={d} />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((order) => {
            const lines = allItems
              .filter((it) => it.order_id === order.id)
              .map((it) => ({
                quantity: it.quantity,
                note: it.note,
                name:
                  allProducts.find((p) => p.id === it.product_id)?.name ??
                  d.removedItem,
              }))

            const location = order.location_id
              ? (allLocations.find((l) => l.id === order.location_id) ?? null)
              : null

            return (
              <li key={order.id}>
                <OrderCard
                  order={order}
                  lines={lines}
                  locationLabel={location?.label ?? null}
                  locationWord={locationWord}
                  lang={locale}
                  labels={d}
                  currency={business.currency}
                  onStatus={(status, message) => {
                    setOrderStatus(order.id, status)
                    toast.success(message)
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------------------------------
   Paniers laissés en route
   ------------------------------------------------------------ */

/**
 * Liste des paniers à relancer, un bouton WhatsApp par ligne.
 *
 * Le geste tient en un appui : le message part prérempli avec le détail exact
 * du panier, pour que le client n'ait rien à resaisir. C'est cette absence de
 * frottement qui fait la différence entre une relance faite et une relance
 * remise à plus tard.
 */
function AbandonedList({
  carts,
  products,
  currency,
  whatsappNumber,
  locale,
  labels,
  onRemind,
  onDismiss,
}: {
  carts: AbandonedCart[]
  products: Product[]
  currency: Currency
  whatsappNumber: string
  locale: 'fr' | 'en'
  labels: Dict['dashboard']['orders']['abandoned']
  onRemind: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const recoveredCount = carts.filter((c) => c.recovered_at).length

  if (carts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <ShoppingBag
          className="mx-auto size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="pt-3 text-sm font-medium">{labels.empty}</p>
        <p className="mx-auto max-w-sm pt-1 text-sm leading-relaxed text-muted-foreground">
          {labels.emptyHint}
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
        {labels.body}
      </p>

      <ul className="flex flex-col gap-3">
        {carts.map((cart) => {
          const lines = cart.lines
            .map((l) => ({
              quantity: l.quantity,
              product: products.find((p) => p.id === l.productId) ?? null,
            }))
            .filter((l) => l.product)

          /* Le message est reconstruit à l'ouverture, pas stocké : si un prix a
             changé depuis l'abandon, la relance annonce le prix courant. */
          const href = whatsappLink(
            whatsappNumber,
            buildCartReminderMessage({
              customerName: cart.customer_name,
              lines: cart.lines,
              products,
              currency,
              locale,
            }),
          )

          return (
            <li
              key={cart.id}
              className={cn(
                'rounded-2xl border border-border bg-background p-4',
                /* Un panier récupéré n'attend plus rien : il s'efface
                   visuellement sans disparaître, comme trace du résultat. */
                cart.recovered_at && 'opacity-60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{cart.customer_name}</p>
                  <p className="pt-0.5 text-xs text-muted-foreground">
                    {relativeTime(cart.created_at, undefined, locale)}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatPrice(cart.total_estimate, currency)}
                </p>
              </div>

              <ul className="pt-3 text-sm text-muted-foreground">
                {lines.map((l, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="tabular-nums">{l.quantity}x</span>
                    <span className="min-w-0 truncate">{l.product!.name}</span>
                  </li>
                ))}
              </ul>

              {cart.recovered_at ? (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-500">
                  <Check className="size-4 shrink-0" aria-hidden="true" />
                  {labels.recovered}
                </p>
              ) : (
                /* Colonne sur mobile : deux boutons côte à côte à 416 px
                   réduiraient chaque cible sous le confortable. */
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    className="w-full sm:flex-1"
                    nativeButton={false}
                    render={
                      <a href={href} target="_blank" rel="noopener noreferrer" />
                    }
                    onClick={() => {
                      onRemind(cart.id)
                      toast.success(labels.opened)
                    }}
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    {cart.reminded_at ? labels.remindAgain : labels.remind}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground sm:w-auto"
                    onClick={() => onDismiss(cart.id)}
                  >
                    {labels.dismiss}
                  </Button>
                </div>
              )}

              {cart.reminded_at && !cart.recovered_at && (
                <p className="pt-2 text-xs text-muted-foreground">
                  {labels.reminded(
                    relativeTime(cart.reminded_at, undefined, locale),
                  )}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      {recoveredCount > 0 && (
        <p className="pt-4 text-sm text-muted-foreground">
          {labels.recoveredCount(recoveredCount)}
        </p>
      )}
    </div>
  )
}

function OrderCard({
  order,
  lines,
  locationLabel,
  locationWord,
  lang,
  labels,
  currency,
  onStatus,
}: {
  order: Order
  lines: Array<{ name: string; quantity: number; note: string | null }>
  locationLabel: string | null
  locationWord: string
  lang: 'fr' | 'en'
  labels: Dict['dashboard']['orders']
  currency: Currency
  onStatus: (status: OrderStatus, message: string) => void
}) {
  const statusLabel: Record<OrderStatus, string> = {
    pending: labels.status.pending,
    whatsapp_opened: labels.status.whatsappOpened,
    confirmed: labels.status.confirmed,
    cancelled: labels.status.cancelled,
  }
  const open = order.status === 'pending' || order.status === 'whatsapp_opened'

  /* Message pré-rempli : le commerçant n'a plus qu'à envoyer. Le récapitulatif
     évite l'aller-retour « c'était quoi votre commande ? ». */
  const recap = lines.map((l) => `${l.quantity}x ${l.name}`).join(', ')
  const waHref = whatsappLink(
    order.customer_phone,
    buildOrderReplyMessage({
      customerName: order.customer_name,
      recap,
      locale: lang,
    }),
  )

  return (
    <article className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-medium">{order.customer_name}</h2>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                STATUS_TONE[order.status],
              )}
            >
              {statusLabel[order.status]}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {order.customer_phone}
            </span>
            <span>{relativeTime(order.created_at, undefined, lang)}</span>
            {locationLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {/* Les libellés saisis contiennent souvent déjà le mot métier
                    (« Table 3 ») : on évite alors « Table Table 3 ». */}
                {foldAccents(locationLabel).includes(foldAccents(locationWord))
                  ? locationLabel
                  : `${locationWord} ${locationLabel}`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <ShoppingBag className="size-3.5 shrink-0" aria-hidden />
                {labels.onlineChannel}
              </span>
            )}
          </p>
        </div>
        <p className="text-lg font-semibold tabular-nums">
          {formatPrice(order.total_estimate, currency)}
        </p>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-8 shrink-0 tabular-nums text-muted-foreground">
              {line.quantity}x
            </span>
            <span className="min-w-0">
              {line.name}
              {line.note && (
                <span className="text-muted-foreground"> — {line.note}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {order.note}
        </p>
      )}

      {open && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            onClick={() => {
              /* Ouvrir la discussion vaut trace : le statut avance seul,
                 sinon le commerçant devrait le faire à la main. */
              if (order.status === 'pending') {
                onStatus(
                  'whatsapp_opened',
                  labels.contacted(order.customer_name),
                )
              }
            }}
          >
            <MessageCircle className="size-4" aria-hidden />
            {labels.replyWhatsapp}
          </a>
          <Button
            size="sm"
            onClick={() =>
              onStatus('confirmed', labels.confirmedToast(order.customer_name))
            }
          >
            <Check className="size-4" aria-hidden />
            {labels.confirm}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() =>
              onStatus('cancelled', labels.cancelledToast(order.customer_name))
            }
          >
            <X className="size-4" aria-hidden />
            {labels.cancel}
          </Button>
        </div>
      )}
    </article>
  )
}

function EmptyState({
  hasAny,
  labels,
}: {
  hasAny: boolean
  labels: Dict['dashboard']['orders']
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden />
      <p className="mt-4 font-medium">
        {hasAny ? labels.emptyFiltered : labels.emptyNone}
      </p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {hasAny
          ? labels.emptyFilteredBody
          : labels.emptyNoneBody}
      </p>
    </div>
  )
}
