'use client'

import { useMemo, useState } from 'react'
import {
  CalendarClock,
  Check,
  Clock,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useClyde } from '@/lib/clyde/store'
import { type Dict, type Locale, useLocale, useT } from '@/lib/clyde/i18n'
import { relativeTime } from '@/lib/clyde/text'
import {
  buildBookingReplyMessage,
  whatsappLink,
} from '@/lib/clyde/whatsapp'
import type { AvailabilityRule, Booking, BookingStatus } from '@/lib/clyde/types'
import { EmptyState, SectionHeader } from './shell'
import { useOwnerContext } from './use-owner'

/**
 * Les réservations CLYDE se confirment à la main : le client demande un
 * créneau depuis la page publique, le commerçant valide. L'écran est donc
 * trié par heure de passage — ce qui arrive le plus tôt d'abord — et non par
 * date de création comme les commandes.
 */

/* Seule la teinte est figée ici : le libellé de statut vient du dict. */
const STATUS_TONE: Record<BookingStatus, string> = {
  pending: 'bg-primary/10 text-primary',
  confirmed: 'bg-accent text-accent-foreground',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground line-through decoration-1',
}

/* `as const` : les onglets ne couvrent pas tous les statuts (« confirmed »
   vit dans « À venir »), le type doit donc rester la liste exacte. */
const FILTER_KEYS = [
  'pending',
  'upcoming',
  'completed',
  'cancelled',
  'all',
] as const satisfies ReadonlyArray<'upcoming' | BookingStatus | 'all'>

/**
 * Créneaux d'ouverture, par demi-heure.
 *
 * On préfère une liste à `<input type="time">` : ce dernier suit la locale du
 * navigateur et affiche « 06:00 PM » sur un appareil configuré en anglais,
 * alors qu'au Cameroun les horaires s'écrivent en 24 heures. Une liste fixe
 * garantit le même affichage pour tous.
 */
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, '0')
  return `${hour}:${i % 2 === 0 ? '00' : '30'}`
})

/**
 * Options d'un menu horaire, en gardant la valeur enregistrée.
 *
 * Un `<select>` dont la valeur courante manque à la liste s'affiche vide et
 * l'écraserait au premier changement : un horaire comme « 08:15 » doit donc
 * rester proposé même s'il ne tombe pas sur une demi-heure.
 */
function hourOptions(current: string): string[] {
  return HALF_HOURS.includes(current)
    ? HALF_HOURS
    : [...HALF_HOURS, current].sort()
}

/** Début de journée local : on compare des jours, pas des instants. */
function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/**
 * En-tête de groupe : « Aujourd'hui » parle plus vite qu'une date, mais
 * au-delà de demain la date reste la seule information utile.
 */
function dayHeading(
  iso: string,
  now: Date,
  labels: Dict['dashboard']['bookings'],
  lang: Locale,
): string {
  const day = startOfDay(new Date(iso))
  const today = startOfDay(now)
  const diff = Math.round(
    (day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  )

  if (diff === 0) return labels.today
  if (diff === 1) return labels.tomorrow
  if (diff === -1) return labels.yesterday

  return day.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Heures en 24 h dans les deux langues : `hour12: false` rend la règle
 * explicite au lieu de la faire dépendre de la locale passée.
 */
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function Bookings() {
  const { business } = useOwnerContext()
  const t = useT()
  const { locale } = useLocale()
  const d = t.dashboard.bookings
  const filterLabel: Record<(typeof FILTER_KEYS)[number], string> = {
    pending: d.filters.pending,
    upcoming: d.filters.upcoming,
    completed: d.filters.completed,
    cancelled: d.filters.cancelled,
    all: d.filters.all,
  }
  const allBookings = useClyde((s) => s.bookings)
  const allProducts = useClyde((s) => s.products)
  const allAvailability = useClyde((s) => s.availability)
  const setBookingStatus = useClyde((s) => s.setBookingStatus)

  /* On ouvre sur les demandes à confirmer quand il y en a — c'est le seul
     onglet qui appelle une action. Sinon « À venir », pour ne pas accueillir
     le commerçant par une liste vide. */
  const [filter, setFilter] = useState<'upcoming' | BookingStatus | 'all' | null>(
    null,
  )

  /* L'heure du rendu sert de référence pour « à venir » et pour les
     en-têtes de jour. Figée le temps d'un rendu, elle évite qu'une même
     liste se classe différemment d'une ligne à l'autre. */
  const now = useMemo(() => new Date(), [])

  const bookings = useMemo(() => {
    if (!business) return []
    return allBookings
      .filter((b) => b.business_id === business.id)
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
  }, [allBookings, business])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: bookings.length }
    for (const b of bookings) base[b.status] = (base[b.status] ?? 0) + 1
    base.upcoming = bookings.filter(
      (b) =>
        new Date(b.start_at) >= now &&
        (b.status === 'pending' || b.status === 'confirmed'),
    ).length
    return base
  }, [bookings, now])

  /* Tant que le commerçant n'a rien choisi, l'onglet dépend de ce qui
     l'attend réellement. */
  const filterOrDefault =
    filter ?? ((counts.pending ?? 0) > 0 ? 'pending' : 'upcoming')

  const visible = useMemo(() => {
    if (filterOrDefault === 'all') return bookings
    if (filterOrDefault === 'upcoming') {
      return bookings.filter(
        (b) =>
          new Date(b.start_at) >= now &&
          (b.status === 'pending' || b.status === 'confirmed'),
      )
    }
    return bookings.filter((b) => b.status === filterOrDefault)
  }, [bookings, filterOrDefault, now])

  /* Regroupement par journée : un agenda se lit par jour, pas en liste plate. */
  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of visible) {
      const key = dayHeading(b.start_at, now, d, locale)
      const list = map.get(key)
      if (list) list.push(b)
      else map.set(key, [b])
    }
    return [...map.entries()]
  }, [visible, now, d, locale])

  if (!business) return null

  const rules = allAvailability.filter((r) => r.business_id === business.id)
  const pending = counts.pending ?? 0

  return (
    <div>
      <SectionHeader
        title={d.title}
        description={
          pending > 0
            ? pending > 1
              ? d.pendingMany(pending)
              : d.pendingOne(pending)
            : d.allClear
        }
      />

      <div className="flex flex-wrap gap-2 pb-6" role="tablist">
        {FILTER_KEYS.map((key) => {
          const count = counts[key] ?? 0
          const active = filterOrDefault === key
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
                  'text-xs',
                  active ? 'text-background/70' : 'text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={
            bookings.length > 0 ? d.emptyFilteredTitle : d.emptyTitle
          }
          description={
            bookings.length > 0 ? d.emptyFilteredBody : d.emptyBody
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([heading, list]) => (
            <section key={heading}>
              {/* `capitalize` reste sur le jour seul : en anglais il
                  transformerait aussi « 1 booking » en « 1 Booking ». */}
              <h2 className="pb-3 text-sm font-medium text-muted-foreground">
                <span className="capitalize">{heading}</span>
                <span className="ml-2 font-normal">
                  {list.length > 1
                    ? d.countMany(list.length)
                    : d.countOne(list.length)}
                </span>
              </h2>
              <div className="flex flex-col gap-3">
                {list.map((booking) => {
                  const service = booking.service_id
                    ? allProducts.find((p) => p.id === booking.service_id)
                    : undefined
                  return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    businessName={business.name}
                    serviceName={service?.name ?? null}
                    durationMinutes={service?.duration_minutes ?? null}
                    past={new Date(booking.start_at) < now}
                    labels={d}
                    lang={locale}
                    onStatus={(status, message) => {
                      setBookingStatus(booking.id, status)
                      toast.success(message)
                    }}
                  />
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AvailabilityCard
        businessId={business.id}
        rules={rules}
        labels={d}
        onSaved={() => toast.success(d.slotsSaved)}
      />
    </div>
  )
}

function BookingCard({
  booking,
  businessName,
  serviceName,
  durationMinutes,
  past,
  labels,
  lang,
  onStatus,
}: {
  booking: Booking
  businessName: string
  serviceName: string | null
  durationMinutes: number | null
  past: boolean
  labels: Dict['dashboard']['bookings']
  lang: Locale
  onStatus: (status: BookingStatus, message: string) => void
}) {
  const live = booking.status === 'pending' || booking.status === 'confirmed'

  /* La fin n'est pas stockée : elle se déduit de la durée du service. Sans
     service rattaché (une table réservée, par exemple), il n'y a pas d'heure
     de fin à annoncer. */
  const endLabel =
    durationMinutes != null
      ? timeLabel(
          new Date(
            new Date(booking.start_at).getTime() + durationMinutes * 60_000,
          ).toISOString(),
        )
      : null

  const waHref = whatsappLink(
    booking.customer_phone,
    buildBookingReplyMessage({
      businessName,
      customerName: booking.customer_name,
      serviceName,
      startAt: booking.start_at,
      confirmed: booking.status === 'confirmed',
      locale: lang,
    }),
  )

  return (
    <article className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-4">
          {/* L'heure est l'information la plus consultée : elle prend la
              première colonne, en chiffres lisibles de loin. */}
          <div className="shrink-0 text-center">
            <p className="text-lg font-semibold leading-none tabular-nums">
              {timeLabel(booking.start_at)}
            </p>
            {/* Sous l'heure de début, la fin du créneau lorsqu'elle se
                déduit de la durée du service : afficher ici l'ancienneté de
                la demande donnait « 19:30 · il y a 20 h », deux temps
                différents collés l'un à l'autre. */}
            {endLabel && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                {`→ ${endLabel}`}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-medium">{booking.customer_name}</h3>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  STATUS_TONE[booking.status],
                )}
              >
                {labels.status[booking.status]}
              </span>
              {/* L'attente ne compte que pour une demande non traitée. */}
              {booking.status === 'pending' && (
                <span className="text-xs text-muted-foreground">
                  {labels.requestedAt(
                    relativeTime(booking.created_at, undefined, lang),
                  )}
                </span>
              )}
            </div>

            {serviceName && (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {serviceName}
              </p>
            )}

            <a
              href={`tel:${booking.customer_phone}`}
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="size-3.5 shrink-0" aria-hidden />
              {booking.customer_phone}
            </a>

            {booking.note && (
              <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed">
                {booking.note}
              </p>
            )}
          </div>
        </div>
      </div>

      {live && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <MessageCircle className="size-4" aria-hidden />
            {labels.replyOnWhatsapp}
          </a>

          {booking.status === 'pending' && (
            <Button
              size="sm"
              onClick={() =>
                onStatus(
                  'confirmed',
                  labels.confirmedToast(booking.customer_name),
                )
              }
            >
              <Check className="size-4" aria-hidden />
              {labels.confirm}
            </Button>
          )}

          {/* « Honorée » n'a de sens qu'après le passage : proposer ce bouton
              sur un créneau à venir inviterait à clôturer trop tôt. */}
          {booking.status === 'confirmed' && past && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onStatus(
                  'completed',
                  labels.completedToast(booking.customer_name),
                )
              }
            >
              <Check className="size-4" aria-hidden />
              {labels.markCompleted}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() =>
              onStatus(
                'cancelled',
                labels.cancelledToast(booking.customer_name),
              )
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

/**
 * Créneaux d'ouverture : ce sont eux qui déterminent les heures proposées au
 * client sur la page publique. Un jour sans règle n'accepte aucune demande.
 */
function AvailabilityCard({
  businessId,
  rules,
  labels,
  onSaved,
}: {
  businessId: string
  rules: AvailabilityRule[]
  labels: Dict['dashboard']['bookings']
  onSaved: () => void
}) {
  const setAvailability = useClyde((s) => s.setAvailability)
  const [draft, setDraft] = useState<AvailabilityRule[] | null>(null)

  const current = draft ?? rules
  const dirty = draft !== null

  const byDay = (day: number) => current.find((r) => r.day_of_week === day)

  const toggleDay = (day: number) => {
    const existing = byDay(day)
    if (existing) {
      setDraft(current.filter((r) => r.day_of_week !== day))
      return
    }
    /* Un jour qu'on ouvre reprend les horaires d'un jour déjà ouvert :
       la plupart des commerces appliquent les mêmes plages. */
    const model = current[0]
    setDraft([
      ...current,
      {
        id: `av-${businessId}-${day}`,
        business_id: businessId,
        day_of_week: day,
        start_time: model?.start_time ?? '09:00',
        end_time: model?.end_time ?? '18:00',
        slot_duration_minutes: model?.slot_duration_minutes ?? 60,
      },
    ])
  }

  const patchDay = (day: number, patch: Partial<AvailabilityRule>) => {
    setDraft(
      current.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)),
    )
  }

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            {labels.openingTitle}
          </h2>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {labels.openingBody}
          </p>
        </div>
        {dirty && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              {labels.cancel}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setAvailability(businessId, current)
                setDraft(null)
                onSaved()
              }}
            >
              {labels.save}
            </Button>
          </div>
        )}
      </header>

      <div className="mt-5 flex flex-col divide-y divide-border">
        {/* Semaine commencée au lundi : l'ordre ISO correspond à la façon
            dont un commerçant lit son planning. */}
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const rule = byDay(day)
          return (
            <div
              key={day}
              className="flex flex-wrap items-center gap-3 py-3 first:pt-0"
            >
              <label className="flex min-w-36 items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={!!rule}
                  onChange={() => toggleDay(day)}
                  className="size-4 accent-primary"
                />
                <span className={cn(!rule && 'text-muted-foreground')}>
                  {labels.dayNames[day]}
                </span>
              </label>

              {rule ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <select
                    value={rule.start_time}
                    onChange={(e) =>
                      patchDay(day, { start_time: e.target.value })
                    }
                    aria-label={labels.opensAt(labels.dayNames[day])}
                    className="rounded-md border border-border bg-background px-2 py-1 tabular-nums"
                  >
                    {hourOptions(rule.start_time).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className="text-muted-foreground">{labels.to}</span>
                  <select
                    value={rule.end_time}
                    onChange={(e) => patchDay(day, { end_time: e.target.value })}
                    aria-label={labels.closesAt(labels.dayNames[day])}
                    className="rounded-md border border-border bg-background px-2 py-1 tabular-nums"
                  >
                    {hourOptions(rule.end_time).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.slot_duration_minutes}
                    onChange={(e) =>
                      patchDay(day, {
                        slot_duration_minutes: Number(e.target.value),
                      })
                    }
                    aria-label={labels.slotLength(labels.dayNames[day])}
                    className="rounded-md border border-border bg-background px-2 py-1"
                  >
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {labels.slotOf(m)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {labels.closed}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
