import type { Bilingual } from './formation'
import type {
  ForumCategory,
  ForumReply,
  ForumReport,
  ForumThread,
} from './types'

/**
 * CLYDE — Forum : rubriques, tri et règles de visibilité.
 *
 * Le forum est le seul endroit du produit où un commerçant écrit pour les
 * autres. Les règles de modération vivent donc ici, en un seul endroit : une
 * condition de visibilité recopiée dans trois composants finit par laisser
 * fuiter un contenu masqué dans le quatrième.
 */

export interface CategoryMeta {
  id: ForumCategory
  label: Bilingual
  note: Bilingual
  /** Rubrique réservée à l'équipe CLYDE. */
  staffOnly: boolean
}

export const FORUM_CATEGORIES: CategoryMeta[] = [
  {
    id: 'entraide',
    label: { fr: 'Entraide', en: 'Help each other' },
    note: {
      fr: 'Une difficulté dans votre commerce ? Posez la question à ceux qui l’ont déjà eue.',
      en: 'Stuck somewhere in your business? Ask those who have been there.',
    },
    staffOnly: false,
  },
  {
    id: 'vitrine',
    label: { fr: 'Vitrine', en: 'Showcase' },
    note: {
      fr: 'Montrez votre page et demandez un avis franc à vos confrères.',
      en: 'Show your page and ask your peers for an honest opinion.',
    },
    staffOnly: false,
  },
  {
    id: 'technique',
    label: { fr: 'Technique', en: 'Technical' },
    note: {
      fr: 'Questions sur l’outil lui-même : QR, commandes, thème, abonnés.',
      en: 'Questions about the tool itself: QR, orders, theme, followers.',
    },
    staffOnly: false,
  },
  {
    id: 'annonces',
    label: { fr: 'Annonces', en: 'Announcements' },
    note: {
      fr: 'Ce que l’équipe CLYDE livre, corrige et prépare.',
      en: 'What the CLYDE team ships, fixes and is preparing.',
    },
    staffOnly: true,
  },
]

export function categoryMeta(id: ForumCategory): CategoryMeta {
  /* Le `!` est sûr : `FORUM_CATEGORIES` couvre tout le type `ForumCategory`, et
     le compilateur refuserait l'ajout d'une rubrique sans son entrée ici. */
  return FORUM_CATEGORIES.find((c) => c.id === id)!
}

/* ============================================================
   Visibilité
   ============================================================ */

/**
 * Ce contenu est-il lisible par ce lecteur ?
 *
 * Un contenu masqué reste visible à son auteur et à l'équipe. Le cacher à son
 * auteur lui donnerait l'impression d'un bug — il le réécrirait aussitôt, à
 * l'identique. Le lui montrer avec son motif est la seule façon qu'il corrige.
 */
export function canRead(
  content: Pick<ForumThread, 'moderation' | 'author_user_id'>,
  readerId: string | null,
  readerIsStaff: boolean,
): boolean {
  if (content.moderation !== 'masque') return true
  if (readerIsStaff) return true
  return readerId !== null && readerId === content.author_user_id
}

/**
 * Fils lisibles par ce lecteur, triés.
 *
 * Épinglés d'abord, puis par dernière activité : un fil où l'on répond encore
 * est plus utile qu'un fil récent mais mort.
 */
export function visibleThreads(
  threads: ForumThread[],
  readerId: string | null,
  readerIsStaff: boolean,
  category?: ForumCategory | 'toutes',
): ForumThread[] {
  return threads
    .filter((t) => canRead(t, readerId, readerIsStaff))
    .filter((t) =>
      !category || category === 'toutes' ? true : t.category === category,
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (
        new Date(b.last_activity_at).getTime() -
        new Date(a.last_activity_at).getTime()
      )
    })
}

/** Réponses lisibles d'un fil, de la plus ancienne à la plus récente. */
export function visibleReplies(
  replies: ForumReply[],
  threadId: string,
  readerId: string | null,
  readerIsStaff: boolean,
): ForumReply[] {
  return replies
    .filter((r) => r.thread_id === threadId)
    .filter((r) => canRead(r, readerId, readerIsStaff))
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
}

/**
 * Nombre de réponses affiché sur la liste des fils.
 *
 * Compte tout sauf les contenus masqués — y compris pour l'auteur d'une réponse
 * masquée : un compteur qui varie selon le lecteur sèmerait le doute sur les
 * chiffres du forum. Le masquage se voit dans le fil, pas dans le décompte.
 */
export function replyCount(replies: ForumReply[], threadId: string): number {
  return replies.filter(
    (r) => r.thread_id === threadId && r.moderation !== 'masque',
  ).length
}

/* ============================================================
   Signalements
   ============================================================ */

/** Ce lecteur a-t-il déjà signalé ce contenu ? Empêche le double signalement. */
export function hasReported(
  reports: ForumReport[],
  targetId: string,
  readerId: string | null,
): boolean {
  if (!readerId) return false
  return reports.some(
    (r) => r.target_id === targetId && r.reporter_user_id === readerId,
  )
}

/** Signalements en attente d'arbitrage, les plus anciens d'abord. */
export function pendingReports(reports: ForumReport[]): ForumReport[] {
  return reports
    .filter((r) => r.resolved_at === null)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
}

/* ============================================================
   Extraits
   ============================================================ */

/**
 * Coupe un corps de message pour l'aperçu, sans casser un mot.
 *
 * `slice` brut couperait au milieu d'un mot : sur une liste de fils, l'effet
 * est celui d'un texte corrompu.
 */
export function excerpt(body: string, max = 150): string {
  const clean = body.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`
}
