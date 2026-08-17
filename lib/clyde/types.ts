/**
 * CLYDE — types miroir du schéma SQL (plan v5, section 18).
 * Toute la couche démo respecte ces formes pour que le passage à Supabase
 * soit un remplacement de la couche d'accès, pas une réécriture.
 */

export type UserRole = 'owner' | 'customer' | 'admin'

export type Currency = 'XAF' | 'CNY' | 'EUR' | 'USD'

export type BusinessCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'boulangerie_patisserie'
  | 'traiteur'
  | 'hotel'
  | 'location_courte_duree'
  | 'coiffure_beaute'
  | 'spa_bienetre'
  | 'sport_coaching'
  | 'boutique_mode'
  | 'epicerie'
  | 'fleuriste'
  | 'electronique_reparation'
  | 'service_pro'
  | 'artisan'
  | 'pressing'
  | 'auto_garage'
  | 'immobilier'
  | 'photographe_studio'
  | 'evenementiel'
  | 'autre'

export type Plan = 'free' | 'pro' | 'entreprise'

export type OrderStatus =
  | 'pending'
  | 'whatsapp_opened'
  | 'confirmed'
  | 'cancelled'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type OrderChannel = 'online' | 'qr_location'

export type LocationType = 'table' | 'room' | 'other'

export type ProductType = 'product' | 'service'

export interface User {
  id: string
  email: string | null
  /** Contact WhatsApp — requis pour créer un compte visiteur */
  whatsapp_number: string | null
  name: string | null
  /** Quartier — requis pour créer un compte visiteur */
  neighborhood: string | null
  /** Adresse précise — optionnelle (note vie privée, section 9) */
  address: string | null
  role: UserRole
  created_at: string
}

export interface Business {
  id: string
  owner_id: string
  slug: string
  name: string
  category: BusinessCategory
  whatsapp_number: string
  description: string | null
  currency: Currency
  followers_public: boolean
  listed_in_marketplace: boolean
  /** Texte d'engagement affiché avant abonnement — jamais vide */
  follower_data_notice: string
  module_locations: boolean
  module_booking: boolean
  city: string | null
  neighborhood: string | null
  cover_url: string | null
  logo_url: string | null
  /**
   * Code de parrainage propre à la page, unique, attribué à sa création.
   * Sert à bâtir le lien personnalisé `/rejoindre?ref={code}`.
   */
  referral_code: string
  created_at: string
}

export interface Page {
  id: string
  business_id: string
  theme_json: PageTheme
  layout_json: Block[]
  published: boolean
}

/**
 * Un choix proposé au client dans un groupe d'options.
 *
 * `price_delta` est un écart au prix de base, pas un prix : « grande portion »
 * vaut +500, pas 500. Stocker l'écart permet de changer le prix du plat sans
 * avoir à reprendre chacune de ses variantes.
 */
export interface ProductOption {
  id: string
  label: string
  /** Écart au prix de base, en unité entière. 0 pour une option gratuite. */
  price_delta: number
}

/**
 * Un groupe d'options : « Portion », « Sauce », « Cuisson »…
 *
 * Le groupe porte la règle de choix, pas l'option : c'est au niveau du groupe
 * qu'on décide s'il faut choisir une seule sauce ou plusieurs, et si le choix
 * est obligatoire.
 */
export interface ProductOptionGroup {
  id: string
  label: string
  /**
   * `unique` : un seul choix (boutons radio). `multiple` : plusieurs cases.
   *
   * Un groupe `unique` et `required` est le cas le plus fréquent — la taille
   * d'une pizza doit être choisie, et une seule.
   */
  select: 'unique' | 'multiple'
  /** Le client ne peut pas commander sans avoir choisi dans ce groupe. */
  required: boolean
  options: ProductOption[]
}

export interface Product {
  id: string
  business_id: string
  name: string
  description: string | null
  price: number
  /** Prix barré, si le produit est en promotion */
  compare_at_price: number | null
  media_urls: string[]
  type: ProductType
  duration_minutes: number | null
  category_label: string | null
  active: boolean
  /** Indisponible temporairement — reste visible, non commandable */
  available: boolean
  /**
   * Groupes d'options, dans l'ordre d'affichage. Vide pour la majorité des
   * articles : un savon n'a pas de taille.
   */
  option_groups: ProductOptionGroup[]
  created_at: string
}

export interface BusinessLocation {
  id: string
  business_id: string
  type: LocationType
  label: string
  created_at: string
}

export interface Order {
  id: string
  business_id: string
  customer_id: string | null
  customer_name: string
  customer_phone: string
  channel: OrderChannel
  location_id: string | null
  total_estimate: number
  status: OrderStatus
  note: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  note: string | null
  /**
   * Les options choisies, figées en texte au moment de la commande.
   *
   * Volontairement du texte et non des identifiants : une commande est une
   * archive. Si le commerçant renomme « Grande faim » ou retire l'option le
   * mois suivant, la commande passée doit continuer à dire ce que le client
   * avait réellement demandé.
   */
  options_summary: string | null
}

/**
 * Panier renseigné puis laissé en route.
 *
 * Ce n'est pas une commande : rien n'a été envoyé, le commerçant ne doit donc
 * rien préparer. Mais le client est joignable et son choix est connu — c'est
 * la vente la plus facile à rattraper de tout le parcours.
 *
 * Les lignes sont stockées telles quelles, sans passer par `OrderItem` : un
 * panier abandonné n'a pas de commande à laquelle rattacher ses articles.
 */
export interface AbandonedCart {
  id: string
  business_id: string
  customer_id: string | null
  customer_name: string
  customer_phone: string
  lines: CartLine[]
  total_estimate: number
  /** Dernière activité sur le panier — sert au seuil des 30 minutes. */
  created_at: string
  /** Horodatage de la relance, pour ne pas écrire deux fois au même client. */
  reminded_at: string | null
  /** Renseigné dès que le client commande : le panier quitte la liste. */
  recovered_at: string | null
}

export interface AvailabilityRule {
  id: string
  business_id: string
  /** 0 = dimanche … 6 = samedi */
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
}

export interface Booking {
  id: string
  business_id: string
  customer_id: string | null
  customer_name: string
  customer_phone: string
  service_id: string | null
  start_at: string
  /**
   * Emplacement souhaité — table, salle, cabine.
   *
   * C'est une préférence transmise au commerçant, pas une ligne de facture :
   * le prix d'une prestation ne dépend pas de la table choisie. Elle sert à
   * préparer le bon endroit, et reste hors du total.
   */
  location_id: string | null
  /**
   * Durée retenue par le client, en minutes.
   *
   * Multiple de la durée de créneau du jour. `null` sur les réservations
   * antérieures à ce champ : on retombe alors sur la durée du service.
   */
  duration_minutes: number | null
  /** Total annoncé au client au moment de la demande, dans la devise du commerce. */
  total_estimate: number | null
  status: BookingStatus
  note: string | null
  created_at: string
}

export interface Follower {
  id: string
  business_id: string
  user_id: string
  created_at: string
  /**
   * Preuve de consentement.
   *
   * Le `follower_data_notice` affiché sur la vitrine n'engageait à rien : il
   * peut être réécrit après coup, si bien qu'on ne savait ni ce que l'abonné
   * avait réellement accepté, ni quand. On enregistre donc les deux éléments
   * qu'un audit réclame : l'instant du consentement, et une COPIE du texte tel
   * qu'il était à cet instant.
   *
   * Copie et non référence : si le commerçant change sa notice demain, la
   * preuve d'hier doit rester ce qui a été lu hier.
   *
   * Facultatifs, car les abonnements écrits avant cette version n'en ont pas ;
   * la migration v9 les marque `import` plutôt que d'inventer une date.
   */
  consent_at?: string
  consent_notice?: string
  /** `page` : consenti sur la vitrine. `import` : antérieur à la traçabilité. */
  consent_source?: 'page' | 'import'
}

export interface Post {
  id: string
  business_id: string
  type: 'image' | 'video'
  media_url: string
  caption: string | null
  views: number
  likes: number
  created_at: string
}

export interface PostComment {
  id: string
  post_id: string
  customer_name: string
  content: string
  created_at: string
}

export type EventType =
  | 'page_view'
  | 'product_view'
  | 'post_view'
  | 'post_like'
  | 'order_created'
  | 'booking_created'
  | 'marketplace_click'

export interface AnalyticsEvent {
  id: string
  business_id: string
  event_type: EventType
  target_id: string | null
  session_id: string
  created_at: string
}

export interface ProductStatsDaily {
  id: string
  product_id: string
  day: string
  views: number
  /**
   * Ajouts au panier.
   *
   * Étape intermédiaire du tunnel : sans elle, on ne sait pas distinguer
   * « personne n'est intéressé » (peu d'ajouts) de « on perd les gens au
   * moment d'envoyer » (beaucoup d'ajouts, peu de commandes) — deux problèmes
   * dont les remèdes n'ont rien à voir.
   */
  carts: number
  orders: number
}

/**
 * Panier commencé puis laissé sans commande.
 *
 * Le client a choisi ses articles mais n'a jamais ouvert WhatsApp. C'est la
 * perte la plus récupérable du parcours : l'intention est connue, il ne manque
 * qu'un message. On garde donc de quoi relancer — le contact et le contenu
 * exact du panier.
 */
export interface AbandonedCart {
  id: string
  business_id: string
  customer_id: string | null
  customer_name: string
  /** Sans numéro, aucune relance possible : la ligne n'est alors pas créée. */
  customer_phone: string
  lines: CartLine[]
  total_estimate: number
  created_at: string
  /** Date de la dernière relance envoyée, pour ne pas harceler. */
  reminded_at: string | null
  /** Renseigné dès qu'une commande de ce client arrive après coup. */
  recovered_at: string | null
}

/**
 * Abonnement CLYDE — rattaché au COMPTE, pas à une page.
 *
 * Le plan gouverne le nombre de pages qu'un compte a le droit de créer
 * (Gratuit 1, Pro 3, Entreprise illimité). Lier l'abonnement à une page rendait
 * cette règle circulaire : une page ne peut pas ouvrir le droit d'en créer
 * d'autres. Un abonnement par propriétaire, donc.
 *
 * À ne pas confondre avec l'essai gratuit (`TrialBonus`), qui reste au niveau de
 * la page : le plan dit combien de pages on peut créer, l'essai dit combien de
 * temps une page donnée reste gratuite.
 */
export interface Subscription {
  id: string
  owner_id: string
  plan: Plan
  status: 'active' | 'past_due' | 'cancelled'
  started_at: string
  renews_at: string | null
}

/* ============================================================
   Récompenses — essai, parrainage, paliers d'abonnés
   ============================================================ */

/**
 * Motif d'un bonus de jours d'essai.
 *
 * - `base_trial` : les 35 jours accordés à toute nouvelle page.
 * - `referral_sent` : le filleul a publié, le parrain est récompensé.
 * - `referral_received` : la page filleule, à sa première publication.
 * - `follower_milestone` : un palier d'abonnés a été franchi.
 */
export type TrialBonusReason =
  | 'base_trial'
  | 'referral_sent'
  | 'referral_received'
  | 'follower_milestone'

/**
 * Une ligne de bonus d'essai, jamais modifiée après écriture.
 *
 * La date de fin d'essai n'est pas stockée : elle se recalcule en sommant ces
 * lignes depuis la création de la page. Un compteur unique qu'on incrémente se
 * désynchronise au premier bug et ne se laisse pas auditer — ici, chaque jour
 * offert porte son motif et sa date.
 */
export interface TrialBonus {
  id: string
  business_id: string
  reason: TrialBonusReason
  days: number
  /** Le filleul, si `reason = 'referral_sent'`. */
  related_business_id: string | null
  /** Le palier franchi (20, 40 … 200), si `reason = 'follower_milestone'`. */
  related_milestone: number | null
  /**
   * Bonus gagné alors que la page était déjà payante.
   *
   * Des « jours d'essai gratuit » n'ont pas de sens sur une page qui paie déjà.
   * Plutôt que de refuser le bonus — un parrain qui amène un commerçant doit
   * être récompensé, sinon le parrainage perd toute crédibilité — on l'écrit en
   * réserve : il ne compte pas dans l'essai courant, et s'appliquera si la page
   * revient au gratuit.
   */
  deferred: boolean
  granted_at: string
}

/** Étape atteinte par un parrainage. */
export type ReferralStatus = 'lien_partage' | 'inscrit' | 'page_publiee'

/**
 * Lien de parrainage entre deux pages.
 *
 * La récompense ne tombe jamais à la simple inscription : elle attend la
 * publication complète de la page du filleul. Sans cette condition, le
 * parrainage se transformerait en fabrique de comptes vides.
 */
export interface Referral {
  id: string
  referrer_business_id: string
  /** Renseigné dès que le filleul crée sa page. */
  referred_business_id: string | null
  referral_code: string
  status: ReferralStatus
  created_at: string
  /** Horodatage de la publication du filleul. */
  completed_at: string | null
}

/** Distinctions inscrites au registre. */
export type CertificateType = 'fondation' | '200_abonnes' | 'formation'

/**
 * Registre des distinctions remises à une page.
 *
 * Le PDF est régénéré à la demande ; ce registre ne garde que le fait et sa
 * date. Sans lui, un certificat des 200 abonnés disparaîtrait si la page
 * redescendait sous le seuil — une distinction obtenue ne se retire pas.
 */
export interface Certificate {
  id: string
  business_id: string
  type: CertificateType
  /**
   * Le cours validé, si `type = 'formation'`.
   *
   * Facultatif : les certificats de fondation et des 200 abonnés n'ont aucun
   * cours associé, et les rendre porteurs d'un champ vide obligatoire n'aurait
   * rien clarifié.
   */
  related_course_id?: string | null
  granted_at: string
}

/**
 * Leçon achevée par une page.
 *
 * L'avancement est enregistré leçon par leçon, et non sous forme d'un
 * pourcentage : un pourcentage ne dit pas *où* le commerçant s'est arrêté, et
 * empêche de reprendre là où il en était. C'est aussi ce qui permet de
 * recalculer la complétion si un cours gagne une leçon plus tard.
 */
export interface LessonCompletion {
  id: string
  business_id: string
  course_id: string
  lesson_id: string
  completed_at: string
}

/* ============================================================
   Communauté — Forum
   ============================================================ */

/**
 * Rubrique d'un fil de discussion.
 *
 * - `entraide` : on demande de l'aide à ses confrères.
 * - `vitrine` : on montre sa page et on demande un avis.
 * - `technique` : questions sur l'outil lui-même.
 * - `annonces` : réservé à l'équipe CLYDE.
 */
export type ForumCategory = 'entraide' | 'vitrine' | 'technique' | 'annonces'

/**
 * État de modération d'un contenu du forum.
 *
 * `visible` et `masque` sont les deux seuls états réels ; `signale` dit qu'un
 * contenu attend un arbitrage tout en restant lisible. Masquer dès le premier
 * signalement offrirait à n'importe qui un droit de censure sur ses confrères.
 */
export type ModerationState = 'visible' | 'signale' | 'masque'

/**
 * Un fil de discussion.
 *
 * `author_business_id` est facultatif : l'équipe CLYDE publie des annonces sans
 * être un commerce. C'est aussi ce qui permet d'afficher la page de l'auteur
 * quand il en a une, sans l'inventer quand il n'en a pas.
 */
export interface ForumThread {
  id: string
  author_user_id: string
  author_business_id: string | null
  category: ForumCategory
  title: string
  body: string
  /** Remonté en tête de liste, quelle que soit la date. */
  pinned: boolean
  moderation: ModerationState
  /** Motif du masquage, montré à l'auteur : une sanction muette n'apprend rien. */
  moderation_note: string | null
  created_at: string
  /** Dernière activité — création ou réponse. Sert au tri par vivacité. */
  last_activity_at: string
}

/** Une réponse dans un fil. */
export interface ForumReply {
  id: string
  thread_id: string
  author_user_id: string
  author_business_id: string | null
  body: string
  moderation: ModerationState
  moderation_note: string | null
  created_at: string
}

/**
 * Un signalement, conservé même après arbitrage.
 *
 * On garde la trace des signalements rejetés autant que des acceptés : sans
 * cet historique, impossible de repérer celui qui signale tout ce qui le
 * dérange.
 */
export interface ForumReport {
  id: string
  target_type: 'thread' | 'reply'
  target_id: string
  reporter_user_id: string
  reason: string
  created_at: string
  /** Renseigné à l'arbitrage, quel qu'en soit le sens. */
  resolved_at: string | null
  /** `true` si le signalement a conduit à un masquage. */
  upheld: boolean | null
}

/* ============================================================
   Avis clients
   ============================================================ */

/**
 * Un avis déposé par un client sur une vitrine.
 *
 * Deux portées, voulues distinctes :
 * - `product_id` renseigné : l'avis porte sur un article précis, et s'affiche
 *   sur sa fiche.
 * - `product_id` à `null` : l'avis porte sur le commerce dans son ensemble, et
 *   s'affiche dans le bloc « Avis » de la page.
 * Un avis n'apparaît jamais aux deux endroits : « le poulet était froid » et
 * « accueil formidable » ne répondent pas à la même question.
 *
 * Aucun compte n'est requis — la plupart des clients arrivent par QR code et
 * n'en créeront jamais. L'auteur laisse donc un nom, et `author_user_id` n'est
 * renseigné que s'il se trouvait connecté. Le garde-fou n'est pas à l'entrée
 * mais en aval : le même circuit de modération que le Forum.
 */
export interface Review {
  id: string
  business_id: string
  /** `null` quand l'avis porte sur le commerce et non sur un article. */
  product_id: string | null
  /** Renseigné seulement si l'auteur était connecté. */
  author_user_id: string | null
  /** Nom saisi par l'auteur, seul élément d'identification garanti. */
  author_name: string
  /** Note de 1 à 5. */
  rating: number
  /** Commentaire libre, facultatif : une note seule est un avis valable. */
  body: string | null
  moderation: ModerationState
  /** Motif du masquage, montré à l'auteur. */
  moderation_note: string | null
  created_at: string
}

/**
 * Un signalement d'avis, conservé après arbitrage.
 *
 * Volontairement séparé de `ForumReport` : les deux ont la même forme
 * aujourd'hui, mais un signalement d'avis vise la vitrine d'un commerçant
 * tandis qu'un signalement de forum vise un confrère. Les fondre aurait mêlé
 * deux registres qui n'ont ni le même arbitre ni les mêmes conséquences.
 */
export interface ReviewReport {
  id: string
  review_id: string
  /** `null` si le signalant n'était pas connecté. */
  reporter_user_id: string | null
  reason: string
  created_at: string
  resolved_at: string | null
  upheld: boolean | null
}

/* ============================================================
   Communauté — Équipe de développement et courrier à l'Usine
   ============================================================ */

/**
 * Un membre de l'équipe de développement.
 *
 * Ce n'est pas un « abonné à la newsletter » : le monde CLYDE ne fait pas
 * s'abonner, il recrute. Le nom du type suit cette promesse, sinon le code
 * aurait dit « subscriber » là où l'écran dit « rejoindre l'équipe » — et le
 * jour où quelqu'un lit le code, c'est le mot du code qui l'emporte.
 */
export interface TeamMember {
  id: string
  name: string
  /**
   * Numéro WhatsApp, normalisé par `normalizePhone`. Obligatoire : c'est le
   * canal réellement lu par ce public, là où un e-mail peut ne jamais l'être.
   */
  whatsapp: string
  /** Facultatif — exiger un e-mail ferait abandonner une partie des inscrits. */
  email: string | null
  /**
   * Emplacement du formulaire ayant recruté ce membre. Sans cette trace, on ne
   * saurait pas lequel des trois points d'entrée fonctionne, et on ne pourrait
   * décider d'en retirer un que sur une intuition.
   */
  source: 'landing' | 'forum' | 'page-creee' | 'tableau-de-bord'
  /** Renseigné quand l'inscription vient d'un compte connecté. */
  user_id: string | null
  created_at: string
}

/**
 * Un message adressé directement à l'Usine (l'administration CLYDE).
 *
 * Séparé de `TeamMember` : rejoindre l'équipe et poser une question sont deux
 * intentions distinctes. Les fondre aurait transformé chaque question en
 * inscription non consentie.
 */
export interface AdminMessage {
  id: string
  sender_user_id: string | null
  sender_name: string
  /** Au moins l'un des deux est renseigné, sinon aucune réponse n'est possible. */
  whatsapp: string | null
  email: string | null
  topic: 'idee' | 'probleme' | 'aide' | 'autre'
  body: string
  created_at: string
  /** `null` tant que l'administration ne l'a pas ouvert. */
  read_at: string | null
}

/* ============================================================
   Communauté — Boutique Goodies
   ============================================================ */

/**
 * Une commande de goodie payée en points.
 *
 * Le solde de points n'est pas stocké : il se recalcule en retranchant ces
 * lignes des points gagnés, eux-mêmes déduits des faits déjà inscrits
 * (certificats, leçons, parrainages). Même raison que pour l'essai gratuit —
 * un compteur qu'on incrémente se désynchronise et ne s'audite pas.
 */
export interface GoodieRedemption {
  id: string
  business_id: string
  goodie_id: string
  /** Coût au moment de l'échange : un barème peut changer ensuite. */
  points_spent: number
  /**
   * Coordonnées de remise, recopiées AU MOMENT de l'échange depuis le compte
   * du commerçant — qui peut ensuite déménager ou changer de numéro sans que
   * le colis en cours ne se perde.
   */
  recipient_name: string
  recipient_phone: string
  delivery_city: string
  /** Quartier, rue ou point de repère : indispensable en remise directe. */
  delivery_address: string | null
  /** Taille choisie quand l'article se porte, `null` pour les objets. */
  size: string | null
  delivery_note: string | null
  status: 'demande' | 'preparee' | 'remise'
  created_at: string
}

/* ============================================================
   Page builder — thème et blocs (layout_json)
   ============================================================ */

export type FontChoice = 'kanit' | 'inter' | 'playfair' | 'space' | 'lora'
export type ButtonStyle = 'rounded' | 'square' | 'pill'

/**
 * Matière des cartes et des surfaces de la page.
 *
 * - `plain` : aplat discret, la valeur sûre.
 * - `glass` : verre dépoli translucide, posé sur un fond ambiant.
 * - `cartoon` : contour épais et ombre portée franche, sans flou.
 */
export type SurfaceStyle = 'plain' | 'glass' | 'cartoon'

export interface PageTheme {
  /** Couleur d'accent principale, en hex */
  brand: string
  /** Fond de page, en hex */
  background: string
  /** Couleur du texte, en hex */
  ink: string
  font: FontChoice
  buttonStyle: ButtonStyle
  /** Densité globale des espacements */
  density: 'compact' | 'normal' | 'airy'
  /** Matière des cartes. Absent = `plain`, pour les pages créées avant. */
  surface?: SurfaceStyle
  /**
   * Genre de la page :
   * - `vitrine` (défaut, absent = vitrine) : la page-magazine actuelle —
   *   couverture, blocs, cartes aérées, pensée pour flâner.
   * - `commande` : façon application de livraison — rail de catégories
   *   épinglé à gauche du catalogue, liste dense photo + prix + « + »,
   *   pensée pour commander vite.
   */
  preset?: 'vitrine' | 'commande'
}

export type BlockType =
  | 'hero'
  | 'search'
  | 'categories'
  | 'catalogue'
  | 'carousel'
  | 'promo'
  | 'booking'
  | 'reviews'
  | 'faq'
  | 'hours_location'
  | 'video'
  | 'contact'
  | 'identity_media'
  | 'image_gallery'
  | 'bottom_nav'

/** Réglages d'apparence communs à tous les blocs (panneau d'inspection) */
export interface BlockStyle {
  fontWeight?: 300 | 400 | 500 | 600 | 700
  fontScale?: number
  align?: 'left' | 'center' | 'right'
  textColor?: string | null
  brandColor?: string | null
  background?: string | null
  paddingY?: number
  paddingX?: number
  radius?: 'sharp' | 'soft' | 'round'
}

export interface BlockBase {
  id: string
  type: BlockType
  hidden?: boolean
  style?: BlockStyle
}

export interface HeroBlock extends BlockBase {
  type: 'hero'
  variant: 'center' | 'bottom' | 'edge'
  title: string
  subtitle: string
  ctaLabel: string
  imageUrl: string
  overlay: number
  height: 'sm' | 'md' | 'lg'

  /**
   * Destination du bouton du hero.
   *
   * Il ouvrait WhatsApp quel que soit son libellé : un « Voir le menu » qui
   * lance une conversation trahit sa promesse. Optionnel, traité comme
   * `catalogue` à défaut, pour que les pages déjà enregistrées se réparent
   * sans migration.
   */
  ctaTarget?: 'catalogue' | 'booking' | 'contact'

  /**
   * Logo ou photo de profil mis en avant dans le hero.
   *
   * Distinct de la pastille d'identité toujours présente en coin : ici le logo
   * devient un élément de composition, dimensionnable et positionnable. Absent
   * = désactivé, donc les pages existantes gardent leur mise en page.
   */
  logo?: {
    enabled: boolean
    size: 'sm' | 'md' | 'lg'
    align: 'left' | 'center' | 'right'
    /** Vide = le logo de la boutique */
    url?: string
  }
}

export interface SearchBlock extends BlockBase {
  type: 'search'
  placeholder: string
  showFilter: boolean
}

export interface CategoriesBlock extends BlockBase {
  type: 'categories'
  /** Vide = généré depuis les catégories du catalogue */
  items: string[]
  autoFromCatalogue: boolean

  /**
   * Forme de la liste de catégories.
   *
   * - `wrap` : les pastilles passent à la ligne. Lisible tant qu'elles sont
   *   peu nombreuses, mais une carte de restaurant à quinze catégories
   *   fabriquait un mur de boutons qui repoussait le catalogue hors de l'écran.
   * - `scroll` : une seule ligne qui glisse horizontalement, la hauteur reste
   *   constante quel que soit le nombre de catégories.
   * - `card` : vignettes illustrées par le premier produit de la catégorie,
   *   pour les commerces dont les rayons se reconnaissent à l'image.
   *
   * Absent = `wrap`, la mise en page des pages déjà enregistrées est conservée.
   */
  display?: 'wrap' | 'scroll' | 'card'
}

export interface CatalogueBlock extends BlockBase {
  type: 'catalogue'
  title: string
  display: 'grid' | 'list'
  columns: 2 | 3
  showPrice: boolean
  showRating: boolean
  actionLabel: string
}

export interface CarouselBlock extends BlockBase {
  type: 'carousel'
  title: string
  productIds: string[]
  /**
   * Matière du carrousel :
   * - `products` (défaut) : cartes tirées du catalogue — `productIds` choisit
   *   lesquelles, vide = les six premières.
   * - `images` : visuels libres téléversés (`images`), pour un carrousel
   *   promotionnel qui ne vend rien de précis.
   * Absent = `products`, les pages déjà enregistrées ne changent pas.
   */
  source?: 'products' | 'images'
  /** Visuels du mode `images`, téléversés depuis l'éditeur. */
  images?: string[]
  /**
   * Habillage des cartes du carrousel — pour varier la construction des pages
   * dans le builder :
   * - `overlay` (défaut) : photo pleine carte, dégradé sombre en pied.
   * - `caption` : cartouche sombre arrondi posé dans la photo, prix en badge.
   * - `card` : photo en haut, cartouche opaque dessous.
   * `glass` est un alias hérité rendu comme `caption` (l'ancien bandeau
   * glassmorphe rendait les noms illisibles et a été retiré).
   * Absent = `overlay`, les pages déjà enregistrées ne changent pas.
   */
  variant?: 'overlay' | 'caption' | 'card' | 'glass'
}

export interface PromoBlock extends BlockBase {
  type: 'promo'
  title: string
  description: string
  productId: string | null
  endsAt: string | null
  ctaLabel: string
}

export interface BookingBlock extends BlockBase {
  type: 'booking'
  title: string
  description: string
  daysAhead: number
  ctaLabel: string
}

export interface ReviewBlock extends BlockBase {
  type: 'reviews'
  title: string
  withTabs: boolean
  items: { id: string; name: string; rating: number; content: string }[]
}

export interface FaqBlock extends BlockBase {
  type: 'faq'
  title: string
  items: { id: string; q: string; a: string }[]
}

export interface HoursLocationBlock extends BlockBase {
  type: 'hours_location'
  title: string
  address: string
  mapQuery: string
  hours: { day: string; value: string }[]
}

export interface VideoBlock extends BlockBase {
  type: 'video'
  title: string
  url: string
  caption: string
}

export interface ContactBlock extends BlockBase {
  type: 'contact'
  title: string
  description: string
  ctaLabel: string
  phone: string
  email: string
  socials: { id: string; label: string; url: string }[]
}

export interface IdentityMediaBlock extends BlockBase {
  type: 'identity_media'
  showLogo: boolean
  showProfile: boolean
  title: string
  subtitle: string
}

export interface ImageGalleryBlock extends BlockBase {
  type: 'image_gallery'
  title: string
  images: string[]
  columns: 2 | 3
}

export interface BottomNavBlock extends BlockBase {
  type: 'bottom_nav'
  items: { id: string; label: string; href: string; icon: 'home' | 'calendar' | 'search' | 'grid' | 'plus' }[]
  showOn: 'mobile' | 'all'
  /**
   * Style du menu mobile, choisi par le commerçant dans l'éditeur :
   * - `floating` (défaut) : barre flottante claire, action centrale surélevée.
   * - `dark-pill` : pilule sombre compacte, l'onglet actif en couleur de marque.
   * - `docked` : barre pleine largeur collée au bord, libellés sous les icônes.
   * - `minimal` : pilule flottante, icônes seules, la plus discrète.
   * Absent = `floating`, les pages existantes ne changent pas.
   */
  navStyle?: 'floating' | 'dark-pill' | 'docked' | 'minimal'
}

export type Block =
  | HeroBlock
  | SearchBlock
  | CategoriesBlock
  | CatalogueBlock
  | CarouselBlock
  | PromoBlock
  | BookingBlock
  | ReviewBlock
  | FaqBlock
  | HoursLocationBlock
  | VideoBlock
  | ContactBlock
  | IdentityMediaBlock
  | ImageGalleryBlock
  | BottomNavBlock

/** Ligne de panier côté client (jamais persistée en base) */
export interface CartLine {
  productId: string
  quantity: number
  note?: string
  /**
   * Options retenues, par identifiant.
   *
   * Conséquence importante : une ligne n'est plus identifiée par son produit
   * seul. Deux pizzas de tailles différentes sont deux lignes distinctes, sinon
   * augmenter la quantité de l'une changerait la taille de l'autre. C'est
   * `cartLineKey` (lib/clyde/options.ts) qui sert de clé partout.
   */
  optionIds?: string[]
}
