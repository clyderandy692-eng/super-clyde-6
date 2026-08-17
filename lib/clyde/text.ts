/**
 * Utilitaires de texte partagés.
 *
 * Le contenu des commerces est en français : « ndolé », « braisé »,
 * « bâton de manioc ». Or on tape rarement les accents dans un champ de
 * recherche, et jamais dans une URL. Ces deux besoins reposent sur la même
 * opération : ramener une chaîne à sa forme sans diacritiques.
 */

/**
 * Ramène une chaîne à une forme comparable : sans accents, en minuscules
 * et sans espaces superflus. « Ndolé » et « ndole » deviennent identiques.
 */
export function foldAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Transforme un nom commercial en slug d'URL lisible. */
export function slugify(value: string): string {
  return foldAccents(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/**
 * Ancienneté en clair : « à l'instant », « il y a 12 min », « hier ».
 *
 * Sur un écran de commandes, l'information utile n'est pas l'heure exacte
 * mais le temps d'attente du client. Au-delà d'une semaine on repasse à
 * une date, un décompte en jours ne parlant plus.
 */
export function relativeTime(
  iso: string,
  now: Date = new Date(),
  /* La langue est un paramètre et non une constante : cet affichage apparaît
     dans le tableau de bord, qui se lit en français comme en anglais. */
  lang: 'fr' | 'en' = 'fr',
): string {
  const then = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  const tag = lang === 'en' ? 'en-GB' : 'fr-FR'

  /* Un horodatage à venir ne peut pas se raconter en ancienneté : on donne
     l'heure, plutôt que d'afficher « à l'instant » pour un futur. */
  if (minutes < 0) {
    const time = then.toLocaleTimeString(tag, {
      hour: '2-digit',
      minute: '2-digit',
    })
    return lang === 'en' ? `at ${time}` : `à ${time}`
  }

  if (minutes < 1) return lang === 'en' ? 'just now' : "à l'instant"
  if (minutes < 60)
    return lang === 'en' ? `${minutes} min ago` : `il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return lang === 'en'
      ? `${hours} hr${hours > 1 ? 's' : ''} ago`
      : `il y a ${hours} h`

  const days = Math.floor(hours / 24)
  if (days === 1) return lang === 'en' ? 'yesterday' : 'hier'
  if (days < 7)
    return lang === 'en' ? `${days} days ago` : `il y a ${days} jours`

  return then.toLocaleDateString(tag, { day: 'numeric', month: 'long' })
}
