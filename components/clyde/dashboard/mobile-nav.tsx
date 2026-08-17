'use client'

import Link from 'next/link'
import { CalendarDays, Grid2X2, Home, LayoutGrid, Plus, Search, Settings2, type LucideIcon } from 'lucide-react'
import { useEditorDock } from '@/lib/clyde/editor-dock'
import { cn } from '@/lib/utils'

/* Une entrée est soit une destination (`href`), soit une action (`onClick`).
   Les deux se dessinent exactement pareil : sur un téléphone, la barre du bas
   est le seul repère stable, et deux styles concurrents la rendraient
   illisible. */
type DockItem = {
  key: string
  label: string
  icon: LucideIcon
  primary?: boolean
  active?: boolean
  href?: string
  onClick?: () => void
}

const EDITOR_PATH = '/tableau-de-bord/page'

export function DashboardMobileNav({ pathname }: { pathname: string }) {
  /* Publié par l'éditeur pendant qu'il est à l'écran. Ailleurs : `null`. */
  const openPanel = useEditorDock((s) => s.open)
  const onEditor = pathname.startsWith(EDITOR_PATH) && Boolean(openPanel)

  const navItems: DockItem[] = [
    { key: 'home', href: '/tableau-de-bord', label: 'Accueil', icon: Home },
    { key: 'agenda', href: '/tableau-de-bord/reservations', label: 'Agenda', icon: CalendarDays },
    { key: 'add', href: EDITOR_PATH, label: 'Ajouter', icon: Plus, primary: true },
    { key: 'catalog', href: '/tableau-de-bord/catalogue', label: 'Catalogue', icon: Search },
    { key: 'more', href: '/tableau-de-bord/modules', label: 'Plus', icon: Grid2X2 },
  ]

  /* Dans le constructeur, cette même barre porte les outils de construction.
     Le téléphone n'a pas la place d'empiler une seconde barre d'outils au-dessus
     du dock : les deux mangeaient 157 px sur un écran de 844, et l'aperçu — la
     seule chose qu'on veut vraiment voir en construisant — se retrouvait
     comprimé au centre.

     « Ajouter » garde sa place surélevée et prend enfin un sens : il pointait
     vers l'éditeur, donc vers la page déjà ouverte, et ne faisait rien. Il
     ouvre désormais la bibliothèque de blocs. « Accueil » et « Plus » restent
     pour pouvoir sortir de l'éditeur. */
  const editorItems: DockItem[] = [
    { key: 'home', href: '/tableau-de-bord', label: 'Accueil', icon: Home },
    { key: 'structure', onClick: () => openPanel?.('structure'), label: 'Structure', icon: LayoutGrid },
    { key: 'add', onClick: () => openPanel?.('library'), label: 'Ajouter', icon: Plus, primary: true },
    { key: 'settings', onClick: () => openPanel?.('settings'), label: 'Réglages', icon: Settings2 },
    { key: 'more', href: '/tableau-de-bord/modules', label: 'Plus', icon: Grid2X2 },
  ]

  const items = onEditor ? editorItems : navItems

  return (
    <nav
      aria-label={onEditor ? 'Outils du constructeur' : 'Navigation mobile du tableau de bord'}
      className="fixed inset-x-3 bottom-3 z-40 flex items-end justify-around rounded-[1.6rem] border border-border bg-background/95 px-2 pt-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] shadow-[0_16px_40px_-18px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden"
    >
      {items.map(({ key, href, label, icon: Icon, primary, onClick }) => {
        const active =
          href === undefined
            ? false
            : href === '/tableau-de-bord'
              ? pathname === href
              : pathname.startsWith(href)

        const content = (
          <>
            <span
              className={cn(
                'flex items-center justify-center',
                primary
                  ? '-mt-1 h-20 w-[4.5rem] rounded-t-[2.75rem] rounded-b-[1.6rem] border-4 border-background bg-brand pt-2 shadow-lg'
                  : 'size-10',
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center rounded-full',
                  primary ? 'size-10 bg-background text-brand' : active ? 'bg-brand/10 text-brand' : 'text-muted-foreground',
                )}
              >
                <Icon className={primary ? 'size-7' : 'size-5'} aria-hidden="true" />
              </span>
            </span>
            {/* `truncate` + `max-w-full` : « Structure » et « Réglages » sont plus
                longs que « Agenda », et sans cette limite ils élargissaient leur
                colonne au point de désaligner les cinq entrées. */}
            <span className={cn('max-w-full truncate', primary || active ? 'text-brand' : 'text-muted-foreground')}>
              {label}
            </span>
          </>
        )

        /* `min-w-14` garde les cinq colonnes de largeur égale ; la cible tactile
           fait au moins 44 px de haut, icône et libellé compris. */
        const className = cn(
          'flex min-w-14 flex-col items-center gap-1 text-[10px] font-semibold transition-transform active:scale-95',
          primary && '-mt-8',
        )

        return href !== undefined ? (
          <Link key={key} href={href} aria-current={active ? 'page' : undefined} className={className}>
            {content}
          </Link>
        ) : (
          <button key={key} type="button" onClick={onClick} className={className}>
            {content}
          </button>
        )
      })}
    </nav>
  )
}
