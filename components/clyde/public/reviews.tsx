'use client'

/**
 * Avis clients — affichage, dépôt et signalement.
 *
 * Un seul composant sert les deux emplacements voulus : le bloc « Avis » de la
 * page (avis du commerce) et la fiche d'un article (avis de cet article). C'est
 * `productId` qui tranche, et rien d'autre : dupliquer le composant aurait
 * garanti que les deux se mettent à divergerses au premier correctif.
 */

import { useMemo, useState } from 'react'
import { Flag, Star } from 'lucide-react'
import {
  averageRating,
  businessReviews,
  productReviews,
  ratingBreakdown,
  countableReviews,
} from '@/lib/clyde/reviews'
import { Button } from '@/components/ui/button'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import { readableOn } from '@/lib/clyde/theme'
import { cn } from '@/lib/utils'
import type { Review } from '@/lib/clyde/types'

/** Étoiles en lecture seule. */
export function Stars({
  value,
  size = 14,
  color,
}: {
  value: number
  size?: number
  color?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${value} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          aria-hidden="true"
          className={i <= Math.round(value) ? 'fill-current' : 'opacity-25'}
          style={color ? { color } : undefined}
        />
      ))}
    </span>
  )
}

/**
 * Étoiles cliquables du formulaire.
 *
 * De vrais boutons radio derrière les étoiles : un `div` cliquable n'est ni
 * atteignable au clavier ni annoncé par un lecteur d'écran, et une note est
 * précisément le seul champ obligatoire de ce formulaire.
 */
function RatingInput({
  value,
  onChange,
  color,
}: {
  value: number
  onChange: (v: number) => void
  color?: string
}) {
  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">Votre note, de 1 à 5 étoiles</legend>
      {[1, 2, 3, 4, 5].map((i) => (
        <label
          key={i}
          className="cursor-pointer p-0.5"
          title={`${i} étoile${i > 1 ? 's' : ''}`}
        >
          <input
            type="radio"
            name="rating"
            value={i}
            checked={value === i}
            onChange={() => onChange(i)}
            className="sr-only peer"
          />
          <Star
            size={26}
            aria-hidden="true"
            className={cn(
              'transition-transform peer-focus-visible:scale-110 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
              i <= value ? 'fill-current' : 'opacity-30',
            )}
            style={color ? { color } : undefined}
          />
          <span className="sr-only">
            {i} étoile{i > 1 ? 's' : ''}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.round(days / 30)
  return `il y a ${months} mois`
}

/* ============================================================
   Une carte d'avis
   ============================================================ */

function ReviewCard({
  review,
  brand,
  onReport,
  reported,
}: {
  review: Review
  brand: string
  onReport: (reason: string) => void
  reported: boolean
}) {
  /* Le signalement demande un motif écrit. Un clic seul envoyait « Signalé
     depuis la vitrine » : l'équipe CLYDE lisait ce texte sans savoir ce qui
     était reproché, et ne pouvait donc rien arbitrer. */
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')

  /* Un avis masqué n'arrive ici que sous les yeux de son auteur — pour les
     autres, `visibleReviews` l'a écarté en amont. Un avis signalé, lui, reste
     lisible de tous : le signalement attend un arbitrage, il ne l'anticipe pas. */
  const hidden = review.moderation === 'masque'

  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-2xl border bg-background/60 p-4',
        hidden && 'border-dashed opacity-70',
      )}
    >
      {hidden ? (
        /* L'auteur apprend le retrait et sa raison. Le laisser lire son avis
           comme si tout allait bien l'aurait laissé croire à un bug, et il
           l'aurait redéposé à l'identique. */
        <div className="flex flex-col gap-1 rounded-xl bg-secondary/60 px-3 py-2">
          <p className="text-xs font-semibold">
            Cet avis a été retiré par l&apos;équipe CLYDE. Vous seul le voyez
            encore.
          </p>
          {review.moderation_note ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Motif : {review.moderation_note}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{review.author_name}</p>
          <Stars value={review.rating} color={brand} />
        </div>
        <time
          dateTime={review.created_at}
          className="shrink-0 text-xs text-muted-foreground"
        >
          {relativeDay(review.created_at)}
        </time>
      </div>

      {review.body ? (
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {review.body}
        </p>
      ) : null}

      {/* Rien à signaler sur un avis déjà retiré : l'arbitrage a eu lieu, et
          seul son auteur l'a encore sous les yeux. */}
      <div className={cn('flex items-center justify-between gap-2', hidden && 'hidden')}>
        {review.moderation === 'signale' ? (
          <p className="text-xs text-muted-foreground">
            Signalé — en cours d&apos;examen par l&apos;équipe CLYDE.
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setReporting((v) => !v)}
          disabled={reported}
          aria-expanded={reporting}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline disabled:no-underline disabled:opacity-50"
        >
          <Flag className="size-3" aria-hidden="true" />
          {reported ? 'Signalement envoyé' : 'Signaler'}
        </button>
      </div>

      {reporting && !reported ? (
        <div className="flex flex-col gap-2 border-t pt-3">
          <label
            htmlFor={`reason-${review.id}`}
            className="text-xs font-semibold"
          >
            Qu&apos;est-ce qui pose problème dans cet avis ?
          </label>
          <textarea
            id={`reason-${review.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Décrivez le problème en une phrase."
            className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              /* Fermé jusqu'au motif : un signalement vide ne se juge pas, et
                 l'envoyer quand même encombrerait la file d'attente. */
              disabled={reason.trim().length === 0}
              onClick={() => {
                onReport(reason)
                setReporting(false)
                setReason('')
              }}
            >
              Envoyer le signalement
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setReporting(false)
                setReason('')
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

/* ============================================================
   Formulaire de dépôt
   ============================================================ */

function ReviewForm({
  brand,
  onSubmit,
}: {
  brand: string
  onSubmit: (input: { name: string; rating: number; body: string }) => void
}) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [touched, setTouched] = useState(false)

  const nameOk = name.trim().length >= 2
  const ratingOk = rating >= 1
  /* Le commentaire reste libre : exiger un texte ferait renoncer une partie de
     ceux qui voulaient simplement mettre cinq étoiles. */
  const valid = nameOk && ratingOk

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    onSubmit({ name: name.trim(), rating, body: body.trim() })
    setName('')
    setRating(0)
    setBody('')
    setTouched(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Votre note</span>
        <RatingInput value={rating} onChange={setRating} color={brand} />
        {touched && !ratingOk ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            Choisissez une note.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-name" className="text-sm font-semibold">
          Votre nom
        </label>
        <input
          id="review-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Prénom ou nom"
          autoComplete="name"
          className="min-h-11 rounded-xl border bg-background px-3 text-sm"
          aria-invalid={touched && !nameOk}
        />
        {touched && !nameOk ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            Indiquez au moins deux caractères.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-body" className="text-sm font-semibold">
          Votre avis <span className="font-normal opacity-60">(optionnel)</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Ce qui vous a plu, ou ce qui pourrait être amélioré."
          className="resize-none rounded-xl border bg-background px-3 py-2 text-sm leading-relaxed"
        />
      </div>

      <button
        type="submit"
        className="min-h-11 rounded-xl px-4 text-sm font-bold transition-transform active:scale-[0.99]"
        style={{ background: brand, color: readableOn(brand) }}
      >
        Publier mon avis
      </button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Votre avis est publié aussitôt et reste visible. L&apos;équipe CLYDE
        n&apos;intervient qu&apos;après signalement.
      </p>
    </form>
  )
}

/* ============================================================
   Bloc complet
   ============================================================ */

/**
 * Le bloc d'avis, dans l'un ou l'autre de ses deux emplacements.
 *
 * - `productId` renseigné : les avis de cet article.
 * - `productId` à `null` : les avis du commerce.
 *
 * `interactive` à `false` sert l'éditeur : le commerçant voit son bloc, mais
 * ni le formulaire ni les signalements n'y sont actifs — un aperçu ne doit pas
 * écrire de vrais avis.
 */
export function ReviewsSection({
  businessId,
  productId = null,
  brand,
  title,
  interactive = true,
  className,
}: {
  businessId: string
  productId?: string | null
  brand: string
  title?: string
  interactive?: boolean
  className?: string
}) {
  /* Le store ne lit le stockage local que sur demande (`skipHydration`). Sans
     cet appel, le bloc affichait les seuls avis de démonstration : l'avis qu'un
     client venait de déposer réapparaissait absent au rechargement, alors qu'il
     était bien enregistré. La demande est faite ici, et non dans les pages
     hôtes, pour que le bloc soit juste partout où il est monté. */
  useClydeReady()
  const allReviews = useClyde((s) => s.reviews)
  const createReview = useClyde((s) => s.createReview)
  const reportReview = useClyde((s) => s.reportReview)
  const userId = useSession((s) => s.userId)

  /* Les signalements de la session, pour griser le bouton aussitôt. Le store
     refuse déjà le doublon d'un utilisateur connu ; ceci n'est que le retour
     visuel, qui vaut aussi pour un visiteur anonyme. */
  const [reported, setReported] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  /* La liste montrée inclut l'avis masqué de son propre auteur, pour qu'il en
     connaisse le sort et le motif. */
  const reviews = useMemo(
    () =>
      productId
        ? productReviews(allReviews, productId, userId)
        : businessReviews(allReviews, businessId, userId),
    [allReviews, businessId, productId, userId],
  )

  /* La note publique, elle, ignore les avis masqués — y compris celui que
     l'auteur voit encore. Sans cette distinction, il aurait lu une moyenne
     différente de celle des autres visiteurs. */
  const counted = useMemo(() => countableReviews(reviews), [reviews])

  const sorted = useMemo(
    /* Du plus récent au plus ancien : un avis d'il y a deux ans en tête de
       liste donnerait l'impression d'une vitrine à l'abandon. */
    () =>
      [...reviews].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [reviews],
  )

  const avg = averageRating(counted)
  const breakdown = ratingBreakdown(counted)
  const heading = title ?? (productId ? 'Avis sur cet article' : 'Avis clients')

  function handleSubmit(input: {
    name: string
    rating: number
    body: string
  }) {
    if (!interactive) return
    createReview({
      businessId,
      productId,
      authorUserId: userId,
      authorName: input.name,
      rating: input.rating,
      body: input.body,
    })
    setOpen(false)
  }

  function handleReport(reviewId: string, reason: string) {
    if (!interactive) return
    reportReview({
      reviewId,
      reporterUserId: userId,
      reason,
    })
    setReported((prev) => new Set(prev).add(reviewId))
  }

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">{heading}</h2>
        {avg !== null ? (
          <span className="inline-flex items-center gap-2 text-sm font-bold">
            <Stars value={avg} color={brand} />
            {avg.toFixed(1)}
            <span className="font-normal text-muted-foreground">
              ({counted.length})
            </span>
          </span>
        ) : null}
      </div>

      {/* Le vide se juge sur ce qui est montré, pas sur la note publique : un
          auteur dont l'unique avis a été retiré lisait « Aucun avis » au-dessus
          de sa propre carte, qui existait pourtant juste en dessous. */}
      {sorted.length === 0 ? (
        /* Ni « 0 sur 5 » ni un bloc vide : l'absence d'avis n'est pas une
           mauvaise note, et le dire ainsi invite à écrire le premier. */
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aucun avis pour le moment. Soyez le premier à donner le vôtre.
        </p>
      ) : (
        <>
          {/* La répartition n'a de sens qu'avec des avis qui comptent. */}
          <div className={cn('flex flex-col gap-1.5', counted.length === 0 && 'hidden')}>
            {breakdown.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2">
                {/* L'icône plutôt que le caractère « ★ », absent de la police
                    du site : il s'y affichait en carré vide. */}
                <span className="flex w-10 shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  {rating}
                  <Star className="size-3" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                </span>
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${counted.length ? (count / counted.length) * 100 : 0}%`,
                      background: brand,
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {sorted.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                brand={brand}
                reported={reported.has(r.id)}
                onReport={(reason) => handleReport(r.id, reason)}
              />
            ))}
          </div>
        </>
      )}

      {open ? (
        <div className="rounded-2xl border bg-background/60 p-4">
          <ReviewForm brand={brand} onSubmit={handleSubmit} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!interactive}
          className="min-h-11 self-start rounded-xl border px-4 text-sm font-bold disabled:opacity-50"
          style={{ borderColor: brand, color: brand }}
        >
          Donner mon avis
        </button>
      )}
    </section>
  )
}
