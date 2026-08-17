import type { Block, PageTheme } from './types'

/**
 * Ambiances — palettes complètes prêtes à l'emploi.
 *
 * Le public du constructeur n'est pas designer : trois pastilles de couleur
 * libres (fond, texte, marque) produisaient surtout des pages illisibles, ou
 * n'étaient jamais touchées. Une ambiance est une combinaison ÉPROUVÉE des
 * trois couleurs du thème : en choisir une donne un rendu cohérent d'un coup,
 * sans rien connaître à la théorie des couleurs.
 *
 * Chaque ambiance reste modifiable ensuite, couleur par couleur, et chaque
 * bloc peut être remis « aux couleurs de la page » d'un bouton.
 */
export interface Ambiance {
  id: string
  /** Nom parlant, pas technique : « Terre cuite », pas « #C4552D ». */
  label: string
  brand: string
  background: string
  ink: string
}

export const AMBIANCES: Ambiance[] = [
  /* L'ambiance de départ des nouvelles pages : chaleureuse, neutre. */
  { id: 'soleil', label: 'Soleil', brand: '#FF6B35', background: '#FAFAF8', ink: '#1C1917' },
  { id: 'terre', label: 'Terre cuite', brand: '#C4552D', background: '#FBF6F0', ink: '#33241C' },
  { id: 'foret', label: 'Forêt', brand: '#2D6A4F', background: '#F6FAF7', ink: '#1B2E24' },
  { id: 'ocean', label: 'Océan', brand: '#1D6FA5', background: '#F4F8FB', ink: '#16303F' },
  { id: 'rose', label: 'Rose poudré', brand: '#C2185B', background: '#FDF4F7', ink: '#3D1F2B' },
  { id: 'violet', label: 'Violet', brand: '#6D4AA0', background: '#F8F6FC', ink: '#2A2138' },
  { id: 'nuit', label: 'Nuit', brand: '#F59E0B', background: '#171410', ink: '#F5EFE6' },
  { id: 'ardoise', label: 'Ardoise', brand: '#38BDF8', background: '#0F172A', ink: '#E2E8F0' },
]

/**
 * L'ambiance actuellement active si le thème correspond exactement à l'une
 * des palettes — sert à surligner la pastille choisie dans l'éditeur.
 * Un thème personnalisé à la main ne correspond à aucune.
 */
export function activeAmbianceId(theme: PageTheme): string | null {
  const hit = AMBIANCES.find(
    (a) =>
      a.brand.toLowerCase() === theme.brand.toLowerCase() &&
      a.background.toLowerCase() === theme.background.toLowerCase() &&
      a.ink.toLowerCase() === theme.ink.toLowerCase(),
  )
  return hit?.id ?? null
}

/** Applique une ambiance au thème sans toucher police, boutons ni densité. */
export function applyAmbiance(theme: PageTheme, ambiance: Ambiance): PageTheme {
  return { ...theme, brand: ambiance.brand, background: ambiance.background, ink: ambiance.ink }
}

/**
 * Efface les couleurs posées à la main sur chaque bloc pour qu'ils
 * retombent tous sur les couleurs de la page.
 *
 * Appelé quand on applique une ambiance : sans ce nettoyage, les blocs déjà
 * personnalisés gardaient leurs anciennes couleurs et la page devenait un
 * patchwork — exactement ce que l'ambiance devait éviter. Les autres réglages
 * de style (alignement, taille, espacement) sont conservés : ils ne se
 * marient pas avec les couleurs, ils n'ont pas à sauter.
 */
export function resetBlockColors(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    if (!block.style) return block
    const { background: _bg, textColor: _tc, brandColor: _bc, ...rest } = block.style
    return { ...block, style: rest }
  })
}

/** Version un-seul-bloc de `resetBlockColors`, pour le bouton du panneau. */
export function resetOneBlockColors(block: Block): Block {
  if (!block.style) return block
  const { background: _bg, textColor: _tc, brandColor: _bc, ...rest } = block.style
  return { ...block, style: rest }
}

/** Vrai si le bloc a au moins une couleur posée à la main. */
export function hasCustomColors(block: Block): boolean {
  const s = block.style
  return !!s && (s.background != null || s.textColor != null || s.brandColor != null)
}
