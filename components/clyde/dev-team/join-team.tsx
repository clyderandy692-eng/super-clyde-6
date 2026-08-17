'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Send, UsersRound, Check, Mailbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/clyde/i18n'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import type { AdminMessage } from '@/lib/clyde/types'

/**
 * L'équipe de développement — ce qu'ailleurs on appellerait « la newsletter ».
 *
 * Le monde CLYDE ne fait pas s'abonner, il recrute : le formulaire dit
 * « rejoindre l'équipe » et le contenu envoyé est le compte-rendu du Forum.
 * Le vocabulaire n'est pas décoratif — c'est la promesse faite à l'inscrit.
 *
 * Trois formes pour trois moments, un seul formulaire dessous :
 * - `JoinTeamPanel` : le bloc complet, montré juste après la création d'une page,
 *    quand le commerçant vient de comprendre ce que l'Usine fabrique ;
 * - `JoinTeamCollapsible` : replié en tête du Forum, pour ne pas repousser vers
 *    le bas les fils que le visiteur est venu lire ;
 * - `FactoryMailSection` : dans le tableau de bord, l'inscription ET le courrier
 *    direct à l'administration.
 *
 * Les trois passent par `joinTeam`, qui refuse les doublons : sans ce point
 * unique, chaque emplacement aurait eu sa propre idée de ce qu'est un doublon.
 */

/* ============================================================
   Déjà membre ? — partagé par le panneau et la section du tableau de bord
   ============================================================ */

/**
 * Vrai si le compte connecté figure déjà dans l'équipe de développement.
 * La correspondance se fait sur le numéro WhatsApp (seule clé que `joinTeam`
 * dédoublonne) : chiffres seuls, pour que « +237 6… » et « 2376… » se
 * reconnaissent. Un membre inscrit ne doit plus voir le formulaire dans son
 * tableau de bord — il recevrait l'invitation à rejoindre une équipe dont il
 * fait déjà partie.
 */
function useIsTeamMember(): boolean {
  useClydeReady()
  const userId = useSession((s) => s.userId)
  return useClyde((s) => {
    if (!userId) return false
    const account = s.users.find((u) => u.id === userId)
    const digits = account?.whatsapp_number?.replace(/\D/g, '') ?? ''
    if (!digits) return false
    return s.teamMembers.some((m) => m.whatsapp.replace(/\D/g, '') === digits)
  })
}

/* ============================================================
   Le formulaire d'inscription, commun aux trois formes
   ============================================================ */

function JoinTeamForm({
  source,
  className,
}: {
  source: 'landing' | 'forum' | 'page-creee' | 'tableau-de-bord'
  className?: string
}) {
  const t = useT()
  const d = t.devTeam
  /* Sans cette demande, la liste enregistrée resterait ignorée : le contrôle de
     doublon porterait sur un tableau vide et réinscrirait la même personne. */
  useClydeReady()
  const joinTeam = useClyde((s) => s.joinTeam)
  const userId = useSession((s) => s.userId)
  const account = useClyde((s) =>
    userId ? (s.users.find((u) => u.id === userId) ?? null) : null,
  )

  /* `useId` et non des identifiants écrits en dur : le formulaire apparaît
     plusieurs fois sur la même page (tableau de bord), et des `id` identiques
     feraient pointer chaque libellé vers le premier champ trouvé. */
  const uid = useId()
  /* Préremplissage depuis le compte connecté, avec la même règle que le courrier
     à l'Usine : `null` veut dire « champ non touché », de sorte que la valeur du
     compte apparaisse même arrivée après le premier rendu. On ne redemande pas à
     quelqu'un un numéro que l'Usine détient déjà. */
  const [nameEdit, setNameEdit] = useState<string | null>(null)
  const [whatsappEdit, setWhatsappEdit] = useState<string | null>(null)
  const [emailEdit, setEmailEdit] = useState<string | null>(null)
  const name = nameEdit ?? account?.name ?? ''
  const whatsapp = whatsappEdit ?? account?.whatsapp_number ?? ''
  const email = emailEdit ?? account?.email ?? ''
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(d.errorName)
      return
    }
    /* Le contrôle de forme est ici, le contrôle métier dans le store. On ne
       duplique pas la règle : on empêche seulement d'envoyer un numéro
       manifestement incomplet, pour donner un message précis tout de suite. */
    if (whatsapp.replace(/\D/g, '').length < 8) {
      setError(d.errorWhatsapp)
      return
    }

    const ok = joinTeam({
      name,
      whatsapp,
      email,
      source,
      userId,
    })
    /* `false` ne peut plus venir que du doublon, les deux autres refus étant
       déjà écartés au-dessus. Le dire précisément évite le « une erreur est
       survenue » qui laisse l'inscrit sans rien à faire. */
    if (!ok) {
      setError(d.errorDuplicate)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-5',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Check className="size-4" aria-hidden="true" />
          </span>
          <p className="text-base font-bold">{d.successTitle}</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {d.successBody}
        </p>
        <Link
          href="/forum"
          className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-bold text-background"
        >
          {d.successForum}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-nom`} className="text-sm font-semibold">
          {d.nameLabel}
        </label>
        <input
          id={`${uid}-nom`}
          value={name}
          onChange={(e) => setNameEdit(e.target.value)}
          required
          autoComplete="name"
          placeholder={d.namePlaceholder}
          className="min-h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-whatsapp`} className="text-sm font-semibold">
          {d.whatsappLabel}
        </label>
        <input
          id={`${uid}-whatsapp`}
          value={whatsapp}
          onChange={(e) => setWhatsappEdit(e.target.value)}
          required
          /* `tel` et non `text` : sur téléphone, le pavé numérique s'ouvre
             directement, ce qui est le geste attendu pour un numéro. */
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={d.whatsappPlaceholder}
          aria-describedby={`${uid}-whatsapp-aide`}
          className="min-h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <p id={`${uid}-whatsapp-aide`} className="text-xs text-muted-foreground">
          {d.whatsappHint}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${uid}-email`}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          {d.emailLabel}
          {/* Le caractère facultatif est écrit, pas deviné : sans cette mention,
              l'inscrit croit le champ obligatoire et abandonne s'il n'a pas
              d'adresse. */}
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            {d.emailOptional}
          </span>
        </label>
        <input
          id={`${uid}-email`}
          value={email}
          onChange={(e) => setEmailEdit(e.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={d.emailPlaceholder}
          className="min-h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98]"
      >
        <UsersRound className="size-4" aria-hidden="true" />
        {d.submit}
      </button>
    </form>
  )
}

/* ============================================================
   Forme 1 — le bloc complet
   ============================================================ */

/**
 * Le bloc entier, avec sa promesse.
 *
 * Montré après la création d'une page : à cet instant le commerçant vient de
 * fabriquer quelque chose avec les outils de l'Usine, et l'invitation à décider
 * de la suite tombe juste. Le même bloc sert de référence visuelle ailleurs.
 */
export function JoinTeamPanel({
  source = 'page-creee',
  className,
}: {
  source?: 'landing' | 'forum' | 'page-creee' | 'tableau-de-bord'
  className?: string
}) {
  const t = useT()
  const d = t.devTeam
  const alreadyMember = useIsTeamMember()

  /* Déjà recruté : le bloc disparaît au lieu de proposer une inscription
     qui échouerait sur le contrôle de doublon. */
  if (alreadyMember) return null

  return (
    <section
      className={cn(
        'flex flex-col gap-5 rounded-3xl border bg-card p-6 md:flex-row md:gap-8 md:p-8',
        className,
      )}
      aria-labelledby="equipe-dev-titre"
    >
      <div className="flex flex-col gap-3 md:flex-1">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-brand uppercase">
          <UsersRound className="size-3.5" aria-hidden="true" />
          {d.badge}
        </span>
        <h2
          id="equipe-dev-titre"
          className="text-balance text-2xl font-bold tracking-tight md:text-3xl"
        >
          {d.title}
        </h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {d.subtitle}
        </p>
        <p className="text-pretty rounded-xl border border-dashed bg-secondary/40 px-4 py-3 text-sm leading-relaxed">
          {d.promise}
        </p>
      </div>

      <div className="md:w-80 md:shrink-0">
        <JoinTeamForm source={source} />
      </div>
    </section>
  )
}

/* ============================================================
   Forme 2 — le dépliant du Forum
   ============================================================ */

/**
 * Version repliée, pour la tête du Forum.
 *
 * Fermée par défaut : le visiteur du Forum vient lire des fils, et un bloc
 * déployé d'office repousserait tout le contenu sous la ligne de flottaison.
 * Elle ne prend que la place d'une ligne tant qu'on ne l'ouvre pas.
 */
export function JoinTeamCollapsible({ className }: { className?: string }) {
  const t = useT()
  const d = t.devTeam
  const [open, setOpen] = useState(false)
  const panneau = useId()

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-card',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panneau}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <UsersRound className="size-4" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-bold">
              {open ? d.toggleClose : d.toggleOpen}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {d.toggleHint}
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Rendu conditionnel et non simple masquage : un champ caché mais présent
          reste atteignable au clavier, et l'utilisateur tabulerait dans un
          formulaire qu'il ne voit pas. */}
      {open ? (
        <div id={panneau} className="flex flex-col gap-4 border-t px-4 py-4">
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {d.subtitle}
          </p>
          <JoinTeamForm source="forum" />
        </div>
      ) : null}
    </section>
  )
}

/* ============================================================
   Forme 3 — courrier direct à l'Usine
   ============================================================ */

const TOPICS: AdminMessage['topic'][] = ['idee', 'probleme', 'aide', 'autre']

/**
 * Le formulaire de courrier direct à l'administration CLYDE.
 *
 * Distinct du Forum, et le texte le dit : une question posée au Forum est
 * publique et sert à d'autres, celle-ci arrive à l'Usine seule. Confondre les
 * deux aurait exposé sur la place publique un message destiné à l'administration.
 */
function ContactFactoryForm() {
  const t = useT()
  const d = t.devTeam
  useClydeReady()
  const messageAdmin = useClyde((s) => s.messageAdmin)
  const userId = useSession((s) => s.userId)
  /* Le compte connaît déjà le nom et le numéro : les redemander obligerait le
     commerçant à ressaisir ce que l'Usine sait de lui, et un envoi échouait
     simplement parce que le champ de contact était resté vide. */
  const account = useClyde((s) =>
    userId ? (s.users.find((u) => u.id === userId) ?? null) : null,
  )

  const uid = useId()
  /* `null` signifie « le champ n'a pas encore été touché » et laisse la valeur du
     compte s'afficher. Un simple `useState(account?.name)` aurait figé une valeur
     vide : au premier rendu le magasin n'est pas encore relu, et le préremplissage
     n'arriverait jamais. */
  const [nameEdit, setNameEdit] = useState<string | null>(null)
  const [whatsappEdit, setWhatsappEdit] = useState<string | null>(null)
  const [emailEdit, setEmailEdit] = useState<string | null>(null)
  const senderName = nameEdit ?? account?.name ?? ''
  const whatsapp = whatsappEdit ?? account?.whatsapp_number ?? ''
  const email = emailEdit ?? account?.email ?? ''
  const [topic, setTopic] = useState<AdminMessage['topic']>('idee')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!body.trim()) {
      setError(d.errorMessage)
      return
    }
    if (!whatsapp.trim() && !email.trim()) {
      setError(d.errorChannel)
      return
    }

    const ok = messageAdmin({
      senderName,
      whatsapp,
      email,
      topic,
      body,
      userId,
    })
    if (!ok) {
      setError(d.errorChannel)
      return
    }
    setSent(true)
    setBody('')
  }

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Check className="size-3.5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed">{d.contactSuccess}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-sujet`} className="text-sm font-semibold">
          {d.topicLabel}
        </label>
        <select
          id={`${uid}-sujet`}
          value={topic}
          onChange={(e) => setTopic(e.target.value as AdminMessage['topic'])}
          className="min-h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {TOPICS.map((k) => (
            <option key={k} value={k}>
              {d.topics[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-nom`} className="text-sm font-semibold">
          {d.nameLabel}
        </label>
        <input
          id={`${uid}-nom`}
          value={senderName}
          onChange={(e) => setNameEdit(e.target.value)}
          autoComplete="name"
          placeholder={d.namePlaceholder}
          className="min-h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`${uid}-wa`} className="text-sm font-semibold">
            {d.whatsappLabel}
          </label>
          <input
            id={`${uid}-wa`}
            value={whatsapp}
            onChange={(e) => setWhatsappEdit(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={d.whatsappPlaceholder}
            className="min-h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`${uid}-mail`} className="text-sm font-semibold">
            {d.emailLabel}
          </label>
          <input
            id={`${uid}-mail`}
            value={email}
            onChange={(e) => setEmailEdit(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={d.emailPlaceholder}
            className="min-h-11 rounded-xl border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-msg`} className="text-sm font-semibold">
          {d.messageLabel}
        </label>
        <textarea
          id={`${uid}-msg`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          required
          placeholder={d.messagePlaceholder}
          className="resize-none rounded-xl border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-transform active:scale-[0.98]"
      >
        <Send className="size-4" aria-hidden="true" />
        {d.contactSubmit}
      </button>
    </form>
  )
}

/**
 * Le bloc du tableau de bord : rejoindre l'équipe et écrire à l'Usine.
 *
 * Les deux sont côte à côte parce qu'un commerçant qui veut peser sur la suite
 * hésite entre les deux gestes ; les séparer sur deux écrans l'aurait obligé à
 * choisir avant de savoir lequel correspond à son besoin.
 */
export function FactoryMailSection({
  className,
  /**
   * Permet de retirer la moitié « rejoindre l'équipe » quand `JoinTeamPanel` est
   * déjà présent sur le même écran. Deux formulaires d'inscription côte à côte
   * feraient douter de leur différence, et l'un des deux resterait ignoré.
   */
  showJoin = true,
}: {
  className?: string
  showJoin?: boolean
}) {
  const t = useT()
  const d = t.devTeam
  const alreadyMember = useIsTeamMember()
  /* Fermé par défaut : le courrier à l'Usine est un geste occasionnel, et le
     formulaire déployé occupait la moitié de l'écran d'accueil du tableau de
     bord. Replié, il ne prend que la place d'une ligne. */
  const [mailOpen, setMailOpen] = useState(false)
  const mailPanelId = useId()

  /* Un membre déjà recruté ne revoit plus le formulaire d'inscription :
     seule la moitié « courrier » subsiste, pleine largeur. */
  const joinVisible = showJoin && !alreadyMember

  return (
    <div className={cn('grid gap-4', joinVisible && 'lg:grid-cols-2', className)}>
      {joinVisible ? (
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-brand uppercase">
            <UsersRound className="size-3" aria-hidden="true" />
            {d.badge}
          </span>
          <h2 className="text-lg font-bold tracking-tight">{d.title}</h2>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {d.promise}
          </p>
        </div>
        <JoinTeamForm source="tableau-de-bord" />
      </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border bg-card">
        <button
          type="button"
          onClick={() => setMailOpen((v) => !v)}
          aria-expanded={mailOpen}
          aria-controls={mailPanelId}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Mailbox className="size-4" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-bold">{d.contactTitle}</span>
              <span className="truncate text-xs text-muted-foreground">
                {d.contactBody}
              </span>
            </span>
          </span>
          <ChevronDown
            className={cn(
              'size-5 shrink-0 text-muted-foreground transition-transform',
              mailOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
        {/* Rendu conditionnel : un formulaire caché mais présent resterait
            atteignable au clavier. */}
        {mailOpen ? (
          <div id={mailPanelId} className="border-t px-5 py-4">
            <ContactFactoryForm />
          </div>
        ) : null}
      </section>
    </div>
  )
}
