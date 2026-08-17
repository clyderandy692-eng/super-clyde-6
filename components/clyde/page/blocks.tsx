'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Grid2X2,
  Home,
  Images,
  Mail,
  MapPin,
  Share2,
  PanelBottom,
  Phone,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  blockVars,
  brandButton,
  cardSurface,
  controlSurface,
  frameSurface,
  insetFill,
  outlineButton,
  isDark,
  readableOn,
  surfaceOf,
  tint,
  shade,
  lighten,
} from '@/lib/clyde/theme'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { demoCover } from '@/lib/clyde/demo-media'
import { averageRating, businessReviews } from '@/lib/clyde/reviews'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import type {
  AvailabilityRule,
  Block,
  Booking,
  Business,
  CarouselBlock,
  CatalogueBlock,
  Currency,
  HeroBlock,
  PageTheme,
  Product,
} from '@/lib/clyde/types'

/* ============================================================
   Contexte de rendu — partagé par l'éditeur et la page publique
   ============================================================ */

export interface RenderCtx {
  business: Business
  products: Product[]
  availability: AvailabilityRule[]
  theme: PageTheme
  currency: Currency
  device: 'desktop' | 'mobile'
  /** false dans l'éditeur : les contrôles sont visibles mais inertes */
  interactive: boolean
  search: string
  setSearch: (v: string) => void
  category: string | null
  setCategory: (v: string | null) => void
  onOpenProduct?: (p: Product) => void
  onAddToCart?: (p: Product) => void
  /**
   * Réservation d'une prestation.
   *
   * Séparé de `onAddToCart` : un service occupe un créneau, il ne se cumule pas
   * dans un panier. Le « + » d'un service envoyait pourtant une prestation au
   * panier comme un plat, sans jamais demander de date.
   */
  onReserve?: (p: Product) => void
  onBook?: (startAt: string) => void
  onContact?: () => void
}

/* ============================================================
   Primitives thémées
   ============================================================ */

function Shell({
  block,
  ctx,
  className,
  children,
  bleed,
}: {
  block: Block
  ctx: RenderCtx
  className?: string
  children: React.ReactNode
  bleed?: boolean
}) {
  return (
    <section
      /* Cible d'ancrage : la navigation basse pointe sur le type de bloc
         (#catalogue, #booking, #contact…) et atteint donc vraiment sa section. */
      id={block.type}
      style={{ ...blockVars(block.style, ctx.theme), scrollMarginBottom: 96 }}
      className={cn('w-full scroll-mt-4', className)}
    >
      <div
        /* La largeur de colonne est décidée par le conteneur parent
           (vitrine ou aperçu du builder), pas par le bloc lui-même. */
        className="mx-auto w-full"
        style={bleed ? undefined : { paddingLeft: 'var(--b-pad-x)', paddingRight: 'var(--b-pad-x)' }}
      >
        {children}
      </div>
    </section>
  )
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-balance"
      style={{
        fontSize: 'calc(1.35rem * var(--b-scale, 1))',
        fontWeight: 'var(--b-weight, 600)' as unknown as number,
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </h2>
  )
}

/**
 * Visuel d'un produit. Sans photo, on affiche l'initiale sur une surface
 * dérivée de la marque plutôt qu'une image cassée ou un placeholder gris.
 */
function Thumb({
  src,
  alt,
  ctx,
  className,
  radius,
}: {
  src?: string
  alt: string
  ctx: RenderCtx
  className?: string
  radius?: string
}) {
  if (src) {
    return (
    <img
      src={src}
      alt={alt}
      className={cn('h-full w-full object-cover', className)}
      style={radius ? { borderRadius: radius } : undefined}
      /* Chargement différé : ces images se répètent dans les grilles de
         catalogue — les charger toutes d'un coup plombait le premier écran. */
      loading="lazy"
      decoding="async"
    />
    )
  }
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center font-bold',
        className,
      )}
      style={{
        borderRadius: radius,
        background: `linear-gradient(135deg, ${lighten(ctx.theme.brand, 0.72)}, ${lighten(ctx.theme.brand, 0.5)})`,
        color: shade(ctx.theme.brand, 0.35),
        fontSize: '1.5rem',
      }}
      aria-label={alt}
      role="img"
    >
      {alt.trim().charAt(0).toUpperCase() || '·'}
    </div>
  )
}

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'fill-current' : 'opacity-25'}
          style={{ color: 'var(--p-brand)' }}
        />
      ))}
    </span>
  )
}

/* ============================================================
   1. Couverture (Hero)
   ============================================================ */

const HERO_H = {
  desktop: { sm: 260, md: 360, lg: 480 },
  /* Sur téléphone, une couverture trop haute repousse le contenu utile sous
     la ligne de flottaison — mais trop basse, la pastille d'identité posée
     en haut venait chevaucher le titre ancré en bas. Ces hauteurs laissent
     la place aux deux. */
  mobile: { sm: 250, md: 330, lg: 400 },
}

function HeroRender({ block, ctx }: { block: HeroBlock; ctx: RenderCtx }) {
  const h = HERO_H[ctx.device][block.height]
  const img = block.imageUrl || demoCover(ctx.business.id)
  const [shared, setShared] = useState(false)

  /* Abonnement : le MÊME système que le cœur de la barre haute (store des
     followers), pas un doublon décoratif. Suivi réel pour un client connecté ;
     pour un visiteur anonyme, on délègue à PageSocial (dialogue d'inscription)
     via un événement — et si personne n'écoute (mockup de la landing), un
     état local fait répondre le bouton quand même. */
  const followers = useClyde((s) => s.followers)
  const toggleFollow = useClyde((s) => s.toggleFollow)
  const userId = useSession((s) => s.userId)
  const storeReady = useClydeReady()
  const [demoFollow, setDemoFollow] = useState(false)
  const following =
    storeReady && userId
      ? followers.some(
          (f) => f.business_id === ctx.business.id && f.user_id === userId,
        )
      : demoFollow

  function handleSubscribe() {
    if (userId) {
      toggleFollow(ctx.business.id, userId)
      return
    }
    const event = new CustomEvent('clyde:follow-request', { cancelable: true })
    const unhandled = window.dispatchEvent(event)
    /* dispatchEvent renvoie false si un écouteur a fait preventDefault() —
       c'est PageSocial qui prend la main. Sinon, réponse locale de démo. */
    if (unhandled) setDemoFollow((v) => !v)
  }

  /* flex-col : items-* gère l'horizontale, justify-* la verticale.
     Les variantes overlay et edge posent le texte en bas à gauche. */
  const align =
    block.variant === 'center'
      ? 'items-center justify-center text-center'
      : 'items-start justify-end'

  const logo = block.logo
  const logoEnabled = logo?.enabled !== false
  const logoUrl = logo?.url || ctx.business.logo_url
  /* Sur téléphone, les tailles hautes mangeraient la couverture entière. */
  const logoPx = ctx.device === 'mobile'
    ? { sm: 48, md: 64, lg: 84 }
    : { sm: 64, md: 84, lg: 112 }
  const size = logoPx[logo?.size ?? 'md']
  const r = size / 2
  /* L'encoche est légèrement plus large que l'avatar : c'est ce vide entre la
     couverture et le cercle qui donne l'effet « sculpté » — sans lui, l'avatar
     paraîtrait simplement posé par-dessus. */
  const notchR = r + 7
  const edgePad = 24
  const alignKey = logo?.align ?? 'left'
  /* Centre horizontal de l'encoche ET de l'avatar — le même calcul pour les
     deux, sinon le cercle sort de son creux dès qu'on change d'alignement. */
  const cx =
    alignKey === 'right'
      ? `calc(100% - ${edgePad + r}px)`
      : alignKey === 'center'
        ? '50%'
        : `${edgePad + r}px`
  /* La couverture se déforme : un cercle transparent est masqué dans son bord
     inférieur, exactement là où l'avatar la chevauche. Le fond de page
     apparaît dans le creux — la photo de profil a son propre espace au lieu
     de flotter sur l'image. */
  const notchMask = logoEnabled
    ? `radial-gradient(circle ${notchR}px at ${cx} 100%, transparent ${notchR - 0.5}px, black ${notchR + 0.5}px)`
    : undefined

  async function handleShare() {
    /* Partage natif si le navigateur le propose (mobile), sinon copie du
       lien : les deux aboutissent à la même chose — l'adresse de la page
       dans les mains du client. */
    const url = window.location.href
    const data = { title: ctx.business.name, url }
    try {
      if (navigator.share) {
        await navigator.share(data)
      } else {
        await navigator.clipboard.writeText(url)
      }
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      /* Partage annulé par l'utilisateur : rien à signaler. */
    }
  }

  return (
    <section style={blockVars(block.style, ctx.theme)} className="relative w-full !py-0">
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: h,
          maskImage: notchMask,
          WebkitMaskImage: notchMask,
        }}
      >
        {img ? (
          <img
            src={img}
            alt={block.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          /* Sans photo : surface dérivée de la couleur de marque, jamais une image cassée */
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(145deg, ${shade(ctx.theme.brand, 0.12)} 0%, ${ctx.theme.brand} 45%, ${shade(ctx.theme.brand, 0.55)} 100%)`,
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              block.variant === 'center'
                ? `radial-gradient(120% 100% at 50% 50%, transparent 20%, rgba(0,0,0,${block.overlay / 100}) 100%)`
                : `linear-gradient(to top, rgba(0,0,0,${Math.min(0.92, block.overlay / 100 + 0.35)}) 0%, rgba(0,0,0,${block.overlay / 200}) 55%, transparent 100%)`,
          }}
        />
        {block.variant === 'edge' && (
          <div className="absolute top-0 left-0 flex h-full items-center pl-4">
            <span
              className="font-mono text-[10px] font-bold tracking-[0.4em] text-white/80 uppercase"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {ctx.business.name}
            </span>
          </div>
        )}
        <div
          className={cn('absolute inset-0 flex flex-col gap-3 p-6', align)}
          style={{
            paddingLeft: block.variant === 'edge' ? 44 : undefined,
            /* Réserve le bas de la couverture à l'encoche : sans cette marge,
               le sous-titre glisserait sous la découpe et serait rogné. */
            paddingBottom: logoEnabled ? r + 20 : undefined,
          }}
        >
          <h1
            className="max-w-xl text-balance text-white drop-shadow-sm"
            style={{
              fontSize:
                ctx.device === 'mobile'
                  ? 'calc(1.9rem * var(--b-scale, 1))'
                  : 'calc(2.9rem * var(--b-scale, 1))',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {block.title}
          </h1>
          {block.subtitle && (
            <p className="max-w-md text-pretty text-sm leading-relaxed text-white/85">
              {block.subtitle}
            </p>
          )}
        </div>
      </div>
      {/* Bande profil sous la couverture. L'avatar est à cheval sur le bord :
          sa moitié haute vit dans l'encoche creusée ci-dessus, sa moitié
          basse dans cette bande — l'effet des interfaces mobiles food &
          booking où le cadre se déforme pour céder la place au profil.
          Encoche et avatar suivent le même alignement (gauche / centre /
          droite) choisi dans le constructeur de page. */}
      {logoEnabled && (
        /* L'avatar est un vrai élément de la rangée, et non plus un calque en
           position absolue. Détaché du flux, il ne réservait aucune largeur :
           les boutons se plaçaient comme s'il n'existait pas et passaient
           dessous dès que la place manquait — 19 px de recouvrement sur
           l'aperçu téléphone du constructeur avec un logo en grande taille, et
           seulement 1 px d'écart en taille moyenne, donc un défaut latent à la
           moindre étiquette plus longue.

           En flux, c'est flexbox qui garantit l'écart : `shrink-0` protège le
           cercle, et le groupe de boutons se contente de la place restante. */
        <div
          className={cn(
            /* Pas de padding haut sur la rangée : il repoussait l'avatar de
               10 px vers le bas, si bien qu'il ne chevauchait la couverture que
               de 22 px au lieu de sa moitié (32 px) — le cercle flottait sous
               son encoche au lieu de s'y loger, comme sur l'aperçu de la page
               d'accueil qui sert de référence. */
            'flex gap-2 px-6',
            alignKey === 'center'
              ? 'flex-col items-center'
              : alignKey === 'right'
                ? 'flex-row-reverse items-start'
                : 'items-start',
          )}
          style={{ minHeight: r + 12 }}
        >
          <span
            className="block shrink-0 rounded-full shadow-lg"
            style={{
              width: size,
              height: size,
              /* Remonte le cercle à cheval sur la couverture : sa moitié haute
                 se loge dans l'encoche creusée au-dessus. */
              marginTop: -r,
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Photo de profil ${ctx.business.name}`}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center rounded-full text-lg font-bold"
                style={{
                  background: ctx.theme.brand,
                  color: '#fff',
                }}
              >
                {ctx.business.name.charAt(0)}
              </span>
            )}
          </span>
          {/* Les actions se serrent contre l'avatar, comme sur la référence de
              la page d'accueil — rejetées au bord opposé, elles laissaient un
              trou au milieu de la bande et semblaient orphelines. Sous lui
              quand il est centré. `flex-wrap` reste le filet de sécurité dans
              un cadre très étroit. */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5 pt-2.5',
              alignKey === 'center'
                ? 'justify-center'
                : alignKey === 'right'
                  ? 'flex-1 justify-end'
                  : 'flex-1 justify-start',
            )}
          >
            <button
              type="button"
              onClick={ctx.interactive ? handleSubscribe : undefined}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full py-1.5 text-[13px] font-semibold shadow-sm transition-transform active:scale-95',
                /* Padding resserré sur téléphone pour que les deux boutons
                   tiennent avec leur libellé à côté de l'avatar. */
                ctx.device === 'mobile' ? 'px-3' : 'px-4',
              )}
              style={
                following
                  ? {
                      background: 'transparent',
                      color: 'inherit',
                      boxShadow: `inset 0 0 0 1.5px ${ctx.theme.brand}`,
                    }
                  : { background: ctx.theme.brand, color: '#fff' }
              }
            >
              {following ? 'Abonné' : "S'abonner"}
            </button>
            {/* « Partager » garde son libellé sur téléphone, comme la
                référence : le padding resserré des deux boutons libère la place
                qui manquait, et `flex-wrap` protège les cas extrêmes. */}
            <button
              type="button"
              onClick={ctx.interactive ? handleShare : undefined}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full border py-1.5 text-[13px] font-semibold transition-transform active:scale-95',
                ctx.device === 'mobile' ? 'px-3' : 'px-4',
              )}
              style={{
                borderColor: 'color-mix(in srgb, currentColor 25%, transparent)',
              }}
            >
              {shared ? (
                <Check className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Share2 className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              {shared ? 'Lien copié' : 'Partager'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/* ============================================================
   2. Recherche · 3. Catégories
   ============================================================ */

function SearchRender({ block, ctx }: { block: Extract<Block, { type: 'search' }>; ctx: RenderCtx }) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const categories = useMemo(
    () => Array.from(new Set(ctx.products.map((p) => p.category_label).filter(Boolean))) as string[],
    [ctx.products],
  )

  return (
    <Shell block={block} ctx={ctx} className={filtersOpen ? 'relative z-[60]' : undefined}>
      <div className="relative flex items-center gap-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-2 px-3.5"
          style={controlSurface(ctx.theme)}
        >
          <Search size={16} className="shrink-0 opacity-45" />
          <input
            value={ctx.search}
            onChange={(e) => ctx.setSearch(e.target.value)}
            readOnly={!ctx.interactive}
            placeholder={block.placeholder}
            aria-label="Rechercher dans le catalogue"
            className="w-full min-w-0 bg-transparent py-3 text-sm outline-none placeholder:opacity-45"
          />
        </div>
        {block.showFilter && (
          <button
            type="button"
            aria-label="Filtres"
            aria-expanded={filtersOpen}
            onClick={ctx.interactive ? () => setFiltersOpen((open) => !open) : undefined}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: ctx.theme.brand,
              color: readableOn(ctx.theme.brand),
              borderColor: ctx.theme.brand,
              opacity: 1,
            }}
          >
            <SlidersHorizontal size={17} />
          </button>
        )}
      </div>
      {filtersOpen && ctx.interactive && (
        <div
          role="menu"
          aria-label="Filtrer par catégorie"
          className="relative z-[9999] mt-2 flex w-full flex-col gap-1 overflow-y-auto rounded-xl border p-2 shadow-2xl sm:max-h-48 sm:flex-row sm:flex-wrap"
          style={{
            backgroundColor: ctx.theme.background,
            color: ctx.theme.ink,
            borderColor: `${ctx.theme.ink}28`,
            opacity: 1,
            isolation: 'isolate',
          }}
        >
          {['Tout', ...categories].map((label) => {
            const value = label === 'Tout' ? null : label
            const active = ctx.category === value
            return (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => {
                  ctx.setCategory(value)
                  setFiltersOpen(false)
                }}
                className="rounded-lg px-3 py-2 text-left text-xs font-semibold sm:text-center"
                style={{
                  backgroundColor: active ? ctx.theme.brand : ctx.theme.background,
                  color: active ? readableOn(ctx.theme.brand) : ctx.theme.ink,
                  border: `1px solid ${active ? ctx.theme.brand : `${ctx.theme.ink}16`}`,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </Shell>
  )
}

function CategoriesRender({
  block,
  ctx,
}: {
  block: Extract<Block, { type: 'categories' }>
  ctx: RenderCtx
}) {
  const items = useMemo(() => {
    if (!block.autoFromCatalogue && block.items.length) return block.items
    const set = new Set<string>()
    for (const p of ctx.products) if (p.category_label) set.add(p.category_label)
    const auto = Array.from(set)
    return auto.length ? auto : ['Populaires', 'Nouveautés']
  }, [block.autoFromCatalogue, block.items, ctx.products])

  const all = ['Tout', ...items]
  const display = block.display ?? 'wrap'

  /* Vignette du mode `card` : la première photo trouvée dans la catégorie.
     On la calcule une fois pour tous les libellés plutôt que de reparcourir
     le catalogue à chaque bouton. */
  const covers = useMemo(() => {
    if (display !== 'card') return {}
    const map: Record<string, string> = {}
    for (const p of ctx.products) {
      const key = p.category_label
      if (key && !map[key] && p.media_urls[0]) map[key] = p.media_urls[0]
    }
    return map
  }, [display, ctx.products])

  const gutters = { paddingLeft: 'var(--b-pad-x)', paddingRight: 'var(--b-pad-x)' }

  if (display === 'card') {
    return (
      <Shell block={block} ctx={ctx} bleed>
        {/* Piste glissante : les vignettes gardent leur largeur et débordent
            plutôt que de rétrécir jusqu'à l'illisible. `snap` pour que le
            geste au doigt s'arrête sur une vignette entière. */}
        <CarouselRail
          enabled={ctx.interactive}
          ariaLabel="Catégories"
          itemCount={all.length}
          style={gutters}
        >
          {all.map((label) => {
            const value = label === 'Tout' ? null : label
            const active = ctx.category === value
            const cover = value ? covers[value] : undefined
            return (
              <button
                key={label}
                type="button"
                onClick={ctx.interactive ? () => ctx.setCategory(value) : undefined}
                className="relative h-24 w-32 shrink-0 snap-start overflow-hidden text-left transition-transform active:scale-[0.98]"
                style={controlSurface(ctx.theme, { radius: 'var(--p-card-radius)', active })}
                aria-pressed={active}
              >
                {cover ? (
                  <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : null}
                {/* Voile systématique, y compris sans photo : le libellé reste
                    lisible quelle que soit la teinte de l'image. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background: cover
                      ? 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 70%)'
                      : undefined,
                  }}
                />
                <span
                  className="absolute inset-x-0 bottom-0 p-2 text-[13px] font-semibold"
                  style={cover ? { color: '#fff' } : undefined}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </CarouselRail>
      </Shell>
    )
  }

  if (display === 'scroll') {
    return (
      <Shell block={block} ctx={ctx} bleed>
        <CarouselRail
          enabled={ctx.interactive}
          ariaLabel="Catégories"
          itemCount={all.length}
          style={gutters}
        >
          {all.map((label) => {
            const value = label === 'Tout' ? null : label
            const active = ctx.category === value
            return (
              <button
                key={label}
                type="button"
                onClick={ctx.interactive ? () => ctx.setCategory(value) : undefined}
                className="shrink-0 snap-start px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors"
                style={controlSurface(ctx.theme, {
                  radius: 'var(--p-btn-radius)',
                  active,
                })}
                aria-pressed={active}
              >
                {label}
              </button>
            )
          })}
        </CarouselRail>
      </Shell>
    )
  }

  return (
    <Shell block={block} ctx={ctx} bleed>
      <div className="flex flex-wrap gap-2" style={gutters}>
        {all.map((label) => {
          const value = label === 'Tout' ? null : label
          const active = ctx.category === value
          return (
            <button
              key={label}
              type="button"
              onClick={ctx.interactive ? () => ctx.setCategory(value) : undefined}
              className="shrink-0 px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors"
              style={controlSurface(ctx.theme, {
                radius: 'var(--p-btn-radius)',
                active,
              })}
              aria-pressed={active}
            >
              {label}
            </button>
          )
        })}
      </div>
    </Shell>
  )
}

/* ============================================================
   4. Catalogue
   ============================================================ */

function ProductCard({
  p,
  ctx,
  block,
  layout,
}: {
  p: Product
  ctx: RenderCtx
  block: CatalogueBlock
  layout: 'grid' | 'list'
}) {
  const img = p.media_urls[0]
  const open = ctx.interactive && ctx.onOpenProduct ? () => ctx.onOpenProduct?.(p) : undefined

  /* Une prestation ne se cumule pas dans un panier : elle occupe un créneau.
     Le bouton d'action ouvre donc la réservation, et son icône l'annonce —
     un « + » promettait un ajout au panier qui n'avait pas de sens ici. */
  const isService = p.type === 'service'
  const ActionIcon = isService ? CalendarDays : Plus
  const act = ctx.interactive
    ? () => (isService ? ctx.onReserve?.(p) : ctx.onAddToCart?.(p))
    : undefined
  const actLabel = isService
    ? `Réserver ${p.name}`
    : `Ajouter ${p.name} au panier`

  if (layout === 'list') {
    return (
      <div
        className="flex items-center gap-3 p-2.5 text-left"
        style={{
          ...cardSurface(ctx.theme),
        }}
      >
        <button
          type="button"
          onClick={open}
          className="size-[68px] shrink-0 overflow-hidden"
          style={{ borderRadius: 'calc(var(--b-radius) * 0.7)' }}
        >
          <Thumb src={img} alt={p.name} ctx={ctx} />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={open} className="block text-left">
            <p className="truncate text-sm font-semibold">{p.name}</p>
          </button>
          {p.description && (
            <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug opacity-55">
              {p.description}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            {block.showPrice && (
              <span className="text-[13px] font-bold" style={{ color: 'var(--p-brand)' }}>
                {formatPrice(p.price, ctx.currency)}
              </span>
            )}
            {p.compare_at_price && (
              <span className="text-[11px] line-through opacity-40">
                {formatPrice(p.compare_at_price, ctx.currency)}
              </span>
            )}
            {block.showRating && <Stars value={4.6} size={11} />}
          </div>
        </div>
        <button
          type="button"
          onClick={act}
          disabled={!p.available}
          aria-label={p.available ? actLabel : `${p.name} épuisé`}
          title={p.available ? actLabel : 'Épuisé'}
          className="flex size-10 shrink-0 items-center justify-center disabled:opacity-40"
          style={{ ...brandButton(ctx.theme), borderRadius: 999 }}
        >
          <ActionIcon className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col overflow-hidden text-left"
      style={{
        ...cardSurface(ctx.theme),
      }}
    >
      <button type="button" onClick={open} className="relative block aspect-square overflow-hidden @[26rem]:aspect-[4/3]">
        <Thumb src={img} alt={p.name} ctx={ctx} />
        {!p.available && (
          <span className="absolute inset-x-0 bottom-0 bg-black/65 py-1 text-center text-[10px] font-bold tracking-wider text-white uppercase">
            Indisponible
          </span>
        )}
        {p.compare_at_price && p.available && (
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              borderRadius: 4,
              background: 'var(--p-brand)',
              color: readableOn(ctx.theme.brand),
            }}
          >
            -{Math.max(1, Math.round((1 - p.price / p.compare_at_price) * 100))}%
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <button type="button" onClick={open} className="min-w-0 text-left">
          <p className="line-clamp-2 text-[13px] leading-tight font-semibold">{p.name}</p>
        </button>
        {block.showRating && <Stars value={4.6} size={11} />}
        {/* Prix et ajout au panier sur une seule ligne : la carte reste dense
            et le « + » remplace un libellé qui débordait sur deux lignes. */}
        <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-1.5">
          <div className="flex min-w-0 flex-col">
            {block.showPrice && (
              <p className="min-w-0 truncate text-[13px] font-bold" style={{ color: 'var(--p-brand)' }}>
                {formatPrice(p.price, ctx.currency)}
              </p>
            )}
            {p.compare_at_price && (
              <p className="text-[10px] line-through opacity-40">
                {formatPrice(p.compare_at_price, ctx.currency)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={act}
            disabled={!p.available}
            aria-label={p.available ? actLabel : `${p.name} indisponible`}
            title={p.available ? actLabel : 'Indisponible'}
            className="flex size-9 shrink-0 items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
            style={{ ...brandButton(ctx.theme), borderRadius: 999 }}
          >
            <ActionIcon className="size-[17px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CatalogueRender({ block, ctx }: { block: CatalogueBlock; ctx: RenderCtx }) {
  const list = useMemo(() => {
    const q = ctx.search.trim().toLowerCase()
    return ctx.products.filter((p) => {
      if (!p.active) return false
      if (ctx.category && p.category_label !== ctx.category) return false
      if (q && !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [ctx.products, ctx.search, ctx.category])

  /* Genre « commande » : le catalogue devient l'écran central d'une app de
     livraison — rail de catégories épinglé à gauche, liste dense à droite. */
  if ((ctx.theme.preset ?? 'vitrine') === 'commande') {
    return <DeliveryCatalogue block={block} ctx={ctx} list={list} />
  }

  const cols = ctx.device === 'mobile' ? 2 : block.columns
  const layout = block.display

  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-4">
        {block.title && <BlockTitle>{block.title}</BlockTitle>}
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm opacity-50">
            Aucun résultat pour cette recherche.
          </p>
        ) : layout === 'grid' ? (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {list.map((p) => (
              <ProductCard key={p.id} p={p} ctx={ctx} block={block} layout="grid" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} ctx={ctx} block={block} layout="list" />
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

/**
 * Catalogue façon application de livraison (référence : Eleme / Meituan).
 *
 * Deux colonnes structurantes :
 * - à gauche, un RAIL de catégories étroit, épinglé pendant qu'on défile la
 *   liste — l'onglet actif porte la couleur de marque et une barre latérale ;
 * - à droite, la LISTE dense : vignette carrée, nom en gras, description sur
 *   une ligne, prix en couleur de marque avec prix barré, « + » rond à droite.
 *
 * Le rail réutilise `ctx.category` / `ctx.setCategory` — le même état que les
 * pastilles du bloc Catégories : les deux genres filtrent la même donnée.
 */
function DeliveryCatalogue({
  block,
  ctx,
  list,
}: {
  block: CatalogueBlock
  ctx: RenderCtx
  list: Product[]
}) {
  /* Les rayons, dans l'ordre d'apparition du catalogue. */
  const categories = useMemo(() => {
    const seen: string[] = []
    for (const p of ctx.products) {
      if (!p.active || !p.category_label) continue
      if (!seen.includes(p.category_label)) seen.push(p.category_label)
    }
    return seen
  }, [ctx.products])

  const railBtn = (label: string, value: string | null) => {
    const active = ctx.category === value
    return (
      <button
        key={label}
        type="button"
        onClick={ctx.interactive ? () => ctx.setCategory(value) : undefined}
        aria-pressed={active}
        className="relative w-full px-2 py-3 text-center text-[12px] leading-tight transition-colors"
        style={{
          background: active ? 'color-mix(in srgb, var(--p-brand) 10%, transparent)' : 'transparent',
          color: active ? 'var(--p-brand)' : 'inherit',
          fontWeight: active ? 700 : 500,
          opacity: active ? 1 : 0.65,
        }}
      >
        {/* Barre latérale : le marqueur d'onglet actif des apps de commande. */}
        {active && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full"
            style={{ background: 'var(--p-brand)' }}
          />
        )}
        {label}
      </button>
    )
  }

  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-3">
        {block.title && <BlockTitle>{block.title}</BlockTitle>}
        <div className="flex items-start gap-0 overflow-hidden" style={{ borderRadius: 'var(--b-radius)' }}>
          {/* Rail gauche : étroit, épinglé, fond légèrement en retrait pour
              détacher la liste. */}
          <nav
            aria-label="Rayons"
            className="sticky top-2 flex max-h-[70vh] w-[88px] shrink-0 flex-col overflow-y-auto"
            style={{ background: 'color-mix(in srgb, var(--p-ink) 5%, transparent)' }}
          >
            {railBtn('Tout', null)}
            {categories.map((c) => railBtn(c, c))}
          </nav>

          {/* Liste dense : une rangée par article, séparées d'un trait fin. */}
          <div className="min-w-0 flex-1">
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm opacity-50">
                Aucun résultat pour cette recherche.
              </p>
            ) : (
              list.map((p) => <DeliveryRow key={p.id} p={p} ctx={ctx} block={block} />)
            )}
          </div>
        </div>
      </div>
    </Shell>
  )
}

/** Une rangée d'article du genre « commande » : photo, texte, prix, « + ». */
function DeliveryRow({ p, ctx, block }: { p: Product; ctx: RenderCtx; block: CatalogueBlock }) {
  const img = p.media_urls[0]
  const open = ctx.interactive && ctx.onOpenProduct ? () => ctx.onOpenProduct?.(p) : undefined
  const isService = p.type === 'service'
  const ActionIcon = isService ? CalendarDays : Plus
  const act = ctx.interactive
    ? () => (isService ? ctx.onReserve?.(p) : ctx.onAddToCart?.(p))
    : undefined
  const promo = p.compare_at_price
    ? Math.max(1, Math.round((1 - p.price / p.compare_at_price) * 100))
    : null

  return (
    <div
      className="flex items-start gap-3 px-3 py-3"
      style={{ borderBottom: '1px solid color-mix(in srgb, var(--p-ink) 8%, transparent)' }}
    >
      <button
        type="button"
        onClick={open}
        className="relative size-[84px] shrink-0 overflow-hidden"
        style={{ borderRadius: 'calc(var(--b-radius) * 0.6)' }}
      >
        <Thumb src={img} alt={p.name} ctx={ctx} />
        {!p.available && (
          <span className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] font-bold tracking-wide text-white uppercase">
            Épuisé
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button type="button" onClick={open} className="block min-w-0 text-left">
          <p className="line-clamp-2 text-[14px] leading-snug font-bold">{p.name}</p>
        </button>
        {p.description && (
          <p className="line-clamp-1 text-[12px] opacity-55">{p.description}</p>
        )}
        {/* Badge de remise en pastille bordée, comme le « 8.72折 » du modèle. */}
        {promo && p.available && (
          <span
            className="w-fit rounded px-1.5 py-px text-[10px] font-bold"
            style={{
              border: '1px solid var(--p-brand)',
              color: 'var(--p-brand)',
            }}
          >
            -{promo}%
          </span>
        )}
        {/* `flex-wrap` sur le groupe prix : quand la colonne devient étroite,
            l'ancien prix barré passe à la ligne au lieu de venir buter contre
            le bouton d'action — le prix et le « + » gardent toujours leur
            espace de respiration. */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            {block.showPrice && (
              <span
                className="text-[15px] font-extrabold whitespace-nowrap"
                style={{ color: 'var(--p-brand)' }}
              >
                {formatPrice(p.price, ctx.currency)}
              </span>
            )}
            {p.compare_at_price && (
              <span className="text-[11px] whitespace-nowrap line-through opacity-40">
                {formatPrice(p.compare_at_price, ctx.currency)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={act}
            disabled={!p.available}
            aria-label={
              p.available
                ? isService
                  ? `Réserver ${p.name}`
                  : `Ajouter ${p.name} au panier`
                : `${p.name} épuisé`
            }
            className="flex size-8 shrink-0 items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
            style={{ ...brandButton(ctx.theme), borderRadius: 999 }}
          >
            <ActionIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   5. Carrousel
   ============================================================ */

function CarouselRender({ block, ctx }: { block: CarouselBlock; ctx: RenderCtx }) {
  const list = useMemo(() => {
    const picked = block.productIds.length
      ? block.productIds.map((id) => ctx.products.find((p) => p.id === id)).filter(Boolean)
      : ctx.products.slice(0, 6)
    return picked as Product[]
  }, [block.productIds, ctx.products])

  const variant = block.variant ?? 'overlay'
  /* Mobile : 1 carte visible + bout de la suivante — le débordement signale
     qu'on peut glisser. Desktop : 3 cartes + bout de la suivante. */
  const cardW = ctx.device === 'mobile' ? '72%' : '30%'

  /* Mode « images libres » : visuels promotionnels téléversés, sans produit
     derrière — même rail, cartes sans prix ni clic produit. */
  const images = (block.images ?? []).filter(Boolean)
  if (block.source === 'images') {
    if (images.length === 0 && ctx.interactive) return null
    return (
      <Shell block={block} ctx={ctx} bleed>
        <div className="flex flex-col gap-3">
          {block.title && (
            <div style={{ paddingLeft: 'var(--b-pad-x)', paddingRight: 'var(--b-pad-x)' }}>
              <BlockTitle>{block.title}</BlockTitle>
            </div>
          )}
          <CarouselRail
            enabled
            ariaLabel={block.title || 'Carrousel'}
            itemCount={images.length}
            style={{ paddingLeft: 'var(--b-pad-x)', paddingRight: 'var(--b-pad-x)' }}
          >
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="shrink-0 snap-start overflow-hidden"
                style={{ ...frameSurface(ctx.theme), width: cardW, minWidth: cardW }}
              >
                <div className="aspect-[16/10] w-full">
                  <Thumb src={src} alt={block.title ? `${block.title} ${i + 1}` : `Visuel ${i + 1}`} ctx={ctx} />
                </div>
              </div>
            ))}
            {images.length === 0 ? (
              <div
                className="flex aspect-[16/10] shrink-0 snap-start items-center justify-center border border-dashed text-center"
                style={{ ...frameSurface(ctx.theme), width: cardW, minWidth: cardW }}
              >
                <p className="px-4 text-[12px] text-muted-foreground">
                  Téléversez des images dans les réglages du bloc
                </p>
              </div>
            ) : null}
          </CarouselRail>
        </div>
      </Shell>
    )
  }

  return (
    <Shell block={block} ctx={ctx} bleed>
      <div className="flex flex-col gap-3">
        {block.title && (
          <div style={{ paddingLeft: 'var(--b-pad-x)', paddingRight: 'var(--b-pad-x)' }}>
            <BlockTitle>{block.title}</BlockTitle>
          </div>
        )}
        <CarouselRail
          /* Le défilement reste visible dans l'éditeur comme sur la vitrine.
             `interactive` ne doit contrôler que les clics sur les cartes. */
          enabled
          ariaLabel={block.title || 'Sélection du moment'}
          itemCount={list.length}
          style={{ paddingLeft: 'var(--b-pad-x)', paddingRight: 'var(--b-pad-x)' }}
        >
          {list.map((p) => {
            const open = ctx.interactive ? () => ctx.onOpenProduct?.(p) : undefined

            if (variant === 'card') {
              /* Photo en haut, cartouche opaque dessous : la variante la plus
                 sobre, lisible sur n'importe quelle photo. */
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={open}
                  className="flex shrink-0 snap-start flex-col overflow-hidden text-left"
                  style={{ ...cardSurface(ctx.theme), width: cardW, minWidth: cardW }}
                >
                  <div className="aspect-[16/10] w-full overflow-hidden">
                    <Thumb src={p.media_urls[0]} alt={p.name} ctx={ctx} />
                  </div>
                  <div className="flex flex-col gap-0.5 p-3">
                    <p className="line-clamp-1 text-[13px] font-semibold">{p.name}</p>
                    <p className="text-[12px] font-bold" style={{ color: 'var(--p-brand)' }}>
                      {formatPrice(p.price, ctx.currency)}
                    </p>
                  </div>
                </button>
              )
            }

            if (variant === 'caption' || variant === 'glass') {
              /* Cartouche sombre arrondi posé dans la photo (remplace
                 l'ancien bandeau glassmorphe : le flou translucide rendait
                 les noms illisibles sur les photos claires). Le fond opaque
                 garantit le contraste, et le nom garde deux lignes. */
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={open}
                  className="relative shrink-0 snap-start overflow-hidden text-left"
                  style={{ ...frameSurface(ctx.theme), width: cardW, minWidth: cardW }}
                >
                  <div className="aspect-[4/3] w-full">
                    <Thumb src={p.media_urls[0]} alt={p.name} ctx={ctx} />
                  </div>
                  <div className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[13px] leading-snug font-semibold text-white">
                        {p.name}
                      </span>
                    </span>
                    <span
                      className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-bold text-white"
                      style={{ background: 'var(--p-brand)' }}
                    >
                      {formatPrice(p.price, ctx.currency)}
                    </span>
                  </div>
                </button>
              )
            }

            /* `overlay` (défaut) : dégradé sombre en pied de photo. */
            return (
              <button
                key={p.id}
                type="button"
                onClick={open}
                className="relative shrink-0 snap-start overflow-hidden text-left"
                style={{ ...frameSurface(ctx.theme), width: cardW, minWidth: cardW }}
              >
                <div className="aspect-[16/10] w-full">
                  <Thumb src={p.media_urls[0]} alt={p.name} ctx={ctx} />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                  <p className="line-clamp-1 text-[13px] font-semibold text-white">{p.name}</p>
                  {/* Blanc plutôt que la couleur de marque : sur fond sombre,
                      un orange saturé vibrait et restait peu lisible. */}
                  <p className="text-[12px] font-bold text-white/90">
                    {formatPrice(p.price, ctx.currency)}
                  </p>
                </div>
              </button>
            )
          })}
        </CarouselRail>
      </div>
    </Shell>
  )
}

/*
 * Rail horizontal glissant — utilisé pour les catégories et la sélection.
 *
 * Principe :
 *  - Le défilement est natif (overflow-x: auto + touch-action: pan-x).
 *    Sur mobile le swipe fonctionne sans JS.
 *  - Un requestAnimationFrame incrémente scrollLeft de ~0.35 px par frame
 *    (≈ 21 px/s à 60 fps). Cette méthode contourne le blocage causé par
 *    `scroll-smooth` qui ignorait les mutations directes sur scrollLeft.
 *  - Aucun indicateur (points, flèches) : le rail déborde intentionnellement
 *    pour signaler qu'il y a du contenu à découvrir.
 *  - Le défilement s'arrête lorsque l'utilisateur touche le rail, puis
 *    reprend 2 s après qu'il a relâché.
 */
function CarouselRail({
  children,
  ariaLabel,
  itemCount,
  style,
}: {
  children: React.ReactNode
  enabled?: boolean
  ariaLabel: string
  itemCount: number
  style?: CSSProperties
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const pausedRef = useRef(false)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* Position accumulée en flottant : `scrollLeft` est tronqué à l'entier par
     le navigateur, donc incrémenter directement scrollLeft de 0.35 px ne
     bougeait jamais le rail (0 + 0.35 → tronqué à 0, à chaque frame). */
  const posRef = useRef(0)

  useEffect(() => {
    if (itemCount < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const PX_PER_FRAME = 0.4

    const tick = () => {
      const rail = railRef.current
      if (rail && !pausedRef.current) {
        const max = rail.scrollWidth - rail.clientWidth
        if (max > 0) {
          /* Resynchronise si l'utilisateur a fait défiler à la main. */
          if (Math.abs(rail.scrollLeft - posRef.current) > 2) {
            posRef.current = rail.scrollLeft
          }
          posRef.current = posRef.current + PX_PER_FRAME >= max ? 0 : posRef.current + PX_PER_FRAME
          rail.scrollLeft = posRef.current
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [itemCount])

  /* Pause pendant l'interaction, reprise après 4 s : assez long pour lire
     une carte et cliquer dessus sans que le rail reparte sous le doigt. */
  function pause() {
    pausedRef.current = true
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
  }
  function resume() {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => { pausedRef.current = false }, 4000)
  }

  /* Glisser à la souris : le défilement natif ne répond qu'au tactile et à
     la molette — à la souris, le rail semblait figé. On traduit donc le
     mouvement du pointeur en scrollLeft, et on avale le clic qui suit un
     vrai glissement pour ne pas ouvrir une carte par accident. */
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false })

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pause()
    if (e.pointerType !== 'mouse') return
    const rail = railRef.current
    if (!rail) return
    dragRef.current = { active: true, startX: e.clientX, startScroll: rail.scrollLeft, moved: false }
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const rail = railRef.current
    if (!drag.active || !rail) return
    const delta = e.clientX - drag.startX
    if (Math.abs(delta) > 5 && !drag.moved) {
      drag.moved = true
      rail.setPointerCapture(e.pointerId)
    }
    if (drag.moved) rail.scrollLeft = drag.startScroll - delta
  }
  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (drag.active && drag.moved) {
      railRef.current?.releasePointerCapture?.(e.pointerId)
    }
    drag.active = false
    resume()
  }
  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (dragRef.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current.moved = false
    }
  }

  if (itemCount === 0) return null

  return (
    <div
      ref={railRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className="clyde-no-scrollbar flex cursor-grab gap-3 overflow-x-auto overscroll-x-contain pb-1 select-none active:cursor-grabbing"
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      {children}
    </div>
  )
}






/* ============================================================
   6. Bannière promo
   ============================================================ */

function PromoRender({ block, ctx }: { block: Extract<Block, { type: 'promo' }>; ctx: RenderCtx }) {
  const product = block.productId ? ctx.products.find((p) => p.id === block.productId) : null
  const remaining = useCountdown(block.endsAt)

  return (
    <Shell block={block} ctx={ctx}>
      <div
        className="flex flex-col gap-4 overflow-hidden p-5 @lg:flex-row @lg:items-center"
        style={{
          borderRadius: 'var(--b-radius)',
          background: `linear-gradient(120deg, ${ctx.theme.brand}, ${lighten(ctx.theme.brand, 0.32)})`,
          color: readableOn(ctx.theme.brand),
        }}
      >
        <div className="min-w-0 flex-1 text-left">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase opacity-70">
            Offre limitée
          </p>
          <p
            className="mt-1 text-balance"
            style={{
              fontSize: 'calc(1.3rem * var(--b-scale, 1))',
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            {block.title}
          </p>
          {block.description && (
            <p className="mt-1 text-[13px] leading-snug opacity-80">{block.description}</p>
          )}
          {remaining && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-black/15 px-2 py-1 font-mono text-[11px] font-bold">
              <Clock size={12} /> {remaining}
            </p>
          )}
        </div>

        {product && (
          <div className="flex items-center gap-3 rounded-xl bg-black/12 p-2.5">
            <div className="size-14 shrink-0 overflow-hidden rounded-lg">
              <Thumb src={product.media_urls[0]} alt={product.name} ctx={ctx} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{product.name}</p>
              <p className="text-sm font-bold">
                {formatPrice(product.price, ctx.currency)}
                {product.compare_at_price && (
                  <span className="ml-1.5 text-[11px] font-normal line-through opacity-65">
                    {formatPrice(product.compare_at_price, ctx.currency)}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* L'offre mène toujours quelque part : au panier si un article est
            associé, au catalogue sinon. Plus de bouton mort. */}
        <PromoCta block={block} ctx={ctx} product={product ?? null} />
      </div>
    </Shell>
  )
}

function PromoCta({
  block,
  ctx,
  product,
}: {
  block: Extract<Block, { type: 'promo' }>
  ctx: RenderCtx
  product: Product | null
}) {
  const style = {
    borderRadius: 'var(--p-btn-radius)',
    background: readableOn(ctx.theme.brand),
    color: ctx.theme.brand,
  } as const
  const className = 'inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] font-bold'

  /* Le produit mis en avant peut être une prestation : elle se réserve, et
     le libellé du bloc parlerait sinon d'ajout au panier. */
  const isService = product?.type === 'service'
  if (product && (isService ? ctx.onReserve : ctx.onAddToCart)) {
    const Icon = isService ? CalendarDays : Plus
    return (
      <button
        type="button"
        onClick={
          ctx.interactive
            ? () => (isService ? ctx.onReserve?.(product) : ctx.onAddToCart?.(product))
            : undefined
        }
        disabled={!product.available}
        className={cn(className, 'disabled:opacity-50')}
        style={style}
      >
        <Icon className="size-4" aria-hidden="true" />
        {product.available
          ? isService
            ? 'Réserver'
            : block.ctaLabel
          : 'Indisponible'}
      </button>
    )
  }

  /* Sans panier disponible (aperçu, maquette), on renvoie vers le catalogue
     de la page : l'intention du bouton reste lisible. */
  return (
    <a href="#catalogue" className={className} style={style}>
      {block.ctaLabel}
    </a>
  )
}

function useCountdown(endsAt: string | null) {
  const [now] = useState(() => Date.now())
  if (!endsAt) return null
  const diff = new Date(endsAt).getTime() - now
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return d > 0 ? `${d} j ${h} h restantes` : `${h} h ${m} min restantes`
}

/* ============================================================
   7. Réservation
   ============================================================ */

export function slotsForDay(rules: AvailabilityRule[], date: Date): string[] {
  const dow = date.getDay()
  /* Un Set, pas un tableau : deux règles du même jour peuvent se chevaucher
     (deux emplacements, deux plages qui se recoupent) et produire la même
     heure deux fois — deux boutons « 13:00 » dans la grille, et React qui
     proteste sur les clés dupliquées. On trie à la fin : l'ordre d'itération
     des règles ne garantit pas l'ordre chronologique. */
  const out = new Set<string>()
  for (const r of rules) {
    if (r.day_of_week !== dow) continue
    const [sh, sm] = r.start_time.split(':').map(Number)
    const [eh, em] = r.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em
    while (cur + r.slot_duration_minutes <= end) {
      out.add(
        `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`,
      )
      cur += r.slot_duration_minutes
    }
  }
  return [...out].sort()
}

/**
 * Durée d'un créneau ce jour-là, en minutes.
 *
 * La feuille de réservation propose des durées qui sont des multiples de ce pas,
 * afin qu'une prestation longue occupe des créneaux réellement contigus plutôt
 * qu'une durée arbitraire qui chevaucherait le suivant. `null` quand le jour est
 * fermé : il n'y a alors pas de pas à multiplier.
 */
export function slotStepForDay(
  rules: AvailabilityRule[],
  date: Date,
): number | null {
  const dow = date.getDay()
  const steps = rules
    .filter((r) => r.day_of_week === dow)
    .map((r) => r.slot_duration_minutes)
  /* Plusieurs plages peuvent cohabiter (matin, soir) avec des pas différents :
     le plus petit est le seul qui reste valable partout. */
  return steps.length ? Math.min(...steps) : null
}

/**
 * Plages déjà réservées ce jour-là, en minutes depuis minuit.
 *
 * Seules les demandes vivantes bloquent : une réservation annulée ou terminée
 * rend son créneau. Les réservations sans durée (antérieures au champ)
 * occupent un pas de créneau — l'hypothèse la plus courte, pour ne jamais
 * bloquer plus que ce que le client a demandé.
 */
export function bookedRangesForDay(
  bookings: Booking[],
  businessId: string,
  date: Date,
  fallbackMinutes: number,
): Array<[number, number]> {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  const out: Array<[number, number]> = []
  for (const b of bookings) {
    if (b.business_id !== businessId) continue
    if (b.status !== 'pending' && b.status !== 'confirmed') continue
    const start = new Date(b.start_at)
    if (start.getFullYear() !== y || start.getMonth() !== m || start.getDate() !== d) continue
    const from = start.getHours() * 60 + start.getMinutes()
    out.push([from, from + (b.duration_minutes ?? fallbackMinutes)])
  }
  return out
}

/**
 * Ne garde que les créneaux encore libres pour une prestation de
 * `durationMinutes` : le créneau est retiré dès que SA durée complète
 * chevauche une réservation existante. C'est ce filtre qui garantit que deux
 * clients ne peuvent pas retenir la même table ou la même heure — l'occupé
 * n'est simplement jamais proposé.
 */
export function freeSlotsForDay(
  rules: AvailabilityRule[],
  date: Date,
  bookings: Booking[],
  businessId: string,
  durationMinutes?: number,
): string[] {
  const all = slotsForDay(rules, date)
  if (!all.length) return all
  const step = slotStepForDay(rules, date) ?? 60
  const span = durationMinutes ?? step
  const taken = bookedRangesForDay(bookings, businessId, date, step)
  if (!taken.length) return all
  return all.filter((s) => {
    const [h, m] = s.split(':').map(Number)
    const from = h * 60 + m
    const to = from + span
    return !taken.some(([bFrom, bTo]) => from < bTo && to > bFrom)
  })
}

const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function BookingRender({
  block,
  ctx,
}: {
  block: Extract<Block, { type: 'booking' }>
  ctx: RenderCtx
}) {
  const days = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return Array.from({ length: block.daysAhead }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d
    })
  }, [block.daysAhead])

  const [dayIdx, setDayIdx] = useState(0)
  const [slot, setSlot] = useState<string | null>(null)
  const [storeHydrated, setStoreHydrated] = useState(false)
  const day = days[dayIdx] ?? days[0]
  /* Zustand persist peut restaurer les réservations dans le navigateur avant
     le premier rendu client. Le serveur, lui, ne les connaît pas encore :
     filtrer la grille avec cette donnée externe dès le premier rendu change
     le nombre de boutons et déclenche une erreur d'hydratation. On garde donc
     la grille déterministe pendant l'hydratation, puis on applique le filtre
     dès que le store client est prêt. */
  const allBookings = useClyde((s) => s.bookings)
  useEffect(() => {
    setStoreHydrated(true)
  }, [])
  const visibleBookings = storeHydrated ? allBookings : []
  const slots = useMemo(
    () => freeSlotsForDay(ctx.availability, day, visibleBookings, ctx.business.id),
    [ctx.availability, day, visibleBookings, ctx.business.id],
  )

  /* The booking block depends on two browser-only inputs: persisted Zustand
     data and the current date. Even with a stable bookings snapshot, either
     can differ during the server/client handoff (especially around midnight
     or after a previous booking). Keep the complete first tree deterministic;
     only reveal the live calendar after hydration has finished. */
  if (!storeHydrated) {
    return (
      <Shell block={block} ctx={ctx}>
        <div className="flex flex-col gap-4" aria-busy="true">
          <div>
            <BlockTitle>{block.title}</BlockTitle>
            {block.description && (
              <p className="mt-1 text-[13px] opacity-60">{block.description}</p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 @[20rem]:grid-cols-5 @[26rem]:grid-cols-7">
            {Array.from({ length: Math.min(block.daysAhead, 7) }, (_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-[var(--b-radius)] bg-current opacity-10"
              />
            ))}
          </div>
          <div className="h-10 animate-pulse rounded-[var(--b-radius)] bg-current opacity-10" />
        </div>
      </Shell>
    )
  }

  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-4">
        <div>
          <BlockTitle>{block.title}</BlockTitle>
          {block.description && (
            <p className="mt-1 text-[13px] opacity-60">{block.description}</p>
          )}
        </div>

        {/* Grille au lieu d'une bande qui défile : sur un téléphone étroit,
            aucun jour ne se retrouve coupé au bord de l'écran. */}
        <div className="grid grid-cols-4 gap-2 @[20rem]:grid-cols-5 @[26rem]:grid-cols-7">
          {days.map((d, i) => {
            const active = i === dayIdx
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={
                  ctx.interactive
                    ? () => {
                        setDayIdx(i)
                        setSlot(null)
                      }
                    : undefined
                }
                className="flex min-w-0 flex-col items-center gap-0.5 py-2.5"
                style={controlSurface(ctx.theme, { active })}
              >
                <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                  {DAY_SHORT[d.getDay()]}
                </span>
                <span className="text-base leading-none font-bold">{d.getDate()}</span>
              </button>
            )
          })}
        </div>

        {slots.length === 0 ? (
          <p
            className="px-3 py-6 text-center text-[13px] opacity-55"
            style={{
              borderRadius: 'var(--b-radius)',
              background: insetFill(ctx.theme),
            }}
          >
            {/* Jour ouvert mais saturé ≠ jour fermé : dire « fermé » à un
                client un samedi complet serait un mensonge démotivant. */}
            {slotsForDay(ctx.availability, day).length
              ? 'Complet ce jour-là — choisissez une autre date.'
              : 'Fermé ce jour-là — choisissez une autre date.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 @lg:grid-cols-4">
            {slots.map((s) => {
              const active = slot === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={ctx.interactive ? () => setSlot(s) : undefined}
                  className="py-2.5 text-[13px] font-semibold tabular-nums"
                  style={
                    /* Créneau libre : contour seul, pour que la grille reste
                       aérée et que le créneau retenu ressorte vraiment. */
                    active
                      ? controlSurface(ctx.theme, { active: true })
                      : { ...outlineButton(ctx.theme), borderRadius: 'var(--b-radius)' }
                  }
                >
                  {s}
                </button>
              )
            })}
          </div>
        )}

        <button
          type="button"
          disabled={!slot}
          onClick={
            ctx.interactive && slot
              ? () => {
                  const [h, m] = slot.split(':').map(Number)
                  const d = new Date(day)
                  d.setHours(h, m, 0, 0)
                  ctx.onBook?.(d.toISOString())
                }
              : undefined
          }
          className="w-full py-3.5 text-sm font-bold transition-transform active:scale-[0.99] disabled:opacity-40"
          style={brandButton(ctx.theme)}
        >
          {slot ? `${block.ctaLabel} — ${DAY_SHORT[day.getDay()]} ${day.getDate()} à ${slot}` : 'Choisissez un créneau'}
        </button>
      </div>
    </Shell>
  )
}

/* ============================================================
   8. Avis & Témoignages
   ============================================================ */

function ReviewsRender({
  block,
  ctx,
}: {
  block: Extract<Block, { type: 'reviews' }>
  ctx: RenderCtx
}) {
  const [tab, setTab] = useState<'infos' | 'booking' | 'reviews'>('reviews')
  const allReviews = useClyde((s) => s.reviews)
  const createReview = useClyde((s) => s.createReview)
  const userId = useSession((s) => s.userId)
  const reportReview = useClyde((s) => s.reportReview)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  /* Les signalements déjà envoyés depuis cet écran. Le store empêche déjà le
     doublon d'un même compte, mais un visiteur anonyme peut signaler autant de
     fois qu'il clique : ce garde-fou évite qu'il le fasse sans le voir. */
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())

  function submitReport(reviewId: string) {
    if (!ctx.interactive || reportReason.trim().length === 0) return
    reportReview({ reviewId, reporterUserId: userId, reason: reportReason })
    setReportedIds((prev) => new Set(prev).add(reviewId))
    setReportingId(null)
    setReportReason('')
  }

  /* Ce bloc ne montre que de vrais avis du commerce. Les témoignages que le
     commerçant saisissait lui-même (`block.items`) ne sont plus affichés : une
     note écrite par le vendeur sur sa propre vitrine n'informe personne. Le
     champ reste dans le type pour ne pas effacer le travail déjà saisi, mais il
     ne trompe plus le visiteur. */
  const reviews = useMemo(
    () =>
      [...businessReviews(allReviews, ctx.business.id)].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
    [allReviews, ctx.business.id],
  )
  const avg = averageRating(reviews)

  function submit() {
    if (!ctx.interactive || rating < 1 || !name.trim()) return
    createReview({
      businessId: ctx.business.id,
      /* `null` : cet emplacement recueille l'avis sur le commerce. Les avis
         d'articles se déposent sur la page de l'article. */
      productId: null,
      authorUserId: userId,
      authorName: name,
      rating,
      body,
    })
    setFormOpen(false)
    setName('')
    setRating(0)
    setBody('')
  }

  const content = (
    <div className="flex flex-col gap-2.5">
      {reviews.length === 0 ? (
        /* Aucun avis : on le dit franchement plutôt que d'afficher un bloc vide
           que le visiteur croirait cassé — et on invite à être le premier. */
        <p className="py-2 text-[13px] leading-relaxed opacity-60">
          Aucun avis pour le moment. Soyez la première personne à donner le
          vôtre.
        </p>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="p-3.5 text-left" style={{ ...cardSurface(ctx.theme) }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold">{r.author_name}</p>
              <Stars value={r.rating} />
            </div>
            {r.body ? (
              <p className="mt-1.5 text-[13px] leading-relaxed opacity-70">{r.body}</p>
            ) : null}

            {/* Le signalement existe ici aussi. Sans lui, un avis diffamatoire
                sur le commerce ne pouvait être porté à l'arbitrage depuis la
                page — seuls les avis d'articles l'étaient. */}
            <div className="mt-2 flex items-center justify-between gap-2">
              {r.moderation === 'signale' ? (
                <p className="text-[11px] opacity-60">
                  Signalé — en cours d&apos;examen par l&apos;équipe CLYDE.
                </p>
              ) : (
                <span />
              )}
              {reportedIds.has(r.id) ? (
                <span className="text-[11px] opacity-50">Signalement envoyé</span>
              ) : (
                <button
                  type="button"
                  onClick={ctx.interactive ? () => setReportingId(r.id) : undefined}
                  className="shrink-0 text-[11px] font-semibold opacity-60 underline-offset-4 hover:underline"
                >
                  Signaler
                </button>
              )}
            </div>

            {reportingId === r.id ? (
              <div className="mt-2.5 flex flex-col gap-2">
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={2}
                  placeholder="Qu'est-ce qui pose problème dans cet avis ?"
                  className="w-full resize-none bg-transparent px-3 py-2 text-[13px] outline-none"
                  style={{
                    borderRadius: 'calc(var(--b-radius) * 0.6)',
                    background: insetFill(ctx.theme),
                    color: 'var(--p-ink)',
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    /* Fermé jusqu'au motif : l'équipe ne peut rien juger sur un
                       signalement muet. */
                    disabled={reportReason.trim().length === 0}
                    onClick={() => submitReport(r.id)}
                    className="px-3 py-1.5 text-[12px] font-bold disabled:opacity-40"
                    style={brandButton(ctx.theme)}
                  >
                    Envoyer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportingId(null)
                      setReportReason('')
                    }}
                    className="text-[12px] font-semibold opacity-60 underline-offset-4 hover:underline"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))
      )}

      {formOpen ? (
        <div className="flex flex-col gap-2.5 p-3.5" style={{ ...cardSurface(ctx.theme) }}>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                onClick={ctx.interactive ? () => setRating(n) : undefined}
                className="p-0.5"
              >
                <Star
                  className="size-5"
                  style={{ color: 'var(--p-brand)' }}
                  fill={n <= rating ? 'currentColor' : 'none'}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
            className="w-full bg-transparent px-3 py-2 text-[13px] outline-none"
            style={{
              borderRadius: 'calc(var(--b-radius) * 0.6)',
              background: insetFill(ctx.theme),
              color: 'var(--p-ink)',
            }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Votre expérience (facultatif)"
            className="w-full resize-none bg-transparent px-3 py-2 text-[13px] outline-none"
            style={{
              borderRadius: 'calc(var(--b-radius) * 0.6)',
              background: insetFill(ctx.theme),
              color: 'var(--p-ink)',
            }}
          />
          <button
            type="button"
            disabled={rating < 1 || !name.trim()}
            onClick={submit}
            className="w-full py-2.5 text-[13px] font-bold disabled:opacity-40"
            style={brandButton(ctx.theme)}
          >
            Publier mon avis
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={ctx.interactive ? () => setFormOpen(true) : undefined}
          className="self-start text-[13px] font-semibold underline-offset-4 hover:underline"
          style={{ color: 'var(--p-brand)' }}
        >
          Donner mon avis
        </button>
      )}
    </div>
  )

  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <BlockTitle>{block.title}</BlockTitle>
          {/* La note n'apparaît qu'une fois un avis déposé : « 0,0 » sur une
              vitrine neuve donnerait à croire à un commerce mal noté. */}
          {avg !== null ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold">
              <Stars value={avg} size={14} />
              {avg.toFixed(1)}
              <span className="font-normal opacity-60">({reviews.length})</span>
            </span>
          ) : null}
        </div>

        {block.withTabs ? (
          <div className="flex flex-col gap-3">
            <div
              className="flex gap-1 p-1"
              style={{
                borderRadius: 'var(--b-radius)',
                background: insetFill(ctx.theme),
              }}
            >
              {(
                [
                  ['infos', 'Infos'],
                  ['booking', 'Réservation'],
                  ['reviews', 'Avis'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={ctx.interactive ? () => setTab(id) : undefined}
                  className="flex-1 py-2 text-[12px] font-semibold"
                  style={
                    /* Onglet au repos : transparent, la piste creusée derrière
                       lui sert déjà de fond. */
                    tab === id
                      ? controlSurface(ctx.theme, {
                          radius: 'calc(var(--b-radius) * 0.6)',
                          active: true,
                        })
                      : {
                          borderRadius: 'calc(var(--b-radius) * 0.6)',
                          background: 'transparent',
                          color: 'var(--p-ink)',
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'reviews' && content}
            {tab === 'infos' && (
              <p className="text-[13px] leading-relaxed opacity-70">
                {ctx.business.description ?? 'Présentation à compléter.'}
              </p>
            )}
            {tab === 'booking' && (
              <p className="text-[13px] leading-relaxed opacity-70">
                Utilisez le bloc Réservation de la page pour choisir un créneau.
              </p>
            )}
          </div>
        ) : (
          content
        )}
      </div>
    </Shell>
  )
}

/* ============================================================
   9. FAQ
   ============================================================ */

function FaqRender({ block, ctx }: { block: Extract<Block, { type: 'faq' }>; ctx: RenderCtx }) {
  const [open, setOpen] = useState<string | null>(block.items[0]?.id ?? null)
  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-4">
        <BlockTitle>{block.title}</BlockTitle>
        <div className="flex flex-col gap-2">
          {block.items.map((it) => {
            const isOpen = open === it.id
            return (
              <div
                key={it.id}
                style={{
                  ...cardSurface(ctx.theme),
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : it.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
                >
                  <span className="text-[13px] font-semibold">{it.q}</span>
                  <ChevronDown
                    size={16}
                    className="shrink-0 opacity-50 transition-transform"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                {isOpen && (
                  <p className="px-3.5 pb-3.5 text-[13px] leading-relaxed opacity-70">{it.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}

/* ============================================================
   10. Horaires & Localisation
   ============================================================ */

function HoursRender({
  block,
  ctx,
}: {
  block: Extract<Block, { type: 'hours_location' }>
  ctx: RenderCtx
}) {
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(block.mapQuery || block.address)}&output=embed`
  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-4">
        <BlockTitle>{block.title}</BlockTitle>
        <div className="grid gap-4 @lg:grid-cols-2">
          <div className="overflow-hidden" style={frameSurface(ctx.theme)}>
            <div className="flex items-start gap-2 p-3.5">
              <MapPin size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--p-brand)' }} />
              <p className="text-[13px] leading-snug font-medium">{block.address}</p>
            </div>
            <div style={{ borderTop: `1px solid ${tint(ctx.theme.ink, 0.08)}` }}>
              {block.hours.map((h, i) => (
                <div
                  key={h.day}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[12px]"
                  style={{
                    borderTop: i ? `1px solid ${tint(ctx.theme.ink, 0.06)}` : undefined,
                  }}
                >
                  <span className="font-medium opacity-70">{h.day}</span>
                  <span className="font-semibold tabular-nums">{h.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="min-h-[200px] overflow-hidden"
            style={frameSurface(ctx.theme)}
          >
            <iframe
              title={`Carte — ${block.address}`}
              src={mapSrc}
              className="h-full min-h-[200px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </Shell>
  )
}

/* ============================================================
   11. Vidéo
   ============================================================ */

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? m[1] : null
}

/* Une URL de fichier vidéo direct (téléversée via l'éditeur ou collée) se lit
   dans un <video> natif — le bloc n'est plus limité à YouTube. */
function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url) || url.includes('blob.vercel-storage.com')
}

function VideoRender({ block, ctx }: { block: Extract<Block, { type: 'video' }>; ctx: RenderCtx }) {
  const id = youtubeId(block.url)
  const direct = !id && block.url ? isDirectVideo(block.url) : false
  /* Même règle que la galerie : pas de lien vidéo valide, pas de bloc sur la
     page publique. Un cadre vide portant une consigne de configuration
     décrédibilise la vitrine aux yeux du client. */
  if (!id && !direct && ctx.interactive) return null
  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-3">
        {block.title && <BlockTitle>{block.title}</BlockTitle>}
        <div
          className="relative aspect-video w-full overflow-hidden"
          style={{ ...frameSurface(ctx.theme), background: insetFill(ctx.theme) }}
        >
          {id ? (
            <iframe
              title={block.title || 'Vidéo'}
              src={`https://www.youtube.com/embed/${id}`}
              allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : direct ? (
            <video
              src={block.url}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-50">
              <span
                className="flex size-12 items-center justify-center rounded-full"
                style={{ background: tint(ctx.theme.brand, 0.2), color: 'var(--p-brand)' }}
              >
                <Play size={20} className="fill-current" />
              </span>
              <p className="text-[12px] font-medium">Téléversez une vidéo ou collez un lien YouTube dans les réglages</p>
            </div>
          )}
        </div>
        {block.caption && <p className="text-[12px] opacity-55">{block.caption}</p>}
      </div>
    </Shell>
  )
}

/* ============================================================
   12. Contact / CTA final
   ============================================================ */

function ContactRender({
  block,
  ctx,
}: {
  block: Extract<Block, { type: 'contact' }>
  ctx: RenderCtx
}) {
  return (
    <Shell block={block} ctx={ctx}>
      <div
        className="flex flex-col items-center gap-3 p-6 text-center"
        style={{
          /* Le fond teinté marque reste la signature de ce bloc ; seul le
             contour suit la matière, sinon le contour marqué s'arrêtait net
             au dernier bloc de la page. */
          ...(surfaceOf(ctx.theme) === 'cartoon'
            ? frameSurface(ctx.theme)
            : {
                borderRadius: 'var(--b-radius)',
                border: `1px solid ${tint(ctx.theme.brand, 0.25)}`,
              }),
          background: tint(ctx.theme.brand, 0.1),
        }}
      >
        <BlockTitle>{block.title}</BlockTitle>
        {block.description && (
          <p className="max-w-md text-pretty text-[13px] leading-relaxed opacity-65">
            {block.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={ctx.interactive ? ctx.onContact : undefined}
            className="px-5 py-3 text-sm font-bold"
            style={brandButton(ctx.theme)}
          >
            {block.ctaLabel}
          </button>
          {block.phone && (
            <a
              href={`tel:${block.phone}`}
              className="inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold"
              style={outlineButton(ctx.theme)}
            >
              <Phone size={14} /> {block.phone}
            </a>
          )}
          {block.email && (
            <a
              href={`mailto:${block.email}`}
              className="inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold"
              style={outlineButton(ctx.theme)}
            >
              <Mail size={14} /> Email
            </a>
          )}
        </div>
        {block.socials.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            {block.socials.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-semibold underline decoration-1 underline-offset-2 opacity-65"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

function IdentityMediaRender({ block, ctx }: { block: Extract<Block, { type: 'identity_media' }>; ctx: RenderCtx }) {
  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col items-center gap-2.5 text-center">
        {block.showLogo && (
          <div className="size-20 overflow-hidden rounded-3xl border-4 bg-background shadow-lg" style={{ borderColor: `${ctx.theme.brand}55` }}>
            {ctx.business.logo_url ? <img src={ctx.business.logo_url} alt={`Logo ${ctx.business.name}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold" style={{ color: ctx.theme.brand }}>{ctx.business.name.charAt(0)}</div>}
          </div>
        )}
        {block.showProfile && <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: ctx.theme.brand }}>{ctx.business.category.replaceAll('_', ' ')}</p>}
        <h2 className="text-balance text-2xl font-bold">{block.title}</h2>
        <p className="max-w-md text-sm leading-relaxed opacity-70">{block.subtitle}</p>
      </div>
    </Shell>
  )
}

function ImageGalleryRender({ block, ctx }: { block: Extract<Block, { type: 'image_gallery' }>; ctx: RenderCtx }) {
  if (!block.images.length) {
    /* Sur la page publique, une galerie vide ne s'affiche pas du tout : la
       consigne « Ajoutez des photos depuis le builder » est adressée au
       commerçant, jamais à son client. Dans l'éditeur (interactive === false)
       on garde le bloc visible pour qu'il reste sélectionnable. */
    if (ctx.interactive) return null
    return (
      <Shell block={block} ctx={ctx}>
        <div
          className="flex flex-col items-center gap-2 px-5 py-8 text-center"
          style={{ borderRadius: 'var(--b-radius)', background: insetFill(ctx.theme) }}
        >
          <Images className="size-6 opacity-35" aria-hidden="true" />
          <BlockTitle>{block.title}</BlockTitle>
          <p className="text-[13px] opacity-60">Ajoutez des photos depuis le constructeur de page.</p>
        </div>
      </Shell>
    )
  }
  return (
    <Shell block={block} ctx={ctx}>
      <div className="flex flex-col gap-3">
        <BlockTitle>{block.title}</BlockTitle>
        <div className={cn('grid gap-2', block.columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {block.images.map((url) => (
            <img
              key={url}
              src={url}
              alt="Photo de la boutique"
              className="aspect-square w-full object-cover"
              style={{ borderRadius: 'calc(var(--b-radius) * 0.8)' }}
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </Shell>
  )
}

const NAV_ICONS = { home: Home, calendar: CalendarDays, search: Search, grid: Grid2X2, plus: Plus }

/**
 * Navigation basse — barre flottante d'application, avec action centrale
 * surélevée. Le positionnement collant est posé par le conteneur de rendu :
 * la barre reste donc visible pendant tout le défilement de la page.
 */
function BottomNavRender({ block, ctx }: { block: Extract<Block, { type: 'bottom_nav' }>; ctx: RenderCtx }) {
  if (block.showOn === 'mobile' && ctx.device !== 'mobile') return null
  const dark = isDark(ctx.theme.background)
  const barBg = dark ? lighten(ctx.theme.background, 0.1) : ctx.theme.background
  const navStyle = block.navStyle ?? 'floating'

  /* Une barre de navigation basse cesse d'être lisible au-delà de cinq
     entrées sur un téléphone : chaque cible passerait sous les 44 px
     recommandés et les libellés seraient rognés. On plafonne donc le rendu,
     quel que soit le nombre d'entrées saisies par le commerçant. */
  const items = block.items.slice(0, 5)
  if (items.length === 0) return null

  /* L'onglet actif est l'accueil (page unique : c'est la section d'arrivée).
     À défaut d'icône « maison », la première entrée fait office d'actif. */
  const homeIndex = items.findIndex((it) => it.icon === 'home')
  const activeIndex = homeIndex >= 0 ? homeIndex : 0

  /* Voile dégradé sous les barres flottantes : le contenu qui défile passe
     derrière sans jamais sembler traverser la barre. */
  const scrim = `linear-gradient(to top, ${ctx.theme.background} 55%, ${ctx.theme.background}00)`

  /* ---- `dark-pill` : pilule sombre compacte (inspirée des apps food) ---- */
  if (navStyle === 'dark-pill') {
    /* Fond volontairement opaque : un noir translucide laissait lire le texte
       de la page à travers la barre. */
    const pillBg = '#111214'
    return (
      <div
        className="pointer-events-none px-3 pt-12 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{ backgroundImage: scrim }}
      >
        <nav
          aria-label="Navigation de la page"
          className="pointer-events-auto mx-auto flex w-full max-w-sm items-stretch gap-0.5 rounded-full p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]"
          style={{ background: pillBg }}
        >
          {items.map((item, i) => {
            const Icon = NAV_ICONS[item.icon]
            const active = i === activeIndex
            return (
              <a
                key={item.id}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'true' : undefined}
                /* `flex-1 basis-0 min-w-0` : toutes les entrées se partagent la
                   largeur à égalité et la barre ne peut jamais déborder. */
                className="flex min-h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 transition-transform active:scale-95"
                style={active ? { background: ctx.theme.brand, color: readableOn(ctx.theme.brand) } : { color: '#FFFFFFA6' }}
              >
                {/* `shrink-0` : sans lui, le flex écrasait les icônes en
                    quelques pixels de large — elles devenaient illisibles. */}
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="max-w-full truncate text-[10px] font-semibold tracking-tight">{item.label}</span>
              </a>
            )
          })}
        </nav>
      </div>
    )
  }

  /* ---- `docked` : barre pleine largeur collée au bord ---- */
  if (navStyle === 'docked') {
    return (
      <nav
        aria-label="Navigation de la page"
        className="flex items-stretch border-t px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        style={{ background: barBg, borderColor: `${ctx.theme.ink}14` }}
      >
        {items.map((item, i) => {
          const Icon = NAV_ICONS[item.icon]
          const primary = item.icon === 'plus'
          const active = i === activeIndex
          return (
            <a
              key={item.id}
              href={item.href}
              aria-current={active ? 'true' : undefined}
              className="flex min-h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 transition-opacity"
              style={{
                color: primary || active ? ctx.theme.brand : ctx.theme.ink,
                opacity: primary || active ? 1 : 0.6,
              }}
            >
              <Icon className="size-[19px] shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate text-[10px] font-semibold tracking-tight">{item.label}</span>
            </a>
          )
        })}
      </nav>
    )
  }

  /* ---- `minimal` : pilule flottante, icônes seules ---- */
  if (navStyle === 'minimal') {
    return (
      <div
        className="pointer-events-none px-4 pt-12 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        style={{ backgroundImage: scrim }}
      >
        <nav
          aria-label="Navigation de la page"
          className="pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-1 rounded-full border p-1.5 shadow-[0_14px_32px_-16px_rgba(0,0,0,0.4)]"
          style={{ background: barBg, borderColor: `${ctx.theme.ink}16` }}
        >
          {items.map((item, i) => {
            const Icon = NAV_ICONS[item.icon]
            const primary = item.icon === 'plus'
            const active = i === activeIndex
            /* Cibles portées à 44 px : c'est le minimum recommandé pour un
               appui au pouce, l'ancienne version tombait à 40 px. */
            return (
              <a
                key={item.id}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'true' : undefined}
                className="flex size-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
                style={
                  primary
                    ? { background: ctx.theme.brand, color: readableOn(ctx.theme.brand) }
                    : active
                      ? { background: `${ctx.theme.ink}12`, color: ctx.theme.ink }
                      : { color: ctx.theme.ink, opacity: 0.6 }
                }
              >
                <Icon className="size-[19px] shrink-0" aria-hidden="true" />
              </a>
            )
          })}
        </nav>
      </div>
    )
  }

  /* ---- `floating` (défaut) : barre flottante, action centrale surélevée ---- */
  return (
    <div
      className="pointer-events-none px-3 pt-14 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      style={{ backgroundImage: scrim }}
    >
      <nav
        aria-label="Navigation de la page"
        className="pointer-events-auto mx-auto flex w-full max-w-md items-stretch gap-0.5 rounded-[1.75rem] border px-1.5 pt-2 pb-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]"
        style={{ background: barBg, borderColor: `${ctx.theme.ink}16` }}
      >
        {items.map((item, i) => {
          const Icon = NAV_ICONS[item.icon]
          const primary = item.icon === 'plus'
          const active = i === activeIndex
          if (primary) {
            return (
              <a
                key={item.id}
                href={item.href}
                aria-label={item.label}
                className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-0.5"
              >
                {/* Le bouton surélevé garde sa marge négative, mais le voile
                    au-dessus (`pt-14`) lui laisse la place de dépasser sans
                    jamais sortir du cadre du téléphone. */}
                <span
                  className="-mt-7 flex size-12 shrink-0 items-center justify-center rounded-[1.25rem] shadow-lg transition-transform active:scale-95"
                  style={{
                    background: ctx.theme.brand,
                    color: readableOn(ctx.theme.brand),
                    border: `3px solid ${barBg}`,
                  }}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                </span>
                <span
                  className="max-w-full truncate text-[10px] font-bold tracking-tight"
                  style={{ color: ctx.theme.brand }}
                >
                  {item.label}
                </span>
              </a>
            )
          }
          return (
            <a
              key={item.id}
              href={item.href}
              aria-current={active ? 'true' : undefined}
              className="flex min-h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 transition-opacity"
              style={{ color: active ? ctx.theme.brand : ctx.theme.ink, opacity: active ? 1 : 0.6 }}
            >
              <Icon className="size-[19px] shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate text-[10px] font-semibold tracking-tight">{item.label}</span>
            </a>
          )
        })}
      </nav>
    </div>
  )
}

/* ============================================================
   Dispatcher
   ============================================================ */

export function BlockRender({ block, ctx }: { block: Block; ctx: RenderCtx }) {
  if (block.hidden) return null
  switch (block.type) {
    case 'hero':
      return <HeroRender block={block} ctx={ctx} />
    case 'search':
      return <SearchRender block={block} ctx={ctx} />
    case 'categories':
      return <CategoriesRender block={block} ctx={ctx} />
    case 'catalogue':
      return <CatalogueRender block={block} ctx={ctx} />
    case 'carousel':
      return <CarouselRender block={block} ctx={ctx} />
    case 'promo':
      return <PromoRender block={block} ctx={ctx} />
    case 'booking':
      return <BookingRender block={block} ctx={ctx} />
    case 'reviews':
      return <ReviewsRender block={block} ctx={ctx} />
    case 'faq':
      return <FaqRender block={block} ctx={ctx} />
    case 'hours_location':
      return <HoursRender block={block} ctx={ctx} />
    case 'video':
      return <VideoRender block={block} ctx={ctx} />
    case 'contact':
      return <ContactRender block={block} ctx={ctx} />
    case 'identity_media':
      return <IdentityMediaRender block={block} ctx={ctx} />
    case 'image_gallery':
      return <ImageGalleryRender block={block} ctx={ctx} />
    case 'bottom_nav':
      return <BottomNavRender block={block} ctx={ctx} />
    default:
      return null
  }
}
