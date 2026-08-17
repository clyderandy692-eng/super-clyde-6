/**
 * Provenance d'une page publique.
 *
 * Le bouton « Retour » des vitrines se fiait à `window.history.length > 1`. Dans
 * un aperçu en iframe, cette longueur est presque toujours supérieure à 1, même
 * quand le visiteur arrive directement par un QR code ou un lien WhatsApp : le
 * retour renvoyait alors vers une entrée d'historique étrangère au site, d'où
 * l'impression d'un bouton mort.
 *
 * On enregistre donc explicitement le fait d'avoir cliqué depuis l'intérieur du
 * site. `sessionStorage` convient : l'information ne vaut que pour l'onglet
 * courant, et disparaît à sa fermeture.
 */

const KEY = 'clyde-internal-nav'

/** Pose le marqueur, à appeler sur les liens internes vers une page publique. */
export function markInternalNavigation(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* Navigation privée ou stockage refusé : on se rabat sur « lien direct »,
       qui propose au moins une sortie explicite vers le marketplace. */
  }
}

/**
 * Le visiteur a-t-il navigué depuis l'intérieur du site ?
 *
 * À lire dans un effet, jamais au premier rendu : `sessionStorage` n'existe pas
 * côté serveur, et la lecture pendant le rendu ferait diverger l'hydratation.
 */
export function cameFromInside(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
