'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CreditCard,
  ExternalLink,
  Gift,
  GraduationCap,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  PlusCircle,
  QrCode,
  ScrollText,
  ShoppingBag,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  PenLine,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Backdrop, type BackdropPattern } from '@/components/clyde/backdrop'
import { ClydeWordmark } from '@/components/clyde/mark'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { useClyde, useSession } from '@/lib/clyde/store'
import { vendorNotifications } from '@/lib/clyde/notifications'
import { NotificationsBell } from '@/components/clyde/notifications-bell'
import { cn } from '@/lib/utils'
import { DashboardMobileNav } from './mobile-nav'
import { useOwnerContext } from './use-owner'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutGrid
  /** Masqué quand le module correspondant est désactivé. */
  visible?: boolean
}

/* Un motif de fond par section, dérivé du chemin plutôt que passé par chaque
   page : le shell est commun, la table reste donc le seul endroit à tenir à
   jour quand une section s'ajoute. Le choix suit ce que la section fait —
   on compte, on range, on dessine, on arbitre. */
const SECTION_PATTERNS: { prefix: string; pattern: BackdropPattern }[] = [
  /* Les préfixes les plus longs d'abord : `/tableau-de-bord` matcherait
     sinon toutes ses sous-pages avant elles. */
  { prefix: '/tableau-de-bord/catalogue', pattern: 'perforated' },
  { prefix: '/tableau-de-bord/page', pattern: 'blueprint' },
  { prefix: '/tableau-de-bord/commandes', pattern: 'ledger' },
  { prefix: '/tableau-de-bord/emplacements', pattern: 'perforated' },
  { prefix: '/tableau-de-bord/reservations', pattern: 'ruled' },
  { prefix: '/tableau-de-bord/analytics', pattern: 'gauge' },
  { prefix: '/tableau-de-bord/modules', pattern: 'louver' },
  { prefix: '/tableau-de-bord/abonnement', pattern: 'cartouche' },
  /* Accueil du tableau de bord : les instruments, comme l'analytics. */
  { prefix: '/tableau-de-bord', pattern: 'gauge' },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const signOut = useSession((s) => s.signOut)
  const role = useSession((s) => s.role)
  const { ready, userId, demoMode, business, page, owned, quota, catalogWord, locationWordPlural } =
    useOwnerContext()
  const setActiveBusiness = useSession((s) => s.setActiveBusiness)
  const t = useT()
  const { locale } = useLocale()
  const [mobileOpen, setMobileOpen] = useState(false)

  /* Le gabarit est monté par le layout commun à toutes les pages du tableau de
     bord, donc une page ne peut pas lui passer de propriété : on reconnaît
     l'éditeur à sa route. */
  const isEditor = pathname === '/tableau-de-bord/page'

  /* Redirections : pas de session → connexion ; session sans commerce →
     onboarding. On attend la réhydratation pour ne pas rediriger à tort.

     Les deux cas s'excluent par un `return` et non par un `else if` : sans
     session, `business` est également `null`, si bien que les deux branches
     s'armaient dans la même passe et que `/onboarding` écrasait `/connexion`.
     Un visiteur non connecté atterrissait sur l'onboarding au lieu de la page
     de connexion. */
  useEffect(() => {
    if (!ready) return
    if (!userId && !demoMode) {
      router.replace('/connexion')
      return
    }
    if (!business) router.replace('/onboarding')
  }, [ready, userId, demoMode, business, router])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  /* Matière première des notifications. Les hooks se lisent AVANT la garde
     de chargement qui suit — un retour anticipé entre deux rendus changerait
     le nombre de hooks appelés, ce que React interdit. */
  const allOrders = useClyde((s) => s.orders)
  const allBookings = useClyde((s) => s.bookings)
  const allReviews = useClyde((s) => s.reviews)
  const allProducts = useClyde((s) => s.products)
  const allFollowers = useClyde((s) => s.followers)
  const allUsers = useClyde((s) => s.users)

  /* En mode démo (aucune session), le tableau de bord s'ouvre sur le
     commerce de démonstration : sans le `|| demoMode`, la garde bloquait
     sur le spinner alors que la redirection, elle, acceptait la démo. */
  if (!ready || (!userId && !demoMode) || !business) {
    return (
      <div className="grid min-h-dvh place-items-center bg-secondary/30">
        <Loader2
          className="size-5 animate-spin text-muted-foreground"
          aria-label={t.dashboard.common.loading}
        />
      </div>
    )
  }

  const sectionPattern: BackdropPattern =
    SECTION_PATTERNS.find((s) => pathname.startsWith(s.prefix))?.pattern ??
    'gauge'

  /* Dérivées à chaque rendu, jamais stockées : une commande confirmée sort
     de la cloche d'elle-même, sans « marquer comme lu ». */
  const notifications = vendorNotifications({
    businessId: business.id,
    orders: allOrders,
    bookings: allBookings,
    reviews: allReviews,
    products: allProducts,
    followers: allFollowers,
    users: allUsers,
  })

  const items: NavItem[] = [
    { href: '/tableau-de-bord', label: t.dashboard.nav.home, icon: LayoutGrid },
    { href: '/tableau-de-bord/catalogue', label: catalogWord, icon: ShoppingBag },
    {
      href: '/tableau-de-bord/page',
      label: locale === 'fr' ? 'Éditer ma page' : 'Edit my page',
      icon: PenLine,
    },
    {
      href: '/tableau-de-bord/commandes',
      label: t.dashboard.nav.orders,
      icon: ScrollText,
    },
    {
      href: '/tableau-de-bord/emplacements',
      /* Pluriel fourni par le dictionnaire métier. */
      label: `${locationWordPlural} ${t.dashboard.nav.qrSuffix}`,
      icon: QrCode,
      visible: business.module_locations,
    },
    {
      href: '/tableau-de-bord/reservations',
      label: t.dashboard.nav.bookings,
      icon: CalendarClock,
      visible: business.module_booking,
    },
    {
      href: '/tableau-de-bord/analytics',
      label: t.dashboard.nav.analytics,
      icon: BarChart3,
    },
    {
      href: '/tableau-de-bord/modules',
      label: t.dashboard.nav.modules,
      icon: SlidersHorizontal,
    },
    {
      href: '/tableau-de-bord/abonnement',
      label: t.dashboard.nav.subscription,
      icon: CreditCard,
    },
    /* Formation et Boutique : ces deux pages publiques concernent d'abord le
       commerçant — apprendre à mieux vendre, commander les goodies de sa
       page — mais elles n'étaient joignables que depuis l'accueil public. Un
       commerçant vit dans son tableau de bord : c'est ici que ces liens
       doivent l'attendre. */
    {
      href: '/formation',
      label: t.nav.links.formation,
      icon: GraduationCap,
    },
    {
      href: '/goodies',
      label: t.nav.links.goodies,
      icon: Gift,
    },
    {
      href: '/admin',
      label: locale === 'fr' ? 'Administration' : 'Administration',
      icon: ShieldCheck,
      /* Visible aussi en démo : on veut pouvoir explorer toutes les
         fonctionnalités, y compris la console d'administration. */
      visible: role === 'admin' || demoMode,
    },
  ].filter((i) => i.visible !== false)

  const nav = (
    <nav className="flex flex-col gap-1" aria-label={t.dashboard.common.navLabel}>
      {items.map((item) => {
        /* Accueil ne doit pas rester actif sur les sous-pages. */
        const active =
          item.href === '/tableau-de-bord'
            ? pathname === item.href
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-brand text-brand-foreground'
                : 'text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const identity = (
    <div className="flex items-center gap-3">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-sm font-bold text-brand-foreground"
        aria-hidden="true"
      >
        {business.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {business.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          clyde.app/r/{business.slug}
        </span>
      </span>
      {/* La cloche vit à côté de l'identité — l'emplacement où le texte
          « notifications » s'affichait sans être cliquable. `align="left"` :
          dans la barre latérale gauche, un panneau aligné à droite sortirait
      de l'écran. */}
      <NotificationsBell notifications={notifications} align="left" />
    </div>
  )

  /* Sélecteur de pages : un compte peut posséder plusieurs pages selon son
     abonnement, mais AUCUN moyen de passer de l'une à l'autre n'existait —
     le tableau de bord restait verrouillé sur la première. Le commutateur
     vit sous l'identité, dans les deux menus (bureau et mobile). */
  const switcher = (owned.length > 1 || !quota.reached) && (
    <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
      {owned.length > 1 && (
        <>
          <p className="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {locale === 'fr' ? 'Mes pages' : 'My pages'}
          </p>
          {owned.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setActiveBusiness(b.id)
                /* En mobile, la bascule garde la même route : l'effet qui
                   ferme le tiroir au changement de page ne se déclenche pas.
                   Sans cette fermeture, le tiroir masquait le tableau de
                   bord de la page qu'on vient de choisir. */
                setMobileOpen(false)
              }}
              aria-current={b.id === business.id ? 'true' : undefined}
              className={cn(
                'flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                b.id === business.id
                  ? 'bg-brand/10 font-semibold text-brand'
                  : 'text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground',
              )}
            >
              <Store className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{b.name}</span>
              {b.id === business.id && (
                <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              )}
            </button>
          ))}
        </>
      )}
      {!quota.reached && (
        <Link
          href="/onboarding"
          className="flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <PlusCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {locale === 'fr' ? 'Créer une nouvelle page' : 'Create a new page'}
        </Link>
      )}
    </div>
  )

  return (
    <div className="relative min-h-dvh bg-secondary/30">
      <Backdrop pattern={sectionPattern} />
      {/* Barre latérale — desktop */}
      {/* `z-20` : le <main> qui suit porte `relative z-10` et s'étend sur toute
          la largeur (son retrait gauche est un simple padding, qui appartient
          toujours à sa zone de clic). Sans z-index, cette barre fixe passait
          SOUS le main : aucun lien du menu ne recevait ni clic ni molette. */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-background px-4 py-6 lg:flex">
        {/* Le monogramme, et non un « CLYDE » en texte nu : la barre latérale
            était le seul endroit où la marque perdait sa marque. */}
        <Link href="/" className="px-2">
          <ClydeWordmark accent="bg-brand" className="text-lg" />
        </Link>

        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-3">
          {identity}
          <span
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
              page?.published
                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-500/14 text-amber-700 dark:text-amber-500',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                page?.published ? 'bg-emerald-500' : 'bg-amber-500',
              )}
              aria-hidden="true"
            />
            {page?.published
              ? t.dashboard.common.online
              : t.dashboard.common.draft}
          </span>
          {switcher}
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">{nav}</div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            nativeButton={false}
            render={<Link href={`/r/${business.slug}`} target="_blank" />}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t.dashboard.common.viewPage}
          </Button>
          {/* Retour au site public en toutes lettres : le logo cliquable en
              haut fait déjà ce trajet, mais rien ne dit qu'il est cliquable.
              Quelqu'un qui veut relire l'accueil — tarifs, FAQ — doit voir le
              chemin écrit, pas le deviner. */}
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <Home className="size-4" aria-hidden="true" />
            {t.nav.backHomeLong}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            onClick={() => {
              signOut()
              router.push('/')
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t.dashboard.common.signOut}
          </Button>
        </div>
      </aside>

      {/* Barre supérieure — mobile */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={t.dashboard.common.openMenu}
              />
            }
          >
            <Menu className="size-4" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 px-4 py-6">
            {/* Le libellé « CLYDE » reste dans le titre : le monogramme est
                décoratif, il ne doit pas priver le lecteur d'écran du nom. */}
            <SheetTitle className="px-2 text-lg">
              <ClydeWordmark accent="bg-brand" className="text-lg" />
            </SheetTitle>
            <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-3">
              {identity}
              {/* Le même commutateur de pages que sur ordinateur : celui qui
                  gère plusieurs pages depuis son téléphone en a autant
                  besoin. */}
              {switcher}
            </div>
            <div className="mt-5">{nav}</div>
            <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                nativeButton={false}
                render={<Link href={`/r/${business.slug}`} target="_blank" />}
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                {t.dashboard.common.viewPage}
              </Button>
              {/* Même sortie que dans la barre latérale de bureau : les deux
                  menus doivent offrir les mêmes chemins. */}
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground"
                nativeButton={false}
                render={<Link href="/" />}
              >
                <Home className="size-4" aria-hidden="true" />
                {t.nav.backHomeLong}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-muted-foreground"
                onClick={() => {
                  signOut()
                  router.push('/')
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                {t.dashboard.common.signOut}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Store className="size-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="truncate text-sm font-semibold">{business.name}</span>
        </span>
        {/* Sur mobile la barre latérale n'existe pas : la cloche vit dans la
            barre du haut, toujours visible. */}
        <NotificationsBell notifications={notifications} />
      </header>

      {/* `relative z-10` : le fond est peint au-dessus du fond du conteneur,
          le contenu doit donc repasser devant. */}
      <main className="relative z-10 pb-24 lg:pb-0 lg:pl-64">
        <div
          className={cn(
            'mx-auto px-4 py-8 md:px-8 md:py-10',
            /* `max-w-5xl` borne la largeur de lecture : sur une page de
               formulaires ou de listes, des lignes plus longues fatiguent l'œil.

               L'éditeur est la seule exception, parce qu'il ne se lit pas, il se
               manipule : il aligne structure, aperçu et réglages côte à côte. Le
               plafond de 1024px maintenait sa grille à 896px quelle que soit la
               taille de l'écran, si bien que la colonne des réglages n'avait
               jamais la place de s'installer et retombait sous l'aperçu, à plus
               de 1000px de haut. */
            isEditor ? 'max-w-[1700px]' : 'max-w-5xl',
          )}
        >
          {children}
        </div>
      </main>
      <DashboardMobileNav pathname={pathname} />
    </div>
  )
}

/** En-tête de section : titre, sous-titre explicatif et actions à droite. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  )
}

/**
 * Chiffre clé, avec sa variation éventuelle.
 *
 * Partagé par l'accueil et les analytics : les deux écrans affichent les mêmes
 * indicateurs, ils doivent les présenter à l'identique.
 */
export function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  href,
}: {
  icon: typeof LayoutGrid
  label: string
  value: string
  /** Variation en % sur la période précédente. `null` = incomparable. */
  delta?: number | null
  /** Précision affichée à la place de la variation. */
  hint?: string
  /**
   * Destination du détail : la carte entière devient cliquable. « Abonnés »
   * mène à la liste des abonnés, « Visites » aux analytics — le chiffre seul
   * frustrait, on voyait le total sans jamais pouvoir savoir qui ou quoi.
   */
  href?: string
}) {
  const t = useT()
  const positive = typeof delta === 'number' && delta > 0
  const negative = typeof delta === 'number' && delta < 0

  const content = (
    <>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
        {href ? (
          <ArrowUpRight
            className="ml-auto size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {typeof delta === 'number' ? (
        <p
          className={cn(
            'mt-1.5 flex items-center gap-1 text-xs font-medium',
            positive && 'text-emerald-600 dark:text-emerald-400',
            negative && 'text-red-600 dark:text-red-400',
            !positive && !negative && 'text-muted-foreground',
          )}
        >
          {positive && <TrendingUp className="size-3.5" aria-hidden="true" />}
          {negative && <TrendingDown className="size-3.5" aria-hidden="true" />}
          {delta > 0 ? '+' : ''}
          {delta} % {t.dashboard.common.vsPrevious}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-2xl border border-border bg-background p-5 transition-colors hover:border-brand/40"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      {content}
    </div>
  )
}

/**
 * État vide : on explique toujours quoi faire ensuite plutôt que d'afficher
 * un cadre vide sans issue.
 */
export function EmptyState({
  icon: Icon = LayoutGrid,
  title,
  description,
  action,
}: {
  icon?: typeof LayoutGrid
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-background px-6 py-14 text-center">
      <span
        className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand"
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
