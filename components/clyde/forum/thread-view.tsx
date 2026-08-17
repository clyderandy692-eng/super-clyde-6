'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare, Pin } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import {
  AuthorLine,
  ModerationNotice,
  ModerationTools,
  ReportButton,
  useForumReader,
} from './shared'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { bi } from '@/lib/clyde/formation'
import { canRead, categoryMeta, visibleReplies } from '@/lib/clyde/forum'
import { useClyde } from '@/lib/clyde/store'
import type { ForumReply } from '@/lib/clyde/types'

/** Un fil et ses réponses. */
export function ThreadView({ threadId }: { threadId: string }) {
  const t = useT()
  const { locale } = useLocale()
  const { ready, userId, isStaff } = useForumReader()
  const threads = useClyde((s) => s.forumThreads)
  const replies = useClyde((s) => s.forumReplies)

  const thread = threads.find((th) => th.id === threadId) ?? null

  /* Trois états distincts, et non un seul « introuvable » : tant que le
     stockage n'est pas relu, on ne sait RIEN — annoncer l'absence à ce moment
     ferait clignoter un « fil introuvable » sur chaque chargement. */
  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-secondary" />
      </div>
    )
  }

  if (!thread || !canRead(thread, userId, isStaff)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {t.forum.notFound}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t.forum.notFoundBody}
        </p>
        <BackLink />
      </div>
    )
  }

  const shown = visibleReplies(replies, thread.id, userId, isStaff)
  const isAuthor = thread.author_user_id === userId

  return (
    <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
      <BackLink />

      <article className="mt-5">
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

        <h1 className="mt-4 text-balance text-3xl leading-[1.1] font-bold tracking-[-0.02em] sm:text-4xl">
          {thread.title}
        </h1>

        <div className="mt-4 border-b border-border pb-5">
          <AuthorLine
            userId={thread.author_user_id}
            businessId={thread.author_business_id}
            at={thread.created_at}
          />
        </div>

        {/* `whitespace-pre-line` : les commerçants écrivent en paragraphes et en
            listes tapées à la main. Sans lui, tout s'écraserait en un bloc. */}
        <div className="mt-5 whitespace-pre-line text-[15px] leading-relaxed">
          {thread.body}
        </div>

        <ModerationNotice content={thread} isAuthor={isAuthor} />

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <ReportButton
            targetType="thread"
            targetId={thread.id}
            authorUserId={thread.author_user_id}
          />
          <ModerationTools
            targetType="thread"
            targetId={thread.id}
            moderation={thread.moderation}
          />
        </div>
      </article>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 border-b border-border pb-3 text-sm font-bold tracking-tight">
          <MessageSquare className="size-4 text-brand" aria-hidden="true" />
          {t.forum.repliesTitle(shown.length)}
        </h2>

        {shown.length === 0 ? (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {t.forum.repliesCount(0)}
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-4">
            {shown.map((reply, i) => (
              <Reveal key={reply.id} delay={Math.min(i, 6) * 50} as="li">
                <ReplyCard reply={reply} isAuthor={reply.author_user_id === userId} />
              </Reveal>
            ))}
          </ul>
        )}

        <ReplyForm threadId={thread.id} />
      </section>
    </div>
  )
}

function BackLink() {
  const t = useT()
  return (
    <Link
      href="/forum"
      className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {t.forum.backToForum}
    </Link>
  )
}

function ReplyCard({
  reply,
  isAuthor,
}: {
  reply: ForumReply
  isAuthor: boolean
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-5">
      <AuthorLine
        userId={reply.author_user_id}
        businessId={reply.author_business_id}
        at={reply.created_at}
      />
      <div className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">
        {reply.body}
      </div>

      <ModerationNotice content={reply} isAuthor={isAuthor} />

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <ReportButton
          targetType="reply"
          targetId={reply.id}
          authorUserId={reply.author_user_id}
        />
        <ModerationTools
          targetType="reply"
          targetId={reply.id}
          moderation={reply.moderation}
        />
      </div>
    </article>
  )
}

/**
 * Répondre.
 *
 * Le champ est toujours déplié, à l'inverse du formulaire d'ouverture de fil :
 * on arrive dans un fil précisément parce qu'on a quelque chose à y dire.
 */
function ReplyForm({ threadId }: { threadId: string }) {
  const t = useT()
  const { signedIn, userId, businessId } = useForumReader()
  const addReply = useClyde((s) => s.createForumReply)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!signedIn) {
    return (
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5">
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (body.trim().length < 10) {
          setError(t.forum.replyTooShort)
          return
        }
        addReply({
          threadId,
          authorUserId: userId!,
          authorBusinessId: businessId,
          body,
        })
        setBody('')
        setError(null)
      }}
      className="mt-8 rounded-2xl border border-border bg-background p-5"
    >
      <label htmlFor="forum-reply" className="block text-sm font-semibold">
        {t.forum.replyTitle}
      </label>
      <textarea
        id="forum-reply"
        value={body}
        onChange={(e) => {
          setBody(e.target.value)
          setError(null)
        }}
        placeholder={t.forum.replyPlaceholder}
        rows={4}
        className="mt-3 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:border-foreground"
      />
      {error ? (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="mt-4 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background transition-transform active:scale-[0.98]"
      >
        {t.forum.reply}
      </button>
    </form>
  )
}
