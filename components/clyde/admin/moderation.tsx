'use client'

/* ============================================================
   Arbitrage des signalements

   Les signalements du forum n'aboutissaient nulle part : on pouvait
   signaler, personne ne pouvait trancher. Cet écran est le bout de
   la chaîne — sans lui, le bouton « Signaler » était décoratif.

   Il arbitre aussi les avis clients, dans la MÊME file. Une seconde
   file, séparée, aurait fini ignorée : l'équipe traite ce qu'elle a
   sous les yeux. Le registre d'origine reste distinct dans le store,
   seul l'écran d'arbitrage est commun.

   Deux décisions, et seulement deux :
   - « Masquer » retient le signalement (`upheld: true`) et cache le
     contenu en affichant le motif à son auteur.
   - « Rejeter » clôt le signalement (`upheld: false`) et laisse le
     contenu en place.

   Dans les deux cas le signalement est CONSERVÉ, jamais supprimé :
   sans cet historique, impossible de repérer celui qui signale
   systématiquement ses concurrents.
   ============================================================ */

import { useState } from 'react'
import { Flag, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClyde } from '@/lib/clyde/store'
import type { ForumReply, ForumThread } from '@/lib/clyde/types'

/** Extrait court d'un contenu, pour juger sans ouvrir le fil. */
function excerpt(body: string, max = 180): string {
  const clean = body.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export function AdminModeration() {
  const threads = useClyde((s) => s.forumThreads)
  const replies = useClyde((s) => s.forumReplies)
  const reports = useClyde((s) => s.forumReports)
  const reviews = useClyde((s) => s.reviews)
  const reviewReports = useClyde((s) => s.reviewReports)
  const products = useClyde((s) => s.products)
  const businesses = useClyde((s) => s.businesses)
  const users = useClyde((s) => s.users)
  const hideForumContent = useClyde((s) => s.hideForumContent)
  const restoreForumContent = useClyde((s) => s.restoreForumContent)
  const hideReview = useClyde((s) => s.hideReview)
  const restoreReview = useClyde((s) => s.restoreReview)

  /* Le motif est saisi par cible, pas globalement : deux arbitrages
     ouverts en même temps ne doivent pas se voler leur texte. */
  const [notes, setNotes] = useState<Record<string, string>>({})

  /* Déclaré avant la file qui l'appelle : en `const`, l'appeler plus haut
     lèverait une erreur d'initialisation à l'exécution. */
  const targetOf = (
    type: 'thread' | 'reply',
    id: string,
  ): { label: string; body: string; authorId: string } | null => {
    if (type === 'thread') {
      const t: ForumThread | undefined = threads.find((x) => x.id === id)
      return t
        ? { label: 'Sujet', body: `${t.title} — ${excerpt(t.body)}`, authorId: t.author_user_id }
        : null
    }
    const r: ForumReply | undefined = replies.find((x) => x.id === id)
    return r ? { label: 'Réponse', body: excerpt(r.body), authorId: r.author_user_id } : null
  }

  /* Forum et avis arrivent dans une seule file, ramenés à une forme commune.
     Deux files séparées auraient laissé la seconde ignorée : l'équipe traite ce
     qu'elle voit. Chaque entrée porte sa propre décision, ce qui garde le JSX
     unique sans mêler les registres dans le store. */
  const pending: {
    key: string
    label: string
    body: string
    /** D'où vient le contenu, pour situer l'arbitrage d'un coup d'œil. */
    origin: string | null
    authorName: string | null | undefined
    reporterName: string
    reason: string
    createdAt: string
    hide: (note: string) => void
    reject: () => void
  }[] = [
    ...reports
      .filter((r) => r.resolved_at === null)
      .map((report) => {
        const target = targetOf(report.target_type, report.target_id)
        return {
          key: report.id,
          label: target?.label ?? 'Contenu',
          body: target?.body ?? '',
          origin: 'Forum',
          authorName: users.find((u) => u.id === target?.authorId)?.name,
          reporterName:
            users.find((u) => u.id === report.reporter_user_id)?.name ??
            'un membre',
          reason: report.reason,
          createdAt: report.created_at,
          hide: (note: string) =>
            hideForumContent({
              targetType: report.target_type,
              targetId: report.target_id,
              note,
            }),
          reject: () =>
            restoreForumContent({
              targetType: report.target_type,
              targetId: report.target_id,
            }),
        }
      }),
    ...reviewReports
      .filter((r) => r.resolved_at === null)
      .map((report) => {
        const review = reviews.find((x) => x.id === report.review_id)
        const business = businesses.find((b) => b.id === review?.business_id)
        const product = products.find((p) => p.id === review?.product_id)
        return {
          key: report.id,
          label: 'Avis client',
          body: review
            ? `${review.rating}/5 — ${excerpt(review.body ?? 'Note sans commentaire')}`
            : '',
          /* La vitrine visée, et l'article s'il y en a un : un avis se juge
             au regard de ce qu'il commente. */
          origin: business
            ? product
              ? `${business.name} · ${product.name}`
              : business.name
            : null,
          /* Le nom saisi, faute de compte : la plupart des clients n'en ont
             pas, et « un membre » masquerait la seule identification connue. */
          authorName: review?.author_name,
          reporterName:
            users.find((u) => u.id === report.reporter_user_id)?.name ??
            'un visiteur',
          reason: report.reason,
          createdAt: report.created_at,
          hide: (note: string) => hideReview({ reviewId: report.review_id, note }),
          reject: () => restoreReview({ reviewId: report.review_id }),
        }
      }),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt))


  /* Contenu masqué, tous motifs confondus : une décision doit pouvoir se
     défaire. Un masquage sans retour possible est une impasse. */
  const hidden: {
    id: string
    body: string
    note: string | null
    restore: () => void
  }[] = [
    ...threads
      .filter((t) => t.moderation === 'masque')
      .map((t) => ({
        id: t.id,
        body: t.title,
        note: t.moderation_note,
        restore: () =>
          restoreForumContent({ targetType: 'thread', targetId: t.id }),
      })),
    ...replies
      .filter((r) => r.moderation === 'masque')
      .map((r) => ({
        id: r.id,
        body: excerpt(r.body, 120),
        note: r.moderation_note,
        restore: () =>
          restoreForumContent({ targetType: 'reply', targetId: r.id }),
      })),
    /* Les avis masqués aussi : un avis caché à tort ferait perdre au commerçant
       un témoignage légitime, et l'auteur n'a aucun moyen de le redéposer. */
    ...reviews
      .filter((r) => r.moderation === 'masque')
      .map((r) => ({
        id: r.id,
        body: `Avis ${r.rating}/5 de ${r.author_name} — ${excerpt(r.body ?? '', 90)}`,
        note: r.moderation_note,
        restore: () => restoreReview({ reviewId: r.id }),
      })),
  ]

  return (
    <section
      id="arbitrage"
      className="scroll-mt-20 rounded-2xl border border-border bg-background p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Flag className="size-4 text-brand" aria-hidden="true" />
            Signalements à arbitrer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un message signalé reste visible jusqu&apos;à la décision. Le motif
            saisi ici est montré à son auteur.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs font-bold ${
            pending.length > 0
              ? 'bg-brand text-brand-foreground'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {pending.length} en attente
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="mt-5 rounded-xl bg-secondary/50 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun signalement en attente.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {pending.map((item) => {
            const note = notes[item.key] ?? ''

            return (
              <li
                key={item.key}
                className="rounded-xl border border-border bg-secondary/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-foreground px-2 py-0.5 font-mono font-bold text-background">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground">
                    signalé par {item.reporterName}
                  </span>
                  {item.authorName ? (
                    <span className="text-muted-foreground">
                      · écrit par {item.authorName}
                    </span>
                  ) : null}
                  {item.origin ? (
                    <span className="text-muted-foreground">· {item.origin}</span>
                  ) : null}
                </div>

                {/* Le contenu jugé, cité intégralement : on n'arbitre pas sur
                    la seule accusation. */}
                <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm leading-relaxed">
                  {item.body || (
                    <span className="text-muted-foreground italic">
                      Contenu introuvable — il a peut-être été supprimé.
                    </span>
                  )}
                </blockquote>

                <p className="mt-3 text-sm">
                  <span className="font-semibold">Motif invoqué : </span>
                  <span className="text-muted-foreground">{item.reason}</span>
                </p>

                <label
                  className="mt-4 block text-xs font-semibold"
                  htmlFor={`note-${item.key}`}
                >
                  Motif du masquage, montré à l&apos;auteur
                </label>
                <textarea
                  id={`note-${item.key}`}
                  value={note}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [item.key]: e.target.value }))
                  }
                  rows={2}
                  placeholder="Expliquez la décision en une phrase."
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    /* Masquer sans motif priverait l'auteur de la raison :
                       une sanction muette n'apprend rien et ne se contexte
                       pas. Le bouton reste donc fermé jusqu'au motif. */
                    disabled={note.trim().length === 0}
                    onClick={() => item.hide(note)}
                  >
                    <EyeOff className="size-4" aria-hidden="true" />
                    Masquer le contenu
                  </Button>
                  <Button size="sm" variant="outline" onClick={item.reject}>
                    <Eye className="size-4" aria-hidden="true" />
                    Rejeter le signalement
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {hidden.length > 0 ? (
        <div className="mt-8 border-t border-border pt-5">
          <h3 className="text-sm font-bold">Contenu masqué</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Toute décision doit pouvoir se défaire.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {hidden.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.body}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.note ?? 'Sans motif enregistré'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={item.restore}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Rétablir
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
