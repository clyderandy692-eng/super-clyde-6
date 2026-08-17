import credits from '@/public/images/demo/credits.json'

/**
 * Visuels des données de démonstration.
 *
 * Les photos vivent dans `public/images/demo/` et proviennent de Wikimedia
 * Commons, sous licence libre. Auteurs et licences sont listés dans
 * `public/images/demo/CREDITS.md`, régénéré par
 * `scripts/rebuild-demo-credits.mjs`.
 *
 * Les fichiers sont servis localement plutôt que depuis un domaine externe :
 * la démo fonctionne ainsi hors ligne, sans déclarer d'hôtes distants dans
 * `next.config`, et sans dépendre de la disponibilité d'un tiers.
 *
 * La liste des produits illustrés est dérivée de `credits.json`, écrit par
 * le script de téléchargement : une liste tenue à la main ici finissait par
 * mentionner des fichiers absents, ou en oublier de nouveaux. Les produits
 * sans photo exploitable sur Commons restent sans visuel, et les écrans
 * affichent alors un cadre neutre.
 */
const WITH_PHOTO = new Set(credits.map((c) => c.id))

/**
 * Chemin de la photo d'un produit de démonstration, ou `null` s'il n'en a
 * pas.
 */
export function demoPhoto(productId: string): string | null {
  return WITH_PHOTO.has(productId) ? `/images/demo/${productId}.jpg` : null
}

/** `media_urls` prêt à l'emploi pour un produit de démonstration. */
export function demoMediaUrls(productId: string): string[] {
  const photo = demoPhoto(productId)
  return photo ? [photo] : []
}

/**
 * Photo de couverture d'un commerce de démonstration.
 *
 * Sans elle, chaque vitrine s'ouvrait sur un dégradé de sa couleur de marque.
 * Le repli restait cohérent, mais on ne pouvait pas juger une page d'après son
 * aperçu — ce qui est précisément ce que la landing demande au visiteur.
 */
export function demoCover(businessId: string): string | null {
  return demoPhoto(`cover-${businessId}`)
}
