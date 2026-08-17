import type { FamilyId } from './taxonomy'
import { CATEGORY_MAP } from './taxonomy'
import type { BusinessCategory } from './types'

/* ============================================================
   L'Usine — le vernaculaire du monde CLYDE

   CLYDE n'est pas « une plateforme » : c'est une usine, et le
   commerçant n'y est pas « un utilisateur » mais un ingénieur qui
   fabrique sa page avec les machines fournies.

   Ce fichier ne contient que la matière stable du monde : les
   postes, les matricules, les jalons. Les phrases traduites
   vivent dans `i18n.tsx`, comme partout ailleurs.

   Distinction à ne jamais confondre — les deux coexistent :
   - le POSTE (ici) dit la place dans l'usine. Il est stable,
     administratif, et se lit sur la carte : « Ingénieur Culinaire ».
   - le TITRE de la Révélation (`revelation.ts`) dit le métier réel,
     avec emphase : « Gardien du Goût ». Il n'apparaît qu'une fois.
   La carte porte les deux, et c'est précisément ce frottement —
   une administration très sérieuse au service de quelque chose de
   très vivant — qui fait tenir le monde.
   ============================================================ */

/** Poste attribué selon la famille de métier. Un par famille, six en tout. */
export const ENGINEER_POSTS: Record<FamilyId, { fr: string; en: string }> = {
  restauration: { fr: 'Ingénieur Culinaire', en: 'Culinary Engineer' },
  hebergement: { fr: 'Ingénieur Hôtelier', en: 'Hospitality Engineer' },
  beaute: { fr: 'Ingénieur Esthétique', en: 'Aesthetics Engineer' },
  commerce: { fr: 'Ingénieur Produit', en: 'Product Engineer' },
  services: { fr: 'Ingénieur de Précision', en: 'Precision Engineer' },
  evenementiel: { fr: 'Ingénieur Créatif', en: 'Creative Engineer' },
}

export function engineerPost(
  category: BusinessCategory,
  locale: 'fr' | 'en',
): string {
  const family = CATEGORY_MAP[category]?.family ?? 'services'
  return ENGINEER_POSTS[family][locale]
}

/**
 * Matricule d'ingénieur — `CLYDE-ENG-000342`.
 *
 * Il doit être *stable* : un numéro qui change à chaque rendu ferait de la
 * carte un faux papier, et l'ingénieur qui la réimprime après six mois
 * découvrirait une autre identité que celle affichée en boutique. On le dérive
 * donc de l'identifiant du commerce, jamais d'un compteur en mémoire ni d'un
 * aléatoire.
 *
 * Le jour où la base délivrera une vraie séquence, seule cette fonction
 * change — la carte, le certificat et le monde n'en sauront rien.
 */
export function engineerId(businessId: string): string {
  let hash = 0
  for (let i = 0; i < businessId.length; i++) {
    hash = (hash * 31 + businessId.charCodeAt(i)) % 999_983
  }
  /* On évite le matricule 0 : « CLYDE-ENG-000000 » se lit comme un bug, pas
     comme une immatriculation. */
  const serial = (hash % 999_899) + 100
  return `CLYDE-ENG-${String(serial).padStart(6, '0')}`
}

/* ============================================================
   Les jalons de l'usine

   Chaque jalon peut délivrer un certificat. Ils sont déclarés ici
   pour que les conditions restent lisibles au même endroit, plutôt
   que dispersées dans les composants qui les affichent.
   ============================================================ */

export type MilestoneId = 'fondation' | 'ingenieur_confirme'

export interface MilestoneState {
  id: MilestoneId
  reached: boolean
}

/**
 * État des jalons d'un commerce.
 *
 * `fondation` : la page est publiée. C'est le moment le plus chargé du
 * parcours, celui où l'artefact a le plus de valeur.
 * `ingenieur_confirme` : l'activité est réelle — commandes et abonnés. Le
 * seuil est volontairement bas mais non nul : un certificat décerné à zéro
 * commande ne vaut rien et le commerçant le sait.
 */
export function milestones(input: {
  published: boolean
  orders: number
  followers: number
}): MilestoneState[] {
  return [
    { id: 'fondation', reached: input.published },
    {
      id: 'ingenieur_confirme',
      reached: input.orders >= 10 && input.followers >= 10,
    },
  ]
}
