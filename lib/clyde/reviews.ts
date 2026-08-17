/**
 * Avis clients — sélection et moyennes.
 *
 * Toute la logique de visibilité est ici, en un seul endroit : un avis masqué
 * ne doit ni s'afficher, ni compter dans une moyenne. Éparpiller ce filtre dans
 * les écrans revenait à garantir qu'un jour l'un d'eux l'oublierait, et qu'un
 * avis retiré continuerait de peser sur la note.
 */

import type { Review } from './types'

/**
 * Les avis réellement affichables.
 *
 * `signale` reste visible : un signalement n'est pas un verdict, et masquer dès
 * le premier clic offrirait à un concurrent le pouvoir d'effacer les bons avis
 * d'une vitrine. Seul `masque` disparaît.
 */
export function visibleReviews(
  reviews: Review[],
  /**
   * Le lecteur, s'il est connecté.
   *
   * Son propre avis masqué lui reste visible, accompagné du motif : sans cela
   * il le croirait perdu et le redéposerait à l'identique, sans jamais savoir
   * ce qui lui était reproché. Personne d'autre ne le voit.
   */
  viewerId?: string | null,
): Review[] {
  return reviews.filter(
    (r) =>
      r.moderation !== 'masque' ||
      (viewerId != null && r.author_user_id === viewerId),
  )
}

/** Les avis affichables portant sur un article précis. */
export function productReviews(
  reviews: Review[],
  productId: string,
  viewerId?: string | null,
): Review[] {
  return visibleReviews(reviews, viewerId).filter(
    (r) => r.product_id === productId,
  )
}

/**
 * Les avis qui comptent dans une moyenne ou une répartition.
 *
 * Distinct de l'affichage : un avis masqué rendu à son auteur ne doit pas
 * peser sur la note publique, sinon cet auteur verrait une moyenne différente
 * de celle des autres visiteurs — et un avis retiré continuerait de compter
 * pour la seule personne qu'il arrange.
 */
export function countableReviews(reviews: Review[]): Review[] {
  return reviews.filter((r) => r.moderation !== 'masque')
}

/**
 * Les avis affichables portant sur le commerce lui-même.
 *
 * Les avis d'articles sont volontairement exclus : la note d'un plat ne dit
 * rien de l'accueil, et les mélanger produirait une moyenne que personne ne
 * saurait interpréter.
 */
export function businessReviews(
  reviews: Review[],
  businessId: string,
  viewerId?: string | null,
): Review[] {
  return visibleReviews(reviews, viewerId).filter(
    (r) => r.business_id === businessId && r.product_id === null,
  )
}

/**
 * Moyenne d'une liste d'avis, arrondie au dixième.
 *
 * `null` quand la liste est vide : afficher « 0 sur 5 » sur une vitrine neuve
 * ferait passer l'absence d'avis pour une condamnation. L'appelant doit donc
 * traiter ce cas, ce qui est précisément le but.
 */
export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

/**
 * Répartition des notes, de 1 à 5 étoiles.
 *
 * Renvoie toujours les cinq paliers, y compris ceux à zéro : un histogramme
 * dont les barres vides disparaissent se lit de travers.
 */
export function ratingBreakdown(
  reviews: Review[],
): { rating: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }))
}

/**
 * Borne une note dans l'intervalle autorisé.
 *
 * Le contrôle est ici et non dans le formulaire : une note à 7 étoiles ou à 0
 * fausserait toutes les moyennes, et un écran n'est pas un endroit sûr pour
 * garder une invariante.
 */
export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(5, Math.max(1, Math.round(value)))
}
