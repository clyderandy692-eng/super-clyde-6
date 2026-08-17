import type { Bilingual } from './formation'

/**
 * CLYDE — l'équipe de développement.
 *
 * Les noms ne se traduisent pas, les rôles si : d'où ce fichier de données
 * plutôt qu'une entrée du dictionnaire. Même raison que pour les cours.
 */

export interface TeamMember {
  id: string
  name: string
  role: Bilingual
  /** Ce que la personne fait concrètement, pas son parcours. */
  focus: Bilingual
  city: string
  /** Initiales, en repli d'une photo : un rond vide serait pire. */
  initials: string
}

export const TEAM: TeamMember[] = [
  {
    id: 'tm-1',
    name: 'Aurélie Nguema',
    role: { fr: 'Produit', en: 'Product' },
    focus: {
      fr: 'Passe deux jours par semaine derrière un vrai comptoir. C’est elle qui refuse les fonctions que personne n’a demandées.',
      en: 'Spends two days a week behind a real counter. She is the one who turns down features nobody asked for.',
    },
    city: 'Douala',
    initials: 'AN',
  },
  {
    id: 'tm-2',
    name: 'Bertrand Essomba',
    role: { fr: 'Développement', en: 'Engineering' },
    focus: {
      fr: 'Tient la page publique et le constructeur. Son obsession : que la page d’un commerçant s’ouvre en moins de deux secondes sur un téléphone d’entrée de gamme.',
      en: 'Owns the public page and the builder. His obsession: a merchant’s page opening in under two seconds on an entry-level phone.',
    },
    city: 'Yaoundé',
    initials: 'BE',
  },
  {
    id: 'tm-3',
    name: 'Mireille Sona',
    role: { fr: 'Formation et forum', en: 'Training and forum' },
    focus: {
      fr: 'Écrit les cours de l’Usine et lit le forum tous les jours. Les questions qui reviennent trois fois deviennent une leçon.',
      en: 'Writes the Factory courses and reads the forum daily. Questions that come up three times become a lesson.',
    },
    city: 'Douala',
    initials: 'MS',
  },
  {
    id: 'tm-4',
    name: 'Yannick Tchoua',
    role: { fr: 'Terrain', en: 'Field' },
    focus: {
      fr: 'Installe les QR, imprime les plaques, remet les goodies en main propre. Il connaît les commerçants par leur prénom.',
      en: 'Installs the QR codes, prints the plates, hands over the goodies in person. He knows the merchants by their first name.',
    },
    city: 'Yaoundé',
    initials: 'YT',
  },
]
