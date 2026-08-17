import { linePrice, optionsSummary } from './options'
import { formatPrice } from './taxonomy'
import type { CartLine, Currency, Product } from './types'

/**
 * Composition du message WhatsApp.
 *
 * C'est la promesse centrale de CLYDE : le client n'écrit rien. Le message
 * part déjà rédigé, avec les quantités, le total et l'emplacement — le
 * commerçant reçoit une commande lisible plutôt qu'un « bonjour ? ».
 */

/** Numéro WhatsApp au format wa.me : chiffres uniquement, sans + ni espaces. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

export interface OrderMessageInput {
  businessName: string
  currency: Currency
  lines: CartLine[]
  products: Product[]
  locationLabel?: string | null
  customerName?: string | null
  customerPhone?: string | null
  note?: string | null
}

export function orderTotal(lines: CartLine[], products: Product[]): number {
  /* Délégué à `linePrice` : les suppléments d'options entrent dans le total.
     Le calcul direct `prix × quantité` qui était ici sous-facturait chaque
     grande portion et chaque supplément choisi par le client. */
  return lines.reduce((sum, line) => sum + linePrice(line, products), 0)
}

export function buildOrderMessage(input: OrderMessageInput): string {
  const { businessName, currency, lines, products } = input
  const out: string[] = []

  out.push(`Bonjour ${businessName}, je souhaite commander :`)
  out.push('')

  for (const line of lines) {
    const p = products.find((x) => x.id === line.productId)
    if (!p) continue
    const amount = formatPrice(linePrice(line, products), currency)
    out.push(`${line.quantity}x ${p.name} — ${amount}`)
    /* Les options sur leur propre ligne, indentées : le commerçant prépare la
       commande en lisant ce message, il doit voir « grande portion » sans avoir
       à le déduire d'un montant plus élevé que prévu. */
    const options = optionsSummary(p, line.optionIds)
    if (options) out.push(`   ${options}`)
    if (line.note) out.push(`   (${line.note})`)
  }

  out.push('')
  out.push(`Total : ${formatPrice(orderTotal(lines, products), currency)}`)

  if (input.locationLabel) out.push(`Emplacement : ${input.locationLabel}`)
  if (input.customerName) out.push(`Nom : ${input.customerName}`)
  if (input.customerPhone) out.push(`Téléphone : ${input.customerPhone}`)
  if (input.note) out.push(`Note : ${input.note}`)

  return out.join('\n')
}

export interface BookingMessageInput {
  businessName: string
  serviceName?: string | null
  startAt: string
  /** Durée retenue, en minutes — omise si le service n'en déclare pas. */
  durationMinutes?: number | null
  /** Table ou salle souhaitée : une préférence, pas une ligne facturée. */
  locationLabel?: string | null
  /** Total annoncé, avec sa devise pour être formaté ici comme sur la page. */
  totalEstimate?: number | null
  currency?: Currency
  customerName?: string | null
  customerPhone?: string | null
  note?: string | null
}

/** « 90 min » sous la barre de l'heure, « 2 h 30 » au-delà : plus court à lire. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m}`
}

export function buildBookingMessage(input: BookingMessageInput): string {
  const when = new Date(input.startAt)
  const date = when.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const time = when.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const out: string[] = [
    `Bonjour ${input.businessName}, je souhaite réserver :`,
    '',
  ]
  if (input.serviceName) out.push(`Prestation : ${input.serviceName}`)
  out.push(`Date : ${date}`)
  out.push(`Heure : ${time}`)
  if (input.durationMinutes)
    out.push(`Durée : ${formatDuration(input.durationMinutes)}`)
  /* L'emplacement suit la durée et précède le total : il informe le commerçant
     sans jamais entrer dans le calcul du prix. */
  if (input.locationLabel) out.push(`Emplacement : ${input.locationLabel}`)
  if (input.totalEstimate != null && input.currency)
    out.push(`Total : ${formatPrice(input.totalEstimate, input.currency)}`)
  if (input.customerName) out.push(`Nom : ${input.customerName}`)
  if (input.customerPhone) out.push(`Téléphone : ${input.customerPhone}`)
  if (input.note) out.push(`Note : ${input.note}`)

  return out.join('\n')
}

/*
 * Les deux messages ci-dessus partent du client vers le commerce. Le tableau
 * de bord a besoin du sens inverse : c'est le commerçant qui répond, et le
 * tutoiement des modèles clients y sonnerait faux.
 *
 * Ces réponses suivent la langue du tableau de bord : un commerçant qui
 * travaille en anglais doit pouvoir relire ce qu'il envoie avant de l'envoyer.
 */

type ReplyLocale = 'fr' | 'en'

/** Vouvoiement en français, ton neutre en anglais. */
const REPLY_COPY = {
  fr: {
    orderReceived: (name: string) =>
      `Bonjour ${name}, votre commande est bien reçue :`,
    orderFollowUp: 'Nous revenons vers vous pour la confirmation.',
    bookingConfirmed: (name: string) =>
      `Bonjour ${name}, votre réservation est confirmée :`,
    bookingSeeYou: (business: string) => `À bientôt chez ${business}.`,
    bookingPending: (name: string) =>
      `Bonjour ${name}, nous avons bien reçu votre demande :`,
    bookingFollowUp: 'Nous vous confirmons le créneau très vite.',
    /* Relance d'un panier laissé en route. Le ton reste une proposition de
       service, jamais un reproche : le client n'a rien promis. */
    cartOpening: (name: string) =>
      `Bonjour ${name}, vous avez commencé une commande chez nous :`,
    cartClosing: 'Souhaitez-vous que nous la préparions ?',
    cartTotal: 'Total estimé',
    /* « lundi 3 mars à 14:00 » */
    slotJoiner: 'à',
  },
  en: {
    orderReceived: (name: string) => `Hello ${name}, we have your order:`,
    orderFollowUp: 'We will get back to you to confirm.',
    bookingConfirmed: (name: string) =>
      `Hello ${name}, your booking is confirmed:`,
    bookingSeeYou: (business: string) => `See you soon at ${business}.`,
    bookingPending: (name: string) =>
      `Hello ${name}, we have received your request:`,
    bookingFollowUp: 'We will confirm the time slot shortly.',
    cartOpening: (name: string) =>
      `Hello ${name}, you started an order with us:`,
    cartClosing: 'Would you like us to prepare it?',
    cartTotal: 'Estimated total',
    /* en-GB plutôt que en-US : « Monday 3 March at 14:00 », en 24 heures
       comme partout ailleurs dans l'application. */
    slotJoiner: 'at',
  },
} as const

const DATE_LOCALE: Record<ReplyLocale, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
}

/** Accusé de réception d'une commande, envoyé par le commerçant. */
export function buildOrderReplyMessage(input: {
  customerName: string
  recap: string
  locale: ReplyLocale
}): string {
  const copy = REPLY_COPY[input.locale]
  return [
    copy.orderReceived(input.customerName),
    input.recap,
    '',
    copy.orderFollowUp,
  ].join('\n')
}

/** Confirmation d'un créneau de réservation, envoyée par le commerçant. */
export function buildBookingReplyMessage(input: {
  businessName: string
  customerName: string
  serviceName?: string | null
  startAt: string
  confirmed: boolean
  locale: ReplyLocale
}): string {
  const copy = REPLY_COPY[input.locale]
  const tag = DATE_LOCALE[input.locale]
  const when = new Date(input.startAt)
  const date = when.toLocaleDateString(tag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const time = when.toLocaleTimeString(tag, {
    hour: '2-digit',
    minute: '2-digit',
  })

  const slot = input.serviceName
    ? `${input.serviceName}, ${date} ${copy.slotJoiner} ${time}`
    : `${date} ${copy.slotJoiner} ${time}`

  return input.confirmed
    ? [
        copy.bookingConfirmed(input.customerName),
        slot,
        '',
        copy.bookingSeeYou(input.businessName),
      ].join('\n')
    : [
        copy.bookingPending(input.customerName),
        slot,
        '',
        copy.bookingFollowUp,
      ].join('\n')
}

/**
 * Relance d'un panier abandonné, envoyée par le commerçant.
 *
 * Le message reprend le contenu exact du panier : sans le détail, le client
 * doit tout resaisir, et la relance ne fait que déplacer l'effort.
 */
export function buildCartReminderMessage(input: {
  customerName: string
  lines: CartLine[]
  products: Product[]
  currency: Currency
  locale: ReplyLocale
}): string {
  const copy = REPLY_COPY[input.locale]
  const out: string[] = [copy.cartOpening(input.customerName), '']

  for (const line of input.lines) {
    const p = input.products.find((x) => x.id === line.productId)
    if (!p) continue
    out.push(
      `${line.quantity}x ${p.name} — ${formatPrice(linePrice(line, input.products), input.currency)}`,
    )
    const options = optionsSummary(p, line.optionIds)
    if (options) out.push(`   ${options}`)
  }

  out.push('')
  out.push(
    `${copy.cartTotal} : ${formatPrice(orderTotal(input.lines, input.products), input.currency)}`,
  )
  out.push('')
  out.push(copy.cartClosing)

  return out.join('\n')
}

/** Lien wa.me prêt à ouvrir, message encodé. */
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`
}

/**
 * Ouvre WhatsApp. Dans un iframe (aperçu v0), `window.open` sur `_blank`
 * est la seule voie fiable — une navigation top-level y est bloquée.
 */
export function openWhatsapp(phone: string, message: string): void {
  const url = whatsappLink(phone, message)
  window.open(url, '_blank', 'noopener,noreferrer')
}
