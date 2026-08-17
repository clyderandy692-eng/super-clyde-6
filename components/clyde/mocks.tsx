import { cn } from '@/lib/utils'
import {
  BarChart3,
  Bell,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Home,
  LayoutGrid,
  MessageCircle,
  QrCode,
  Search,
  Settings,
  Store,
  Utensils,
} from 'lucide-react'

/* ------------------------------------------------------------------
   Page commerçant (écran mobile) — le livrable CLYDE côté client
------------------------------------------------------------------ */
export function MerchantPage({ className }: { className?: string }) {
  const dishes = [
    { name: 'Poulet DG', price: '4 500', note: 'Le plus commandé' },
    { name: 'Ndolé crevettes', price: '5 200', note: 'Signature' },
    { name: 'Jus de gingembre', price: '1 000', note: '50 cl' },
  ]
  return (
    <div
      className={cn(
        'clyde-mock flex h-full w-full flex-col overflow-hidden bg-background',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <Utensils className="size-3" />
          </span>
          <div className="leading-none">
            <p className="text-[11px] font-bold">Chez Mireille</p>
            <p className="text-[9px] text-muted-foreground">clyde.app/chez-mireille</p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-medium text-muted-foreground">
          Table 12
        </span>
      </div>

      <div className="flex gap-1.5 px-4 py-2.5">
        {['Plats', 'Boissons', 'Desserts'].map((t, i) => (
          <span
            key={t}
            className={cn(
              'rounded-full px-2.5 py-1 text-[9px] font-medium',
              i === 0
                ? 'bg-brand text-brand-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4">
        {dishes.map((d) => (
          <div
            key={d.name}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2"
          >
            <span className="size-9 shrink-0 rounded-md bg-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold">{d.name}</p>
              <p className="text-[9px] text-muted-foreground">{d.note}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold">{d.price}</p>
              <p className="text-[8px] text-muted-foreground">XAF</p>
            </div>
            <span className="flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
              +
            </span>
          </div>
        ))}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-[10px] font-semibold text-background">
          <MessageCircle className="size-3" />
          Commander sur WhatsApp
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Ticket de commande reçu sur WhatsApp
------------------------------------------------------------------ */
export function OrderTicket({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'clyde-mock w-full rounded-xl border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <MessageCircle className="size-3" />
        </span>
        <p className="text-[10px] font-semibold">Nouvelle commande</p>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold">
          Table 12
        </span>
      </div>
      <div className="mt-2.5 flex flex-col gap-1 border-t border-border pt-2">
        {[
          ['2× Poulet DG', '9 000'],
          ['1× Jus gingembre', '1 000'],
        ].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between text-[9px]">
            <span className="text-muted-foreground">{l}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-[10px] font-bold">
          <span>Total</span>
          <span>10 000 XAF</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   Créneaux de réservation
------------------------------------------------------------------ */
export function BookingSlots({ className }: { className?: string }) {
  const slots = ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30']
  return (
    <div
      className={cn(
        'clyde-mock w-full rounded-xl border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <CalendarCheck className="size-3.5 text-brand" />
        <p className="text-[10px] font-semibold">Samedi 14 septembre</p>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {slots.map((s, i) => (
          <span
            key={s}
            className={cn(
              'rounded-md py-1.5 text-center text-[9px] font-medium',
              i === 3
                ? 'bg-brand text-brand-foreground'
                : i === 1 || i === 4
                  ? 'bg-muted text-muted-foreground line-through'
                  : 'border border-border text-foreground',
            )}
          >
            {s}
          </span>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1 text-[9px] text-muted-foreground">
        <Check className="size-3 text-brand" />
        Confirmation envoyée sur WhatsApp
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------
   Donut analytics
------------------------------------------------------------------ */
export function AnalyticsRing({
  value = 74,
  label = 'Vues → commandes',
  className,
}: {
  value?: number
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'clyde-mock w-full rounded-xl border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="size-3.5 text-brand" />
        <p className="text-[10px] font-semibold">Analytics Pro</p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="relative size-16 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(var(--brand) ${value * 3.6}deg, var(--muted) 0deg)`,
          }}
        >
          <span className="absolute inset-[7px] flex items-center justify-center rounded-full bg-card text-[11px] font-bold">
            {value}%
          </span>
        </div>
        <div className="flex-1">
          <p className="text-[9px] text-muted-foreground">{label}</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {[68, 44, 82].map((w, i) => (
              <span key={i} className="block h-1.5 rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${w}%` }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
   QR par emplacement
------------------------------------------------------------------ */
export function QrTile({
  label = 'Chambre 204',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'clyde-mock flex w-full flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-foreground text-background">
        <QrCode className="size-7" />
      </span>
      <p className="text-[10px] font-semibold">{label}</p>
    </div>
  )
}

/* ------------------------------------------------------------------
   Tableau de bord propriétaire (capture large)
------------------------------------------------------------------ */
export function OwnerDashboard({ className }: { className?: string }) {
  const nav = [
    { icon: Home, label: 'Accueil', active: true },
    { icon: LayoutGrid, label: 'Catalogue' },
    { icon: MessageCircle, label: 'Commandes', badge: '7' },
    { icon: CalendarCheck, label: 'Réservations', badge: '3' },
    { icon: QrCode, label: 'Tables & QR' },
    { icon: BarChart3, label: 'Analytics' },
  ]
  const orders = [
    { label: 'Table 12 · 2 plats', pct: 100, state: 'Servi' },
    { label: 'Chambre 204 · room service', pct: 62, state: 'En cuisine' },
    { label: 'À emporter · Awa T.', pct: 30, state: 'Confirmé' },
  ]
  return (
    <div
      className={cn(
        'clyde-mock flex w-full overflow-hidden bg-background text-left',
        className,
      )}
    >
      <aside className="hidden w-40 shrink-0 flex-col gap-3 border-r border-border bg-muted/50 p-3 sm:flex">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-md bg-brand text-[9px] font-black text-brand-foreground">
            C
          </span>
          <p className="text-[11px] font-bold">CLYDE</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-[9px] text-muted-foreground">
          <Store className="size-3" />
          Chez Mireille
        </div>
        <div className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <div
              key={n.label}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-[9px]',
                n.active
                  ? 'bg-card font-semibold shadow-sm'
                  : 'text-muted-foreground',
              )}
            >
              <n.icon className="size-3" />
              {n.label}
              {n.badge ? (
                <span className="ml-auto rounded-full bg-brand px-1.5 text-[8px] font-bold text-brand-foreground">
                  {n.badge}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 text-[9px] text-muted-foreground">
          <Settings className="size-3" />
          Modules
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="flex flex-1 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[9px] text-muted-foreground">
            <Search className="size-3" />
            Rechercher une commande, un produit…
          </div>
          <Bell className="size-3.5 text-muted-foreground" />
          <span className="size-5 rounded-full bg-muted" />
        </div>

        <div className="flex flex-col gap-3 p-3">
          <div>
            <p className="text-[13px] font-bold sm:text-[15px]">
              Bonjour, <span className="text-muted-foreground">Mireille</span>
            </p>
            <p className="text-[9px] text-muted-foreground">
              Samedi 14 septembre · 3 modules actifs
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'Commandes', v: '38', d: '+12%' },
              { k: 'Réservations', v: '14', d: '+5' },
              { k: 'Panier moyen', v: '6 200', d: 'XAF' },
            ].map((s) => (
              <div
                key={s.k}
                className="rounded-lg border border-border bg-card p-2"
              >
                <p className="text-[8px] text-muted-foreground">{s.k}</p>
                <p className="text-[13px] font-bold leading-tight">{s.v}</p>
                <p className="text-[8px] font-medium text-brand">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-border bg-card p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold">Commandes en cours</p>
                <ChevronRight className="size-3 text-muted-foreground" />
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {orders.map((o) => (
                  <div key={o.label} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="truncate font-medium">{o.label}</span>
                      <span className="text-muted-foreground">{o.state}</span>
                    </div>
                    <span className="block h-1.5 rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${o.pct}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-border bg-card p-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3 text-brand" />
                  <p className="text-[10px] font-semibold">Prochain créneau</p>
                </div>
                <p className="mt-1 text-[15px] font-bold leading-none">15:30</p>
                <p className="text-[8px] text-muted-foreground">
                  Table 4 · 6 personnes
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-2.5">
                <p className="text-[9px] text-muted-foreground">
                  Produit le plus vu
                </p>
                <p className="text-[10px] font-semibold">Ndolé crevettes</p>
                <p className="text-[8px] text-brand">2 481 vues · 7,4% conv.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
