'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { PageRenderer } from '@/components/clyde/page/renderer'
import { PageSocial } from '@/components/clyde/public/page-social'
import { OptionPicker } from '@/components/clyde/public/option-picker'
import { Overlay } from '@/components/clyde/public/overlay'
import { ReservationSheet } from '@/components/clyde/public/reservation-sheet'
import { publicBlocks } from '@/lib/clyde/blocks'
import { useT } from '@/lib/clyde/i18n'
import { cameFromInside, markInternalNavigation } from '@/lib/clyde/navigation'
import {
  cartLineKey,
  linePrice,
  optionGroupsOf,
  optionsSummary,
} from '@/lib/clyde/options'
import { useCart, useClyde, useSession } from '@/lib/clyde/store'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { lighten, readableOn, tint } from '@/lib/clyde/theme'
import {
  buildBookingMessage,
  buildOrderMessage,
  openWhatsapp,
  orderTotal,
} from '@/lib/clyde/whatsapp'
import { cn } from '@/lib/utils'
import type { CartLine, Product } from '@/lib/clyde/types'

/**
 * Vitrine publique d'un commerce.
 *
 * La page est rendue par PageRenderer depuis layout_json — cette couche
 * n'ajoute que ce qui est propre au visiteur : fiche produit, panier,
 * contexte QR et départ vers WhatsApp.
 */
export function Storefront({ slug, table, device }: { slug: string; table?: string; device?: 'desktop' | 'mobile' }) {
  const router = useRouter()
  const [renderDevice, setRenderDevice] = useState<'desktop' | 'mobile'>(device ?? 'desktop')

  useEffect(() => {
    if (device) {
      setRenderDevice(device)
      return
    }
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setRenderDevice(media.matches ? 'mobile' : 'desktop')
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [device])
  const t = useT()
  const businesses = useClyde((s) => s.businesses)
  const pages = useClyde((s) => s.pages)
  const allProducts = useClyde((s) => s.products)
  const allLocations = useClyde((s) => s.locations)
  const availability = useClyde((s) => s.availability)
  const createOrder = useClyde((s) => s.createOrder)
  const createBooking = useClyde((s) => s.createBooking)
  const track = useClyde((s) => s.track)
  const recordAbandonedCart = useClyde((s) => s.recordAbandonedCart)
  const resolveAbandonedCart = useClyde((s) => s.resolveAbandonedCart)

  const qrContext = useSession((s) => s.qrContext)
  const qrContextAt = useSession((s) => s.qrContextAt)
  const setQrContext = useSession((s) => s.setQrContext)
  const clearQrContext = useSession((s) => s.clearQrContext)

  const carts = useCart((s) => s.carts)
  const addToCart = useCart((s) => s.add)
  const setQuantity = useCart((s) => s.setQuantity)
  const clearCart = useCart((s) => s.clear)

  const business = useMemo(
    () => businesses.find((b) => b.slug === slug),
    [businesses, slug],
  )
  const page = useMemo(
    () => pages.find((p) => p.business_id === business?.id),
    [pages, business?.id],
  )

  const products = useMemo(
    () => allProducts.filter((p) => p.business_id === business?.id && p.active),
    [allProducts, business?.id],
  )
  const locations = useMemo(
    () => allLocations.filter((l) => l.business_id === business?.id),
    [allLocations, business?.id],
  )

  const [openProduct, setOpenProduct] = useState<Product | null>(null)
  const [reserveProduct, setReserveProduct] = useState<Product | null>(null)
  /* Article dont on est en train de choisir les options. */
  const [configuring, setConfiguring] = useState<Product | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  /* Contact et panier lus au moment du départ, jamais pendant le rendu.
     Des refs, et non un état : l'écouteur de sortie doit voir les dernières
     valeurs sans être réattaché à chaque frappe au clavier. */
  const contactRef = useRef<{ name: string; phone: string } | null>(null)
  const linesRef = useRef<CartLine[]>([])

  /* Provenance : lue après montage, `sessionStorage` n'existant pas côté
     serveur. Faux par défaut, donc l'arrivée directe est le cas sûr. */
  const [fromInside, setFromInside] = useState(false)
  useEffect(() => setFromInside(cameFromInside()), [])

  /* Contexte QR : ?table=... est mémorisé pour ce commerce */
  useEffect(() => {
    if (!business || !table) return
    const match = locations.find(
      (l) => l.label.toLowerCase() === table.toLowerCase() || l.id === table,
    )
    if (match) setQrContext(business.id, match.id)
  }, [business, table, locations, setQrContext])

  useEffect(() => {
    if (business) track(business.id, 'page_view')
  }, [business, track])

  useEffect(() => {
    if (!sent) return
    const id = window.setTimeout(() => setSent(null), 3200)
    return () => window.clearTimeout(id)
  }, [sent])

  /**
   * Enregistrement du panier laissé en route.
   *
   * Le client a donné son nom et son numéro, rempli son panier, puis fermé
   * l'onglet sans envoyer. C'est la perte la plus récupérable du parcours :
   * l'intention est connue, il ne manque qu'un message. On la consigne au
   * moment où la page se cache — `visibilitychange` se déclenche sur mobile
   * là où `beforeunload` est ignoré.
   */
  useEffect(() => {
    if (!business) return

    const save = () => {
      const contact = contactRef.current
      const currentLines = linesRef.current
      /* Sans contact joignable, aucune relance possible : rien à enregistrer.
         Panier vide ou commande déjà partie : rien à récupérer non plus. */
      if (!contact || currentLines.length === 0) return
      recordAbandonedCart({
        businessId: business.id,
        customerName: contact.name,
        customerPhone: contact.phone,
        lines: currentLines,
        totalEstimate: orderTotal(currentLines, products),
      })
    }

    const onHide = () => {
      if (document.visibilityState === 'hidden') save()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      /* Navigation interne (retour au marketplace, autre vitrine) : le
         démontage est le seul signal disponible. */
      save()
    }
  }, [business, products, recordAbandonedCart])

  if (!business || !page) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg font-semibold">Cette page n&apos;existe pas</p>
        <p className="text-sm text-muted-foreground">
          Le lien est peut-être incorrect, ou la page n&apos;est plus publiée.
        </p>
      </main>
    )
  }

  const theme = page.theme_json
  const lines = carts[business.id] ?? []
  /* Le panier courant reste lisible depuis l'écouteur de sortie, qui s'exécute
     hors du cycle de rendu. */
  linesRef.current = lines
  /* Une page équipée du menu mobile réserve la bande basse : le panier
     flottant et les messages passent au-dessus, jamais dessous. */
  const hasBottomNav = page.layout_json.some(
    (b) => b.type === 'bottom_nav' && !b.hidden,
  )

  /**
   * Toujours vers le marketplace, jamais `router.back()`.
   *
   * `history.back()` ne tenait aucune promesse : dans un aperçu en iframe,
   * ou quand l'entrée précédente est une autre page de la même vitrine
   * (fiche produit, ancre), le bouton semblait mort ou renvoyait hors du
   * site. Une destination explicite est le seul comportement fiable — et
   * c'est aussi ce que le libellé « Découvrir » annonce au nouvel arrivant.
   */
  function handleBack() {
    router.push('/marketplace')
  }
  const count = lines.reduce((n, l) => n + l.quantity, 0)
  const total = orderTotal(lines, products)

  /* Un scan de table n'engage que le temps d'un service : au-delà de 3 h,
     le tag « Table 12 » est un mensonge — le client est probablement rentré
     chez lui. Le contexte périmé est simplement ignoré (et la bannière
     disparaît) ; un nouveau scan le réactive à l'instant. */
  const QR_TTL_MS = 3 * 60 * 60 * 1000
  const scannedAt = qrContextAt?.[business.id]
  const qrFresh = scannedAt !== undefined && Date.now() - scannedAt < QR_TTL_MS
  const activeLocationId = qrFresh ? (qrContext[business.id] ?? null) : null
  const activeLocation = locations.find((l) => l.id === activeLocationId) ?? null

  /* Le « + » remplit le panier sans quitter la page : on commande ensuite
     depuis le panier, en une fois, comme dans une application. */
  function handleAdd(p: Product, optionIds?: string[]) {
    if (!p.available) return
    /* Un article à options ne part pas directement au panier : on ouvre le
       sélecteur, et l'ajout se fera au retour avec les choix retenus. Sans
       cette étape, le commerçant recevrait « 1x Pizza » sans savoir laquelle
       préparer. */
    if (optionIds === undefined && optionGroupsOf(p).length > 0) {
      setConfiguring(p)
      return
    }
    addToCart(business!.id, p.id, 1, optionIds)
    setConfiguring(null)
    setOpenProduct(null)
    setSent(`${p.name} ajouté au panier.`)
  }

  /* Référence stable : passée à un effet du panier, une fonction recréée à
     chaque rendu le relancerait en boucle. */
  const handleContactChange = useCallback(
    (contact: { name: string; phone: string }) => {
      contactRef.current = contact
    },
    [],
  )

  function handleSendOrder(contact: { name: string; phone: string }) {
    if (!lines.length) return
    const message = buildOrderMessage({
      businessName: business!.name,
      currency: business!.currency,
      lines,
      products,
      locationLabel: activeLocation?.label ?? null,
      customerName: contact.name,
    })
    createOrder({
      businessId: business!.id,
      customerId: null,
      customerName: contact.name,
      customerPhone: contact.phone,
      channel: activeLocation ? 'qr_location' : 'online',
      locationId: activeLocation?.id ?? null,
      note: null,
      lines,
    })
    /* Le panier est parti : la trace d'abandon éventuellement enregistrée
       n'a plus lieu d'être, sinon le commerçant relancerait un client qui
       vient de commander. */
    resolveAbandonedCart(business!.id, contact.phone)
    openWhatsapp(business!.whatsapp_number, message)
    clearCart(business!.id)
    setCartOpen(false)
    setSent('Votre commande est partie sur WhatsApp.')
  }

  function handleBook(startAt: string) {
    const message = buildBookingMessage({
      businessName: business!.name,
      startAt,
    })
    const id = createBooking({
      businessId: business!.id,
      customerId: null,
      customerName: 'Client web',
      customerPhone: '',
      serviceId: null,
      startAt,
      note: null,
    })
    /* Créneau soufflé entre l'affichage et l'envoi : on prévient au lieu
       d'envoyer un message WhatsApp pour une heure déjà prise. */
    if (!id) {
      setSent('Ce créneau vient d’être réservé — choisissez-en un autre.')
      return
    }
    openWhatsapp(business!.whatsapp_number, message)
    setSent('Votre demande de réservation est partie sur WhatsApp.')
  }

  function handleReserve(input: {
    startAt: string
    durationMinutes: number
    locationId: string | null
    totalEstimate: number
  }) {
    const service = reserveProduct
    if (!service) return
    const location = locations.find((item) => item.id === input.locationId)
    const message = buildBookingMessage({
      businessName: business!.name,
      serviceName: service.name,
      startAt: input.startAt,
      durationMinutes: input.durationMinutes,
      locationLabel: location?.label,
      totalEstimate: input.totalEstimate,
      currency: business!.currency,
    })
    const id = createBooking({
      businessId: business!.id,
      customerId: null,
      customerName: 'Client web',
      customerPhone: '',
      serviceId: service.id,
      startAt: input.startAt,
      locationId: input.locationId,
      durationMinutes: input.durationMinutes,
      totalEstimate: input.totalEstimate,
      note: null,
    })
    if (!id) {
      setSent('Ce créneau vient d’être réservé — choisissez-en un autre.')
      return
    }
    openWhatsapp(business!.whatsapp_number, message)
    setReserveProduct(null)
    setSent('Votre demande de réservation est partie sur WhatsApp.')
  }

  function handleContact() {
    openWhatsapp(
      business!.whatsapp_number,
      `Bonjour ${business!.name}, j'ai une question.`,
    )
  }

  /* Le preview mobile peut être affiché dans une fenêtre desktop : le mode
     rendu est donc plus fiable que les breakpoints du navigateur pour la barre
     flottante. */
  const compactHeader = renderDevice === 'mobile'

  return (
    <main
      className="min-h-screen w-full"
      style={{ background: theme.background, color: theme.ink }}
    >
      {/* Retour si le visiteur vient du site, découverte s'il arrive d'un QR
          code ou d'un lien partagé : dans ce second cas une flèche seule ne
          mènerait nulle part, alors qu'un libellé explicite donne une porte
          d'entrée vers le marketplace. */}
      <button
        type="button"
        onClick={handleBack}
        aria-label={fromInside ? t.marketplace.back : t.marketplace.discover}
        className={cn(
          'fixed left-3 z-50 inline-flex items-center justify-center border shadow-md backdrop-blur transition-transform active:scale-95',
          activeLocation ? 'top-12' : 'top-3',
          fromInside
            ? 'size-9 rounded-full'
            : 'h-8 gap-1 rounded-full px-2.5 text-[11px] font-semibold sm:h-9',
        )}
        style={{
          background: `${theme.background}e8`,
          borderColor: `${theme.ink}22`,
          color: theme.ink,
        }}
      >
        <ArrowLeft size={17} aria-hidden="true" />
        {fromInside ? null : <span>Découvrir</span>}
      </button>

      {/* Partage et abonnement, en miroir du retour : les deux gestes qui font
          revenir un client sur la boutique. Quand la couverture affiche déjà
          « S'abonner » et « Partager » dans sa bande profil, les flottants
          s'effacent — la même paire apparaissait deux fois sur le premier
          écran. Le composant reste monté : il porte les dialogues dont les
          boutons du bloc dépendent. */}
      <PageSocial
        business={business}
        theme={theme}
        offsetTop={Boolean(activeLocation)}
        hideButtons={page.layout_json.some(
          (b) => b.type === 'hero' && !b.hidden && b.logo?.enabled !== false,
        )}
      />
      {activeLocation && (
        /* sticky + z-40 : la bannière reste lisible en défilant, SOUS les
           boutons flottants (z-50) qui, eux, sont décalés de sa hauteur —
           avant ce décalage, « Découvrir » et « S'abonner » la recouvraient
           et le client ne voyait pas depuis quelle table il commandait. */
        <div
          className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold"
          style={{
            background: theme.brand,
            color: readableOn(theme.brand),
          }}
        >
          <span>Vous commandez depuis « {activeLocation.label} »</span>
          <button
            type="button"
            onClick={() => clearQrContext(business.id)}
            className="underline underline-offset-2 opacity-80"
          >
            Changer
          </button>
        </div>
      )}

      {/* La couverture suit la même colonne que le contenu : sur desktop, une
          page CLYDE reste une colonne lisible, jamais une bannière étirée. */}
      <div className="mx-auto w-full max-w-7xl">
        <PageRenderer
          business={business}
          products={products}
          availability={availability.filter(
            (a) => a.business_id === business.id,
          )}
          theme={theme}
          blocks={publicBlocks(page.layout_json, {
            booking: business.module_booking,
            locations: business.module_locations,
          })}
          device={renderDevice}
          interactive
          onOpenProduct={(p) => {
            setOpenProduct(p)
            track(business.id, 'product_view', p.id)
          }}
          onAddToCart={handleAdd}
          onReserve={(product) => setReserveProduct(product)}
          onBook={handleBook}
          onContact={handleContact}
          /* Dès qu'un article entre au panier, le menu mobile s'efface en
             glissant vers le bas et la barre de commande prend sa place —
             il revient dès que le panier se vide. */
          bottomNavHidden={count > 0}
        />
      </div>

      {/* Pile basse : message puis panier, empilés pour ne jamais se
          recouvrir. Quand le panier contient des articles, le menu mobile
          s'escamote et la barre de commande occupe sa place en bas — les
          deux ne sont donc jamais visibles en même temps. */}
      <div
        className={cn(
          'pointer-events-none fixed inset-x-4 z-50 flex flex-col items-end gap-2 transition-[bottom] duration-300 sm:left-auto sm:w-sm',
          hasBottomNav && count === 0
            ? 'bottom-28'
            : 'bottom-[max(1rem,env(safe-area-inset-bottom))]',
        )}
      >
        {sent && (
          <div
            role="status"
            className="pointer-events-auto flex w-full items-center justify-between gap-3 px-4 py-3 text-sm shadow-lg"
            style={{
              borderRadius: 14,
              background: theme.ink,
              color: readableOn(theme.ink),
            }}
          >
            <span>{sent}</span>
            <button type="button" onClick={() => setSent(null)} aria-label="Fermer">
              <X size={16} />
            </button>
          </div>
        )}

        {count > 0 && !cartOpen && (
          /* Barre de commande : elle glisse depuis le bas à la place du menu
             mobile, avec le total à gauche et l'action à droite. */
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto flex w-full items-center justify-between gap-3 py-2.5 pr-2.5 pl-5 text-sm font-bold shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)] transition-transform duration-300 animate-in fade-in slide-in-from-bottom-6 active:scale-[0.99]"
            style={{
              borderRadius: 999,
              background: theme.ink,
              color: readableOn(theme.ink),
            }}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="relative shrink-0">
                <ShoppingBag size={19} aria-hidden="true" />
                <span
                  className="absolute -top-2 -right-2 grid size-4 place-items-center rounded-full text-[10px] font-extrabold"
                  style={{ background: theme.brand, color: readableOn(theme.brand) }}
                >
                  {count}
                </span>
              </span>
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="text-[15px]">{formatPrice(total, business.currency)}</span>
                <span className="text-[11px] font-medium opacity-70">
                  {count} article{count > 1 ? 's' : ''} au panier
                </span>
              </span>
            </span>
            <span
              className="shrink-0 rounded-full px-5 py-2.5 text-[13px] font-bold"
              style={{ background: theme.brand, color: readableOn(theme.brand) }}
            >
              Commander
            </span>
          </button>
        )}
      </div>

      <ProductSheet
        product={openProduct}
        slug={business.slug}
        onClose={() => setOpenProduct(null)}
        onAdd={handleAdd}
        currency={business.currency}
        theme={theme}
      />

      <ReservationSheet
        product={reserveProduct}
        availability={availability.filter((rule) => rule.business_id === business.id)}
        businessId={business.id}
        locations={business.module_locations ? locations : []}
        currency={business.currency}
        theme={theme}
        onClose={() => setReserveProduct(null)}
        onSubmit={handleReserve}
      />

      {configuring ? (
        <OptionPicker
          product={configuring}
          currency={business.currency}
          theme={theme}
          onClose={() => setConfiguring(null)}
          onConfirm={(optionIds) => handleAdd(configuring, optionIds)}
        />
      ) : null}

      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        products={products}
        currency={business.currency}
        theme={theme}
        total={total}
        locationLabel={activeLocation?.label ?? null}
        onSetQuantity={(lineKey, q) => setQuantity(business.id, lineKey, q)}
        onSend={handleSendOrder}
        onContactChange={handleContactChange}
      />
    </main>
  )
}

/* ============================================================
   Fiche produit
   ============================================================ */

function ProductSheet({
  product,
  slug,
  onClose,
  onAdd,
  currency,
  theme,
}: {
  product: Product | null
  slug: string
  onClose: () => void
  onAdd: (p: Product) => void
  currency: Parameters<typeof formatPrice>[1]
  theme: { brand: string; ink: string; background: string }
}) {
  if (!product) return null
  const img = product.media_urls[0]

  return (
    <Overlay onClose={onClose} theme={theme}>
      <div className="flex flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-4xl font-bold"
              style={{
                background: `linear-gradient(135deg, ${lighten(theme.brand, 0.72)}, ${lighten(theme.brand, 0.5)})`,
                color: theme.brand,
              }}
              role="img"
              aria-label={product.name}
            >
              {product.name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-balance text-xl font-bold leading-tight">
              {product.name}
            </h2>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold" style={{ color: theme.brand }}>
                {formatPrice(product.price, currency)}
              </p>
              {product.compare_at_price && (
                <p className="text-xs line-through opacity-45">
                  {formatPrice(product.compare_at_price, currency)}
                </p>
              )}
            </div>
          </div>

          {product.description && (
            <p className="text-pretty text-sm leading-relaxed opacity-70">
              {product.description}
            </p>
          )}

          {product.duration_minutes && (
            <p className="text-[13px] opacity-60">
              Durée : {product.duration_minutes} minutes
            </p>
          )}

          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!product.available}
            aria-label={product.available ? `Ajouter ${product.name} au panier` : `${product.name} indisponible`}
            className="mt-1 flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold transition-transform active:scale-[0.99] disabled:opacity-40"
            style={{
              borderRadius: 12,
              background: theme.brand,
              color: readableOn(theme.brand),
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            {product.available ? 'Ajouter au panier' : 'Indisponible'}
          </button>
          <Link
            href={`/r/${slug}/produit/${product.id}`}
            onClick={() => {
              markInternalNavigation()
              onClose()
            }}
            className="text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline"
          >
            Voir la page complète du produit
          </Link>
        </div>
      </div>
    </Overlay>
  )
}

/* ============================================================
   Panier
   ============================================================ */

function CartSheet({
  open,
  onClose,
  lines,
  products,
  currency,
  theme,
  total,
  locationLabel,
  onSetQuantity,
  onSend,
  onContactChange,
}: {
  open: boolean
  onClose: () => void
  lines: CartLine[]
  products: Product[]
  currency: Parameters<typeof formatPrice>[1]
  theme: { brand: string; ink: string; background: string }
  total: number
  locationLabel: string | null
  /** Reçoit une clé de ligne (`cartLineKey`), pas un identifiant de produit. */
  onSetQuantity: (lineKey: string, quantity: number) => void
  onSend: (contact: { name: string; phone: string }) => void
  onContactChange: (contact: { name: string; phone: string }) => void
}) {
  /* Nom et WhatsApp du client.
     Le commerçant recevait « Client web » sans numéro : impossible de rappeler
     pour préciser une commande, impossible de relancer un panier laissé en
     route. Deux champs suffisent à rendre chaque commande jointe. */
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)

  const nameOk = name.trim().length >= 2
  /* Huit chiffres au minimum, indicatif et séparateurs mis de côté : les
     formats varient trop d'un pays à l'autre pour être imposés ici. */
  const phoneOk = phone.replace(/\D/g, '').length >= 8
  const valid = nameOk && phoneOk

  /* Le contact remonte dès qu'il est complet : si le client s'en va sans
     envoyer, la vitrine a de quoi enregistrer un panier relançable. On ne
     remonte rien d'incomplet, un demi-numéro ne sert à personne. */
  useEffect(() => {
    if (valid) onContactChange({ name: name.trim(), phone: phone.trim() })
  }, [valid, name, phone, onContactChange])

  if (!open) return null

  return (
    <Overlay onClose={onClose} theme={theme}>
      <div className="flex max-h-[80vh] flex-col">
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${tint(theme.ink, 0.1)}` }}
        >
          <h2 className="text-base font-bold">Ma commande</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-50">
              Votre commande est vide.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map((line) => {
                const p = products.find((x) => x.id === line.productId)
                if (!p) return null
                /* La clé et les actions portent sur la ligne, pas sur le
                   produit : deux tailles du même plat coexistent, et régler la
                   quantité par identifiant de produit aurait modifié les deux
                   à la fois. */
                const key = cartLineKey(line)
                const summary = optionsSummary(p, line.optionIds)
                return (
                  <li key={key} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      {summary ? (
                        <p className="truncate text-xs opacity-60">{summary}</p>
                      ) : null}
                      <p className="text-[13px]" style={{ color: theme.brand }}>
                        {formatPrice(linePrice(line, products), currency)}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      style={{
                        borderRadius: 999,
                        background: tint(theme.ink, 0.06),
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onSetQuantity(key, line.quantity - 1)
                        }
                        aria-label={`Retirer un ${p.name}`}
                        className="flex size-8 items-center justify-center"
                      >
                        {line.quantity === 1 ? (
                          <Trash2 size={14} />
                        ) : (
                          <Minus size={14} />
                        )}
                      </button>
                      <span className="w-5 text-center text-sm font-bold">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onSetQuantity(key, line.quantity + 1)
                        }
                        aria-label={`Ajouter un ${p.name}`}
                        className="flex size-8 items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div
            className="flex flex-col gap-3 px-5 py-4"
            style={{ borderTop: `1px solid ${tint(theme.ink, 0.1)}` }}
          >
            {locationLabel && (
              <p className="text-[13px] opacity-70">
                Emplacement : <strong>{locationLabel}</strong>
              </p>
            )}

            {/* Contact : le commerçant doit savoir qui commande, et pouvoir
                rappeler. Les champs restent au-dessus du total pour être
                remplis avant que le pouce n'atteigne le bouton. */}
            <div className="flex flex-col gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Votre nom"
                autoComplete="name"
                aria-label="Votre nom"
                aria-invalid={touched && !nameOk}
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={{
                  borderRadius: 10,
                  background: tint(theme.ink, 0.05),
                  border: `1px solid ${
                    touched && !nameOk ? '#dc2626' : tint(theme.ink, 0.14)
                  }`,
                }}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Votre WhatsApp"
                /* `tel` ouvre le pavé numérique du téléphone : saisir un
                   numéro au clavier alphabétique est une friction inutile. */
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-label="Votre numéro WhatsApp"
                aria-invalid={touched && !phoneOk}
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={{
                  borderRadius: 10,
                  background: tint(theme.ink, 0.05),
                  border: `1px solid ${
                    touched && !phoneOk ? '#dc2626' : tint(theme.ink, 0.14)
                  }`,
                }}
              />
              {/* Le motif n'apparaît qu'après une première tentative : afficher
                  une erreur sur un champ jamais touché est un reproche gratuit. */}
              {touched && !valid && (
                <p className="text-[12px] leading-relaxed" style={{ color: '#dc2626' }}>
                  {!nameOk
                    ? 'Indiquez votre nom pour que le commerçant sache qui commande.'
                    : 'Indiquez un numéro WhatsApp valide pour être recontacté.'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="opacity-70">Total estimé</span>
              <span className="text-lg font-bold" style={{ color: theme.brand }}>
                {formatPrice(total, currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setTouched(true)
                if (valid) onSend({ name: name.trim(), phone: phone.trim() })
              }}
              /* Le bouton reste actionnable même incomplet : le désactiver
                 laisse le client sans explication devant un bouton mort.
                 Ici, appuyer révèle précisément ce qui manque. */
              aria-disabled={!valid}
              className="w-full py-3.5 text-sm font-bold transition-transform active:scale-[0.99]"
              style={{
                borderRadius: 12,
                background: theme.brand,
                color: readableOn(theme.brand),
                opacity: valid ? 1 : 0.55,
              }}
            >
              Envoyer sur WhatsApp
            </button>
            <p className="text-center text-[11px] leading-relaxed opacity-55">
              Le message est déjà rédigé. Vous n&apos;avez plus qu&apos;à appuyer
              sur Envoyer dans WhatsApp.
            </p>
          </div>
        )}
      </div>
    </Overlay>
  )
}

