import type { Locale } from './i18n'

/* ============================================================
   La Formation de l'Usine

   Deux niveaux cohabitent, et c'est le cœur de la section :
   - `usine` : les cours produits par CLYDE. La voix de l'institution.
   - `communaute` : les cours proposés par des ingénieurs à d'autres
     ingénieurs. L'Usine n'enseigne pas seulement d'en haut, on s'y
     forme aussi entre pairs.

   Les textes vivent ici, en paires `{ fr, en }`, comme `ENGINEER_POSTS`
   dans `factory.ts`. Les placer dans `i18n.tsx` aurait doublé la taille
   du dictionnaire pour du contenu éditorial qui n'est pas de
   l'habillage d'interface.
   ============================================================ */

/** Texte bilingue. Le catalogue est du contenu, pas de l'interface. */
export interface Bilingual {
  fr: string
  en: string
}

/** Rend une valeur bilingue dans la langue courante. */
export function bi(value: Bilingual, locale: Locale): string {
  return locale === 'en' ? value.en : value.fr
}

/** Qui produit le cours. */
export type CourseTrack = 'usine' | 'communaute'

/**
 * Nature d'une leçon.
 *
 * L'Usine enseigne en texte, en image et en vidéo : le niveau de lecture
 * des commerçants visés est très variable, et une consigne uniquement
 * écrite laisse de côté ceux qui apprennent en regardant.
 */
export type LessonKind = 'text' | 'image' | 'video'

export type CourseLevel = 'debutant' | 'intermediaire' | 'avance'

export interface Lesson {
  id: string
  title: Bilingual
  kind: LessonKind
  /** Durée annoncée, en minutes. */
  minutes: number
  /** Le corps de la leçon, volontairement court et actionnable. */
  body: Bilingual
}

export interface CourseModule {
  id: string
  title: Bilingual
  lessons: Lesson[]
}

export interface CourseAuthor {
  name: string
  role: Bilingual
  /**
   * Le commerce de l'ingénieur formateur, pour les cours `communaute`.
   * `null` pour les cours de l'Usine : l'institution signe elle-même.
   */
  businessId: string | null
}

export interface Course {
  id: string
  slug: string
  track: CourseTrack
  level: CourseLevel
  title: Bilingual
  summary: Bilingual
  author: CourseAuthor
  modules: CourseModule[]
  /** Un certificat est délivré à la complétion. */
  certificate: boolean
  /**
   * Goodie associé, s'il y en a un.
   *
   * Toutes les formations n'en donnent pas : un goodie promis partout ne
   * récompense plus rien.
   */
  goodie: Bilingual | null
}

/* ------------------------------------------------------------
   Cours produits par l'Usine
   ------------------------------------------------------------ */

const USINE_COURSES: Course[] = [
  {
    id: 'c-page-en-une-heure',
    slug: 'publier-sa-page',
    track: 'usine',
    level: 'debutant',
    title: {
      fr: 'Publier sa page en une heure',
      en: 'Publish your page in one hour',
    },
    summary: {
      fr: 'Le parcours complet, de la catégorie choisie à la page en ligne. Aucune connaissance technique supposée.',
      en: 'The full path, from picking a category to a live page. No technical knowledge assumed.',
    },
    author: {
      name: 'CLYDE',
      role: { fr: 'Usine des Commerçants', en: 'Merchants’ Factory' },
      businessId: null,
    },
    certificate: true,
    goodie: null,
    modules: [
      {
        id: 'm-preparer',
        title: { fr: 'Préparer', en: 'Prepare' },
        lessons: [
          {
            id: 'l-photos',
            title: {
              fr: 'Rassembler ses photos et ses prix',
              en: 'Gather your photos and prices',
            },
            kind: 'text',
            minutes: 6,
            body: {
              fr: 'Avant d’ouvrir le constructeur, réunissez trois choses : une photo de votre devanture, une photo par article phare, et la liste de vos prix à jour. Une page se remplit en dix minutes quand ce travail est fait avant, et traîne une semaine quand il ne l’est pas.',
              en: 'Before opening the builder, gather three things: a photo of your storefront, one photo per flagship item, and your up-to-date price list. A page fills in ten minutes when this is done first, and drags on for a week when it is not.',
            },
          },
          {
            id: 'l-categorie',
            title: {
              fr: 'Choisir la bonne catégorie',
              en: 'Choose the right category',
            },
            kind: 'image',
            minutes: 4,
            body: {
              fr: 'La catégorie détermine le modèle chargé : blocs, modules et vocabulaire. Un restaurant reçoit un menu et des tables, un hôtel des chambres et un calendrier. Choisissez l’activité réelle, pas celle qui sonne le mieux.',
              en: 'The category determines the template loaded: blocks, modules and wording. A restaurant gets a menu and tables, a hotel gets rooms and a calendar. Pick your actual trade, not the one that sounds best.',
            },
          },
        ],
      },
      {
        id: 'm-construire',
        title: { fr: 'Construire', en: 'Build' },
        lessons: [
          {
            id: 'l-blocs',
            title: {
              fr: 'Remplacer le contenu des blocs',
              en: 'Replace the block content',
            },
            kind: 'video',
            minutes: 9,
            body: {
              fr: 'Chaque bloc est déjà en place et déjà rempli d’un exemple. Vous ne construisez pas, vous remplacez. Commencez par la couverture, puis le catalogue : ce sont les deux seuls blocs qu’un visiteur regarde vraiment avant de commander.',
              en: 'Every block is already in place and already filled with an example. You are not building, you are replacing. Start with the cover, then the catalogue: those are the only two blocks a visitor really looks at before ordering.',
            },
          },
          {
            id: 'l-couleurs',
            title: {
              fr: 'Régler ses couleurs sans se tromper',
              en: 'Set your colours without going wrong',
            },
            kind: 'image',
            minutes: 5,
            body: {
              fr: 'Une couleur de marque, un fond clair, un texte lisible. Trois suffisent. Les pages qui échouent sont presque toujours celles qui en portent six, avec un texte pâle sur un fond pâle que personne ne peut lire au soleil.',
              en: 'One brand colour, a light background, readable text. Three is enough. The pages that fail are almost always the ones carrying six, with pale text on a pale background nobody can read in daylight.',
            },
          },
        ],
      },
      {
        id: 'm-publier',
        title: { fr: 'Publier', en: 'Publish' },
        lessons: [
          {
            id: 'l-verifier',
            title: {
              fr: 'Les cinq vérifications avant la mise en ligne',
              en: 'Five checks before going live',
            },
            kind: 'text',
            minutes: 7,
            body: {
              fr: 'Le numéro WhatsApp reçoit bien les messages. Les prix sont à jour. Chaque article a une photo. Les horaires sont exacts. Le nom du commerce est écrit comme sur l’enseigne. Cette liste évite les trois quarts des corrections d’après-publication.',
              en: 'The WhatsApp number does receive messages. Prices are current. Every item has a photo. Opening hours are right. The business name is spelled as on the sign. This list prevents three quarters of post-launch fixes.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'c-vendre-whatsapp',
    slug: 'vendre-sur-whatsapp',
    track: 'usine',
    level: 'intermediaire',
    title: {
      fr: 'Vendre sur WhatsApp sans se perdre',
      en: 'Sell on WhatsApp without losing track',
    },
    summary: {
      fr: 'Recevoir, confirmer et suivre ses commandes quand tout arrive sur un seul téléphone.',
      en: 'Receive, confirm and track orders when everything lands on a single phone.',
    },
    author: {
      name: 'CLYDE',
      role: { fr: 'Usine des Commerçants', en: 'Merchants’ Factory' },
      businessId: null,
    },
    certificate: true,
    goodie: {
      fr: 'Autocollants QR pour vos tables',
      en: 'QR stickers for your tables',
    },
    modules: [
      {
        id: 'm-recevoir',
        title: { fr: 'Recevoir', en: 'Receive' },
        lessons: [
          {
            id: 'l-message',
            title: {
              fr: 'Lire une commande d’un seul regard',
              en: 'Read an order at a glance',
            },
            kind: 'image',
            minutes: 5,
            body: {
              fr: 'La commande arrive déjà rédigée : articles, quantités, table, total. Rien à recopier. Votre seul travail est de répondre, et de répondre vite — un client sans réponse dans les cinq minutes considère que c’est fermé.',
              en: 'The order arrives already written: items, quantities, table, total. Nothing to retype. Your only job is to reply, and to reply fast — a customer with no answer within five minutes assumes you are closed.',
            },
          },
          {
            id: 'l-confirmer',
            title: {
              fr: 'Confirmer, refuser, proposer autre chose',
              en: 'Confirm, decline, offer something else',
            },
            kind: 'text',
            minutes: 6,
            body: {
              fr: 'Trois réponses suffisent, et il faut les avoir prêtes : « C’est confirmé, prêt dans X minutes », « Cet article est terminé aujourd’hui », « Je n’ai plus celui-là, je vous propose celui-ci ». Un refus clair vaut mieux qu’un silence.',
              en: 'Three replies are enough, and you should have them ready: “Confirmed, ready in X minutes”, “That item is finished for today”, “I am out of that one, may I offer this instead”. A clear no beats silence.',
            },
          },
        ],
      },
      {
        id: 'm-suivre',
        title: { fr: 'Suivre', en: 'Track' },
        lessons: [
          {
            id: 'l-paniers',
            title: {
              fr: 'Rattraper un panier abandonné',
              en: 'Recover an abandoned cart',
            },
            kind: 'video',
            minutes: 8,
            body: {
              fr: 'Un panier abandonné est un client qui a presque acheté : il connaît vos prix et il a choisi. Un message unique, sans insistance, récupère une commande sur cinq. Deux messages en récupèrent moins : on devient une gêne.',
              en: 'An abandoned cart is a customer who almost bought: they know your prices and they had chosen. A single, non-pushy message recovers one order in five. Two messages recover fewer: you become a nuisance.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'c-comprendre-chiffres',
    slug: 'comprendre-ses-chiffres',
    track: 'usine',
    level: 'intermediaire',
    title: {
      fr: 'Comprendre ses chiffres',
      en: 'Understand your numbers',
    },
    summary: {
      fr: 'Quatre indicateurs qui changent une décision, et tous les autres qu’on peut ignorer sans dommage.',
      en: 'Four indicators that change a decision, and every other one you can safely ignore.',
    },
    author: {
      name: 'CLYDE',
      role: { fr: 'Usine des Commerçants', en: 'Merchants’ Factory' },
      businessId: null,
    },
    certificate: true,
    goodie: null,
    modules: [
      {
        id: 'm-lire',
        title: { fr: 'Lire', en: 'Read' },
        lessons: [
          {
            id: 'l-vues',
            title: {
              fr: 'Des vues qui ne deviennent pas des commandes',
              en: 'Views that never become orders',
            },
            kind: 'text',
            minutes: 6,
            body: {
              fr: 'Beaucoup de vues et peu de commandes désigne presque toujours l’une de trois causes : les prix sont absents, les photos manquent, ou le bouton de commande est trop bas dans la page. Vérifiez dans cet ordre.',
              en: 'Many views and few orders almost always points to one of three causes: prices are missing, photos are missing, or the order button sits too low on the page. Check in that order.',
            },
          },
          {
            id: 'l-articles',
            title: {
              fr: 'Repérer l’article qui porte le chiffre',
              en: 'Spot the item carrying your revenue',
            },
            kind: 'image',
            minutes: 5,
            body: {
              fr: 'Dans presque tous les commerces, trois articles font la moitié des ventes. Ce sont eux qui doivent être en haut du catalogue, avec la meilleure photo. Le reste peut attendre.',
              en: 'In nearly every business, three items make half the sales. Those belong at the top of the catalogue, with the best photo. The rest can wait.',
            },
          },
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------
   Cours proposés par des ingénieurs
   ------------------------------------------------------------ */

const COMMUNITY_COURSES: Course[] = [
  {
    id: 'c-photo-produit',
    slug: 'photographier-ses-produits',
    track: 'communaute',
    level: 'debutant',
    title: {
      fr: 'Photographier ses produits au téléphone',
      en: 'Photograph your products with a phone',
    },
    summary: {
      fr: 'La lumière, le fond, l’angle. Aucun matériel à acheter — un téléphone et une fenêtre suffisent.',
      en: 'Light, background, angle. Nothing to buy — a phone and a window are enough.',
    },
    author: {
      name: 'Studio Lumière',
      role: { fr: 'Photographe, Douala', en: 'Photographer, Douala' },
      businessId: 'b-8',
    },
    certificate: true,
    goodie: {
      fr: 'Fond photo pliable CLYDE',
      en: 'Foldable CLYDE photo backdrop',
    },
    modules: [
      {
        id: 'm-lumiere',
        title: { fr: 'La lumière', en: 'Light' },
        lessons: [
          {
            id: 'l-fenetre',
            title: {
              fr: 'Travailler près d’une fenêtre, jamais au flash',
              en: 'Work near a window, never with flash',
            },
            kind: 'video',
            minutes: 7,
            body: {
              fr: 'Le flash du téléphone écrase les couleurs et fabrique une ombre dure derrière l’article. Placez votre produit à un mètre d’une fenêtre, de côté et non face à elle. C’est la seule règle qui change tout, et elle est gratuite.',
              en: 'A phone flash flattens colour and casts a hard shadow behind the item. Place your product a metre from a window, to the side rather than facing it. It is the single rule that changes everything, and it costs nothing.',
            },
          },
          {
            id: 'l-heure',
            title: {
              fr: 'Les heures à éviter',
              en: 'Hours to avoid',
            },
            kind: 'text',
            minutes: 4,
            body: {
              fr: 'Entre midi et quinze heures, la lumière tombe droit et durcit tout. Photographiez en début de matinée ou en fin d’après-midi. Un plat photographié à sept heures et le même à treize heures ne se vendent pas au même prix.',
              en: 'Between noon and three, light falls straight down and hardens everything. Shoot early morning or late afternoon. A dish shot at seven and the same dish at one do not sell at the same price.',
            },
          },
        ],
      },
      {
        id: 'm-cadrer',
        title: { fr: 'Cadrer', en: 'Frame' },
        lessons: [
          {
            id: 'l-fond',
            title: {
              fr: 'Un fond calme, toujours le même',
              en: 'A calm background, always the same',
            },
            kind: 'image',
            minutes: 5,
            body: {
              fr: 'Un mur clair, un tissu uni, une planche de bois. Gardez le même fond pour tout votre catalogue : c’est ce qui donne l’impression d’une vraie boutique plutôt que d’un album de photos prises au hasard.',
              en: 'A light wall, a plain cloth, a wooden board. Keep the same background across your whole catalogue: that is what makes it feel like a real shop rather than a random photo album.',
            },
          },
          {
            id: 'l-angle',
            title: {
              fr: 'Deux angles par article, pas dix',
              en: 'Two angles per item, not ten',
            },
            kind: 'video',
            minutes: 6,
            body: {
              fr: 'Une vue de face et une vue de trois quarts. C’est ce qu’un client regarde avant de commander. Les huit autres photos rallongent le chargement de la page et ne vendent rien de plus.',
              en: 'One straight-on view and one three-quarter view. That is what a customer looks at before ordering. The other eight photos slow the page down and sell nothing more.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'c-tenir-son-stock',
    slug: 'tenir-son-stock',
    track: 'communaute',
    level: 'intermediaire',
    title: {
      fr: 'Tenir son stock sans logiciel',
      en: 'Keep stock without software',
    },
    summary: {
      fr: 'La méthode d’un atelier de couture qui suit trois cents pièces avec un cahier et sa page CLYDE.',
      en: 'How a tailoring workshop tracks three hundred pieces with a notebook and its CLYDE page.',
    },
    author: {
      name: 'Atelier Kola',
      role: { fr: 'Boutique de mode, Yaoundé', en: 'Fashion boutique, Yaoundé' },
      businessId: 'b-5',
    },
    certificate: true,
    goodie: null,
    modules: [
      {
        id: 'm-compter',
        title: { fr: 'Compter', en: 'Count' },
        lessons: [
          {
            id: 'l-cahier',
            title: {
              fr: 'Le cahier d’abord, la page ensuite',
              en: 'Notebook first, page second',
            },
            kind: 'text',
            minutes: 6,
            body: {
              fr: 'Comptez une fois par semaine, toujours le même jour, et mettez la page à jour juste après. Le piège est de vouloir tout suivre en direct : on abandonne au bout de dix jours et la page annonce des articles qu’on n’a plus.',
              en: 'Count once a week, always the same day, and update the page right after. The trap is trying to track live: you give up after ten days and the page advertises items you no longer have.',
            },
          },
          {
            id: 'l-rupture',
            title: {
              fr: 'Masquer un article en rupture plutôt que le supprimer',
              en: 'Hide a sold-out item instead of deleting it',
            },
            kind: 'image',
            minutes: 4,
            body: {
              fr: 'Un article supprimé emporte ses photos et ses statistiques. Masquez-le : il revient en un clic quand la marchandise arrive, avec son historique de ventes intact.',
              en: 'A deleted item takes its photos and statistics with it. Hide it instead: it comes back in one click when stock arrives, with its sales history intact.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'c-fideliser-quartier',
    slug: 'fideliser-son-quartier',
    track: 'communaute',
    level: 'avance',
    title: {
      fr: 'Fidéliser son quartier',
      en: 'Build loyalty in your neighbourhood',
    },
    summary: {
      fr: 'Comment un garage transforme des clients de passage en habitués, sans budget publicitaire.',
      en: 'How a garage turns passers-by into regulars, with no advertising budget.',
    },
    author: {
      name: 'Garage Njoya',
      role: { fr: 'Garage automobile, Douala', en: 'Auto garage, Douala' },
      businessId: 'b-6',
    },
    certificate: true,
    goodie: null,
    modules: [
      {
        id: 'm-revenir',
        title: { fr: 'Faire revenir', en: 'Bring them back' },
        lessons: [
          {
            id: 'l-suivi',
            title: {
              fr: 'Le message d’après-intervention',
              en: 'The follow-up message',
            },
            kind: 'text',
            minutes: 5,
            body: {
              fr: 'Une semaine après le passage, un message court : « Tout va bien depuis la réparation ? » Personne ne le fait, et c’est exactement pour cela qu’on s’en souvient. La moitié des réponses ramène un second rendez-vous.',
              en: 'A week after the visit, a short message: “Everything holding up since the repair?” Nobody does this, which is exactly why it is remembered. Half the replies bring a second appointment.',
            },
          },
          {
            id: 'l-abonnes',
            title: {
              fr: 'Donner une raison de s’abonner à la page',
              en: 'Give a reason to follow the page',
            },
            kind: 'video',
            minutes: 7,
            body: {
              fr: 'Personne ne s’abonne à un garage « pour les nouveautés ». On s’abonne pour savoir quand les pièces sont arrivées ou quand l’atelier ferme. Annoncez ce que vos abonnés recevront, sinon le bouton reste sans effet.',
              en: 'Nobody follows a garage “for updates”. People follow to know when parts arrive or when the workshop closes. Say what your followers will receive, otherwise the button does nothing.',
            },
          },
        ],
      },
    ],
  },
]

/** Le catalogue complet, l'Usine d'abord. */
export const COURSES: Course[] = [...USINE_COURSES, ...COMMUNITY_COURSES]

/* ------------------------------------------------------------
   Lecture du catalogue
   ------------------------------------------------------------ */

export function coursesByTrack(track: CourseTrack): Course[] {
  return COURSES.filter((c) => c.track === track)
}

export function findCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug)
}

/** Le pendant par identifiant : le registre des certificats garde un
    `related_course_id`, pas un slug — un slug peut être réécrit sans invalider
    une distinction déjà obtenue. */
export function findCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

/** Toutes les leçons d'un cours, dans l'ordre des modules. */
export function courseLessons(course: Course): Lesson[] {
  return course.modules.flatMap((m) => m.lessons)
}

/** Durée totale annoncée d'un cours, en minutes. */
export function courseMinutes(course: Course): number {
  return courseLessons(course).reduce((sum, l) => sum + l.minutes, 0)
}

/**
 * Avancement d'un cours.
 *
 * `done` ne compte que les leçons qui appartiennent réellement au cours : un
 * identifiant resté en mémoire après la refonte d'un cours aurait sinon
 * gonflé la progression au-delà de 100 %, voire décerné un certificat pour
 * un cours jamais suivi.
 */
export function courseProgress(
  course: Course,
  completedLessonIds: readonly string[],
): { done: number; total: number; ratio: number; complete: boolean } {
  const lessons = courseLessons(course)
  const owned = new Set(lessons.map((l) => l.id))
  const done = completedLessonIds.filter((id) => owned.has(id)).length
  const total = lessons.length
  return {
    done,
    total,
    ratio: total === 0 ? 0 : done / total,
    complete: total > 0 && done === total,
  }
}
