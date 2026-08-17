'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Clock3, MapPin, Send, X } from 'lucide-react'
import { Overlay } from '@/components/clyde/public/overlay'
import { freeSlotsForDay, slotStepForDay, slotsForDay } from '@/components/clyde/page/blocks'
import { useClyde } from '@/lib/clyde/store'
import { formatDuration } from '@/lib/clyde/whatsapp'
import { formatPrice } from '@/lib/clyde/taxonomy'
import type { AvailabilityRule, BusinessLocation, Currency, PageTheme, Product } from '@/lib/clyde/types'

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function dateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function ReservationSheet({
  product,
  availability,
  businessId,
  locations,
  currency,
  theme,
  onClose,
  onSubmit,
}: {
  product: Product | null
  availability: AvailabilityRule[]
  businessId: string
  locations: BusinessLocation[]
  currency: Currency
  theme: PageTheme
  onClose: () => void
  onSubmit: (input: {
    startAt: string
    durationMinutes: number
    locationId: string | null
    totalEstimate: number
  }) => void
}) {
  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() + index)
      return date
    })
  }, [])
  const [dayIndex, setDayIndex] = useState(0)
  const [slot, setSlot] = useState<string | null>(null)
  const [duration, setDuration] = useState(product?.duration_minutes ?? 60)
  const [locationId, setLocationId] = useState<string | null>(null)
  const bookings = useClyde((s) => s.bookings)

  if (!product) return null

  const day = days[dayIndex]
  /* Seuls les créneaux encore libres apparaissent : une heure déjà retenue
     par un autre client (demande en attente ou confirmée) n'est jamais
     proposée. Le filtre tient compte de la durée choisie — une prestation de
     2 h a besoin de 2 h contiguës libres, pas seulement de son heure de
     départ. */
  const slots = freeSlotsForDay(availability, day, bookings, businessId, duration)
  const step = slotStepForDay(availability, day) ?? product.duration_minutes ?? 60
  /* Dérivé, pas stocké : si l'allongement de la durée rend l'heure choisie
     indisponible, elle se déselectionne d'elle-même — l'état ne peut jamais
     pointer vers un créneau devenu occupé. */
  const chosenSlot = slot && slots.includes(slot) ? slot : null
  const baseDuration = product.duration_minutes ?? step
  const durationOptions = Array.from({ length: 4 }, (_, index) => step * (index + 1)).filter(
    (value) => value >= baseDuration,
  )
  const totalEstimate = Math.ceil(duration / baseDuration) * product.price
  const label = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(day)

  return (
    <Overlay onClose={onClose} theme={theme}>
      <div className="flex max-h-[88vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase opacity-55">Réservation</p>
            <h2 className="mt-1 text-xl font-bold">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 opacity-65 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <section aria-labelledby="reservation-date" className="flex flex-col gap-2">
            <h3 id="reservation-date" className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays size={16} aria-hidden="true" /> Choisissez le jour
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.slice(0, 14).map((date, index) => (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    setDayIndex(index)
                    setSlot(null)
                  }}
                  className="flex min-w-14 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-xs"
                  style={index === dayIndex ? { background: theme.brand, color: theme.background, borderColor: theme.brand } : { borderColor: `${theme.ink}22` }}
                >
                  <span className="font-semibold opacity-70">{DAY_NAMES[date.getDay()]}</span>
                  <span className="mt-1 text-base font-bold">{date.getDate()}</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="reservation-slot" className="flex flex-col gap-2">
            <h3 id="reservation-slot" className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 size={16} aria-hidden="true" /> Choisissez l&apos;heure
            </h3>
            {slots.length ? (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSlot(value)}
                    className="rounded-xl border py-2.5 text-sm font-semibold tabular-nums"
                    style={value === chosenSlot ? { background: theme.brand, color: theme.background, borderColor: theme.brand } : { borderColor: `${theme.ink}22` }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl px-3 py-4 text-center text-sm opacity-60" style={{ background: `${theme.ink}0a` }}>
                {slotsForDay(availability, day).length
                  ? 'Complet ce jour-là — choisissez une autre date.'
                  : 'Fermé ce jour-là — choisissez une autre date.'}
              </p>
            )}
          </section>

          {durationOptions.length > 1 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Durée</h3>
              <div className="grid grid-cols-2 gap-2">
                {durationOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDuration(value)}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold"
                    style={value === duration ? { background: theme.brand, color: theme.background, borderColor: theme.brand } : { borderColor: `${theme.ink}22` }}
                  >
                    {formatDuration(value)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {locations.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><MapPin size={16} aria-hidden="true" /> Emplacement souhaité</h3>
              <select
                value={locationId ?? ''}
                onChange={(event) => setLocationId(event.target.value || null)}
                className="h-11 rounded-xl border bg-transparent px-3 text-sm"
                style={{ borderColor: `${theme.ink}22` }}
              >
                <option value="">Peu importe</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
              </select>
              <p className="text-xs opacity-55">Le choix de l&apos;emplacement ne change pas le prix.</p>
            </section>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-black/10 px-5 py-4">
          <div>
            <p className="text-xs opacity-55">Total estimé</p>
            <p className="text-lg font-bold">{formatPrice(totalEstimate, currency)}</p>
          </div>
          <button
            type="button"
            disabled={!chosenSlot}
            onClick={() => {
              if (!chosenSlot) return
              onSubmit({ startAt: new Date(`${dateKey(day)}T${chosenSlot}:00`).toISOString(), durationMinutes: duration, locationId, totalEstimate })
            }}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: theme.brand, color: theme.background }}
          >
            <Send size={16} aria-hidden="true" />
            Envoyer ma demande
          </button>
        </div>
      </div>
    </Overlay>
  )
}
