'use client'

import { useClydeReady } from '@/lib/clyde/store'

/**
 * Déclenche la relecture du stockage local, une fois, pour toute l'application.
 *
 * Le store est monté en `skipHydration` : la relecture n'a lieu que si un écran
 * la demande. Or elle était demandée au cas par cas, et une bonne moitié des
 * écrans l'oubliaient. Un écran oublié ne se contente pas d'afficher les
 * données de démonstration : dès qu'il écrit quelque chose, l'enregistrement
 * emporte l'état de démonstration TOUT ENTIER par-dessus les vraies données.
 * Ouvrir un lien de parrainage effaçait ainsi les parrainages déjà acquis.
 *
 * Placé dans le gabarit racine, ce composant supprime la classe entière de ce
 * défaut : plus aucun écran ne peut naître sur des données fausses, et les
 * appels à `useClydeReady` des écrans qui gèrent leur attente continuent de
 * fonctionner — `hasHydrated()` répond alors immédiatement.
 *
 * Ne rend rien : ce n'est pas un fournisseur de contexte, seulement un
 * déclencheur monté au plus haut.
 */
export function StoreHydrator() {
  useClydeReady()
  return null
}
