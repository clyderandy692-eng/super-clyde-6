'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTemplate, DEFAULT_THEME } from './blocks'
import { normalizePhone } from './whatsapp'
import { dayKey } from './metrics'
import {
  DEMO_ABANDONED_CARTS,
  DEMO_ACTIVE_BUSINESS_ID,
  DEMO_AVAILABILITY,
  DEMO_BOOKINGS,
  DEMO_BUSINESSES,
  DEMO_CERTIFICATES,
  DEMO_FOLLOWERS,
  DEMO_FORUM_REPLIES,
  DEMO_REVIEWS,
  DEMO_FORUM_THREADS,
  DEMO_LOCATIONS,
  DEMO_ORDER_ITEMS,
  DEMO_ORDERS,
  DEMO_PAGES,
  DEMO_POST_COMMENTS,
  DEMO_POSTS,
  DEMO_PRODUCT_STATS,
  DEMO_PRODUCTS,
  DEMO_REFERRALS,
  DEMO_SUBSCRIPTIONS,
  DEMO_TRIAL_BONUSES,
  DEMO_USERS,
} from './demo-data'
import {
  BASE_TRIAL_DAYS,
  CERTIFICATE_FOLLOWER_THRESHOLD,
  generateReferralCode,
  MILESTONE_DAYS,
  ownerPlan,
  pageQuota,
  pendingMilestones,
  REFERRAL_RECEIVED_DAYS,
  REFERRAL_SENT_DAYS,
} from './rewards'
import {
  anonymizeCustomer,
  buildUserDataExport,
  type UserDataExport,
} from './privacy'
import { pointsBalance } from './goodies'
import { cartLineKey, linePrice, optionsSummary } from './options'
import { clampRating } from './reviews'
import { CATEGORY_MAP, DEFAULT_FOLLOWER_NOTICE } from './taxonomy'
import type {
  AbandonedCart,
  AnalyticsEvent,
  AvailabilityRule,
  Block,
  Booking,
  Business,
  BusinessCategory,
  BusinessLocation,
  CartLine,
  Certificate,
  Currency,
  EventType,
  Follower,
  LessonCompletion,
  Order,
  OrderItem,
  Page,
  PageTheme,
  ForumCategory,
  ForumReply,
  ForumReport,
  ForumThread,
  GoodieRedemption,
  Review,
  ReviewReport,
  ModerationState,
  Plan,
  Post,
  PostComment,
  Product,
  ProductStatsDaily,
  Referral,
  Subscription,
  TeamMember,
  AdminMessage,
  TrialBonus,
  User,
} from './types'

/**
 * Couche d'accès aux données, en mémoire pour cette étape.
 * Les signatures reproduisent ce que fera Supabase : le remplacement
 * se fait ici, pas dans les composants.
 */

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

interface ClydeState {
  users: User[]
  businesses: Business[]
  pages: Page[]
  products: Product[]
  locations: BusinessLocation[]
  orders: Order[]
  abandonedCarts: AbandonedCart[]
  orderItems: OrderItem[]
  availability: AvailabilityRule[]
  bookings: Booking[]
  followers: Follower[]
  posts: Post[]
  postComments: PostComment[]
  events: AnalyticsEvent[]
  productStats: ProductStatsDaily[]
  subscriptions: Subscription[]
  trialBonuses: TrialBonus[]
  referrals: Referral[]
  certificates: Certificate[]
  lessonCompletions: LessonCompletion[]
  forumThreads: ForumThread[]
  forumReplies: ForumReply[]
  forumReports: ForumReport[]
  reviews: Review[]
  reviewReports: ReviewReport[]
  teamMembers: TeamMember[]
  adminMessages: AdminMessage[]
  goodieRedemptions: GoodieRedemption[]
  /**
   * Étapes de la checklist d'activation confirmées par le commerçant.
   *
   * Clé composite `businessId:step`, et non un booléen par étape sur
   * `Business` : la checklist ne concerne que les tout premiers pas et n'a
   * aucune raison de vivre dans le compte lui-même. Les deux premières
   * étapes (articles ajoutés, page publiée) ne sont PAS ici — elles se lisent
   * directement dans les données réelles (`products`, `page.published`) et
   * n'ont donc rien à confirmer manuellement.
   */
  activationChecks: string[]

  /* --- Business --- */
  /**
   * Crée une page et son essai de base.
   *
   * Renvoie `null` quand le quota du plan est atteint : le nombre de pages
   * dépend du COMPTE, et laisser passer la création aurait fabriqué une page
   * au-delà du droit acheté.
   */
  createBusiness: (input: {
    ownerId: string
    name: string
    slug: string
    category: BusinessCategory
    currency: Currency
    whatsapp: string
    city: string
    neighborhood: string
    description: string
    moduleLocations: boolean
    moduleBooking: boolean
    /** Code de parrainage reçu, s'il est arrivé par un lien. */
    referralCode?: string | null
  }) => string | null
  updateBusiness: (id: string, patch: Partial<Business>) => void
  toggleModule: (id: string, module: 'locations' | 'booking') => void

  /* --- Page builder --- */
  updateLayout: (businessId: string, layout: Block[]) => void
  updateTheme: (businessId: string, theme: PageTheme) => void
  setPublished: (businessId: string, published: boolean) => void

  /* --- Produits --- */
  upsertProduct: (
    businessId: string,
    product: Partial<Product> & { id?: string },
  ) => string
  deleteProduct: (id: string) => void
  toggleProductAvailable: (id: string) => void

  /* --- Emplacements --- */
  addLocation: (
    businessId: string,
    label: string,
    type: BusinessLocation['type'],
  ) => void
  addLocationsBulk: (
    businessId: string,
    count: number,
    prefix: string,
    type: BusinessLocation['type'],
  ) => void
  updateLocation: (id: string, label: string) => void
  deleteLocation: (id: string) => void

  /* --- Commandes --- */
  createOrder: (input: {
    businessId: string
    customerId: string | null
    customerName: string
    customerPhone: string
    channel: Order['channel']
    locationId: string | null
    note: string | null
    lines: CartLine[]
  }) => string
  setOrderStatus: (id: string, status: Order['status']) => void

  /* --- Paniers abandonnés --- */
  /**
   * Enregistre un panier renseigné mais non envoyé.
   *
   * Appelé quand le client a donné son contact puis quitté sans commander.
   * Un seul enregistrement par numéro et par commerce : sinon la liste se
   * remplirait de doublons à chaque changement d'article.
   */
  recordAbandonedCart: (input: {
    businessId: string
    customerName: string
    customerPhone: string
    lines: CartLine[]
    totalEstimate: number
  }) => void
  /** Marque le panier comme relancé, pour ne pas réécrire deux fois. */
  markCartReminded: (id: string) => void
  /** Le client a commandé : le panier sort de la liste à relancer. */
  resolveAbandonedCart: (businessId: string, customerPhone: string) => void
  dismissAbandonedCart: (id: string) => void

  /* --- Réservations --- */
  createBooking: (input: {
    businessId: string
    customerId: string | null
    customerName: string
    customerPhone: string
    serviceId: string | null
    startAt: string
    locationId?: string | null
    durationMinutes?: number | null
    totalEstimate?: number | null
    note: string | null
    /* `null` : le créneau vient d'être pris par quelqu'un d'autre. */
  }) => string | null
  setBookingStatus: (id: string, status: Booking['status']) => void
  setAvailability: (businessId: string, rules: AvailabilityRule[]) => void

  /* --- Abonnés & contenu --- */
  toggleFollow: (businessId: string, userId: string) => boolean
  addPost: (
    businessId: string,
    post: { type: Post['type']; media_url: string; caption: string },
  ) => void
  likePost: (postId: string) => void
  addComment: (postId: string, name: string, content: string) => void

  /* --- Analytics --- */
  track: (
    businessId: string,
    type: EventType,
    targetId?: string | null,
  ) => void

  /* --- Activation --- */
  /** Coche ou décoche une étape de la checklist d'activation. */
  toggleActivationCheck: (businessId: string, step: string) => void

  /* --- Abonnement CLYDE --- */
  /** Le plan appartient au compte : c'est l'identifiant du propriétaire. */
  setPlan: (ownerId: string, plan: Plan) => void

  /* --- Récompenses --- */
  /**
   * Enregistre le passage par un lien de parrainage.
   *
   * Appelé à l'inscription, avant même que le filleul n'ait une page. Aucun
   * bonus n'est versé ici : seule la publication déclenche la récompense.
   * Renvoie `false` si le code est inconnu.
   */
  registerReferralVisit: (code: string) => boolean
  /**
   * Publie une page et applique tout ce qui en découle.
   *
   * Remplace l'ancien `setPublished(id, true)` pour la première publication :
   * c'est ce moment précis, et pas l'inscription, qui solde un parrainage et
   * verse les deux bonus. Renvoie ce qui a été accordé, pour l'annoncer à
   * l'écran.
   */
  publishPage: (businessId: string) => {
    firstPublication: boolean
    referralCompleted: boolean
    bonusDays: number
  }
  /**
   * Vérifie les paliers d'abonnés et récompense ceux qui viennent d'être
   * franchis. Appelé après chaque abonnement, de façon immédiate — un job
   * différé laisserait le commerçant sans retour au moment où il regarde.
   */
  checkFollowerMilestones: (businessId: string) => number[]

  /* --- Droits sur les données (RGPD art. 15, 17 et 20) --- */
  /**
   * Rassemble tout ce que le système sait d'une personne, dans une forme
   * lisible et réutilisable.
   *
   * Une seule fonction pour l'écran ET le fichier téléchargé : deux chemins
   * séparés auraient divergé, et c'est précisément l'écart entre « ce qu'on
   * montre » et « ce qu'on détient » qui rend un export non conforme.
   */
  exportUserData: (userId: string) => UserDataExport | null
  /**
   * Efface une personne et tout ce qui la désigne.
   *
   * Ne s'applique qu'aux comptes visiteurs : un propriétaire ne peut pas
   * disparaître en laissant derrière lui des vitrines orphelines et des
   * commandes que plus personne ne peut honorer. Le refus est explicite plutôt
   * que silencieux, pour que l'écran puisse l'expliquer.
   *
   * Les commandes et réservations ne sont pas supprimées mais ANONYMISÉES : ce
   * sont des pièces comptables du commerçant, qui ne lui appartiennent pas
   * moins parce que le client s'en va. Son identité en est retirée, la trace
   * de la transaction demeure.
   */
  deleteUserAccount: (userId: string) => { ok: boolean; reason?: 'owner' | 'unknown' }

  /* --- Formation --- */
  /**
   * Marque une leçon comme faite, ou revient sur cette marque.
   *
   * Le retour indique si le cours vient d'être achevé à l'instant, pour que
   * l'écran puisse annoncer le certificat. Le certificat lui-même est inscrit
   * ici et non dans le composant : une distinction qui dépend d'un rendu
   * n'existerait pas pour un commerçant qui ferme l'onglet trop vite.
   */
  toggleLesson: (input: {
    businessId: string
    courseId: string
    lessonId: string
    /** Toutes les leçons du cours, pour juger la complétion. */
    courseLessonIds: readonly string[]
  }) => { completedCourse: boolean }

  /* --- Forum --- */
  createForumThread: (input: {
    authorUserId: string
    authorBusinessId: string | null
    category: ForumCategory
    title: string
    body: string
  }) => string
  /**
   * Répond à un fil.
   *
   * Remonte aussi `last_activity_at` du fil : sans cela, le tri par vivacité
   * enterrerait une discussion active sous des fils morts mais récents.
   */
  createForumReply: (input: {
    threadId: string
    authorUserId: string
    authorBusinessId: string | null
    body: string
  }) => string
  /**
   * Signale un contenu.
   *
   * Le contenu reste lisible : il passe en `signale`, pas en `masque`. Renvoie
   * `false` si ce lecteur l'a déjà signalé — un même contenu signalé dix fois
   * par la même personne ne mérite pas dix arbitrages.
   */
  reportForumContent: (input: {
    targetType: 'thread' | 'reply'
    targetId: string
    reporterUserId: string
    reason: string
  }) => boolean
  /** Masque un contenu et clôt les signalements qui le visaient. */
  hideForumContent: (input: {
    targetType: 'thread' | 'reply'
    targetId: string
    note: string
  }) => void
  /** Rétablit un contenu masqué et rejette les signalements en cours. */
  restoreForumContent: (input: {
    targetType: 'thread' | 'reply'
    targetId: string
  }) => void

  /* --- Avis clients --- */
  /**
   * Dépose un avis sur un commerce ou sur un article.
   *
   * `productId` à `null` vise le commerce lui-même. Aucun compte n'est exigé :
   * la plupart des clients arrivent par QR code. La note est bornée ici, et non
   * dans le formulaire, pour qu'aucun écran ne puisse fausser les moyennes.
   */
  createReview: (input: {
    businessId: string
    productId: string | null
    authorUserId: string | null
    authorName: string
    rating: number
    body: string
  }) => string
  /**
   * Signale un avis.
   *
   * L'avis reste lisible — il passe en `signale`, pas en `masque` : sinon un
   * concurrent effacerait les bons avis d'une vitrine d'un simple clic. Renvoie
   * `false` si ce signalant l'a déjà signalé.
   */
  reportReview: (input: {
    reviewId: string
    reporterUserId: string | null
    reason: string
  }) => boolean
  /** Masque un avis et clôt les signalements qui le visaient. */
  hideReview: (input: { reviewId: string; note: string }) => void
  /** Rétablit un avis masqué et rejette les signalements en cours. */
  restoreReview: (input: { reviewId: string }) => void

  /* --- Équipe de développement et courrier à l'Usine --- */
  /**
   * Inscrit un membre à l'équipe de développement.
   *
   * Renvoie `false` quand ce numéro WhatsApp est déjà inscrit : le doublon est
   * refusé ici et non dans l'écran, sinon un double envoi du formulaire
   * écrirait deux fois la même personne et l'Usine lui parlerait en double.
   * La comparaison porte sur le numéro normalisé — « 07 12 34 56 78 » et
   * « +237 07 12 34 56 78 » sont la même personne.
   */
  joinTeam: (input: {
    name: string
    whatsapp: string
    email?: string | null
    source: TeamMember['source']
    userId?: string | null
  }) => boolean
  /**
   * Adresse un message à l'administration CLYDE.
   *
   * Renvoie `false` si aucun canal de réponse n'est fourni : un message auquel
   * personne ne peut répondre n'est pas un message, c'est une impasse.
   */
  messageAdmin: (input: {
    senderName: string
    whatsapp?: string | null
    email?: string | null
    topic: AdminMessage['topic']
    body: string
    userId?: string | null
  }) => boolean
  /** Marque un message comme lu par l'administration. */
  markAdminMessageRead: (input: { messageId: string }) => void

  /* --- Goodies --- */
  /**
   * Échange des points contre un goodie.
   *
   * Renvoie `null` quand le solde est insuffisant : le contrôle est ici et non
   * dans l'écran, sinon un solde négatif s'écrirait au premier double-clic.
   */
  redeemGoodie: (input: {
    businessId: string
    goodieId: string
    cost: number
    recipientName: string
    recipientPhone: string
    deliveryCity: string
    deliveryAddress: string | null
    size: string | null
    deliveryNote: string | null
  }) => string | null

  /**
   * Fait avancer un échange dans son cycle : demande → préparée → remise.
   *
   * Sans cette action, les points étaient bien débités mais l'échange restait
   * éternellement « demandé » : le commerçant avait payé et personne, côté
   * plateforme, ne pouvait ne serait-ce que marquer le colis comme parti.
   *
   * Le cycle n'avance que d'un cran et jamais à reculons — un objet remis ne
   * peut pas redevenir une demande.
   */
  advanceRedemption: (redemptionId: string) => void

  /* --- Utilisateurs --- */
  upsertUser: (user: Partial<User> & { id?: string }) => string
}

/**
 * Données métier.
 *
 * Persistées, sinon chaque navigation repartait des données de démonstration :
 * un abonnement pris sur une page publique ou une couverture ajoutée depuis le
 * tableau de bord disparaissaient dès le rechargement suivant.
 *
 * `skipHydration` est indispensable : la lecture du stockage local pendant le
 * rendu ferait diverger serveur et client. On réhydrate après montage, via
 * `useClydeReady`.
 */
export const useClyde = create<ClydeState>()(
  persist(
    (set, get) => ({
  users: DEMO_USERS,
  businesses: DEMO_BUSINESSES,
  pages: DEMO_PAGES,
  products: DEMO_PRODUCTS,
  locations: DEMO_LOCATIONS,
  orders: DEMO_ORDERS,
  abandonedCarts: DEMO_ABANDONED_CARTS,
  orderItems: DEMO_ORDER_ITEMS,
  availability: DEMO_AVAILABILITY,
  bookings: DEMO_BOOKINGS,
  followers: DEMO_FOLLOWERS,
  posts: DEMO_POSTS,
  postComments: DEMO_POST_COMMENTS,
  events: [],
  productStats: DEMO_PRODUCT_STATS,
  subscriptions: DEMO_SUBSCRIPTIONS,
  trialBonuses: DEMO_TRIAL_BONUSES,
  referrals: DEMO_REFERRALS,
  certificates: DEMO_CERTIFICATES,
  /* Aucune leçon pré-cochée : un catalogue de démonstration déjà à moitié
     validé ferait croire à une progression que le commerçant n'a pas faite. */
  lessonCompletions: [],
  /* Le forum est livré avec des fils : un forum vide donne l'impression d'un
     lieu désert, et personne n'ouvre la première discussion d'un désert. */
  forumThreads: DEMO_FORUM_THREADS,
  forumReplies: DEMO_FORUM_REPLIES,
  forumReports: [],
  /* Quelques avis de démonstration : un commerçant qui découvre CLYDE doit voir
     à quoi ressemble sa vitrine notée, pas un bloc vide qu'il croira cassé. */
  reviews: DEMO_REVIEWS,
  reviewReports: [],
  /* Aucune graine : une liste de contacts inventés donnerait à l'administration
     l'illusion d'un recrutement qui n'a pas eu lieu. */
  teamMembers: [],
  adminMessages: [],
  goodieRedemptions: [],
  activationChecks: [],

  createBusiness: (input) => {
    /* Le quota se vérifie AVANT toute écriture : une page créée puis annulée
       laisserait derrière elle une page orpheline et un abonnement fantôme. */
    const quota = pageQuota(
      input.ownerId,
      get().businesses,
      get().subscriptions,
    )
    if (quota.reached) return null

    const id = uid('b')
    const meta = CATEGORY_MAP[input.category]
    const business: Business = {
      id,
      owner_id: input.ownerId,
      slug: input.slug,
      name: input.name,
      category: input.category,
      whatsapp_number: input.whatsapp,
      description: input.description || null,
      currency: input.currency,
      followers_public: true,
      listed_in_marketplace: true,
      follower_data_notice: DEFAULT_FOLLOWER_NOTICE,
      module_locations: input.moduleLocations,
      module_booking: input.moduleBooking,
      city: input.city || null,
      neighborhood: input.neighborhood || null,
      cover_url: null,
      logo_url: null,
      referral_code: generateReferralCode(
        new Set(get().businesses.map((b) => b.referral_code)),
      ),
      created_at: new Date().toISOString(),
    }
    const page: Page = {
      id: uid('pg'),
      business_id: id,
      theme_json: { ...DEFAULT_THEME },
      layout_json: createTemplate(input.category, meta.family, {
        booking: input.moduleBooking,
        businessName: input.name,
      }),
      published: false,
    }

    /* L'essai de base est une ligne de bonus comme les autres : la fin d'essai
       se déduit de la somme des bonus, donc sans cette ligne la page naîtrait
       avec un essai déjà expiré. */
    const baseTrial: TrialBonus = {
      id: uid('tb'),
      business_id: id,
      reason: 'base_trial',
      days: BASE_TRIAL_DAYS,
      related_business_id: null,
      related_milestone: null,
      deferred: false,
      granted_at: new Date().toISOString(),
    }

    /* Le plan appartient au compte : on n'ouvre un abonnement que si le
       propriétaire n'en a pas déjà un. Sinon un commerçant Pro qui cr��e sa
       deuxième page se verrait rétrograder au gratuit. */
    const hasSubscription = get().subscriptions.some(
      (s) => s.owner_id === input.ownerId,
    )
    const subscription: Subscription | null = hasSubscription
      ? null
      : {
          id: uid('sb'),
          owner_id: input.ownerId,
          plan: 'free',
          status: 'active',
          started_at: new Date().toISOString(),
          renews_at: null,
        }

    /* Le parrainage est rattaché ici, mais reste au statut `inscrit` : le bonus
       n'est versé qu'à la publication de la page. */
    const code = input.referralCode?.trim().toUpperCase()
    const candidate = code
      ? get().businesses.find((b) => b.referral_code === code)
      : undefined

    /* On se parraine pas soi-même. Un plan Pro donne droit à trois pages : sans
       ce contrôle, il suffisait de créer la deuxième page avec le code de la
       première pour s'offrir 30 + 30 jours, autant de fois qu'on a de pages.
       La comparaison porte sur le PROPRIÉTAIRE et non sur la page — comparer
       les identifiants de page ne pouvait rien attraper, la page du filleul
       n'existant pas encore au moment du test. */
    const referrer =
      candidate && candidate.owner_id !== input.ownerId ? candidate : undefined

    set((s) => ({
      businesses: [...s.businesses, business],
      pages: [...s.pages, page],
      trialBonuses: [...s.trialBonuses, baseTrial],
      subscriptions: subscription
        ? [...s.subscriptions, subscription]
        : s.subscriptions,
      /* On FAIT AVANCER la ligne posée à l'arrivée sur le lien, au lieu d'en
         ajouter une seconde. Auparavant, un même filleul laissait deux traces :
         un `lien_partage` orphelin qui ne se refermait jamais, plus un
         `inscrit`. Le parrain comptait donc deux fois la même personne, une en
         « a ouvert le lien » et une en « s'est inscrite », et son entonnoir ne
         voulait plus rien dire.

         La ligne d'origine est conservée avec sa date de création : c'est la
         date du premier contact, l'information qui permet de savoir combien de
         temps s'écoule entre le clic et la vraie inscription. */
      referrals: referrer
        ? (() => {
            const pendingIndex = s.referrals.findIndex(
              (r) =>
                r.referral_code === referrer.referral_code &&
                r.referred_business_id === null &&
                r.status === 'lien_partage',
            )
            const attached = {
              referred_business_id: id,
              status: 'inscrit' as const,
            }
            if (pendingIndex >= 0) {
              return s.referrals.map((r, i) =>
                i === pendingIndex ? { ...r, ...attached } : r,
              )
            }
            /* Aucune visite retenue : le filleul a saisi le code à la main, ou
               son navigateur refusait le stockage de session. Le parrainage
               compte quand même. */
            return [
              ...s.referrals,
              {
                id: uid('rf'),
                referrer_business_id: referrer.id,
                referral_code: referrer.referral_code,
                created_at: new Date().toISOString(),
                completed_at: null,
                ...attached,
              },
            ]
          })()
        : s.referrals,
    }))
    return id
  },

  updateBusiness: (id, patch) =>
    set((s) => ({
      businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),

  toggleModule: (id, module) =>
    set((s) => ({
      businesses: s.businesses.map((b) =>
        b.id === id
          ? module === 'locations'
            ? { ...b, module_locations: !b.module_locations }
            : { ...b, module_booking: !b.module_booking }
          : b,
      ),
    })),

  updateLayout: (businessId, layout) =>
    set((s) => ({
      pages: s.pages.map((p) =>
        p.business_id === businessId ? { ...p, layout_json: layout } : p,
      ),
    })),

  updateTheme: (businessId, theme) =>
    set((s) => ({
      pages: s.pages.map((p) =>
        p.business_id === businessId ? { ...p, theme_json: theme } : p,
      ),
    })),

  setPublished: (businessId, published) =>
    set((s) => ({
      pages: s.pages.map((p) =>
        p.business_id === businessId ? { ...p, published } : p,
      ),
    })),

  upsertProduct: (businessId, product) => {
    const existing = product.id
      ? get().products.find((p) => p.id === product.id)
      : undefined
    if (existing) {
      set((s) => ({
        products: s.products.map((p) =>
          p.id === existing.id ? { ...p, ...product } : p,
        ),
      }))
      return existing.id
    }
    const id = product.id ?? uid('p')
    const created: Product = {
      id,
      business_id: businessId,
      name: product.name ?? 'Nouvel article',
      description: product.description ?? null,
      price: product.price ?? 0,
      compare_at_price: product.compare_at_price ?? null,
      media_urls: product.media_urls ?? [],
      type: product.type ?? 'product',
      duration_minutes: product.duration_minutes ?? null,
      category_label: product.category_label ?? null,
      active: product.active ?? true,
      available: product.available ?? true,
      option_groups: product.option_groups ?? [],
      created_at: new Date().toISOString(),
    }
    set((s) => ({ products: [created, ...s.products] }))
    return id
  },

  deleteProduct: (id) =>
    set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

  toggleProductAvailable: (id) =>
    set((s) => ({
      products: s.products.map((p) =>
        p.id === id ? { ...p, available: !p.available } : p,
      ),
    })),

  addLocation: (businessId, label, type) =>
    set((s) => ({
      locations: [
        ...s.locations,
        {
          id: uid('l'),
          business_id: businessId,
          type,
          label,
          created_at: new Date().toISOString(),
        },
      ],
    })),

  addLocationsBulk: (businessId, count, prefix, type) =>
    set((s) => {
      const existing = s.locations.filter((l) => l.business_id === businessId)
      const start = existing.length + 1
      const created = Array.from({ length: count }, (_, i) => ({
        id: uid('l'),
        business_id: businessId,
        type,
        label: `${prefix} ${start + i}`,
        created_at: new Date().toISOString(),
      }))
      return { locations: [...s.locations, ...created] }
    }),

  updateLocation: (id, label) =>
    set((s) => ({
      locations: s.locations.map((l) => (l.id === id ? { ...l, label } : l)),
    })),

  deleteLocation: (id) =>
    set((s) => ({ locations: s.locations.filter((l) => l.id !== id) })),

  createOrder: (input) => {
    const products = get().products
    /* Via `linePrice`, comme le message WhatsApp : le total enregistré doit
       inclure les suppléments d'options. Le calcul direct `prix × quantité` qui
       était ici affichait au commerçant un montant inférieur à celui annoncé au
       client — deux chiffres différents pour la même commande. */
    const total = input.lines.reduce(
      (sum, line) => sum + linePrice(line, products),
      0,
    )
    const id = uid('o')
    const order: Order = {
      id,
      business_id: input.businessId,
      customer_id: input.customerId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      channel: input.channel,
      location_id: input.locationId,
      total_estimate: total,
      status: 'pending',
      note: input.note,
      created_at: new Date().toISOString(),
    }
    const items: OrderItem[] = input.lines.map((line) => {
      const product = products.find((x) => x.id === line.productId)
      return {
        id: uid('oi'),
        order_id: id,
        product_id: line.productId,
        quantity: line.quantity,
        note: line.note ?? null,
        /* Figé en texte dès l'enregistrement : sans cela, le commerçant lisait
           « Poulet DG » dans son tableau de bord sans savoir quelle portion ni
           quelle sauce préparer — l'information n'existait que dans le message
           WhatsApp. */
        options_summary: optionsSummary(product, line.optionIds) || null,
      }
    })
    set((s) => {
      /* Même registre que les vues de produit : une commande réelle doit
         faire bouger les mêmes statistiques consolidées que celles lues par
         « meilleures ventes », le tunnel de conversion et le chiffre estimé
         de la page analytics — sinon un commerçant qui vend vraiment verrait
         ses ventes réelles nulle part dans ses propres chiffres. */
      const today = dayKey(new Date())
      let productStats = s.productStats
      for (const line of input.lines) {
        const existing = productStats.find(
          (row) =>
            row.product_id === line.productId &&
            dayKey(new Date(row.day)) === today,
        )
        productStats = existing
          ? productStats.map((row) =>
              row.id === existing.id
                ? {
                    ...row,
                    orders: row.orders + line.quantity,
                    carts: row.carts + line.quantity,
                  }
                : row,
            )
          : [
              ...productStats,
              {
                id: uid('ps'),
                product_id: line.productId,
                day: new Date().toISOString(),
                views: 0,
                carts: line.quantity,
                orders: line.quantity,
              },
            ]
      }
      return {
        orders: [order, ...s.orders],
        orderItems: [...s.orderItems, ...items],
        productStats,
      }
    })
    get().track(input.businessId, 'order_created', id)
    return id
  },

  setOrderStatus: (id, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    })),

  recordAbandonedCart: (input) =>
    set((s) => {
      const phone = normalizePhone(input.customerPhone)
      /* Un client qui ajuste son panier ne doit pas créer une ligne par
         hésitation : on met à jour la trace existante. La comparaison porte
         sur le numéro normalisé, seul identifiant fiable ici. */
      const existing = s.abandonedCarts.find(
        (c) =>
          c.business_id === input.businessId &&
          normalizePhone(c.customer_phone) === phone &&
          !c.recovered_at,
      )

      if (existing) {
        return {
          abandonedCarts: s.abandonedCarts.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  customer_name: input.customerName,
                  lines: input.lines,
                  total_estimate: input.totalEstimate,
                  /* L'horodatage suit la dernière activité : le délai des
                     30 minutes se compte depuis le vrai abandon. */
                  created_at: new Date().toISOString(),
                }
              : c,
          ),
        }
      }

      const cart: AbandonedCart = {
        id: uid('ac'),
        business_id: input.businessId,
        customer_id: null,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        lines: input.lines,
        total_estimate: input.totalEstimate,
        created_at: new Date().toISOString(),
        reminded_at: null,
        recovered_at: null,
      }
      return { abandonedCarts: [cart, ...s.abandonedCarts] }
    }),

  markCartReminded: (id) =>
    set((s) => ({
      abandonedCarts: s.abandonedCarts.map((c) =>
        c.id === id ? { ...c, reminded_at: new Date().toISOString() } : c,
      ),
    })),

  resolveAbandonedCart: (businessId, customerPhone) =>
    set((s) => {
      const phone = normalizePhone(customerPhone)
      return {
        abandonedCarts: s.abandonedCarts.map((c) =>
          c.business_id === businessId &&
          normalizePhone(c.customer_phone) === phone &&
          !c.recovered_at
            ? { ...c, recovered_at: new Date().toISOString() }
            : c,
        ),
      }
    }),

  dismissAbandonedCart: (id) =>
    set((s) => ({
      abandonedCarts: s.abandonedCarts.filter((c) => c.id !== id),
    })),

  createBooking: (input) => {
    /* Dernière défense contre la double réservation : l'interface ne propose
       que les créneaux libres, mais deux visiteurs peuvent avoir la page
       ouverte en même temps. Si le créneau vient d'être pris (demande vivante
       qui chevauche la plage demandée), on refuse au lieu d'empiler deux
       réservations sur la même heure. */
    const from = new Date(input.startAt).getTime()
    const span = (input.durationMinutes ?? 60) * 60_000
    const to = from + span
    const clash = get().bookings.some((b) => {
      if (b.business_id !== input.businessId) return false
      if (b.status !== 'pending' && b.status !== 'confirmed') return false
      const bFrom = new Date(b.start_at).getTime()
      const bTo = bFrom + (b.duration_minutes ?? 60) * 60_000
      return from < bTo && to > bFrom
    })
    if (clash) return null

    const id = uid('bk')
    const booking: Booking = {
      id,
      business_id: input.businessId,
      customer_id: input.customerId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      service_id: input.serviceId,
      start_at: input.startAt,
      location_id: input.locationId ?? null,
      duration_minutes: input.durationMinutes ?? null,
      total_estimate: input.totalEstimate ?? null,
      status: 'pending',
      note: input.note,
      created_at: new Date().toISOString(),
    }
    set((s) => ({ bookings: [booking, ...s.bookings] }))
    get().track(input.businessId, 'booking_created', id)
    return id
  },

  setBookingStatus: (id, status) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
    })),

  setAvailability: (businessId, rules) =>
    set((s) => ({
      availability: [
        ...s.availability.filter((r) => r.business_id !== businessId),
        ...rules,
      ],
    })),

  toggleFollow: (businessId, userId) => {
    const existing = get().followers.find(
      (f) => f.business_id === businessId && f.user_id === userId,
    )
    if (existing) {
      set((s) => ({ followers: s.followers.filter((f) => f.id !== existing.id) }))
      return false
    }
    /* La notice est copiée telle qu'elle est À CET INSTANT. Garder un simple
       renvoi vers le commerce laisserait la preuve changer avec le texte : le
       commerçant pourrait réécrire demain ce que l'abonné a accepté hier. */
    const notice = get().businesses.find((b) => b.id === businessId)
      ?.follower_data_notice
    const now = new Date().toISOString()
    set((s) => ({
      followers: [
        ...s.followers,
        {
          id: uid('fo'),
          business_id: businessId,
          user_id: userId,
          created_at: now,
          consent_at: now,
          consent_notice: notice ?? DEFAULT_FOLLOWER_NOTICE,
          consent_source: 'page',
        },
      ],
    }))
    /* Le palier se vérifie dans le même geste : différer ce calcul ferait
       arriver la récompense après le départ du commerçant de son écran. */
    get().checkFollowerMilestones(businessId)
    return true
  },

  exportUserData: (userId) => {
    const s = get()
    const user = s.users.find((u) => u.id === userId)
    if (!user) return null
    return buildUserDataExport({
      user,
      followers: s.followers,
      orders: s.orders,
      bookings: s.bookings,
      reviews: s.reviews,
      teamMembers: s.teamMembers,
      businessName: (id) => s.businesses.find((b) => b.id === id)?.name ?? id,
    })
  },

  deleteUserAccount: (userId) => {
    const s = get()
    const user = s.users.find((u) => u.id === userId)
    if (!user) return { ok: false, reason: 'unknown' }
    /* Un propriétaire emporterait ses vitrines avec lui : ses clients
       perdraient des pages en ligne et des commandes en cours. Le cas se
       traite en cédant ou en fermant la page d'abord, pas en le devinant ici. */
    if (s.businesses.some((b) => b.owner_id === userId)) {
      return { ok: false, reason: 'owner' }
    }
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      /* Effacé, pas anonymisé : un abonnement est un lien, il disparaît avec
         la personne. Le compteur du commerçant baisse en conséquence — c'est
         la traduction honnête d'un retrait de consentement. */
      followers: state.followers.filter((f) => f.user_id !== userId),
      reviews: state.reviews.filter((r) => r.author_user_id !== userId),
      teamMembers: state.teamMembers.filter((m) => m.user_id !== userId),
      postComments: state.postComments.filter(
        (c) => c.customer_name !== (user.name ?? '\u0000'),
      ),
      /* Pièces comptables du commerçant : la ligne reste, l'identité s'en va. */
      orders: state.orders.map((o) =>
        o.customer_id === userId ? anonymizeCustomer(o) : o,
      ),
      bookings: state.bookings.map((b) =>
        b.customer_id === userId ? anonymizeCustomer(b) : b,
      ),
      abandonedCarts: state.abandonedCarts.filter((c) => c.customer_id !== userId),
    }))
    return { ok: true }
  },

  addPost: (businessId, post) =>
    set((s) => ({
      posts: [
        {
          id: uid('po'),
          business_id: businessId,
          type: post.type,
          media_url: post.media_url,
          caption: post.caption || null,
          views: 0,
          likes: 0,
          created_at: new Date().toISOString(),
        },
        ...s.posts,
      ],
    })),

  likePost: (postId) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, likes: p.likes + 1 } : p,
      ),
    })),

  addComment: (postId, name, content) =>
    set((s) => ({
      postComments: [
        ...s.postComments,
        {
          id: uid('pc'),
          post_id: postId,
          customer_name: name,
          content,
          created_at: new Date().toISOString(),
        },
      ],
    })),

  track: (businessId, type, targetId = null) =>
    set((s) => {
      const event: AnalyticsEvent = {
        id: uid('ev'),
        business_id: businessId,
        event_type: type,
        target_id: targetId,
        session_id: 'demo-session',
        created_at: new Date().toISOString(),
      }

      /* Une vue de produit alimente aussi les statistiques consolidées, et
         pas seulement le registre d'événements : `productStats` est ce que
         lisent le tableau de bord ET la page « Ce que le Miroir vous révèle »
         (KPI de vues, courbe, meilleures ventes, produits les plus regardés).
         Avant cette ligne, ce registre ne recevait AUCUNE écriture depuis sa
         création — chaque commerce affichait pour toujours les mêmes chiffres
         de démonstration, qu'un client réel ait visité la page ou non. */
      if (type !== 'product_view' || !targetId) {
        return { events: [...s.events, event] }
      }

      const today = dayKey(new Date())
      const existing = s.productStats.find(
        (row) =>
          row.product_id === targetId && dayKey(new Date(row.day)) === today,
      )
      const productStats = existing
        ? s.productStats.map((row) =>
            row.id === existing.id ? { ...row, views: row.views + 1 } : row,
          )
        : [
            ...s.productStats,
            {
              id: uid('ps'),
              product_id: targetId,
              day: new Date().toISOString(),
              views: 1,
              carts: 0,
              orders: 0,
            },
          ]

      return { events: [...s.events, event], productStats }
    }),

  toggleActivationCheck: (businessId, step) =>
    set((s) => {
      const key = `${businessId}:${step}`
      const done = s.activationChecks.includes(key)
      return {
        activationChecks: done
          ? s.activationChecks.filter((k) => k !== key)
          : [...s.activationChecks, key],
      }
    }),

  setPlan: (ownerId, plan) =>
    set((s) => {
      const renewsAt =
        plan === 'free'
          ? null
          : new Date(Date.now() + 30 * 86400000).toISOString()
      const existing = s.subscriptions.find((sub) => sub.owner_id === ownerId)
      /* Un compte sans ligne d'abonnement doit pouvoir passer au payant : sans
         cette branche, `setPlan` restait sans effet et le paiement semblait
         échouer sans message. */
      if (!existing) {
        return {
          subscriptions: [
            ...s.subscriptions,
            {
              id: uid('sb'),
              owner_id: ownerId,
              plan,
              status: 'active' as const,
              started_at: new Date().toISOString(),
              renews_at: renewsAt,
            },
          ],
        }
      }
      return {
        subscriptions: s.subscriptions.map((sub) =>
          sub.owner_id === ownerId
            ? { ...sub, plan, status: 'active' as const, renews_at: renewsAt }
            : sub,
        ),
      }
    }),

  registerReferralVisit: (code) => {
    const clean = code.trim().toUpperCase()
    const referrer = get().businesses.find((b) => b.referral_code === clean)
    if (!referrer) return false

    /* Une seule visite en attente par code, et non une par ouverture du lien.
       L'écran d'arrivée appelle cette action à chaque montage : recharger la
       page, revenir en arrière ou rouvrir le lien reçu par WhatsApp écrivait
       autant de lignes `lien_partage`. Le parrain voyait alors « 7 personnes
       ont ouvert mon lien » pour un seul visiteur curieux — un compteur qui
       flatte n'est pas un compteur, et l'administration héritait du même
       mensonge.

       Le dédoublonnage porte sur les lignes SANS filleul : une fois la page du
       filleul créée, la ligne porte son identifiant et ne bloque plus le
       comptage d'un autre visiteur venu par le même code. */
    const alreadyPending = get().referrals.some(
      (r) =>
        r.referral_code === clean &&
        r.referred_business_id === null &&
        r.status === 'lien_partage',
    )
    if (alreadyPending) return true

    set((s) => ({
      referrals: [
        ...s.referrals,
        {
          id: uid('rf'),
          referrer_business_id: referrer.id,
          referred_business_id: null,
          referral_code: clean,
          status: 'lien_partage',
          created_at: new Date().toISOString(),
          completed_at: null,
        },
      ],
    }))
    return true
  },

  publishPage: (businessId) => {
    const page = get().pages.find((p) => p.business_id === businessId)
    const firstPublication = !!page && !page.published

    /* Republier ne doit rien reverser : on ne solde le parrainage qu'à la
       première mise en ligne. Sans ce garde-fou, un commerçant qui dépublie et
       republie s'offrirait des mois d'essai à volonté. */
    if (!firstPublication) {
      set((s) => ({
        pages: s.pages.map((p) =>
          p.business_id === businessId ? { ...p, published: true } : p,
        ),
      }))
      return { firstPublication: false, referralCompleted: false, bonusDays: 0 }
    }

    const pending = get().referrals.find(
      (r) => r.referred_business_id === businessId && r.status !== 'page_publiee',
    )
    const referrer = pending
      ? get().businesses.find((b) => b.id === pending.referrer_business_id)
      : undefined

    /* Un bonus gagné alors que la page est déjà payante n'a pas de sens en
       jours d'essai : on l'écrit en réserve. Le parrain est récompensé quand
       même — le priver de sa contrepartie parce qu'il paie déjà découragerait
       exactement ceux qui recrutent le plus. */
    const isPaid = (ownerId: string) =>
      ownerPlan(ownerId, get().subscriptions) !== 'free'

    const now = new Date().toISOString()
    const created: TrialBonus[] = []

    if (pending && referrer) {
      created.push({
        id: uid('tb'),
        business_id: referrer.id,
        reason: 'referral_sent',
        days: REFERRAL_SENT_DAYS,
        related_business_id: businessId,
        related_milestone: null,
        deferred: isPaid(referrer.owner_id),
        granted_at: now,
      })
      const self = get().businesses.find((b) => b.id === businessId)
      created.push({
        id: uid('tb'),
        business_id: businessId,
        reason: 'referral_received',
        days: REFERRAL_RECEIVED_DAYS,
        related_business_id: null,
        related_milestone: null,
        deferred: self ? isPaid(self.owner_id) : false,
        granted_at: now,
      })
    }

    set((s) => ({
      pages: s.pages.map((p) =>
        p.business_id === businessId ? { ...p, published: true } : p,
      ),
      trialBonuses: [...s.trialBonuses, ...created],
      referrals: pending
        ? s.referrals.map((r) =>
            r.id === pending.id
              ? { ...r, status: 'page_publiee' as const, completed_at: now }
              : r,
          )
        : s.referrals,
    }))

    return {
      firstPublication: true,
      referralCompleted: !!(pending && referrer),
      /* Ce que la page elle-même a gagné, hors réserve : c'est le seul chiffre
         qu'on peut annoncer sans mentir. */
      bonusDays: created
        .filter((b) => b.business_id === businessId && !b.deferred)
        .reduce((sum, b) => sum + b.days, 0),
    }
  },

  checkFollowerMilestones: (businessId) => {
    const count = get().followers.filter((f) => f.business_id === businessId)
      .length
    const own = get().trialBonuses.filter((b) => b.business_id === businessId)
    const pending = pendingMilestones(count, own)
    if (!pending.length) return []

    const business = get().businesses.find((b) => b.id === businessId)
    const deferred = business
      ? ownerPlan(business.owner_id, get().subscriptions) !== 'free'
      : false
    const now = new Date().toISOString()

    const bonuses: TrialBonus[] = pending.map((milestone) => ({
      id: uid('tb'),
      business_id: businessId,
      reason: 'follower_milestone',
      days: MILESTONE_DAYS,
      related_business_id: null,
      related_milestone: milestone,
      deferred,
      granted_at: now,
    }))

    /* Le certificat des 200 abonnés s'inscrit au registre, une seule fois. Le
       PDF se régénère à la demande : ce qui compte est la trace du fait, pour
       que la distinction survive à un désabonnement. */
    const hasCertificate = get().certificates.some(
      (c) => c.business_id === businessId && c.type === '200_abonnes',
    )
    const certificate =
      !hasCertificate && count >= CERTIFICATE_FOLLOWER_THRESHOLD
        ? {
            id: uid('ct'),
            business_id: businessId,
            type: '200_abonnes' as const,
            granted_at: now,
          }
        : null

    set((s) => ({
      trialBonuses: [...s.trialBonuses, ...bonuses],
      certificates: certificate
        ? [...s.certificates, certificate]
        : s.certificates,
    }))
    return pending
  },

  toggleLesson: ({ businessId, courseId, lessonId, courseLessonIds }) => {
    const done = get().lessonCompletions.find(
      (l) => l.business_id === businessId && l.lesson_id === lessonId,
    )

    /* Décocher ne retire jamais le certificat déjà inscrit : une distinction
       obtenue ne se reprend pas, exactement comme celle des 200 abonnés. */
    if (done) {
      set((s) => ({
        lessonCompletions: s.lessonCompletions.filter((l) => l.id !== done.id),
      }))
      return { completedCourse: false }
    }

    const now = new Date().toISOString()
    const completion: LessonCompletion = {
      id: uid('lc'),
      business_id: businessId,
      course_id: courseId,
      lesson_id: lessonId,
      completed_at: now,
    }

    /* On juge la complétion sur l'état d'APRÈS, en n'admettant que les leçons
       qui appartiennent réellement au cours : un identifiant resté en mémoire
       après refonte d'un cours aurait sinon délivré le certificat trop tôt. */
    const owned = new Set(courseLessonIds)
    const doneAfter = new Set(
      [...get().lessonCompletions, completion]
        .filter((l) => l.business_id === businessId && owned.has(l.lesson_id))
        .map((l) => l.lesson_id),
    )
    const complete = owned.size > 0 && doneAfter.size === owned.size

    const alreadyCertified = get().certificates.some(
      (c) =>
        c.business_id === businessId &&
        c.type === 'formation' &&
        c.related_course_id === courseId,
    )
    const certificate: Certificate | null =
      complete && !alreadyCertified
        ? {
            id: uid('ct'),
            business_id: businessId,
            type: 'formation',
            related_course_id: courseId,
            granted_at: now,
          }
        : null

    set((s) => ({
      lessonCompletions: [...s.lessonCompletions, completion],
      certificates: certificate
        ? [...s.certificates, certificate]
        : s.certificates,
    }))

  return { completedCourse: complete && !alreadyCertified }
  },

  createForumThread: ({
    authorUserId,
    authorBusinessId,
    category,
    title,
    body,
  }) => {
    const id = uid('thread')
    const now = new Date().toISOString()
    const thread: ForumThread = {
      id,
      author_user_id: authorUserId,
      author_business_id: authorBusinessId,
      category,
      title: title.trim(),
      body: body.trim(),
      pinned: false,
      moderation: 'visible',
      moderation_note: null,
      created_at: now,
      /* Égal à la création : un fil sans réponse est actif de sa naissance. */
      last_activity_at: now,
    }
    set((s) => ({ forumThreads: [...s.forumThreads, thread] }))
    return id
  },

  createForumReply: ({ threadId, authorUserId, authorBusinessId, body }) => {
    const id = uid('reply')
    const now = new Date().toISOString()
    const reply: ForumReply = {
      id,
      thread_id: threadId,
      author_user_id: authorUserId,
      author_business_id: authorBusinessId,
      body: body.trim(),
      moderation: 'visible',
      moderation_note: null,
      created_at: now,
    }
    set((s) => ({
      forumReplies: [...s.forumReplies, reply],
      forumThreads: s.forumThreads.map((t) =>
        t.id === threadId ? { ...t, last_activity_at: now } : t,
      ),
    }))
    return id
  },

  reportForumContent: ({ targetType, targetId, reporterUserId, reason }) => {
    const already = get().forumReports.some(
      (r) => r.target_id === targetId && r.reporter_user_id === reporterUserId,
    )
    if (already) return false

    const report: ForumReport = {
      id: uid('report'),
      target_type: targetType,
      target_id: targetId,
      reporter_user_id: reporterUserId,
      reason: reason.trim(),
      created_at: new Date().toISOString(),
      resolved_at: null,
      upheld: null,
    }

    /* Le contenu passe en `signale` et reste lisible. Un contenu masqué le
       demeure : un signalement ne doit pas « rouvrir » ce qui est déjà tranché. */
    const flag = <T extends { id: string; moderation: ModerationState }>(
      rows: T[],
    ): T[] =>
      rows.map((row) =>
        row.id === targetId && row.moderation === 'visible'
          ? { ...row, moderation: 'signale' as ModerationState }
          : row,
      )

    set((s) => ({
      forumReports: [...s.forumReports, report],
      forumThreads: targetType === 'thread' ? flag(s.forumThreads) : s.forumThreads,
      forumReplies: targetType === 'reply' ? flag(s.forumReplies) : s.forumReplies,
    }))
    return true
  },

  hideForumContent: ({ targetType, targetId, note }) => {
    const now = new Date().toISOString()
    const hide = <T extends { id: string }>(rows: T[]): T[] =>
      rows.map((row) =>
        row.id === targetId
          ? {
              ...row,
              moderation: 'masque' as ModerationState,
              moderation_note: note.trim() || null,
            }
          : row,
      )

    set((s) => ({
      forumThreads: targetType === 'thread' ? hide(s.forumThreads) : s.forumThreads,
      forumReplies: targetType === 'reply' ? hide(s.forumReplies) : s.forumReplies,
      /* Les signalements visant ce contenu sont clos et retenus : ceux qui
         l'ont signalé avaient raison, et l'historique doit le dire. */
      forumReports: s.forumReports.map((r) =>
        r.target_id === targetId && r.resolved_at === null
          ? { ...r, resolved_at: now, upheld: true }
          : r,
      ),
    }))
  },

  restoreForumContent: ({ targetType, targetId }) => {
    const now = new Date().toISOString()
    const restore = <T extends { id: string }>(rows: T[]): T[] =>
      rows.map((row) =>
        row.id === targetId
          ? {
              ...row,
              moderation: 'visible' as ModerationState,
              moderation_note: null,
            }
          : row,
      )

    set((s) => ({
      forumThreads:
        targetType === 'thread' ? restore(s.forumThreads) : s.forumThreads,
      forumReplies:
        targetType === 'reply' ? restore(s.forumReplies) : s.forumReplies,
      forumReports: s.forumReports.map((r) =>
        r.target_id === targetId && r.resolved_at === null
          ? { ...r, resolved_at: now, upheld: false }
          : r,
      ),
    }))
  },

  createReview: ({
    businessId,
    productId,
    authorUserId,
    authorName,
    rating,
    body,
  }) => {
    const id = uid('rv')
    const review: Review = {
      id,
      business_id: businessId,
      product_id: productId,
      author_user_id: authorUserId,
      author_name: authorName.trim(),
      /* Borné ici : une note hors de 1..5 fausserait toutes les moyennes, et le
         formulaire n'est pas un endroit sûr pour garder cette invariante. */
      rating: clampRating(rating),
      /* Une note seule est un avis valable — on ne force pas le commentaire. */
      body: body.trim() || null,
      moderation: 'visible',
      moderation_note: null,
      created_at: new Date().toISOString(),
    }
    set((s) => ({ reviews: [review, ...s.reviews] }))
    return id
  },

  reportReview: ({ reviewId, reporterUserId, reason }) => {
    const already = get().reviewReports.some(
      (r) => r.review_id === reviewId && r.reporter_user_id === reporterUserId,
    )
    /* Un même avis signalé dix fois par la même personne ne mérite pas dix
       arbitrages. Le contrôle ne vaut que pour les signalants connus : deux
       visiteurs anonymes ont tous deux le droit d'alerter. */
    if (already && reporterUserId !== null) return false

    const report: ReviewReport = {
      id: uid('rvr'),
      review_id: reviewId,
      reporter_user_id: reporterUserId,
      reason: reason.trim(),
      created_at: new Date().toISOString(),
      resolved_at: null,
      upheld: null,
    }

    set((s) => ({
      reviewReports: [...s.reviewReports, report],
      /* L'avis passe en `signale` et reste lisible. Un avis déjà masqué le
         demeure : un signalement ne rouvre pas ce qui est tranché. */
      reviews: s.reviews.map((r) =>
        r.id === reviewId && r.moderation === 'visible'
          ? { ...r, moderation: 'signale' as ModerationState }
          : r,
      ),
    }))
    return true
  },

  hideReview: ({ reviewId, note }) => {
    const now = new Date().toISOString()
    set((s) => ({
      reviews: s.reviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              moderation: 'masque' as ModerationState,
              moderation_note: note.trim() || null,
            }
          : r,
      ),
      reviewReports: s.reviewReports.map((r) =>
        r.review_id === reviewId && r.resolved_at === null
          ? { ...r, resolved_at: now, upheld: true }
          : r,
      ),
    }))
  },

  restoreReview: ({ reviewId }) => {
    const now = new Date().toISOString()
    set((s) => ({
      reviews: s.reviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              moderation: 'visible' as ModerationState,
              moderation_note: null,
            }
          : r,
      ),
      reviewReports: s.reviewReports.map((r) =>
        r.review_id === reviewId && r.resolved_at === null
          ? { ...r, resolved_at: now, upheld: false }
          : r,
      ),
    }))
  },

  joinTeam: ({ name, whatsapp, email, source, userId }) => {
    const numero = normalizePhone(whatsapp)
    /* Un numéro vide ou trop court n'est pas joignable. Le refuser ici garantit
       que la liste ne contient que des contacts réellement atteignables, quel
       que soit l'écran qui a servi à s'inscrire. */
    if (numero.length < 8) return false
    if (!name.trim()) return false

    /* Comparaison sur le numéro normalisé : sans cela, la même personne
       réinscrite avec un indicatif écrit autrement apparaîtrait deux fois. */
    if (get().teamMembers.some((m) => m.whatsapp === numero)) return false

    const membre: TeamMember = {
      id: uid('team'),
      name: name.trim(),
      whatsapp: numero,
      /* Chaîne vide et « non renseigné » ne sont pas la même chose : on écrit
         `null`, pour que l'absence d'e-mail se lise comme telle. */
      email: email?.trim() ? email.trim() : null,
      source,
      user_id: userId ?? null,
      created_at: new Date().toISOString(),
    }
    set((s) => ({ teamMembers: [membre, ...s.teamMembers] }))
    return true
  },

  messageAdmin: ({ senderName, whatsapp, email, topic, body, userId }) => {
    const texte = body.trim()
    if (!texte) return false

    const numero = whatsapp?.trim() ? normalizePhone(whatsapp) : null
    const courriel = email?.trim() ? email.trim() : null
    /* Sans canal de réponse, le message part sans retour possible : l'auteur
       attendrait une réponse qui ne pourrait jamais lui parvenir. */
    if (!numero && !courriel) return false

    const message: AdminMessage = {
      id: uid('msg'),
      sender_user_id: userId ?? null,
      sender_name: senderName.trim() || 'Ingénieur anonyme',
      whatsapp: numero,
      email: courriel,
      topic,
      body: texte,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    set((s) => ({ adminMessages: [message, ...s.adminMessages] }))
    return true
  },

  markAdminMessageRead: ({ messageId }) => {
    const now = new Date().toISOString()
    set((s) => ({
      adminMessages: s.adminMessages.map((m) =>
        /* On ne réécrit pas une date déjà posée : la première lecture est
           l'information utile, pas la dernière. */
        m.id === messageId && m.read_at === null ? { ...m, read_at: now } : m,
      ),
    }))
  },

      redeemGoodie: ({
        businessId,
        goodieId,
        cost,
        recipientName,
        recipientPhone,
        deliveryCity,
        deliveryAddress,
        size,
        deliveryNote,
      }) => {
        const s = get()
        /* Sans destinataire joignable, le colis est indéliverable : le contrôle
           vit ici et non dans l'écran, comme celui du solde — un formulaire
           contourné ne doit pas pouvoir écrire une livraison impossible. */
        if (!recipientName.trim() || !recipientPhone.trim() || !deliveryCity.trim()) {
          return null
        }
        /* Le solde est recalculé ici, à l'instant de la dépense, et non lu depuis
           une valeur passée par l'écran : entre l'affichage et le clic, le
           commerçant a pu échanger un autre goodie dans un second onglet. */
        const { balance } = pointsBalance({
          businessId,
          lessonCompletions: s.lessonCompletions,
          certificates: s.certificates,
          referrals: s.referrals,
          redemptions: s.goodieRedemptions,
        })
        if (balance < cost) return null

        const id = uid('goodie')
        const redemption: GoodieRedemption = {
          id,
          business_id: businessId,
          goodie_id: goodieId,
          points_spent: cost,
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          delivery_city: deliveryCity.trim(),
          delivery_address: deliveryAddress?.trim() || null,
          size: size?.trim() || null,
          delivery_note: deliveryNote?.trim() || null,
          status: 'demande',
          created_at: new Date().toISOString(),
        }
    set((st) => ({ goodieRedemptions: [...st.goodieRedemptions, redemption] }))
    return id
  },

  advanceRedemption: (redemptionId) => {
    /* L'étape suivante est décrite ici, et non calculée dans l'écran : c'est
       le cycle métier, il n'a qu'un seul endroit légitime. `remise` n'a pas
       de suite — un objet remis reste remis. */
    const NEXT: Record<GoodieRedemption['status'], GoodieRedemption['status']> = {
      demande: 'preparee',
      preparee: 'remise',
      remise: 'remise',
    }
    set((s) => ({
      goodieRedemptions: s.goodieRedemptions.map((r) =>
        r.id === redemptionId ? { ...r, status: NEXT[r.status] } : r,
      ),
    }))
  },

  upsertUser: (user) => {
    const existing = user.id ? get().users.find((u) => u.id === user.id) : undefined
    if (existing) {
      set((s) => ({
        users: s.users.map((u) => (u.id === existing.id ? { ...u, ...user } : u)),
      }))
      return existing.id
    }
    const id = user.id ?? uid('u')
    const created: User = {
      id,
      email: user.email ?? null,
      whatsapp_number: user.whatsapp_number ?? null,
      name: user.name ?? null,
      neighborhood: user.neighborhood ?? null,
      address: user.address ?? null,
      role: user.role ?? 'customer',
      created_at: new Date().toISOString(),
    }
    set((s) => ({ users: [...s.users, created] }))
    return id
  },
    }),
    {
      name: 'clyde-data',
      skipHydration: true,
      /* `merge` fait primer les données enregistrées, ce qui figerait un ancien
         jeu de démonstration pour les visiteurs déjà venus. `version` sert donc
         de point de rupture : à incrémenter quand les graines changent.
         v3 : variantes de carrousel (`caption`, `card`) et styles de menu
         mobile (`dark-pill`, `docked`, `minimal`) dans les pages de démo.
         v4 : l'abonnement passe de la page au compte (`business_id` →
         `owner_id`) et les commerces portent un `referral_code`. Les
         abonnements enregistrés sous l'ancienne forme n'ont plus de sens : les
         relire donnerait des pages sans plan et des plans sans compte.
         v5 : arrivée du Forum et de la Boutique Goodies. Les fils de
         démonstration n'existaient pas en v4 : sans rupture, un visiteur déjà
         venu ouvrirait un forum vide.
         v6 : options d'articles (`option_groups`). Les produits enregistrés en
         v5 n'ont pas le champ ; `migrate` repart des graines pour les produits,
         ce qui rétablit du même coup les options du plat signature. Sans
         rupture, un visiteur déjà venu verrait une carte sans aucun choix.
         v7 : avis clients. Nouveaux registres, absents des sessions v6 ; la
         rupture leur donne les avis de démonstration plutôt qu'un bloc vide.
         v8 : l'échange de goodie devient un bon de livraison complet
         (destinataire, téléphone, adresse, taille). Les échanges écrits en v7
         sont complétés champ à champ plutôt que jetés : les points dépensés
         sont l'acte du visiteur.
         v9 : l'abonnement porte la preuve de son consentement (date + copie du
         texte accepté). Les abonnements antérieurs sont marqués `import` sans
         date : leur inventer un horodatage fabriquerait la preuve même que ce
         champ existe pour établir. */
      version: 9,
      /* Les formes n'ont pas bougé, seules des valeurs de démonstration ont été
         corrigées. On repart donc des graines, en conservant ce que le visiteur
         a lui-même produit : ses comptes et ses abonnements. */
      migrate: (state) => {
        const old = state as Partial<ClydeState> | undefined
        /* Les tableaux omis repartent vides : `merge` les recomplète depuis les
           graines juste après. */
        return {
          users: old?.users ?? [],
          /* Le consentement manquant est déclaré tel quel : `import`, sans
             date. Un export doit pouvoir dire « nous ne savons pas quand » —
             c'est vérifiable, alors qu'une date reconstituée ne l'est pas. */
          followers: (old?.followers ?? []).map((f) =>
            f.consent_source ? f : { ...f, consent_source: 'import' as const },
          ),
          businesses: [],
          pages: [],
          products: [],
          locations: [],
          orders: [],
          orderItems: [],
          abandonedCarts: [],
          availability: [],
          bookings: [],
          /* Vidés volontairement : un abonnement écrit en v3 portait un
             `business_id` et aucune notion de compte. Le conserver aurait
             attribué un plan à personne. Les graines reprennent la main. */
          subscriptions: [],
          trialBonuses: [],
          referrals: [],
          certificates: [],
          /* Conservée, contrairement aux tableaux ci-dessus : une leçon validée
             est le travail du visiteur, pas une donnée de démonstration. La
             vider ferait perdre sa progression à chaque montée de version. */
          lessonCompletions: old?.lessonCompletions ?? [],
          /* Conservés pour la même raison : un fil écrit par le visiteur, un
             signalement qu'il a posé ou un goodie qu'il a commandé sont ses
             actes, pas du décor. `merge` y rajoutera les fils de démonstration.
             Les clés absentes en v4 tombent simplement sur le tableau vide. */
          forumThreads: old?.forumThreads ?? [],
          forumReplies: old?.forumReplies ?? [],
          forumReports: old?.forumReports ?? [],
          /* Même raison : un avis déposé par un visiteur est son acte. Absents
             avant la v7, ils tombent sur le tableau vide et `merge` y ajoutera
             les avis de démonstration. */
          reviews: old?.reviews ?? [],
          reviewReports: old?.reviewReports ?? [],
          /* Conservés eux aussi : un contact qui a laissé son numéro et une
             question posée à l'Usine sont des actes de personnes réelles. Les
             vider à chaque montée de version perdrait des contacts. */
          teamMembers: old?.teamMembers ?? [],
          adminMessages: old?.adminMessages ?? [],
          /* Les échanges v7 n'avaient ni destinataire ni taille : on complète
             champ à champ avec des valeurs vides plutôt que de jeter la ligne —
             les points ont réellement été dépensés. */
          goodieRedemptions: (old?.goodieRedemptions ?? []).map((r) => ({
            ...r,
            recipient_name: r.recipient_name ?? '',
            recipient_phone: r.recipient_phone ?? '',
            delivery_address: r.delivery_address ?? null,
            size: r.size ?? null,
          })),
          /* Conservées elles aussi : une vue ou une vente réellement écrite
             par `track()`/`createOrder` est la preuve d'activité du
             commerçant, pas un contenu de démonstration à repartir de zéro à
             chaque montée de version. */
          productStats: old?.productStats ?? [],
          activationChecks: old?.activationChecks ?? [],
        }
      },
      /* On n'enregistre que ce que le visiteur a produit lui-même — comptes,
         commerces, pages, abonnements, commandes. Statistiques et contenus
         éditoriaux restent lus depuis les graines : les figer empêcherait toute
         évolution de la démonstration, et gonflerait le stockage local. */
      partialize: (s) => ({
        users: s.users,
        businesses: s.businesses,
        pages: s.pages,
        products: s.products,
        locations: s.locations,
        orders: s.orders,
        orderItems: s.orderItems,
        abandonedCarts: s.abandonedCarts,
        availability: s.availability,
        bookings: s.bookings,
        followers: s.followers,
        subscriptions: s.subscriptions,
        /* Les récompenses sont acquises : ne pas les enregistrer effacerait au
           rechargement des jours d'essai gagnés et un parrainage abouti. */
        trialBonuses: s.trialBonuses,
        referrals: s.referrals,
        certificates: s.certificates,
        lessonCompletions: s.lessonCompletions,
        /* Contenus du visiteur, et non données éditoriales : ne pas les
           enregistrer effacerait au rechargement le fil qu'il vient d'ouvrir.
           Les décisions de modération suivent, sinon un contenu masqué
           redeviendrait visible au premier rafraîchissement. */
        forumThreads: s.forumThreads,
        forumReplies: s.forumReplies,
        forumReports: s.forumReports,
        /* Les avis suivent la même règle que les fils : sans enregistrement,
           l'avis qu'un client vient de déposer disparaîtrait au rechargement,
           et un avis masqué redeviendrait visible. */
        reviews: s.reviews,
        reviewReports: s.reviewReports,
        /* Un contact recueilli et un message adressé à l'Usine sont ce qu'il y a
           de plus coûteux à perdre : sans enregistrement, la personne qui vient
           de laisser son numéro serait effacée au premier rafraîchissement, et
           sa question ne parviendrait jamais à l'administration. */
        teamMembers: s.teamMembers,
        adminMessages: s.adminMessages,
        goodieRedemptions: s.goodieRedemptions,
        /* Les vues et ventes consolidées ne sont plus de simples graines de
           démonstration depuis que `track()` et `createOrder` y écrivent
           réellement : sans cette ligne, chaque commande passée et chaque
           fiche produit consultée disparaissait au rechargement suivant, et
           « ce que le Miroir révèle » n'aurait jamais pu progresser au-delà
           de la session en cours. */
        productStats: s.productStats,
        /* Aucune graine : cocher « QR téléchargé » est un acte du commerçant,
           pas un contenu de démonstration à recompléter. */
        activationChecks: s.activationChecks,
      }),
      /**
       * Fusion à la réhydratation.
       *
       * Les données enregistrées font foi : un commerçant qui ajoute une
       * couverture, ou un visiteur qui s'abonne, doit retrouver son geste. Mais
       * les graines seules connaissent les enregistrements ajoutés depuis — on
       * les complète donc, sans écraser l'existant.
       */
      merge: (persisted, current) => {
        const saved = persisted as Partial<ClydeState> | undefined
        if (!saved) return current

        /** Version enregistrée d'abord, puis les graines encore inconnues. */
        const mergeById = <T extends { id: string }>(
          stored: T[] | undefined,
          seeds: T[],
        ): T[] => {
          if (!stored?.length) return seeds
          const known = new Set(stored.map((x) => x.id))
          return [...stored, ...seeds.filter((x) => !known.has(x.id))]
        }

        return {
          ...current,
          users: mergeById(saved.users, current.users),
          businesses: mergeById(saved.businesses, current.businesses),
          products: mergeById(saved.products, current.products),
          locations: mergeById(saved.locations, current.locations),
          pages: mergeById(saved.pages, current.pages),
          orders: mergeById(saved.orders, current.orders),
          orderItems: mergeById(saved.orderItems, current.orderItems),
          availability: mergeById(saved.availability, current.availability),
          bookings: mergeById(saved.bookings, current.bookings),
          /* Ici la liste enregistrée fait seule foi : compléter par les graines
             ferait réapparaître un abonnement que le visiteur vient de retirer. */
          followers: saved.followers ?? current.followers,
          /* Même raison : un panier écarté de la liste ne doit pas revenir au
             rechargement. */
          abandonedCarts: saved.abandonedCarts ?? current.abandonedCarts,
          subscriptions: mergeById(saved.subscriptions, current.subscriptions),
          trialBonuses: mergeById(saved.trialBonuses, current.trialBonuses),
          referrals: mergeById(saved.referrals, current.referrals),
      certificates: mergeById(saved.certificates, current.certificates),
      /* `mergeById` : les lignes réellement écrites par `track()` et
         `createOrder` s'ajoutent à celles de démonstration au lieu de les
         remplacer — un commerce de démonstration garde ses chiffres
         d'exemple, un commerce réel garde sa progression réelle. */
      productStats: mergeById(saved.productStats, current.productStats),
      activationChecks: saved.activationChecks ?? current.activationChecks,
      /* La progression n'a aucune graine : ce que le visiteur a validé est la
         seule vérité, et `mergeById` la conserverait à l'identique. */
      lessonCompletions: saved.lessonCompletions ?? current.lessonCompletions,
      /* `mergeById` convient ici : la version enregistrée d'un fil de
         démonstration l'emporte sur sa graine, ce qui préserve un masquage
         décidé par la modération, tout en faisant apparaître les fils ajoutés
         aux graines depuis la dernière visite. */
      forumThreads: mergeById(saved.forumThreads, current.forumThreads),
      forumReplies: mergeById(saved.forumReplies, current.forumReplies),
      /* Aucune graine pour ces deux registres : le visiteur en est la seule
         source, et compléter n'aurait rien à compléter. */
      forumReports: saved.forumReports ?? current.forumReports,
      /* `mergeById` comme pour les fils : la version enregistrée d'un avis de
         démonstration l'emporte sur sa graine, ce qui préserve un masquage
         décidé par la modération, tout en laissant apparaître les avis ajoutés
         aux graines depuis. */
      reviews: mergeById(saved.reviews, current.reviews),
      reviewReports: saved.reviewReports ?? current.reviewReports,
      /* Sans graine, comme les signalements : la liste enregistrée fait seule
         foi. `mergeById` n'aurait rien à compléter, et les clés absentes des
         sessions antérieures tombent sur le tableau vide de l'état initial. */
      teamMembers: saved.teamMembers ?? current.teamMembers,
      adminMessages: saved.adminMessages ?? current.adminMessages,
      goodieRedemptions:
        saved.goodieRedemptions ?? current.goodieRedemptions,
    }
      },
    },
  ),
)

/**
 * Indique si les données persistées ont été relues.
 *
 * Tout composant qui dépend de l'état enregistré (abonnements, couvertures)
 * doit attendre ce signal, sinon il rendrait d'abord les données de
 * démonstration puis basculerait — ce qui casse l'hydratation.
 */
export function useClydeReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (useClyde.persist.hasHydrated()) {
      setReady(true)
      return
    }
    const done = useClyde.persist.onFinishHydration(() => setReady(true))
    void useClyde.persist.rehydrate()
    return done
  }, [])
  return ready
}

/* ============================================================
   Session — utilisateur courant, business actif, contexte QR
   ============================================================ */

interface SessionState {
  userId: string | null
  role: 'owner' | 'customer' | 'admin' | null
  activeBusinessId: string
  /** Contexte QR mémorisé : businessId → locationId */
  qrContext: Record<string, string>
  /**
   * Heure du scan : businessId → timestamp (ms). Sans horodatage, un client
   * qui a scanné « Table 12 » au déjeuner resterait tagué Table 12 en
   * commandant depuis chez lui la semaine suivante — le contexte de table
   * n'a de sens que le temps d'un service.
   */
  qrContextAt: Record<string, number>
  /**
   * Notifications masquées à la main (avis lus, abonnés notés…). Les
   * commandes n'y entrent JAMAIS : une commande en attente ne se balaie pas
   * d'un revers, elle se confirme ou s'annule dans la page Commandes — et
   * disparaît alors d'elle-même puisque la cloche est dérivée des données.
   */
  dismissedNotifications: string[]
  dismissNotification: (id: string) => void
  signIn: (userId: string, role: 'owner' | 'customer' | 'admin') => void
  /**
   * Connexion de démonstration : on retrouve le compte par e-mail.
   * Aucun mot de passe n'est vérifié — au branchement de la base, cette
   * fonction devient un appel d'authentification réel et rien d'autre
   * ne change dans les écrans.
   */
  signInWithEmail: (email: string) => { ok: boolean; error?: string }
  /** Inscription de démonstration : crée le compte s'il n'existe pas déjà. */
  signUpWithEmail: (input: {
    email: string
    name: string
    whatsapp: string
    role: 'owner' | 'customer'
  }) => { ok: boolean; error?: string; userId?: string }
  signOut: () => void
  setActiveBusiness: (id: string) => void
  setQrContext: (businessId: string, locationId: string) => void
  clearQrContext: (businessId: string) => void
}

/**
 * La session est le seul état conservé d'un rafraîchissement à l'autre :
 * sans cela, le tableau de bord renverrait vers l'écran de connexion à
 * chaque rechargement de page. Les données métier restent en mémoire.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      role: null,
      activeBusinessId: DEMO_ACTIVE_BUSINESS_ID,
      qrContext: {},
      qrContextAt: {},
      dismissedNotifications: [],
      dismissNotification: (id) =>
        set((s) => ({
          /* Borné à 200 entrées : les identifiants pointent des faits qui
             finissent traités ou anciens, garder la liste entière pour
             toujours ne ferait que gonfler le stockage local. */
          dismissedNotifications: [...s.dismissedNotifications, id].slice(-200),
        })),
      signIn: (userId, role) => set({ userId, role }),

      signInWithEmail: (email) => {
        const clean = email.trim().toLowerCase()
        const user = useClyde
          .getState()
          .users.find((u) => (u.email ?? '').toLowerCase() === clean)
        if (!user) {
          return { ok: false, error: 'Aucun compte ne correspond à cet e-mail.' }
        }
        const role = user.role === 'admin' ? 'admin' : user.role
        const owned = useClyde
          .getState()
          .businesses.find((b) => b.owner_id === user.id)
        set({
          userId: user.id,
          role,
          ...(owned ? { activeBusinessId: owned.id } : {}),
        })
        return { ok: true }
      },

      signUpWithEmail: ({ email, name, whatsapp, role }) => {
        const clean = email.trim().toLowerCase()
        const exists = useClyde
          .getState()
          .users.some((u) => (u.email ?? '').toLowerCase() === clean)
        if (exists) {
          return { ok: false, error: 'Un compte utilise déjà cet e-mail.' }
        }
        const userId = useClyde.getState().upsertUser({
          email: clean,
          name: name.trim(),
          whatsapp_number: whatsapp.trim() || null,
          role,
        })
        set({ userId, role })
        return { ok: true, userId }
      },

      signOut: () => set({ userId: null, role: null }),
      setActiveBusiness: (id) => set({ activeBusinessId: id }),
      setQrContext: (businessId, locationId) =>
        set((s) => ({
          qrContext: { ...s.qrContext, [businessId]: locationId },
          qrContextAt: { ...s.qrContextAt, [businessId]: Date.now() },
        })),
      clearQrContext: (businessId) =>
        set((s) => {
          const next = { ...s.qrContext }
          const nextAt = { ...s.qrContextAt }
          delete next[businessId]
          delete nextAt[businessId]
          return { qrContext: next, qrContextAt: nextAt }
        }),
    }),
    {
      name: 'clyde-session',
      /* Sans `version` explicite, une session écrite par une version
         antérieure du code était comparée à la valeur 0 par défaut, jugée
         non migrable, puis jetée en entier : le visiteur se retrouvait
         déconnecté à chaque rechargement. */
      version: 1,
      /* On récupère champ par champ plutôt que de repartir de zéro, en
         retombant sur les mêmes valeurs que l'état initial. */
      migrate: (state) => {
        const old = state as Partial<SessionState> | undefined
        return {
          userId: old?.userId ?? null,
          role: old?.role ?? null,
          activeBusinessId: old?.activeBusinessId ?? DEMO_ACTIVE_BUSINESS_ID,
          qrContext: old?.qrContext ?? {},
        }
      },
      partialize: (s) => ({
        userId: s.userId,
        role: s.role,
        activeBusinessId: s.activeBusinessId,
        qrContext: s.qrContext,
      }),
    },
  ),
)

/* ============================================================
   Panier — par business, jamais persisté en base
   ============================================================ */

/**
 * Le panier est indexé par `cartLineKey`, pas par identifiant de produit.
 *
 * Depuis les options, deux tailles de pizza sont deux lignes du même produit.
 * Une clé fondée sur le seul produit faisait qu'augmenter la quantité de l'une
 * modifiait l'autre, et que retirer la grande portion emportait la petite avec
 * elle. Les fonctions reçoivent donc une clé de ligne, obtenue par
 * `cartLineKey({ productId, optionIds })`.
 */
interface CartState {
  carts: Record<string, CartLine[]>
  add: (
    businessId: string,
    productId: string,
    quantity?: number,
    optionIds?: string[],
  ) => void
  setQuantity: (businessId: string, lineKey: string, quantity: number) => void
  setNote: (businessId: string, lineKey: string, note: string) => void
  remove: (businessId: string, lineKey: string) => void
  clear: (businessId: string) => void
}

export const useCart = create<CartState>((set) => ({
  carts: {},
  add: (businessId, productId, quantity = 1, optionIds) =>
    set((s) => {
      const lines = s.carts[businessId] ?? []
      const key = cartLineKey({ productId, optionIds })
      const found = lines.find((l) => cartLineKey(l) === key)
      const next = found
        ? lines.map((l) =>
            cartLineKey(l) === key
              ? { ...l, quantity: l.quantity + quantity }
              : l,
          )
        : [...lines, { productId, quantity, optionIds }]
      return { carts: { ...s.carts, [businessId]: next } }
    }),
  setQuantity: (businessId, lineKey, quantity) =>
    set((s) => {
      const lines = s.carts[businessId] ?? []
      const next =
        quantity <= 0
          ? lines.filter((l) => cartLineKey(l) !== lineKey)
          : lines.map((l) => (cartLineKey(l) === lineKey ? { ...l, quantity } : l))
      return { carts: { ...s.carts, [businessId]: next } }
    }),
  setNote: (businessId, lineKey, note) =>
    set((s) => {
      const lines = s.carts[businessId] ?? []
      return {
        carts: {
          ...s.carts,
          [businessId]: lines.map((l) =>
            cartLineKey(l) === lineKey ? { ...l, note } : l,
          ),
        },
      }
    }),
  remove: (businessId, lineKey) =>
    set((s) => ({
      carts: {
        ...s.carts,
        [businessId]: (s.carts[businessId] ?? []).filter(
          (l) => cartLineKey(l) !== lineKey,
        ),
      },
    })),
  clear: (businessId) =>
    set((s) => ({ carts: { ...s.carts, [businessId]: [] } })),
}))
