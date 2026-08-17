import type { BusinessCategory } from './types'

/* ============================================================
   La Révélation — les titres du Miroir

   Le rituel central de CLYDE : à la première publication de sa
   page, le commerçant reçoit son titre. Ce n'est pas un rôle
   fictif dans une fausse entreprise — c'est un reflet : ce que
   le commerçant fait déjà, nommé avec soin.

   Règles d'usage (à respecter partout où ce fichier est importé) :
   - Le titre apparaît UNE fois, au moment de la publication.
     Jamais en permanence dans l'interface — un gadget répété
     devient un gadget fatigant.
   - Un titre par catégorie, écrit pour le métier réel, jamais
     générique au point d'être interchangeable.
   ============================================================ */

export const REVELATION_TITLES: Record<
  BusinessCategory,
  { fr: string; en: string }
> = {
  // Restauration & Boissons
  restaurant: { fr: 'Gardien du Goût', en: 'Keeper of Taste' },
  cafe: { fr: 'Maître du Comptoir', en: 'Master of the Counter' },
  bar: { fr: 'Architecte des Soirées', en: 'Architect of Evenings' },
  boulangerie_patisserie: { fr: 'Artisan de l’Aube', en: 'Artisan of Dawn' },
  traiteur: { fr: 'Compositeur de Tables', en: 'Composer of Tables' },
  // Hôtellerie & Hébergement
  hotel: { fr: 'Maître de Maison', en: 'Master of the House' },
  location_courte_duree: { fr: 'Hôte des Passages', en: 'Host of Passages' },
  // Beauté & Bien-être
  coiffure_beaute: { fr: 'Architecte de Style', en: 'Architect of Style' },
  spa_bienetre: { fr: 'Gardien du Calme', en: 'Keeper of Calm' },
  sport_coaching: { fr: 'Forgeur d’Élan', en: 'Forger of Momentum' },
  // Commerce & Boutique
  boutique_mode: { fr: 'Curateur de Style', en: 'Curator of Style' },
  epicerie: { fr: 'Gardien du Quotidien', en: 'Keeper of the Everyday' },
  fleuriste: { fr: 'Compositeur d’Éphémère', en: 'Composer of the Ephemeral' },
  electronique_reparation: {
    fr: 'Ingénieur de Confiance',
    en: 'Engineer of Trust',
  },
  // Services & Artisanat
  service_pro: { fr: 'Bâtisseur de Solutions', en: 'Builder of Solutions' },
  artisan: { fr: 'Main d’Œuvre Rare', en: 'Rare Craftsman' },
  pressing: { fr: 'Restaurateur d’Impeccable', en: 'Restorer of Impeccable' },
  auto_garage: { fr: 'Mécanicien de Précision', en: 'Engineer of Motion' },
  immobilier: { fr: 'Ouvreur de Portes', en: 'Opener of Doors' },
  // Événementiel & Créatif
  photographe_studio: { fr: 'Sculpteur de Lumière', en: 'Sculptor of Light' },
  evenementiel: { fr: 'Metteur en Scène', en: 'Director of Moments' },
  // Filet de sécurité
  autre: { fr: 'Commerçant Révélé', en: 'Merchant Revealed' },
}

export function revelationTitle(
  category: BusinessCategory,
  locale: 'fr' | 'en',
): string {
  const entry = REVELATION_TITLES[category] ?? REVELATION_TITLES.autre
  return entry[locale]
}

/* ============================================================
   L'artefact partageable — image avant/après 1200×630

   Générée entièrement côté client sur un <canvas>, aucun
   backend requis. Moitié gauche : silhouette grise floutée,
   « Avant ». Moitié droite : la page révélée, nette, « Après ».
   Bandeau bas : le nom, le titre, le lien.
   ============================================================ */

export function drawRevelationArtifact(opts: {
  businessName: string
  title: string
  slug: string
  brand: string
  background: string
  ink: string
  labels: { before: string; after: string; banner: string }
}): string | null {
  const W = 1200
  const H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')
  if (!g) return null

  /* ---- Fond global ---- */
  g.fillStyle = '#141210'
  g.fillRect(0, 0, W, H)

  /* 150 px et non 120 : la phrase de révélation ne tenait pas sur une ligne et
     partait tronquée (« … est désormais Architecte de Style su… »). L'artefact
     est fait pour circuler — il ne peut pas voyager avec une phrase coupée.
     On lui donne donc deux lignes, et la hauteur qui va avec. */
  const BANNER_H = 150
  const half = W / 2

  /* ---- Moitié gauche : l'avant, flou et générique ---- */
  g.fillStyle = '#2a2624'
  g.fillRect(0, 0, half, H - BANNER_H)
  // Silhouette de page générique : blocs gris sans identité.
  g.filter = 'blur(7px)'
  g.fillStyle = '#4a4440'
  g.beginPath()
  g.arc(half / 2, 118, 52, 0, Math.PI * 2)
  g.fill()
  const ghost = (y: number, w: number, h: number) => {
    g.fillRect(half / 2 - w / 2, y, w, h)
  }
  /* Toute la silhouette est remontée de ~22 px. Le bandeau ayant gagné 30 px de
     hauteur, le dernier bloc venait buter contre le libellé « Avant » : le flou
     débordait sur le texte et l'ensemble paraissait tassé. La pile s'arrête
     maintenant à 412 px, soit 40 px avant le libellé. */
  ghost(188, 300, 26)
  ghost(230, 210, 16)
  ghost(278, 380, 60)
  ghost(352, 380, 60)
  g.filter = 'none'
  g.font = '600 22px system-ui, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.4)'
  g.textAlign = 'center'
  g.fillText(opts.labels.before, half / 2, H - BANNER_H - 28)

  /* ---- Moitié droite : l'après, net et personnel ---- */
  g.fillStyle = opts.background
  g.fillRect(half, 0, half, H - BANNER_H)
  // En-tête de vitrine aux couleurs du commerce.
  g.fillStyle = opts.brand
  g.fillRect(half, 0, half, 96)
  g.beginPath()
  g.arc(half + half / 2, 96, 54, 0, Math.PI * 2)
  g.fillStyle = opts.background
  g.fill()
  g.beginPath()
  g.arc(half + half / 2, 96, 46, 0, Math.PI * 2)
  g.fillStyle = opts.brand
  g.fill()
  // Initiale du commerce dans l'avatar.
  g.font = '700 40px system-ui, sans-serif'
  g.fillStyle = opts.background
  g.fillText((opts.businessName[0] ?? 'C').toUpperCase(), half + half / 2, 110)
  // Nom net.
  g.font = '700 34px system-ui, sans-serif'
  g.fillStyle = opts.ink
  g.fillText(truncate(g, opts.businessName, half - 80), half + half / 2, 208)
  // Cartes produits nettes, elles.
  g.fillStyle = 'rgba(0,0,0,0.07)'
  const card = (y: number) => {
    /* fillRect reste volontairement universel : l'artefact doit aussi
       fonctionner dans les navigateurs sans Canvas roundRect. */
    g.fillRect(half + 60, y, half - 120, 62)
  }
  card(248)
  card(324)
  g.font = '600 22px system-ui, sans-serif'
  g.fillStyle = opts.brand
  g.fillText(opts.labels.after, half + half / 2, H - BANNER_H - 28)

  /* ---- Bandeau bas : la phrase de révélation ---- */
  g.fillStyle = '#141210'
  g.fillRect(0, H - BANNER_H, W, BANNER_H)
  g.textAlign = 'left'
  g.font = '700 29px system-ui, sans-serif'
  g.fillStyle = '#ffffff'
  /* La largeur réservée tient compte du bloc CLYDE à droite : sans cette
     marge, la phrase passerait dessous. */
  const bannerLines = wrapLines(g, opts.labels.banner, W - 300, 2)
  bannerLines.forEach((line, i) => {
    g.fillText(line, 48, H - BANNER_H + 46 + i * 34)
  })
  g.font = '500 21px system-ui, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.55)'
  /* Le lien se place SOUS la dernière ligne réellement écrite : une position
     fixe le ferait chevaucher dès que la phrase tient sur deux lignes. */
  g.fillText(
    `clyde.app/r/${opts.slug}`,
    48,
    H - BANNER_H + 46 + bannerLines.length * 34 + 8,
  )
  // Marque CLYDE à droite, centrée sur la hauteur du bandeau.
  g.textAlign = 'right'
  g.font = '800 34px system-ui, sans-serif'
  g.fillStyle = opts.brand
  g.fillText('CLYDE', W - 48, H - BANNER_H / 2 + 12)

  return canvas.toDataURL('image/png')
}

/**
 * Découpe un texte en lignes qui tiennent dans `maxWidth`.
 *
 * Au-delà de `maxLines`, la dernière ligne est tronquée : mieux vaut une
 * ellipsis maîtrisée qu'un débordement hors du bandeau. La coupe se fait aux
 * espaces, jamais au milieu d'un mot — un titre est un nom propre, on ne le
 * casse pas en deux.
 */
function wrapLines(
  g: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  /* Boucle indexée et non `for...of` : la reprise a besoin de la position
     réelle du mot. Avec `indexOf`, un mot répété dans la phrase (« de », « la »)
     aurait renvoyé sa PREMIÈRE occurrence et la dernière ligne aurait rejoué un
     morceau déjà écrit. */
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const candidate = current ? `${current} ${word}` : word
    if (g.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    current = word
    /* Plus de place : le reste part sur la dernière ligne, qui sera tronquée. */
    if (lines.length === maxLines - 1) {
      lines.push(truncate(g, words.slice(i).join(' '), maxWidth))
      return lines
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : [text]
}

function truncate(
  g: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (g.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && g.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}
