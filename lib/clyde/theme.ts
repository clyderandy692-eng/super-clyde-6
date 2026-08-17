import type {
  BlockStyle,
  ButtonStyle,
  FontChoice,
  PageTheme,
  SurfaceStyle,
} from './types'

/* ============================================================
   Traduction thème -> variables CSS
   Le rendu des blocs ne lit jamais un hex directement : il lit
   ces variables, ce qui permet de surcharger bloc par bloc.
   ============================================================ */

export const FONT_VAR: Record<FontChoice, string> = {
  kanit: 'var(--font-kanit)',
  inter: 'var(--font-inter)',
  playfair: 'var(--font-playfair)',
  space: 'var(--font-space)',
  lora: 'var(--font-lora)',
}

export const FONT_LABEL: Record<FontChoice, string> = {
  kanit: 'Kanit',
  inter: 'Inter',
  playfair: 'Playfair Display',
  space: 'Space Grotesk',
  lora: 'Lora',
}

export const BUTTON_RADIUS: Record<ButtonStyle, string> = {
  square: '0.25rem',
  rounded: '0.75rem',
  pill: '999px',
}

export const DENSITY_SCALE = {
  compact: 0.75,
  normal: 1,
  airy: 1.35,
} as const

export const SURFACE_LABEL: Record<SurfaceStyle, string> = {
  plain: 'Aplat',
  glass: 'Verre dépoli',
  cartoon: 'Contour marqué',
}

/** Matière retenue, en tolérant les pages créées avant l'arrivée du réglage. */
export function surfaceOf(theme: PageTheme): SurfaceStyle {
  return theme.surface ?? 'plain'
}

/** Variables CSS de la page entière */
export function themeVars(theme: PageTheme): React.CSSProperties {
  const surface = surfaceOf(theme)

  /* Le verre dépoli n'existe que s'il a quelque chose à filtrer : sur un aplat
     uni, il ne se distingue pas d'une simple teinte. On pose donc un fond
     ambiant derrière les blocs quand cette matière est choisie. */
  const ambient =
    surface === 'glass'
      ? `radial-gradient(120% 80% at 12% -8%, ${tint(theme.brand, 0.38)} 0%, transparent 58%),
         radial-gradient(90% 70% at 92% 8%, ${tint(theme.brand, 0.2)} 0%, transparent 55%),
         radial-gradient(120% 90% at 50% 110%, ${tint(theme.brand, 0.14)} 0%, transparent 60%)`
      : undefined

  return {
    '--p-brand': theme.brand,
    '--p-bg': theme.background,
    '--p-ink': theme.ink,
    '--p-font': FONT_VAR[theme.font] ?? FONT_VAR.kanit,
    '--p-btn-radius': BUTTON_RADIUS[theme.buttonStyle] ?? BUTTON_RADIUS.rounded,
    '--p-density': String(DENSITY_SCALE[theme.density] ?? 1),
    backgroundColor: theme.background,
    backgroundImage: ambient,
    backgroundAttachment: ambient ? 'fixed' : undefined,
    color: theme.ink,
    fontFamily: `${FONT_VAR[theme.font] ?? FONT_VAR.kanit}, ui-sans-serif, system-ui, sans-serif`,
  } as React.CSSProperties
}

/**
 * Apparence d'une carte selon la matière du thème.
 *
 * Toutes les cartes de la page passent par ici : c'est ce qui rend le réglage
 * « matière » réel plutôt que décoratif. Le rayon reste géré par le bloc
 * (`--b-radius`), la matière ne décide que du fond, du contour et de l'ombre.
 */
export function cardSurface(
  theme: PageTheme,
  opts: { radius?: string; raised?: boolean } = {},
): React.CSSProperties {
  const radius = opts.radius ?? 'var(--b-radius)'
  const dark = isDark(theme.background)

  switch (surfaceOf(theme)) {
    case 'glass':
      return {
        borderRadius: radius,
        background: dark
          ? 'rgba(255, 255, 255, 0.07)'
          : 'rgba(255, 255, 255, 0.55)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)'}`,
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        boxShadow: dark
          ? 'inset 0 1px 0 0 rgba(255,255,255,0.1), 0 16px 40px -20px rgba(0,0,0,0.7)'
          : 'inset 0 1px 0 0 rgba(255,255,255,0.85), 0 16px 40px -22px rgba(20,16,14,0.32)',
      } as React.CSSProperties

    case 'cartoon':
      return {
        borderRadius: radius,
        /* Sur fond sombre, un aplat blanc écraserait la page : on éclaircit
           légèrement le fond pour que le contour reste lisible. */
        background: dark ? lighten(theme.background, 0.1) : '#FFFFFF',
        border: `2px solid ${theme.ink}`,
        boxShadow: `${opts.raised ? '5px 5px' : '3px 3px'} 0 0 ${theme.ink}`,
      }

    default:
      return {
        borderRadius: radius,
        background: tint(theme.ink, dark ? 0.06 : 0.035),
        border: `1px solid ${tint(theme.ink, dark ? 0.14 : 0.07)}`,
      }
  }
}

/**
 * Apparence d'un bouton d'action principal, matière comprise.
 *
 * Le contour marqué doit se voir aussi sur les boutons : le limiter aux cartes
 * donnait des pages mi-cartoon, mi-plates.
 */
export function brandButton(theme: PageTheme): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 'var(--p-btn-radius)',
    background: 'var(--p-brand)',
    color: readableOn(theme.brand),
  }
  if (surfaceOf(theme) === 'cartoon') {
    return {
      ...base,
      border: `2px solid ${theme.ink}`,
      boxShadow: `3px 3px 0 0 ${theme.ink}`,
    }
  }
  return base
}

/**
 * Contour d'un cadre : média, carte intégrée, panneau d'horaires.
 *
 * Contrairement à `cardSurface`, aucun fond n'est posé — le contenu (photo,
 * iframe) occupe toute la surface. Seule la bordure porte la matière, sinon
 * une vitrine en contour marqué gardait des images sans contour.
 */
export function frameSurface(
  theme: PageTheme,
  opts: { radius?: string } = {},
): React.CSSProperties {
  const radius = opts.radius ?? 'var(--b-radius)'
  const dark = isDark(theme.background)

  switch (surfaceOf(theme)) {
    case 'glass':
      return {
        borderRadius: radius,
        border: `1px solid ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.75)'}`,
        boxShadow: dark
          ? '0 16px 40px -20px rgba(0,0,0,0.7)'
          : '0 16px 40px -22px rgba(20,16,14,0.3)',
      }
    case 'cartoon':
      return {
        borderRadius: radius,
        border: `2px solid ${theme.ink}`,
        boxShadow: `3px 3px 0 0 ${theme.ink}`,
      }
    default:
      return {
        borderRadius: radius,
        border: `1px solid ${tint(theme.ink, dark ? 0.14 : 0.09)}`,
      }
  }
}

/**
 * Apparence d'un contrôle : champ de recherche, puce de catégorie, onglet,
 * créneau horaire.
 *
 * `active` peint le contrôle avec la couleur de marque, `tone: 'brand'` donne
 * un accent discret sans le remplir. Ces contrôles étaient figés sur l'aspect
 * plat : le réglage de matière ne portait que sur les cartes, et une page en
 * verre dépoli affichait des champs opaques au milieu de cartes translucides.
 */
export function controlSurface(
  theme: PageTheme,
  opts: {
    radius?: string
    active?: boolean
    tone?: 'neutral' | 'brand'
  } = {},
): React.CSSProperties {
  const radius = opts.radius ?? 'var(--b-radius)'
  const dark = isDark(theme.background)
  const surface = surfaceOf(theme)
  const cartoonEdge =
    surface === 'cartoon'
      ? { border: `2px solid ${theme.ink}` }
      : undefined

  if (opts.active) {
    return {
      borderRadius: radius,
      background: 'var(--p-brand)',
      color: readableOn(theme.brand),
      ...cartoonEdge,
    }
  }

  if (opts.tone === 'brand') {
    return {
      borderRadius: radius,
      background: tint(theme.brand, dark ? 0.24 : 0.14),
      color: 'var(--p-brand)',
      ...cartoonEdge,
    }
  }

  switch (surface) {
    case 'glass':
      return {
        borderRadius: radius,
        background: dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.5)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)'}`,
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        color: 'var(--p-ink)',
      } as React.CSSProperties
    case 'cartoon':
      return {
        borderRadius: radius,
        background: dark ? lighten(theme.background, 0.1) : '#FFFFFF',
        border: `2px solid ${theme.ink}`,
        color: 'var(--p-ink)',
      }
    default:
      return {
        borderRadius: radius,
        background: tint(theme.ink, dark ? 0.08 : 0.05),
        border: `1px solid ${tint(theme.ink, dark ? 0.16 : 0.1)}`,
        color: 'var(--p-ink)',
      }
  }
}

/**
 * Bouton secondaire (téléphone, e-mail) : contour seul, jamais de fond de
 * marque, pour ne pas concurrencer l'action principale.
 */
export function outlineButton(theme: PageTheme): React.CSSProperties {
  const base: React.CSSProperties = { borderRadius: 'var(--p-btn-radius)' }
  const dark = isDark(theme.background)

  if (surfaceOf(theme) === 'cartoon') {
    return {
      ...base,
      border: `2px solid ${theme.ink}`,
      boxShadow: `3px 3px 0 0 ${theme.ink}`,
      background: dark ? lighten(theme.background, 0.1) : '#FFFFFF',
    }
  }
  return {
    ...base,
    border: `1.5px solid ${tint(theme.ink, dark ? 0.26 : 0.18)}`,
  }
}

/**
 * Fond creusé : piste d'onglets, zone vide, réserve d'un lecteur vidéo.
 * Renvoie une seule couleur, ces zones n'ayant jamais de contour propre.
 */
export function insetFill(theme: PageTheme): string {
  const dark = isDark(theme.background)
  switch (surfaceOf(theme)) {
    case 'glass':
      return dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.4)'
    case 'cartoon':
      return tint(theme.ink, dark ? 0.14 : 0.08)
    default:
      return tint(theme.ink, dark ? 0.08 : 0.05)
  }
}

/** Vrai si la couleur est sombre — décide des contours et des ombres. */
export function isDark(hex: string): boolean {
  const [r, g, b] = toRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5
}

const RADIUS_MAP = {
  sharp: '0.125rem',
  soft: '0.875rem',
  round: '1.75rem',
} as const

/** Surcharges d'un bloc : padding, couleurs, typo, forme */
export function blockVars(
  style: BlockStyle | undefined,
  theme: PageTheme,
): React.CSSProperties {
  const s = style ?? {}
  const density = DENSITY_SCALE[theme.density] ?? 1
  /* 32 px par bloc vidaient la page dès une dizaine de sections empilées ;
     22 px gardent un rythme lisible sans laisser de grands trous. */
  const py = (s.paddingY ?? 22) * density
  const px = s.paddingX ?? 18

  const vars: Record<string, string> = {
    '--b-pad-y': `${py}px`,
    '--b-pad-x': `${px}px`,
    '--b-scale': String(s.fontScale ?? 1),
    '--b-weight': String(s.fontWeight ?? 600),
    '--b-radius': RADIUS_MAP[s.radius ?? 'soft'],
  }
  if (s.brandColor) vars['--p-brand'] = s.brandColor
  if (s.textColor) vars['--p-ink'] = s.textColor

  const out: React.CSSProperties = {
    ...(vars as unknown as React.CSSProperties),
    paddingTop: 'var(--b-pad-y)',
    paddingBottom: 'var(--b-pad-y)',
    textAlign: s.align ?? 'left',
  }
  if (s.background) out.backgroundColor = s.background
  if (s.textColor) out.color = s.textColor
  return out
}

/* ------------------------------------------------------------
   Manipulation de couleur en RGB réel.
   On évite color-mix() : imbriqué dans un linear-gradient ou une
   variable CSS, il échoue silencieusement sur plusieurs moteurs et
   le bloc tombe alors en gris. Un calcul explicite est fiable partout.
   ------------------------------------------------------------ */

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.slice(0, 6)
  return [
    Number.parseInt(full.slice(0, 2), 16) || 0,
    Number.parseInt(full.slice(2, 4), 16) || 0,
    Number.parseInt(full.slice(4, 6), 16) || 0,
  ]
}

/** Couleur translucide — pour les fonds de carte et bordures douces */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, amount)).toFixed(3)})`
}

/** Éclaircit vers le blanc — pour les dégradés de marque */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex)
  const k = Math.max(0, Math.min(1, amount))
  const mix = (c: number) => Math.round(c + (255 - c) * k)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

/** Assombrit vers le noir chaud — pour les couvertures sans photo */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex)
  const k = Math.max(0, Math.min(1, amount))
  const target = [20, 16, 14] as const
  const mix = (c: number, t: number) => Math.round(c + (t - c) * k)
  return `rgb(${mix(r, target[0])}, ${mix(g, target[1])}, ${mix(b, target[2])})`
}

/** Contraste automatique : texte clair ou foncé sur un fond donné */
export function readableOn(hex: string): string {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const r = Number.parseInt(full.slice(0, 2), 16) || 0
  const g = Number.parseInt(full.slice(2, 4), 16) || 0
  const b = Number.parseInt(full.slice(4, 6), 16) || 0
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.62 ? '#1C1917' : '#FFFFFF'
}
