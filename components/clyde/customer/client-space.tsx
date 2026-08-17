'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock3,
  Heart,
  LogOut,
  MapPin,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react'
import {
  DEMO_BOOKINGS,
  DEMO_BUSINESSES,
  DEMO_FOLLOWERS,
  DEMO_ORDER_ITEMS,
  DEMO_ORDERS,
  DEMO_PRODUCTS,
  DEMO_USERS,
} from '@/lib/clyde/demo-data'
import { Backdrop } from '@/components/clyde/backdrop'
import { DataRights } from '@/components/clyde/customer/data-rights'
import type { BookingStatus, OrderStatus, Product } from '@/lib/clyde/types'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { useSession } from '@/lib/clyde/store'
import { cn } from '@/lib/utils'

/** Client de repli quand personne n'est connecté (visite en mode démo). */
const FALLBACK_CUSTOMER = DEMO_USERS.find((user) => user.role === 'customer') ?? DEMO_USERS[0]

const orderLabels: Record<OrderStatus, string> = {
  pending: 'En attente',
  whatsapp_opened: 'WhatsApp ouvert',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
}

const bookingLabels: Record<BookingStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
}

function dateLabel(value: string, withTime = false) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

function statusClass(status: OrderStatus | BookingStatus) {
  if (status === 'confirmed' || status === 'completed') {
    return 'bg-emerald-500/10 text-emerald-700'
  }
  if (status === 'cancelled') return 'bg-destructive/10 text-destructive'
  return 'bg-amber-500/10 text-amber-700'
}

function productImage(product: Product) {
  return product.media_urls[0] || '/placeholder.svg?height=320&width=480'
}

export function ClientSpace() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'bookings' | 'favorites' | 'follows'>('overview')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(() => new Set(DEMO_PRODUCTS.slice(0, 4).map((product) => product.id)))

  /* L'espace reflète le compte connecté : Karl voit SES commandes, pas
     celles d'Awa. Sans session (démo), on retombe sur le premier client. */
  const sessionUserId = useSession((s) => s.userId)
  const signOut = useSession((s) => s.signOut)
  const router = useRouter()

  /* Sortie du compte. L'espace client n'offrait aucune issue : un visiteur
     connecté ne pouvait pas revenir en arrière pour entrer sur un autre
     compte. On le repose sur l'accueil public, où « Connexion » est visible. */
  function leaveAccount() {
    signOut()
    router.push('/')
  }

  const customer = useMemo(
    () => DEMO_USERS.find((u) => u.id === sessionUserId && u.role === 'customer') ?? FALLBACK_CUSTOMER,
    [sessionUserId],
  )
  const customerId = customer.id

  const orders = useMemo(
    () => DEMO_ORDERS.filter((order) => order.customer_id === customerId),
    [customerId],
  )
  const bookings = useMemo(
    () => DEMO_BOOKINGS.filter((booking) => booking.customer_id === customerId),
    [customerId],
  )
  /* Boutiques que le client suit : la liste vit dans les données de suivi
     (followers), pas dans les favoris produits — deux notions différentes. */
  const followedShops = useMemo(() => {
    const ids = new Set(
      DEMO_FOLLOWERS.filter((f) => f.user_id === customerId).map((f) => f.business_id),
    )
    return DEMO_BUSINESSES.filter((b) => ids.has(b.id))
  }, [customerId])
  const favoriteProducts = useMemo(
    () => DEMO_PRODUCTS.filter((product) => favorites.has(product.id)),
    [favorites],
  )
  const searchableFavorites = favoriteProducts.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()),
  )
  const upcomingBooking = bookings.find((booking) => booking.status === 'confirmed') ?? bookings[0]
  const upcomingService = DEMO_PRODUCTS.find((product) => product.id === upcomingBooking?.service_id)
  const upcomingBusiness = DEMO_BUSINESSES.find((business) => business.id === upcomingBooking?.business_id)

  function toggleFavorite(productId: string) {
    setFavorites((current) => {
      const next = new Set(current)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const tabs = [
    { id: 'overview' as const, label: 'Vue d’ensemble', icon: Sparkles },
    { id: 'orders' as const, label: 'Mes commandes', icon: ShoppingBag },
    { id: 'bookings' as const, label: 'Réservations', icon: CalendarDays },
    { id: 'favorites' as const, label: 'Favoris', icon: Heart },
    { id: 'follows' as const, label: 'Mes boutiques', icon: Store },
  ]

  return (
    <main className="relative min-h-dvh bg-background text-foreground">
      {/* Registre : un client vient ici relire ses commandes et ses
          réservations, c'est un relevé de compte. */}
      <Backdrop pattern="ledger" />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 md:px-8 lg:flex-row lg:py-10">
        <aside className="lg:w-64 lg:shrink-0">
          <div className="flex items-center justify-between gap-3 lg:block">
            <Link href="/marketplace" className="font-mono text-sm font-bold tracking-[0.18em] text-brand uppercase">
              CLYDE
            </Link>
            <div className="flex items-center gap-1 lg:mt-8 lg:block">
              <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground lg:block">
                <span className="hidden sm:inline">Explorer les commerces</span>
                <span className="sm:hidden">Explorer</span>
              </Link>
              {/* La carte de profil qui porte la déconnexion est réservée à
                  l'ordinateur (`hidden lg:block`) : sur téléphone, la sortie
                  serait introuvable sans ce bouton dans l'en-tête. */}
              <button
                type="button"
                onClick={leaveAccount}
                aria-label="Se déconnecter"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive lg:hidden"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-8 hidden rounded-3xl border border-border bg-card p-5 lg:block">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-4 text-lg font-semibold">{customer.name ?? 'Mon espace'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{customer.neighborhood ?? 'Yaoundé'}</p>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="size-3.5" aria-hidden="true" />
              {orders.filter((o) => o.status === 'pending').length + bookings.filter((b) => b.status === 'pending').length} en attente
            </div>
            {/* La sortie vit sous l'identité : c'est là qu'on cherche à quitter
                un compte, comme dans le tableau de bord commerçant. */}
            <button
              type="button"
              onClick={leaveAccount}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Se déconnecter
            </button>
          </div>

          {/* Sur ordinateur : liste latérale. Sur mobile, la navigation vit
              dans la barre du bas — même modèle que le reste de la plateforme. */}
          <nav className="mt-6 hidden lg:block lg:space-y-1" aria-label="Espace client">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-colors lg:w-full',
                  activeTab === id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                aria-current={activeTab === id ? 'page' : undefined}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-brand uppercase">Espace client</p>
              <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Bonjour {customer.name?.split(' ')[0] ?? 'Awa'}.
              </h1>
              <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
                Retrouvez vos commandes, vos réservations et les commerces que vous aimez.
              </p>
            </div>
            <Link href="/marketplace" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-transform hover:-translate-y-0.5">
              Explorer la marketplace
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </header>

          {activeTab === 'overview' ? (
            <div className="mt-8 space-y-8">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Commandes', value: orders.length, icon: ShoppingBag },
                  { label: 'Réservations', value: bookings.length, icon: CalendarDays },
                  { label: 'Favoris', value: favorites.size, icon: Heart },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-3xl border border-border bg-card p-5">
                    <Icon className="size-4 text-brand" aria-hidden="true" />
                    <p className="mt-5 text-3xl font-bold tracking-tight">{value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {upcomingBooking ? (
                <article className="overflow-hidden rounded-3xl border border-border bg-foreground text-background">
                  <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-background/60">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        Prochaine réservation
                      </div>
                      <h2 className="mt-3 text-2xl font-bold">{upcomingService?.name ?? 'Votre rendez-vous'}</h2>
                      <p className="mt-2 text-sm text-background/65">{upcomingBusiness?.name ?? 'Commerce'} · {dateLabel(upcomingBooking.start_at, true)}</p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-background/10 px-4 py-3 text-sm">
                      <Clock3 className="size-4 text-brand" aria-hidden="true" />
                      {upcomingBooking.duration_minutes} min
                    </div>
                  </div>
                </article>
              ) : null}

              <section>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Activité récente</h2>
                  <button type="button" onClick={() => setActiveTab('orders')} className="text-sm font-semibold text-brand">Tout voir</button>
                </div>
                <div className="mt-4 divide-y divide-border rounded-3xl border border-border bg-card">
                  {orders.slice(0, 3).map((order) => {
                    const business = DEMO_BUSINESSES.find((item) => item.id === order.business_id)
                    return (
                      <div key={order.id} className="flex items-center justify-between gap-4 p-4 sm:p-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><PackageCheck className="size-4" aria-hidden="true" /></div>
                          <div className="min-w-0"><p className="truncate text-sm font-semibold">{business?.name ?? 'Commande'}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(order.created_at)} · {formatPrice(order.total_estimate, business?.currency ?? 'XAF')}</p></div>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', statusClass(order.status))}>{orderLabels[order.status]}</span>
                      </div>
                    )
                  })}
                </div>
              </section>

              <FavoriteSection products={favoriteProducts.slice(0, 3)} onToggle={toggleFavorite} onSeeAll={() => setActiveTab('favorites')} />
            </div>
          ) : activeTab === 'orders' ? (
            <OrdersPanel orders={orders} />
          ) : activeTab === 'bookings' ? (
            <BookingsPanel bookings={bookings} />
          ) : activeTab === 'follows' ? (
            /* Les droits sur les données vivent sous les abonnements : c'est là
               que le visiteur voit à qui il a consenti, donc là qu'il doit
               pouvoir revenir sur ce consentement. */
            <>
              <FollowsPanel shops={followedShops} />
              <DataRights />
            </>
          ) : (
            <section className="mt-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-bold">Vos favoris</h2><p className="mt-1 text-sm text-muted-foreground">Les produits et services à retrouver rapidement.</p></div><label className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm"><Search className="size-4 text-muted-foreground" aria-hidden="true" /><span className="sr-only">Rechercher dans vos favoris</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher" className="w-28 bg-transparent outline-none placeholder:text-muted-foreground" /></label></div>
              <FavoriteGrid products={searchableFavorites} onToggle={toggleFavorite} />
            </section>
          )}
        </section>
      </div>

      {/* Menu mobile adapté au profil client : ses commandes, réservations,
          favoris et boutiques suivies — pas les outils d'un commerçant. */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-[1.6rem] border border-border bg-background/95 px-1 py-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] shadow-[0_16px_40px_-18px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden"
        aria-label="Navigation espace client"
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          const shortLabel =
            id === 'overview' ? 'Accueil' : id === 'orders' ? 'Commandes' : id === 'bookings' ? 'Agenda' : id === 'favorites' ? 'Favoris' : 'Boutiques'
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] font-semibold transition-transform active:scale-95"
            >
              <span className={cn('flex size-9 items-center justify-center rounded-full', active ? 'bg-brand/10 text-brand' : 'text-muted-foreground')}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className={cn('truncate', active ? 'text-brand' : 'text-muted-foreground')}>{shortLabel}</span>
            </button>
          )
        })}
      </nav>
      {/* Réserve de place pour que la barre ne recouvre pas le contenu. */}
      <div className="h-24 lg:hidden" aria-hidden="true" />
    </main>
  )
}

function FavoriteSection({ products, onToggle, onSeeAll }: { products: Product[]; onToggle: (id: string) => void; onSeeAll: () => void }) {
  return <section><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Vos favoris</h2><button type="button" onClick={onSeeAll} className="text-sm font-semibold text-brand">Voir tout</button></div><FavoriteGrid products={products} onToggle={onToggle} compact /></section>
}

function FavoriteGrid({ products, onToggle, compact = false }: { products: Product[]; onToggle: (id: string) => void; compact?: boolean }) {
  return <div className={cn('mt-4 grid gap-3 sm:grid-cols-2', compact ? 'lg:grid-cols-3' : 'lg:grid-cols-3')}>{products.map((product) => <article key={product.id} className="group overflow-hidden rounded-3xl border border-border bg-card"><div className="relative aspect-[1.45] overflow-hidden bg-muted"><img src={productImage(product) || "/placeholder.svg"} alt={product.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" /><button type="button" onClick={() => onToggle(product.id)} aria-label={`Retirer ${product.name} des favoris`} className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-brand shadow-sm"><Heart className="size-4 fill-current" aria-hidden="true" /></button></div><div className="p-4"><p className="line-clamp-1 font-semibold">{product.name}</p><p className="mt-1 text-sm text-muted-foreground">{formatPrice(product.price, 'XAF')}</p></div></article>)}</div>
}

function FollowsPanel({ shops }: { shops: typeof DEMO_BUSINESSES }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold">Mes boutiques</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Les commerces que vous suivez — leurs nouveautés vous attendent.
      </p>
      {shops.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/r/${shop.slug}`}
              className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 transition-colors hover:border-brand/50"
            >
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand text-sm font-bold text-brand-foreground">
                {shop.logo_url ? (
                  <img src={shop.logo_url || '/placeholder.svg'} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  shop.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{shop.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{shop.city ?? 'Cameroun'}</span>
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-3xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Vous ne suivez encore aucune boutique. Explorez la marketplace pour en découvrir.
        </p>
      )}
    </section>
  )
}

function OrdersPanel({ orders }: { orders: typeof DEMO_ORDERS }) {
  return <section className="mt-8"><h2 className="text-2xl font-bold">Mes commandes</h2><p className="mt-1 text-sm text-muted-foreground">Suivez vos dernières commandes chez les commerces CLYDE.</p><div className="mt-5 space-y-3">{orders.map((order) => { const business = DEMO_BUSINESSES.find((item) => item.id === order.business_id); const items = DEMO_ORDER_ITEMS.filter((item) => item.order_id === order.id); return <article key={order.id} className="rounded-3xl border border-border bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{business?.name ?? 'Commande'}</p><p className="mt-1 text-sm text-muted-foreground">{dateLabel(order.created_at)} · {items.length} article{items.length > 1 ? 's' : ''}</p></div><div className="flex items-center gap-3"><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', statusClass(order.status))}>{orderLabels[order.status]}</span><span className="font-semibold">{formatPrice(order.total_estimate, business?.currency ?? 'XAF')}</span></div></div></article> })}</div></section>
}

function BookingsPanel({ bookings }: { bookings: typeof DEMO_BOOKINGS }) {
  return <section className="mt-8"><h2 className="text-2xl font-bold">Mes réservations</h2><p className="mt-1 text-sm text-muted-foreground">Vos créneaux confirmés et vos demandes en cours.</p><div className="mt-5 space-y-3">{bookings.map((booking) => { const service = DEMO_PRODUCTS.find((product) => product.id === booking.service_id); const business = DEMO_BUSINESSES.find((item) => item.id === booking.business_id); return <article key={booking.id} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><CalendarDays className="size-5" aria-hidden="true" /></div><div><p className="font-semibold">{service?.name ?? 'Réservation'}</p><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />{business?.name ?? 'Commerce'} · {dateLabel(booking.start_at, true)}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', statusClass(booking.status))}>{bookingLabels[booking.status]}</span><span className="text-sm font-semibold">{formatPrice(booking.total_estimate ?? 0, business?.currency ?? 'XAF')}</span></div></article> })}</div></section>
}
