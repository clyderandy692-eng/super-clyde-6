'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EyeOff, Flag, ShieldAlert } from 'lucide-react'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { relativeTime } from '@/lib/clyde/text'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import type { ForumReply, ForumThread } from '@/lib/clyde/types'
import { cn } from '@/lib/utils'

/**
 * Qui lit le forum.
 *
 * Rassemblé dans un seul hook parce que trois informations vont toujours
 * ensemble : l'identité du lecteur, son statut d'équipe (qui voit les contenus
 * masqués) et la page qu'il pourra signer. Séparées, la troisième finissait par
 * être oubliée dans un composant, qui publiait alors des messages anonymes.
 */
export function useForumReader() {
  const ready = useClydeReady()
  const userId = useSession((s) => s.userId)
  const role = useSession((s) => s.role)
  const businesses = useClyde((s) => s.businesses)

  /* Avant réhydratation on se déclare déconnecté : c'est l'état du serveur,
     donc celui qui n'entraîne pas de divergence d'hydratation. */
  const signedIn = ready && Boolean(userId)
  const isStaff = signedIn && role === 'admin'

  /* La première page du lecteur signe ses messages. Un commerçant qui tient
     deux commerces écrit donc sous le premier : le forum n'est pas un canal de
     vente, l'important est qu'on sache à qui l'on parle. */
  const business = signedIn
    ? (businesses.find((b) => b.owner_id === userId) ?? null)
    : null

  return {
    ready,
    signedIn,
    isStaff,
    userId: signedIn ? userId : null,
    businessId: business?.id ?? null,
    business,
  }
}

/**
 * Signature d'un message : qui a écrit, depuis quel commerce, il y a combien.
 *
 * `relativeTime` n'est calculé qu'après réhydratation : évalué au rendu
 * serveur, il donnerait une ancienneté figée à l'heure du build, que le client
 * corrigerait aussitôt — React signale alors une divergence d'hydratation.
 */
export function AuthorLine({
  userId,
  businessId,
  at,
}: {
  userId: string
  businessId: string | null
  at: string
}) {
  const t = useT()
  const { locale } = useLocale()
  const ready = useClydeReady()
  const users = useClyde((s) => s.users)
  const businesses = useClyde((s) => s.businesses)

  const user = users.find((u) => u.id === userId) ?? null
  const business = businessId
    ? (businesses.find((b) => b.id === businessId) ?? null)
    : null

  /* Le badge se lit sur le rôle de l'auteur, jamais sur l'absence de commerce :
     un commerçant qui n'a pas encore publié sa page n'a pas de commerce à citer
     et passait pour l'équipe CLYDE — soit la parole officielle attribuée à un
     inconnu, sur les pages mêmes où l'on annonce les tarifs. */
  const staff = user?.role === 'admin'

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
      <span className="font-semibold">{user?.name ?? '—'}</span>

      {staff ? (
        <span className="rounded-full bg-brand px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.12em] text-brand-foreground uppercase">
          {t.forum.staffBadge}
        </span>
      ) : business ? (
        /* Le nom du commerce mène à sa page : sur un forum de commerçants, la
           question « il tient quoi, lui ? » se pose à chaque message. */
        <Link
          href={`/${business.slug}`}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {business.name}
        </Link>
      ) : null}

      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      <span className="font-mono text-[11px] text-muted-foreground">
        {/* `suppressHydrationWarning` ne suffirait pas : on rend une chaîne
            stable avant réhydratation, puis l'ancienneté réelle. */}
        {ready ? relativeTime(at, new Date(), locale) : ''}
      </span>
    </div>
  )
}

/**
 * Bandeau d'état d'un contenu modéré.
 *
 * Ne rend rien pour un contenu ordinaire : c'est ce qui permet de l'appeler
 * sans condition depuis les deux écrans, sans risquer d'en oublier un.
 */
export function ModerationNotice({
  content,
  isAuthor,
}: {
  content: Pick<ForumThread | ForumReply, 'id' | 'moderation' | 'moderation_note'>
  isAuthor: boolean
}) {
  const t = useT()
  const role = useSession((s) => s.role)
  const viewerId = useSession((s) => s.userId)
  const reports = useClyde((s) => s.forumReports)

  const hidden = content.moderation === 'masque'

  /* Le masquage se dit à tout le monde : il laisse un vide dans la discussion,
     et un vide inexpliqué se lit comme une censure. L'attente d'arbitrage, en
     revanche, ne regarde que l'auteur, celui qui a signalé, et l'admin qui doit
     trancher. L'afficher à tous transformait un simple clic sur « Signaler » en
     accusation publique — de quoi salir la réponse d'un concurrent sans qu'une
     décision ait été prise. */
  const isReporter =
    viewerId !== null &&
    reports.some(
      (r) =>
        r.target_id === content.id &&
        r.resolved_at === null &&
        r.reporter_user_id === viewerId,
    )
  const canSeePending = isAuthor || isReporter || role === 'admin'

  if (content.moderation === 'visible') return null
  if (!hidden && !canSeePending) return null

  return (
    <div
      className={cn(
        'mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed',
        hidden
          ? 'border-destructive/30 bg-destructive/10 text-foreground'
          : 'border-border bg-secondary text-muted-foreground',
      )}
    >
      {hidden ? (
        <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <div>
        <p className="font-semibold">
          {hidden
            ? isAuthor
              ? t.forum.hiddenOwn
              : t.forum.hidden
            : t.forum.reported}
        </p>
        {hidden && content.moderation_note ? (
          <p className="mt-1 text-muted-foreground">
            {t.forum.hiddenReason} {content.moderation_note}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Petit formulaire de motif, déplié sous le message.
 *
 * Préféré à `window.prompt` pour trois raisons : le texte natif n'est pas
 * traduisible, la fenêtre ne suit pas l'apparence du site, et sur mobile elle
 * recouvre le message que l'on est précisément en train de juger.
 */
function ReasonForm({
  label,
  placeholder,
  submitLabel,
  destructive,
  onSubmit,
  onCancel,
}: {
  label: string
  placeholder: string
  submitLabel: string
  destructive?: boolean
  onSubmit: (reason: string) => void
  onCancel: () => void
}) {
  const t = useT()
  const [value, setValue] = useState('')
  const reason = value.trim()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!reason) return
        onSubmit(reason)
      }}
      className="mt-3 rounded-xl border border-border bg-secondary p-3"
    >
      <label className="block text-[13px] leading-relaxed font-semibold">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus
        className="mt-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-foreground"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="submit"
          /* Désactivé tant que le motif est vide : un signalement sans grief
             est inarbitrable, et un masquage sans motif n'apprend rien. */
          disabled={!reason}
          className={cn(
            'rounded-lg px-3.5 py-2 text-[13px] font-bold transition-transform active:scale-[0.97] disabled:opacity-40',
            destructive
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-foreground text-background',
          )}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground"
        >
          {t.forum.cancel}
        </button>
      </div>
    </form>
  )
}

/**
 * Bouton de signalement.
 *
 * Absent pour l'auteur du message : se signaler soi-même n'a pas de sens et
 * encombrerait la file de modération. Absent aussi pour un visiteur sans
 * compte — un signalement anonyme ne se recoupe pas.
 */
export function ReportButton({
  targetType,
  targetId,
  authorUserId,
}: {
  targetType: 'thread' | 'reply'
  targetId: string
  authorUserId: string
}) {
  const t = useT()
  const { userId, signedIn } = useForumReader()
  const reports = useClyde((s) => s.forumReports)
  const report = useClyde((s) => s.reportForumContent)
  const [open, setOpen] = useState(false)

  const already = Boolean(
    userId &&
      reports.some(
        (r) => r.target_id === targetId && r.reporter_user_id === userId,
      ),
  )

  if (!signedIn || !userId || userId === authorUserId) return null

  if (already) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <Flag className="size-3.5" aria-hidden="true" />
        {t.forum.reportAlready}
      </span>
    )
  }

  if (open) {
    return (
      <ReasonForm
        label={t.forum.reportBody}
        placeholder={t.forum.reportPlaceholder}
        submitLabel={t.forum.reportSend}
        destructive
        onCancel={() => setOpen(false)}
        onSubmit={(reason) => {
          report({ targetType, targetId, reporterUserId: userId, reason })
          setOpen(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-destructive"
    >
      <Flag className="size-3.5" aria-hidden="true" />
      {t.forum.report}
    </button>
  )
}

/**
 * Outils de modération, réservés à l'équipe.
 *
 * Masquer exige un motif : une sanction muette laisse l'auteur republier le
 * même message, et la file de modération se remplit deux fois.
 */
export function ModerationTools({
  targetType,
  targetId,
  moderation,
}: {
  targetType: 'thread' | 'reply'
  targetId: string
  moderation: ForumThread['moderation']
}) {
  const t = useT()
  const { isStaff } = useForumReader()
  const hide = useClyde((s) => s.hideForumContent)
  const restore = useClyde((s) => s.restoreForumContent)
  const [open, setOpen] = useState(false)

  if (!isStaff) return null

  if (moderation === 'masque') {
    return (
      <button
        type="button"
        onClick={() => restore({ targetType, targetId })}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-brand transition-colors hover:underline"
      >
        {t.forum.restore}
      </button>
    )
  }

  if (open) {
    return (
      <ReasonForm
        label={t.forum.hideReasonLabel}
        placeholder={t.forum.reportPlaceholder}
        submitLabel={t.forum.hide}
        destructive
        onCancel={() => setOpen(false)}
        onSubmit={(note) => {
          hide({ targetType, targetId, note })
          setOpen(false)
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-destructive transition-colors hover:underline"
    >
      <EyeOff className="size-3.5" aria-hidden="true" />
      {t.forum.hide}
    </button>
  )
}
