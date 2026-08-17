'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, Gift, Heart, Home, LayoutGrid, LogOut, Menu, Plus, Search, Tag, UserRound, X } from 'lucide-react'
import { ClydeWordmark } from '@/components/clyde/mark'
import { LocaleSwitch } from '@/components/clyde/locale-switch'
import { useT } from '@/lib/clyde/i18n'
import { useSession } from '@/lib/clyde/store'
import { cn } from '@/lib/utils'

/* Les deux variantes du menu du bas partagent exactement la même allure : on
   la déclare une fois pour éviter que l'une dérive de l'autre. */
/* `min-w-0 flex-1 basis-0` : les entrées se partagent la largeur à égalité et
   la barre ne peut jamais dépasser l'écran, quelle que soit la longueur des
   libellés traduits. `min-h-11` garantit la cible de 44 px recommandée. */
/* `active:scale-95` + transition courte : l'appui répond À L'INSTANT, avant
   même que la navigation ne démarre. Sans ce retour, le doigt attendait la
   nouvelle page dans le silence visuel — c'est cette absence de réponse qui
   faisait paraître « Créer » et « Explorer » lents ou cassés. */
const BOTTOM_ITEM =
  'flex min-h-11 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-center text-[10px] font-semibold tracking-tight text-muted-foreground transition-transform duration-75 hover:bg-secondary hover:text-foreground active:scale-95'
/* L'action centrale garde sa largeur fixe (elle est surélevée et ne doit pas
   se déformer), mais ne rétrécit jamais. */
const BOTTOM_PRIMARY =
  '-mt-8 flex h-20 w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-t-[2.75rem] rounded-b-[1.6rem] border-4 border-background bg-brand pt-2 text-[10px] font-bold tracking-tight text-brand-foreground shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] transition-transform duration-75 active:scale-95'

/**
 * Barre de navigation du site public.
 *
 * `variant` existe parce que les liens de l'accueil sont des ancres : sur
 * l'annuaire, « Le builder » ou « Tarifs » ne mènent nulle part et le clic
 * reste sans effet. En variante « marketplace » la barre propose donc un
 * retour à l'accueil et les repères utiles au visiteur.
 */
export function LandingNav({
  variant = 'landing',
}: {
  variant?: 'landing' | 'marketplace'
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const userId = useSession((s) => s.userId)
  const role = useSession((s) => s.role)
  const signOut = useSession((s) => s.signOut)
  const onMarketplace = variant === 'marketplace'
  /* Menu du compte : « Mon espace » n'était qu'un lien, si bien qu'un visiteur
     connecté n'avait AUCUN moyen de quitter son compte hors du tableau de bord
     commerçant — impossible de revenir se connecter sur un autre compte. */
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement | null>(null)

  /* La même barre sert l'accueil ET toutes les pages annexes (aide, contact,
     confidentialité, forum…). Or la moitié de ses entrées sont des ancres de
     l'accueil : « #builder », « #tarifs », « #accueil ». Sur `/confidentialite`,
     ces fragments ne désignent rien — l'appui ne faisait RIEN, en silence.
     C'est le défaut signalé : « le bouton constructeur ne fonctionne plus ».

     On regarde donc où l'on est. Sur l'accueil, les ancres défilent vers leur
     section, c'est le comportement le plus doux. Partout ailleurs, chaque
     ancre est préfixée par `/` : le clic ramène à l'accueil PUIS défile vers
     la section. Aucun bouton ne peut plus être muet. */
  const pathname = usePathname()
  const onHome = pathname === '/'
  const anchor = (fragment: string) => (onHome ? fragment : `/${fragment}`)
  /* La session vient du stockage local : on n'en tient compte qu'après le
     montage, sinon le rendu serveur et le client divergent. */
  const signedIn = mounted && Boolean(userId)
  const homeHref = signedIn
    ? role === 'owner'
      ? '/tableau-de-bord'
      : '/espace-client'
    : '/'

  /* Cinq entrées maximum : au-delà, la barre se serre contre le logo et les
     boutons de compte. « Modules » et « Analytics » ont donc laissé la place
     aux vraies destinations (formation, forum, boutique) — leurs sections
     restent atteignables depuis l'accueil et le pied de page. */
  /* `route: true` distingue une vraie page d'une ancre de la page d'accueil.
     Sans ce marqueur, « Formation » serait rendu en `<a href>` comme les
     ancres et provoquerait un rechargement complet au lieu d'une navigation
     côté client. */
  /* `route: !onHome` sur les ancres : hors accueil elles deviennent
     `/#builder`, une vraie navigation vers la racine — le composant `Link`
     sait la précharger et le défilement natif prend le relais à l'arrivée. */
  /* Formation et Boutique s'adressent au commerçant installé : apprendre à
     mieux vendre, commander les goodies de sa page. Pour le visiteur qui
     découvre CLYDE, ces entrées sont du bruit avant sa décision — il les
     retrouvera dans son tableau de bord une fois son compte créé. Elles ne
     s'affichent donc qu'aux comptes commerçant et admin connectés. */
  const pro = signedIn && (role === 'owner' || role === 'admin')
  const links = onMarketplace
    ? []
    : [
        { href: anchor('#builder'), label: t.nav.links.builder, route: !onHome },
        ...(pro ? [{ href: '/formation', label: t.nav.links.formation, route: true }] : []),
        { href: '/forum', label: t.nav.links.forum, route: true },
        ...(pro ? [{ href: '/goodies', label: t.nav.links.goodies, route: true }] : []),
        { href: anchor('#tarifs'), label: t.nav.links.pricing, route: !onHome },
      ]

  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Préchauffe les destinations du menu bas dès que la barre est montée.
     `Link` ne précharge que les liens visibles dans le viewport — or la barre
     est fixe en bas et « Créer » / « Explorer » sont les appuis les plus
     probables : sans ce prefetch, le premier appui payait la compilation et
     le chargement de la route, d'où la lenteur ressentie. */
  useEffect(() => {
    router.prefetch('/inscription')
    router.prefetch('/marketplace')
    router.prefetch('/connexion')
  }, [router])

  /* Le menu du compte se ferme au clic extérieur et à Échap — sans quoi il
     resterait ouvert par-dessus la page après un clic à côté. */
  useEffect(() => {
    if (!accountOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountOpen])

  /* Quitter le compte ramène à l'accueil public : rester sur une page réservée
     (espace client, tableau de bord) afficherait un écran vide ou une
     redirection sèche. Depuis l'accueil, « Connexion » est à portée immédiate
     pour entrer sur un autre compte. */
  function leaveAccount() {
    setAccountOpen(false)
    setOpen(false)
    signOut()
    router.push('/')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <div
        /* Au repos la barre occupe toute la largeur ; dès qu'on défile elle se
           resserre en un îlot sombre centré.

           `max-w-6xl` (1152 px) et non `5xl` (1024 px) : la barre du haut a
           besoin de 1077 px pour son contenu — logo, six liens en
           `whitespace-nowrap`, sélecteur de langue, « Connexion » et le bouton
           « Créer ma page ». Or le groupe de droite est en `shrink-0` et les
           liens ne peuvent pas se couper : à 1024 px le surplus ne se
           redistribuait pas, il débordait, et le bouton orange sortait de
           30 px hors du fond noir arrondi — d'où l'impression de déphasage
           entre le bouton et son îlot.

           1152 px laisse 75 px de marge : l'îlot se resserre donc encore
           visiblement (1280 → 1152) sans jamais laisser fuir son contenu. */
        className={cn(
          'mx-auto flex h-16 items-center justify-between gap-3 rounded-2xl px-4 transition-all duration-500 sm:px-6',
          scrolled
            ? 'w-[calc(100%-1rem)] max-w-6xl border border-foreground/15 bg-foreground text-background shadow-lg'
            : 'w-full max-w-7xl border border-transparent',
        )}
      >
        <Link href="/" className="shrink-0" aria-label={t.nav.home}>
          {/* Grande taille (1,5 ×) : c'est la seule barre où la marque doit
              s'imposer — le visiteur y arrive sans savoir où il est. Ailleurs
              (tableau de bord, connexion) il connaît déjà le site et le logo
              n'a plus à se présenter. La barre mesure 64 px de haut : le
              monogramme passé à 30 px y tient sans forcer. */}
          <ClydeWordmark
            accent="bg-brand"
            size="lg"
            className={cn(scrolled ? 'text-background' : 'text-foreground')}
          />
        </Link>

        {/* `xl:` et non `md:` : ce menu réclame 1101 px de fenêtre pour ses six
            liens en `whitespace-nowrap`. Affiché dès 768 px, il débordait de
            l'îlot de 326 px — le bouton « Créer ma page » se retrouvait
            largement hors du fond noir. En dessous de `xl`, c'est le bouton
            hamburger qui prend le relais : il contient les mêmes liens, plus la
            langue et la connexion. */}
        <nav className="hidden items-center gap-1 xl:flex">
          {onMarketplace ? (
            <>
              <Link
                href="/"
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors',
                  scrolled
                    ? 'text-background/85 hover:bg-background/10 hover:text-background'
                    : 'text-foreground hover:bg-secondary',
                )}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t.nav.backHomeLong}
              </Link>
              {signedIn ? (
                <Link
                  href="/espace-client"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                    scrolled
                      ? 'text-background/75 hover:bg-background/10 hover:text-background'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Heart className="size-4" aria-hidden="true" />
                  {t.nav.follows}
                </Link>
              ) : null}
            </>
          ) : (
            <>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  /* Les ancres restent en navigation native : `scroll` géré par
                     le navigateur évite un saut brutal en haut de page. */
                  scroll={!l.route ? undefined : true}
                  /* `whitespace-nowrap` : un libellé de navigation est un nom,
                     pas une phrase. Sans lui, « Constructeur de page » et
                     « Hall d'exposition » se coupaient en deux lignes vers
                     1024 px et faisaient 60 px de haut contre 40 px aux
                     autres — une barre visiblement de guingois. */
                  className={cn(
                    'rounded-lg px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                    scrolled
                      ? 'text-background/75 hover:bg-background/10 hover:text-background'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/marketplace"
                className={cn(
                  'rounded-lg px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                  scrolled
                    ? 'text-background/75 hover:bg-background/10 hover:text-background'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {t.nav.marketplace}
              </Link>
            </>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <LocaleSwitch className="hidden sm:flex" />

          {signedIn ? (
            /* Un visiteur déjà connecté n'a pas besoin qu'on lui propose de se
               connecter : on lui ouvre son espace — et surtout la sortie. */
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-colors',
                  scrolled
                    ? 'bg-background/10 text-background hover:bg-background/20'
                    : 'bg-secondary text-foreground hover:bg-secondary/70',
                )}
              >
                <UserRound className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.nav.account}</span>
                <ChevronDown
                  className={cn('size-3.5 transition-transform', accountOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>

              {accountOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-background p-1.5 text-foreground shadow-xl"
                >
                  <Link
                    href={homeHref}
                    role="menuitem"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary"
                  >
                    <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                    {t.nav.account}
                  </Link>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={leaveAccount}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    {t.nav.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* `justify-center` + `text-center` : ces deux libellés viennent du
                  dictionnaire et s'allongent d'une langue à l'autre. Quand ils
                  passent à la ligne, le texte doit rester centré dans le bouton
                  — sinon la seconde ligne se colle à gauche et le libellé paraît
                  décalé dans son cadre. */}
              <Link
                href="/connexion"
                className={cn(
                  'hidden items-center justify-center rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors sm:flex',
                  scrolled
                    ? 'text-background hover:bg-background/10'
                    : 'text-foreground hover:bg-secondary',
                )}
              >
                {t.nav.login}
              </Link>
              <Link
                href="/inscription"
                className="flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-brand-foreground transition-transform active:scale-[0.97]"
              >
                {t.nav.cta}
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            className={cn(
              /* Même seuil que le menu horizontal qu'il remplace : en `md:hidden`
                 il disparaissait à 768 px alors que le menu déborderait encore
                 jusqu'à 1101 px, laissant une plage sans navigation utilisable. */
              'flex size-10 items-center justify-center rounded-lg xl:hidden',
              scrolled
                ? 'bg-background/10 text-background hover:bg-background/20'
                : 'text-foreground hover:bg-secondary',
            )}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="clyde-menu-in mx-auto mt-2 flex w-full max-w-6xl flex-col rounded-2xl border border-border bg-background p-2 text-foreground shadow-2xl xl:hidden">
          {onMarketplace ? (
            <>
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t.nav.backHomeLong}
              </Link>
              {signedIn ? (
                <a
                  href="#mes-abonnements"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary"
                >
                  <Heart className="size-4" aria-hidden="true" />
                  {t.nav.follows}
                </a>
              ) : null}
            </>
          ) : (
            <>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/marketplace"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary"
              >
                {t.nav.marketplace}
              </Link>
            </>
          )}
          <div className="my-1 h-px bg-border" />
          <Link
            href={signedIn ? homeHref : '/connexion'}
            onClick={() => setOpen(false)}
            className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-secondary"
          >
            {signedIn ? t.nav.account : t.nav.login}
          </Link>
          {/* La sortie du compte se trouve là où le visiteur mobile cherche
              déjà son espace : dans ce même menu, juste en dessous. */}
          {signedIn ? (
            <button
              type="button"
              onClick={leaveAccount}
              className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {t.nav.signOut}
            </button>
          ) : null}

          {/* Le sélecteur du haut est masqué sous 640 px : sans reprise ici,
              la langue serait inaccessible sur mobile. */}
          <LocaleSwitch
            variant="stacked"
            className="mt-1 px-3 py-2 sm:hidden"
          />
        </div>
      )}

      {/* Menu mobile du bas. Sur l'annuaire les ancres de l'accueil n'existent
          pas : chaque entrée devient une vraie destination, sinon les appuis
          restaient sans effet. */}
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-3 bottom-3 z-50 flex items-stretch rounded-2xl border border-border bg-background p-2 shadow-[0_16px_40px_-20px_rgba(23,20,18,0.45)] md:hidden"
      >
        {(onMarketplace
          ? [
              { key: 'home', href: '/', link: true, Icon: Home, label: t.nav.backHome },
              /* « Mes abonnements » ne parle qu'à qui a un compte : un nouveau
                 visiteur n'a encore rien suivi, l'entrée était morte pour lui.
                 On lui montre les tarifs — la question qu'il se pose vraiment.
                 Une fois connecté, l'entrée redevient ses abonnements. */
              signedIn
                ? { key: 'follows', href: '#mes-abonnements', link: false, Icon: Heart, label: t.nav.follows }
                : { key: 'pricing', href: '/#tarifs', link: true, Icon: Tag, label: t.nav.links.pricing },
              { key: 'create', href: '/inscription', link: true, Icon: Plus, label: 'Créer', primary: true },
              { key: 'explore', href: '#mp-search', link: false, Icon: Search, label: 'Explorer' },
              {
                key: 'account',
                href: signedIn ? homeHref : '/connexion',
                link: true,
                Icon: UserRound,
                label: signedIn ? t.nav.account : t.nav.login,
              },
            ]
          : [
              /* Première entrée contextuelle. Sur l'accueil : « Accueil », une
                 ancre vers le haut de page (« #top » désignait un bloc DANS le
                 mockup de téléphone — l'appui défilait vers le mockup, pas vers
                 le haut). Ailleurs (FAQ, confidentialité, formation…) :
                 « Retour », qui rend la page précédente — c'est le geste
                 attendu quand on est venu voir une page annexe et qu'on veut
                 reprendre sa lecture là où on l'avait laissée. */
              onHome
                ? { key: 'home', href: '#accueil', link: false, Icon: Home, label: t.nav.backHome }
                : { key: 'back', back: true, Icon: ArrowLeft, label: t.nav.back },
              /* Même règle que la barre du haut : la boutique de goodies parle
                 au commerçant installé, pas au visiteur qui découvre. Au
                 visiteur on montre les tarifs — la question qu'il se pose
                 avant de créer sa page. */
              pro
                ? { key: 'goodies', href: '/goodies', link: true, Icon: Gift, label: t.nav.links.goodies }
                : { key: 'pricing', href: anchor('#tarifs'), link: !onHome, Icon: Tag, label: t.nav.links.pricing },
              /* Le bouton central est la promesse principale. Pour le visiteur :
                 créer sa page. Pour qui a déjà un compte, « Créer » menant à
                 l'inscription serait une impasse — on l'emmène à son espace,
                 tableau de bord ou espace client selon son rôle. */
              signedIn
                ? { key: 'space', href: homeHref, link: true, Icon: UserRound, label: t.nav.account, primary: true }
                : { key: 'create', href: '/inscription', link: true, Icon: Plus, label: 'Créer', primary: true },
              { key: 'explore', href: '/marketplace', link: true, Icon: Search, label: 'Explorer' },
              /* Libellé traduit : « Constructeur » en français, « Builder » en
                 anglais. Forme courte — cinq entrées se partagent la barre.
                 `anchor()` : hors accueil, l'ancre nue ne désignait rien et
                 l'appui restait muet — préfixée, elle ramène à l'accueil puis
                 défile vers la section du constructeur. */
              { key: 'builder', href: anchor('#builder'), link: !onHome, Icon: LayoutGrid, label: t.nav.links.builderShort },
            ]
        ).map(({ key, href, link, Icon, label, primary, back }) => {
          const content = (
            <>
              {/* `shrink-0` : sans lui le flex écrase les icônes dès qu'un
                  libellé est long — elles deviennent illisibles. */}
              <Icon className={cn(primary ? 'size-6' : 'size-[18px]', 'shrink-0')} aria-hidden="true" />
              {/* Les libellés viennent des traductions : ils peuvent être longs
                  (« Mes abonnements »). On les tronque proprement plutôt que de
                  laisser la barre déborder de l'écran. */}
              <span className="max-w-full truncate">{label}</span>
            </>
          )
          const className = primary ? BOTTOM_PRIMARY : BOTTOM_ITEM
          if (back) {
            return (
              <button
                key={key}
                type="button"
                /* Quelqu'un arrivé ici par un lien direct (WhatsApp, favori)
                   n'a pas d'historique dans ce site : `history.length ≤ 1`
                   signalerait un retour qui ne mène nulle part. Dans ce cas,
                   on l'emmène à l'accueil — le bouton tient toujours parole. */
                onClick={() => {
                  if (window.history.length > 1) router.back()
                  else router.push('/')
                }}
                className={className}
              >
                {content}
              </button>
            )
          }
          return link ? (
            <Link key={key} href={href!} className={className}>
              {content}
            </Link>
          ) : (
            <a key={key} href={href!} className={className}>
              {content}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
