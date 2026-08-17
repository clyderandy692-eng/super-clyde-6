'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, Pin, Plus } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { PageHeader } from '@/components/clyde/pages/page-shell'
import { AuthorLine, ModerationNotice, useForumReader } from './shared'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { bi } from '@/lib/clyde/formation'
import {
  FORUM_CATEGORIES,
  categoryMeta,
  excerpt,
  replyCount,
  visibleThreads,
} from '@/lib/clyde/forum'
import { useClyde } from '@/lib/clyde/store'
import type { ForumCategory, ForumThread } from '@/lib/clyde/types'
import { cn } from '@/lib/utils'

/** Le forum : rubriques, fils, et le bouton pour en ouvrir un. */
export function ForumList() {
  const t = useT()
  const [category, setCategory] = useState<ForumCategory | 'toutes'>('toutes')
  const [composing, setComposing] = useState(false)

  const { ready, userId, isStaff } = useForumReader()
  const threads = useClyde((s) => s.forumThreads)
  const replies = useClyde((s) => s.forumReplies)

  /* Avant réhydratation la liste est vide : les fils vivent dans le stockage
     local, et les rendre au serveur ferait diverger l'hydratation. */
  const shown = ready ? visibleThreads(threads, userId, isStaff, category) : []

  return (
    <>
      <PageHeader
        badge={t.forum.badge}
        title={t.forum.title}
        subtitle={t.forum.subtitle}
      />

      <div className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <Filters
          category={category}
          onChange={setCategory}
          count={shown.length}
        />

        <Composer
          open={composing}
          onOpen={() => setComposing(true)}
          onClose={() => setComposing(false)}
          category={category}
        />

        {/* `ready` retiré de la condition de vide : sinon, le temps de la
            réhydratation, la page affichait « personne n'a ouvert de fil »
            avant de se remplir — un forum désert pendant une fraction de
            seconde suffit à décourager. */}
        {!ready ? null : shown.length === 0 ? (
          <EmptyCategory onOpen={() => setComposing(true)} />
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {shown.map((thread, i) => (
              <Reveal key={thread.id} delay={Math.min(i, 6) * 50} as="li">
                <ThreadRow
                  thread={thread}
                  replies={replyCount(replies, thread.id)}
                  isAuthor={thread.author_user_id === userId}
                />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

/** Filtre par rubrique. Chaque rubrique porte sa raison d'être. */
function Filters({
  category,
  onChange,
  count,
}: {
  category: ForumCategory | 'toutes'
  onChange: (c: ForumCategory | 'toutes') => void
  count: number
}) {
  const t = useT()
  const { locale } = useLocale()

  return (
    <div className="border-b border-border pb-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'toutes' as const, label: t.forum.all },
            ...FORUM_CATEGORIES.map((c) => ({
              id: c.id,
              label: bi(c.label, locale),
            })),
          ]
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={category === c.id}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
              category === c.id
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
        {category === 'toutes'
          ? t.forum.threadsCount(count)
          : bi(categoryMeta(category).note, locale)}
      </p>
    </div>
  )
}

/**
 * Ouvrir un fil.
 *
 * Le formulaire ne s'ouvre qu'au clic : déplié en permanence, il occuperait le
 * haut de la page et donnerait à croire qu'il faut écrire avant de lire.
 */
function Composer({
  open,
  onOpen,
  onClose,
  category,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
  category: ForumCategory | 'toutes'
}) {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const { signedIn, userId, businessId, isStaff } = useForumReader()
  const createThread = useClyde((s) => s.createForumThread)

  /* La rubrique du filtre est présélectionnée — on écrit presque toujours dans
     celle qu'on parcourt. « Annonces » est réservée à l'équipe, donc jamais
     retenue pour un commerçant. */
  const openable = FORUM_CATEGORIES.filter((c) => isStaff || !c.staffOnly)
  const initial: ForumCategory =
    category !== 'toutes' && openable.some((c) => c.id === category)
      ? category
      : openable[0].id

  const [chosen, setChosen] = useState<ForumCategory>(initial)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  /* `useState(initial)` ne sert qu'au premier montage : sans cette reprise, un
     commerçant qui filtre sur « Technique » puis ouvre le formulaire écrirait
     dans « Entraide », la rubrique retenue au chargement de la page.

     La dépendance est `open` seul, volontairement : réagir aussi à `initial`
     écraserait la rubrique choisie à la main dès que le filtre change derrière
     le formulaire ouvert. */
  useEffect(() => {
    if (open) setChosen(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!signedIn) {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5">
        <p className="text-sm text-muted-foreground">{t.forum.signedOut}</p>
        <Link
          href="/connexion"
          className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          {t.forum.signedOutCta}
        </Link>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.97]"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t.forum.newThread}
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        /* Les deux seuils sont volontairement bas : on refuse « aidez moi »,
           pas un français approximatif. Un forum qui corrige la forme fait
           taire ceux qui en ont le plus besoin. */
        if (title.trim().length < 12) {
          setError(t.forum.titleTooShort)
          return
        }
        if (body.trim().length < 30) {
          setError(t.forum.bodyTooShort)
          return
        }
        const id = createThread({
          authorUserId: userId!,
          authorBusinessId: businessId,
          category: chosen,
          title,
          body,
        })
        /* On emmène l'auteur dans son fil : rester sur la liste lui laisserait
           chercher son propre message parmi les autres. */
        router.push(`/forum/${id}`)
      }}
      className="mt-6 rounded-2xl border border-border bg-background p-5"
    >
      <h2 className="text-base font-semibold">{t.forum.newThreadTitle}</h2>

      <label className="mt-4 block text-[13px] font-semibold">
        {t.forum.categoryLabel}
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {openable.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChosen(c.id)}
            aria-pressed={chosen === c.id}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors',
              chosen === c.id
                ? 'border-foreground bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {bi(c.label, locale)}
          </button>
        ))}
      </div>

      <label
        htmlFor="forum-title"
        className="mt-5 block text-[13px] font-semibold"
      >
        {t.forum.titleLabel}
      </label>
      <input
        id="forum-title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setError(null)
        }}
        placeholder={t.forum.titlePlaceholder}
        className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-foreground"
      />

      <label
        htmlFor="forum-body"
        className="mt-4 block text-[13px] font-semibold"
      >
        {t.forum.bodyLabel}
      </label>
      <textarea
        id="forum-body"
        value={body}
        onChange={(e) => {
          setBody(e.target.value)
          setError(null)
        }}
        placeholder={t.forum.bodyPlaceholder}
        rows={5}
        className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:border-foreground"
      />

      {error ? (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.97]"
        >
          {t.forum.publish}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {t.forum.cancel}
        </button>
      </div>
    </form>
  )
}

function EmptyCategory({ onOpen }: { onOpen: () => void }) {
  const t = useT()
  const { signedIn } = useForumReader()

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{t.forum.emptyCategory}</p>
      {signedIn ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-3 text-sm font-semibold text-brand underline-offset-4 hover:underline"
        >
          {t.forum.emptyCategoryCta}
        </button>
      ) : null}
    </div>
  )
}

/** Une ligne de la liste : de quoi décider si l'on ouvre le fil. */
function ThreadRow({
  thread,
  replies,
  isAuthor,
}: {
  thread: ForumThread
  replies: number
  isAuthor: boolean
}) {
  const t = useT()
  const { locale } = useLocale()

  return (
    <article className="rounded-2xl border border-border bg-background p-5 transition-colors hover:border-foreground/25">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase">
          {bi(categoryMeta(thread.category).label, locale)}
        </span>
        {thread.pinned ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold tracking-[0.14em] text-brand uppercase">
            <Pin className="size-3" aria-hidden="true" />
            {t.forum.pinned}
          </span>
        ) : null}
      </div>

      <h2 className="mt-3 text-pretty text-lg leading-snug font-semibold">
        <Link href={`/forum/${thread.id}`} className="hover:text-brand">
          {thread.title}
        </Link>
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {excerpt(thread.body)}
      </p>

      <ModerationNotice content={thread} isAuthor={isAuthor} />

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <AuthorLine
          userId={thread.author_user_id}
          businessId={thread.author_business_id}
          at={thread.last_activity_at}
        />
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {t.forum.repliesCount(replies)}
        </span>
      </footer>
    </article>
  )
}
