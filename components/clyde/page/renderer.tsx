'use client'

import { useState } from 'react'
import { themeVars } from '@/lib/clyde/theme'
import { cn } from '@/lib/utils'
import { BlockRender, type RenderCtx } from './blocks'
import type {
  AvailabilityRule,
  Block,
  Business,
  PageTheme,
  Product,
} from '@/lib/clyde/types'

export interface PageRendererProps {
  business: Business
  products: Product[]
  availability: AvailabilityRule[]
  theme: PageTheme
  blocks: Block[]
  device?: 'desktop' | 'mobile'
  interactive?: boolean
  className?: string
  onOpenProduct?: (p: Product) => void
  onAddToCart?: (p: Product) => void
  onReserve?: (p: Product) => void
  onBook?: (startAt: string) => void
  onContact?: () => void
  /** Rendu autour de chaque bloc — l'éditeur y accroche sélection et poignées */
  wrapBlock?: (block: Block, node: React.ReactNode, index: number) => React.ReactNode
  /**
   * Escamote la navigation basse avec une glissade vers le bas.
   * La vitrine l'active quand le panier contient des articles : la barre de
   * commande prend alors la place du menu, et le menu revient dès que le
   * panier se vide. Les deux barres ne cohabitent jamais.
   */
  bottomNavHidden?: boolean
}

/**
 * Rendu déclaratif d'une page CLYDE : chaque bloc du layout_json est un
 * composant qui lit ses props. Aucun moteur de mise en page libre.
 */
export function PageRenderer({
  business,
  products,
  availability,
  theme,
  blocks,
  device = 'desktop',
  interactive = true,
  className,
  onOpenProduct,
  onAddToCart,
  onReserve,
  onBook,
  onContact,
  wrapBlock,
  bottomNavHidden = false,
}: PageRendererProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const ctx: RenderCtx = {
    business,
    products,
    availability,
    theme,
    currency: business.currency,
    device,
    interactive,
    search,
    setSearch,
    category,
    setCategory,
    onOpenProduct,
    onAddToCart,
    onReserve,
    onBook,
    onContact,
  }

  return (
    /* @container : les blocs se mesurent à la largeur de leur cadre et non à
       celle du navigateur. Sans cela, une maquette téléphone de 390 px posée
       dans une fenêtre de 1350 px déclenchait les points de rupture du
       bureau et entassait une mise en page large dans un écran étroit. */
    <div
      id="top"
      style={themeVars(theme)}
      className={cn('@container flex min-h-full w-full flex-col', className)}
    >
      {blocks.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-1.5 p-10 text-center opacity-45">
          <p className="text-sm font-semibold">Votre page est vide</p>
          <p className="text-[13px]">Ajoutez un premier bloc pour commencer.</p>
        </div>
      ) : (
        /* La navigation basse est TOUJOURS rendue en dernier, quelle que soit
           sa position dans la liste de blocs. `sticky bottom-0` ne colle un
           élément que tant que sa place naturelle est plus bas que l'écran :
           un menu placé au milieu de la liste remontait donc avec le contenu
           et finissait affiché en plein milieu de la page. En le déplaçant en
           fin de flux, la barre reste épinglée au bas de l'écran du début à
           la fin du défilement — peu importe comment le commerçant ordonne
           ses blocs dans l'éditeur. */
        [...blocks.filter((b) => b.type !== 'bottom_nav'), ...blocks.filter((b) => b.type === 'bottom_nav')].map(
          (block) => {
            const originalIndex = blocks.indexOf(block)
            const node = <BlockRender block={block} ctx={ctx} />
            const pinned = block.type === 'bottom_nav'
            /* L'épinglage enveloppe AUSSI le rendu de wrapBlock : l'aperçu de
               l'éditeur passe par wrapBlock, et sans cette enveloppe le menu
               mobile s'affichait en plein milieu de la maquette au lieu de
               rester collé en bas — l'éditeur mentait sur le rendu réel. */
            const content = wrapBlock ? wrapBlock(block, node, originalIndex) : node
            return (
              <div
                key={block.id}
                className={
                  pinned
                    ? cn(
                        'sticky bottom-0 z-40 mt-auto transition-all duration-300 ease-out',
                        bottomNavHidden && 'pointer-events-none translate-y-full opacity-0',
                      )
                    : undefined
                }
              >
                {content}
              </div>
            )
          },
        )
      )}
    </div>
  )
}
