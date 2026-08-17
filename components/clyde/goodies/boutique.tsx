'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Coins, Gift, Package } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { PageHeader } from '@/components/clyde/pages/page-shell'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { bi } from '@/lib/clyde/formation'
import {
  GOODIES,
  POINTS_FOLLOWERS,
  POINTS_FOUNDATION,
  POINTS_PER_COURSE,
  POINTS_PER_LESSON,
  POINTS_PER_REFERRAL,
  pointsBalance,
  pointsReasonLabel,
  type Goodie,
} from '@/lib/clyde/goodies'
import { relativeTime } from '@/lib/clyde/text'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import { cn } from '@/lib/utils'

/**
 * La Boutique Goodies.
 *
 * Le solde est recalculé à chaque rendu depuis les registres, jamais lu dans un
 * champ « points ». C'est plus de calcul, mais un chiffre faux se répare alors
 * en corrigeant le fait qui le nourrit — pas en réécrivant un compteur dont
 * plus personne ne sait d'où il vient.
 */
export function Boutique() {
  const t = useT()
  const g = t.goodies
  const ready = useClydeReady()
  const userId = useSession((s) => s.userId)
  const users = useClyde((s) => s.users)
  const businesses = useClyde((s) => s.businesses)
  const lessonCompletions = useClyde((s) => s.lessonCompletions)
  const certificates = useClyde((s) => s.certificates)
  const referrals = useClyde((s) => s.referrals)
  const redemptions = useClyde((s) => s.goodieRedemptions)

  /* La page du commerçant porte les points, pas son compte : les leçons et
     certificats sont inscrits au nom d'un commerce. */
  const business = ready && userId
    ? (businesses.find((b) => b.owner_id === userId) ?? null)
    : null

  const balance = business
    ? pointsBalance({
        businessId: business.id,
        lessonCompletions,
        certificates,
        referrals,
        redemptions,
      })
    : null

  /* Les coordonnées de remise sont EXTRAITES du compte, pas redemandées : le
     commerçant a déjà donné son nom, son WhatsApp et sa ville. Le formulaire
     les présente préremplies, modifiables — livrer chez un employé reste
     possible. */
  const owner = userId ? (users.find((u) => u.id === userId) ?? null) : null
  const prefill = {
    name: owner?.name ?? '',
    phone: business?.whatsapp_number ?? owner?.whatsapp_number ?? '',
    city: business?.city ?? '',
  }

  /* Le catalogue s'ordonne par utilité d'abord, puis par coût croissant : la
     boutique n'est pas une vitrine de produits dérivés, c'est un outillage.
     Les articles désactivés par l'administration n'apparaissent pas — mais
     leurs fiches restent résolubles pour les échanges passés. */
  const catalogue = GOODIES.filter((g) => g.active).sort((a, b) =>
    a.useful !== b.useful ? (a.useful ? -1 : 1) : a.cost - b.cost,
  )

  return (
    <>
      <PageHeader badge={g.badge} title={g.title} subtitle={g.subtitle} />

      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        {!ready ? (
          <div className="h-28 animate-pulse rounded-2xl bg-secondary" />
        ) : !userId ? (
          <Notice body={g.signedOut} cta={g.signedOutCta} href="/connexion" />
        ) : !business ? (
          <Notice body={g.noBusiness} cta={g.noBusinessCta} href="/inscription" />
        ) : (
          <BalanceCard balance={balance!} />
        )}

        <Scale />

        <section className="mt-14">
          <h2 className="border-b border-border pb-4 text-xl font-bold tracking-tight">
            {g.catalogueTitle}
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {catalogue.map((goodie, i) => (
              <Reveal key={goodie.id} delay={Math.min(i, 6) * 60} as="li">
                <GoodieCard
                  goodie={goodie}
                  balance={balance?.balance ?? 0}
                  businessId={business?.id ?? null}
                  prefill={prefill}
                />
              </Reveal>
            ))}
          </ul>
        </section>

        {business ? <Redemptions businessId={business.id} /> : null}
      </div>
    </>
  )
}

function Notice({
  body,
  cta,
  href,
}: {
  body: string
  cta: string
  href: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5">
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link
        href={href}
        className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
      >
        {cta}
      </Link>
    </div>
  )
}

/**
 * Le solde et son relevé.
 *
 * Le détail est affiché sans être dépliable : c'est justement parce qu'un
 * commerçant peut recompter ligne par ligne qu'il fait confiance au total.
 */
function BalanceCard({
  balance,
}: {
  balance: NonNullable<ReturnType<typeof pointsBalance>>
}) {
  const t = useT()
  const { locale } = useLocale()
  const g = t.goodies

  return (
    <section className="overflow-hidden rounded-2xl border border-border">
      <div className="flex flex-wrap items-end justify-between gap-4 bg-foreground px-6 py-6 text-background">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-background/60 uppercase">
            {g.balance}
          </p>
          <p className="mt-2 text-5xl leading-none font-bold tracking-tight">
            {balance.balance}
            <span className="ml-2 text-lg font-semibold text-background/60">
              {g.pointsShort}
            </span>
          </p>
        </div>
        <Coins className="size-9 text-brand" aria-hidden="true" />
      </div>

      <div className="px-6 py-5">
        <h2 className="font-mono text-[11px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
          {g.ledgerTitle}
        </h2>

        {balance.entries.length === 0 ? (
          <div className="mt-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {g.ledgerEmpty}
            </p>
            <Link
              href="/formation"
              className="mt-3 inline-block text-sm font-semibold text-brand underline-offset-4 hover:underline"
            >
              {g.ledgerCta}
            </Link>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {balance.entries.map((e) => (
              <li
                key={e.reason}
                className="flex items-center justify-between gap-4 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {pointsReasonLabel(e.reason, locale, e.count)}
                </span>
                <span
                  className={cn(
                    'font-mono font-bold tabular-nums',
                    e.points < 0 ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {e.points > 0 ? '+' : ''}
                  {e.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Le barème, en clair. Sans lui, les points auraient l'air arbitraires. */
function Scale() {
  const t = useT()
  const g = t.goodies

  const rows = [
    { label: g.scale.lesson, points: POINTS_PER_LESSON },
    { label: g.scale.course, points: POINTS_PER_COURSE },
    { label: g.scale.foundation, points: POINTS_FOUNDATION },
    { label: g.scale.followers, points: POINTS_FOLLOWERS },
    { label: g.scale.referral, points: POINTS_PER_REFERRAL },
  ]

  return (
    <Reveal>
      <section className="mt-12 rounded-2xl border border-border bg-secondary px-6 py-6">
        <h2 className="font-mono text-[11px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
          {g.scaleTitle}
        </h2>
        <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-sm last:border-b-0 sm:last:border-b"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className="shrink-0 font-mono font-bold tabular-nums">
                +{r.points}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  )
}

/** Une fiche du catalogue, avec son bon de livraison replié. */
function GoodieCard({
  goodie,
  balance,
  businessId,
  prefill,
}: {
  goodie: Goodie
  balance: number
  businessId: string | null
  /** Coordonnées connues du compte, proposées préremplies dans le bon. */
  prefill: { name: string; phone: string; city: string }
}) {
  const t = useT()
  const { locale } = useLocale()
  const g = t.goodies
  const redeem = useClyde((s) => s.redeemGoodie)

  const [open, setOpen] = useState(false)
  /* `null` tant que le formulaire n'a pas été ouvert : `useState(prefill.x)`
     capturerait la valeur du PREMIER rendu, soit une chaîne vide, puisque le
     stockage local n'est relu qu'après le montage. Les champs arrivaient donc
     vides alors que le compte était connu. On lit à l'ouverture. */
  const [name, setName] = useState<string | null>(null)
  const [phone, setPhone] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [size, setSize] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState(false)

  const missing = goodie.cost - balance
  const affordable = businessId !== null && missing <= 0
  /* Ce que chaque champ affiche : la saisie si elle existe, sinon la valeur
     du compte — y compris lorsqu'elle n'est connue qu'après relecture. */
  const nameValue = name ?? prefill.name
  const phoneValue = phone ?? prefill.phone
  const cityValue = city ?? prefill.city
  /* Premier choix présélectionné : une liste de tailles sans choix par défaut
     laisse passer des commandes sans taille au premier clic trop rapide. */
  const sizeValue = size ?? goodie.sizes?.[0] ?? null

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
      {/* La photo d'abord : un catalogue sans image ne donne envie de rien. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
        <img
          src={goodie.image || '/placeholder.svg'}
          alt={bi(goodie.name, locale)}
          className="size-full object-cover"
          loading="lazy"
        />
        <span className="absolute top-3 left-3 rounded-full border border-border bg-background/90 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase backdrop-blur">
          {bi(goodie.tag, locale)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
      <h3 className="text-pretty text-lg leading-snug font-semibold">
        {bi(goodie.name, locale)}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {bi(goodie.description, locale)}
      </p>

      <div className="mt-auto pt-5">
        <p className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tabular-nums">
            {goodie.cost}
          </span>
          <span className="text-sm text-muted-foreground">{g.pointsShort}</span>
        </p>

        {/* Le manque est chiffré : « Il vous manque 30 points » est une
            information actionnable, un bouton grisé ne l'est pas. */}
        {businessId && missing > 0 ? (
          <p className="mt-2 text-[13px] text-muted-foreground">
            {g.missing(missing)}
          </p>
        ) : null}

        {open ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const id = redeem({
                businessId: businessId!,
                goodieId: goodie.id,
                cost: goodie.cost,
                recipientName: nameValue.trim(),
                recipientPhone: phoneValue.trim(),
                deliveryCity: cityValue.trim(),
                deliveryAddress: address.trim() || null,
                size: sizeValue,
                deliveryNote: note.trim() || null,
              })
              /* `null` : solde insuffisant ou coordonnées incomplètes. Le
                 contrôle vit dans le store, pas ici. */
              if (id === null) {
                setFailed(true)
                return
              }
              setOpen(false)
              setNote('')
              setAddress('')
              setName(null)
              setPhone(null)
              setCity(null)
              setSize(null)
            }}
            className="mt-4 rounded-xl border border-border bg-secondary p-3"
          >
            <label
              htmlFor={`name-${goodie.id}`}
              className="block text-[13px] font-semibold"
            >
              {g.nameLabel}
            </label>
            <input
              id={`name-${goodie.id}`}
              value={nameValue}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground"
            />

            <label
              htmlFor={`phone-${goodie.id}`}
              className="mt-3 block text-[13px] font-semibold"
            >
              {g.phoneLabel}
            </label>
            <input
              id={`phone-${goodie.id}`}
              type="tel"
              value={phoneValue}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground"
            />

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor={`city-${goodie.id}`}
                  className="block text-[13px] font-semibold"
                >
                  {g.cityLabel}
                </label>
                <input
                  id={`city-${goodie.id}`}
                  value={cityValue}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground"
                />
              </div>
              {goodie.sizes && goodie.sizes.length > 0 ? (
                <div>
                  <label
                    htmlFor={`size-${goodie.id}`}
                    className="block text-[13px] font-semibold"
                  >
                    {g.sizeLabel}
                  </label>
                  <select
                    id={`size-${goodie.id}`}
                    value={sizeValue ?? ''}
                    onChange={(e) => setSize(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground"
                  >
                    {goodie.sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <label
              htmlFor={`address-${goodie.id}`}
              className="mt-3 block text-[13px] font-semibold"
            >
              {g.addressLabel}
            </label>
            <input
              id={`address-${goodie.id}`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={g.addressPlaceholder}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground"
            />

            <label
              htmlFor={`note-${goodie.id}`}
              className="mt-3 block text-[13px] font-semibold"
            >
              {g.noteLabel}
            </label>
            <input
              id={`note-${goodie.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={g.notePlaceholder}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-foreground"
            />

            {failed ? (
              <p
                role="alert"
                className="mt-2.5 text-[13px] font-semibold text-destructive"
              >
                {!nameValue.trim() || !phoneValue.trim() || !cityValue.trim()
                  ? g.incomplete
                  : g.failed}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold text-brand-foreground transition-transform active:scale-[0.97]"
              >
                {g.confirm}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setFailed(false)
                }}
                className="rounded-lg px-3 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
              >
                {g.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!affordable}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Gift className="size-4" aria-hidden="true" />
            {g.redeem}
          </button>
        )}
      </div>
      </div>
    </article>
  )
}

/** Les échanges déjà faits, du plus récent au plus ancien. */
function Redemptions({ businessId }: { businessId: string }) {
  const t = useT()
  const { locale } = useLocale()
  const g = t.goodies
  const redemptions = useClyde((s) => s.goodieRedemptions)

  const mine = redemptions
    .filter((r) => r.business_id === businessId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

  return (
    <section className="mt-14">
      <h2 className="flex items-center gap-2 border-b border-border pb-4 text-xl font-bold tracking-tight">
        <Package className="size-5 text-brand" aria-hidden="true" />
        {g.ordersTitle}
      </h2>

      {mine.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          {g.ordersEmpty}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col divide-y divide-border">
          {mine.map((r) => {
            const goodie = GOODIES.find((x) => x.id === r.goodie_id)
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {goodie ? (
                    <img
                      src={goodie.image || '/placeholder.svg'}
                      alt=""
                      className="size-11 shrink-0 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {goodie ? bi(goodie.name, locale) : r.goodie_id}
                      {r.size ? ` · ${r.size}` : ''}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {`−${r.points_spent} ${g.pointsShort} · ${r.delivery_city} · ${relativeTime(r.created_at, new Date(), locale)}`}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em] uppercase">
                  {r.status === 'remise' ? (
                    <Check className="size-3 text-brand" aria-hidden="true" />
                  ) : null}
                  {g.status[r.status]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
