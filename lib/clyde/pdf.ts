import { jsPDF } from 'jspdf'
import { formatPrice } from './taxonomy'
import type { Currency, Product } from './types'

/**
 * Documents imprimables — planche de QR codes et catalogue.
 *
 * Deux besoins très concrets : coller un QR sur chaque table sans en
 * télécharger douze un par un, et pouvoir diffuser sa carte en dehors de
 * CLYDE (statut WhatsApp, impression, envoi par mail).
 *
 * `jspdf` est importé dynamiquement par les composants appelants : la
 * bibliothèque pèse quelques centaines de kilo-octets, il n'y a aucune raison
 * de l'inclure dans le paquet initial du tableau de bord.
 */

/** Format A4 en millimètres, l'unité de travail de tous les calculs ci-dessous. */
const PAGE = { width: 210, height: 297 } as const
const MARGIN = 12

/* Le noir pur vibre à l'impression jet d'encre ; ce gris très sombre reste
   lisible et se comporte mieux sur papier ordinaire. */
const INK = 26
const MUTED = 122

/**
 * Caractères que les polices standard du PDF ne savent pas écrire.
 *
 * Les polices intégrées (Helvetica et compagnie) sont limitées au jeu WinAnsi :
 * les lettres accentuées passent, mais la ligature « œ » et la typographie
 * fine n'y sont pas. jsPDF basculait alors la chaîne entière en UTF-16, que
 * ces mêmes polices ne peuvent pas rendre — « bœuf » devenait « buf » et les
 * prix se transformaient en suite de caractères vides.
 *
 * On remplace donc en amont par des équivalents que la police connaît. Perdre
 * une ligature est acceptable ; diffuser un menu au prix illisible ne l'est
 * pas. Les accents, eux, sont conservés intacts.
 */
const PDF_REPLACEMENTS: Array<[RegExp, string]> = [
  /* Ligatures françaises. */
  [/œ/g, 'oe'],
  [/Œ/g, 'OE'],
  [/æ/g, 'ae'],
  [/Æ/g, 'AE'],
  /* Apostrophes et guillemets typographiques. */
  [/[’‘‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  /* Tirets longs et puces. */
  [/[–—―]/g, '-'],
  [/…/g, '...'],
  /* Espaces spéciales — dont l'espace fine insécable que produit le
     formatage des prix en français. C'est elle qui cassait les montants. */
  [/[\u00a0\u202f\u2009\u200a\u2007]/g, ' '],
  /* Caractères invisibles : aucun rendu utile, autant les retirer. */
  [/[\u200b-\u200d\u2060\ufeff]/g, ''],
]

/**
 * Rend une chaîne écrivable par les polices standard du PDF.
 *
 * Tout texte tracé dans un document passe par ici — nom du commerce, article,
 * description, prix. Un seul caractère non pris en charge suffirait à rendre
 * sa ligne illisible.
 */
function pdfText(value: string): string {
  let out = value
  for (const [pattern, replacement] of PDF_REPLACEMENTS) {
    out = out.replace(pattern, replacement)
  }
  /* Dernier filet : ce qui resterait hors du jeu Latin-1 est écarté plutôt
     que de compromettre le rendu de toute la ligne. */
  return out.replace(/[^\u0000-\u00ff]/g, '')
}

/* Convertit un hex en triplet RVB pour jsPDF, qui ne lit pas les chaînes. */
function rgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export interface EngineerCardLabels {
  /** Nom de l'institution imprimé en tête : « Usine CLYDE ». */
  institution: string
  /** Nature du document : « Carte d'Ingénieur ». */
  document: string
  postLabel: string
  titleLabel: string
  idLabel: string
  sinceLabel: string
  /** Consigne sous le QR : à quoi il sert. */
  qrHint: string
  /** Pied de carte : la mention légère qui referme l'objet. */
  footer: string
}

/**
 * La Carte d'Ingénieur — l'artefact d'intégration.
 *
 * Format A6 portrait (105 × 148 mm) et non une carte de visite : l'objet a
 * deux vies. Dans la poche il prouve l'appartenance ; punaisé près de la
 * caisse, son QR envoie le client sur la page. Une carte de visite serait trop
 * petite pour la seconde, un A4 trop encombrant pour la première.
 *
 * Le QR arrive en PNG depuis un canvas : la génération vit côté composant,
 * cette fonction ne fait que composer le document.
 */
export function buildEngineerCard(input: {
  engineerName: string
  businessName: string
  /** Poste dans l'usine — « Ingénieur Culinaire ». */
  post: string
  /** Titre de la Révélation — « Gardien du Goût ». */
  revelationTitle: string
  /** Matricule stable — « CLYDE-ENG-000342 ». */
  engineerId: string
  since: string
  url: string
  qrDataUrl: string
  brand: string
  labels: EngineerCardLabels
}): jsPDF {
  const W = 105
  const H = 148
  const M = 10
  const doc = new jsPDF({ unit: 'mm', format: [W, H] })
  const { labels } = input
  const [br, bg, bb] = rgb(input.brand)

  /* Bandeau de marque en tête : c'est l'usine qui délivre le papier, la
     signature vient donc avant le nom du porteur. */
  doc.setFillColor(br, bg, bb)
  doc.rect(0, 0, W, 26, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(255, 255, 255)
  doc.text('CLYDE', M, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(pdfText(labels.institution.toUpperCase()), M, 19.5, {
    charSpace: 0.8,
  })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(pdfText(labels.document.toUpperCase()), W - M, 19.5, {
    align: 'right',
    charSpace: 0.5,
  })

  const contentW = W - M * 2

  /** Mesure le découpage d'un texte sans le tracer, police comprise. */
  const measure = (
    text: string,
    weight: 'normal' | 'bold',
    size: number,
  ): string[] => {
    doc.setFont('helvetica', weight)
    doc.setFontSize(size)
    return (doc.splitTextToSize(pdfText(text), contentW) as string[]).slice(0, 2)
  }

  /* ---- Tout est mesuré AVANT d'être tracé ----

     Le pied de carte (QR, mention légale) est une zone réservée de hauteur
     fixe. Le bloc d'identité au-dessus, lui, est élastique : un nom ET une
     enseigne passant chacun sur deux lignes ajoutent une douzaine de
     millimètres. Un tracé au fil de l'eau ne pouvait donc pas tenir — sur
     « Établissement Panoramique de Coiffure... », le matricule finissait par se
     superposer au QR et à la date.

     On mesure donc d'abord la hauteur réellement nécessaire, puis on resserre
     les espaces si le bloc dépasse. Les libellés et les corps de texte gardent
     leur taille : c'est le blanc qui cède, jamais la lisibilité. */
  const nameLines = measure(input.engineerName, 'bold', 17)
  const shopLines = measure(input.businessName, 'normal', 10)
  const postLines = measure(input.post, 'bold', 10.5)
  const titleLines = measure(input.revelationTitle, 'bold', 10.5)

  /* La police est fixée AVANT le découpage : `splitTextToSize` mesure avec la
     taille courante, et celle laissée par la mesure précédente (10,5) faisait
     replier la mention trop tôt — la troisième ligne, coupée par le `slice`,
     emportait le mot « commercial. ». Un texte légal amputé n'est pas une
     coquille : c'est un contresens juridique. */
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  const footerLines = (
    doc.splitTextToSize(pdfText(labels.footer), contentW) as string[]
  ).slice(0, 2)
  const FOOTER_LEAD = 2.6
  const footerY = H - 7 - (footerLines.length - 1) * FOOTER_LEAD

  const qrSize = 32
  /* Haut de la zone réservée : le QR et la mention en dessous. Le bloc
     d'identité ne doit jamais franchir cette ligne. */
  const qrY = footerY - 6 - qrSize
  const idBaselineMax = qrY - 4

  const LABEL_GAP = 4.2
  const LEAD = 5
  const NAME_LEAD = 7

  /* Les quatre respirations compressibles, à leur valeur nominale. */
  let gapShopRule = 4
  let gapRuleFields = 8
  let gapAfterField = 4.5
  let gapBeforeId = 1.5

  const idBaseline = () =>
    40 +
    nameLines.length * NAME_LEAD +
    shopLines.length * LEAD +
    gapShopRule +
    gapRuleFields +
    LABEL_GAP +
    postLines.length * LEAD +
    gapAfterField +
    LABEL_GAP +
    titleLines.length * LEAD +
    gapAfterField +
    gapBeforeId +
    LABEL_GAP

  const overflow = idBaseline() - idBaselineMax
  if (overflow > 0) {
    const flexible =
      gapShopRule + gapRuleFields + gapAfterField * 2 + gapBeforeId
    /* Plancher à 0,3 : au-delà, les blocs se toucheraient. Un nom et une
       enseigne tous deux sur deux lignes tiennent encore largement au-dessus de
       cette limite. */
    const ratio = Math.max(0.3, (flexible - overflow) / flexible)
    gapShopRule *= ratio
    gapRuleFields *= ratio
    gapAfterField *= ratio
    gapBeforeId *= ratio
  }

  let y = 40

  /* Le porteur : son nom d'abord, le commerce ensuite. La carte appartient à
     une personne, pas à une enseigne. */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(INK)
  doc.text(nameLines, M, y)
  y += nameLines.length * NAME_LEAD

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(MUTED)
  doc.text(shopLines, M, y)
  y += shopLines.length * LEAD + gapShopRule

  doc.setDrawColor(br, bg, bb)
  doc.setLineWidth(0.6)
  doc.line(M, y, M + 16, y)
  y += gapRuleFields

  /** Une ligne d'état civil : libellé discret au-dessus, valeur affirmée. */
  const field = (label: string, lines: string[]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(MUTED)
    doc.text(pdfText(label.toUpperCase()), M, y, { charSpace: 0.6 })
    y += LABEL_GAP
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(INK)
    doc.text(lines, M, y)
    y += lines.length * LEAD + gapAfterField
  }

  field(labels.postLabel, postLines)
  field(labels.titleLabel, titleLines)
  y += gapBeforeId

  /* Le matricule en chasse fixe : c'est le détail qui fait « papier
     administratif » plutôt que « badge de conférence ». */
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(MUTED)
  doc.text(pdfText(labels.idLabel.toUpperCase()), M, y, { charSpace: 0.6 })
  doc.text(pdfText(labels.sinceLabel.toUpperCase()), W / 2 + 6, y, {
    charSpace: 0.6,
  })
  y += 4.2
  doc.setFont('courier', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(INK)
  doc.text(pdfText(input.engineerId), M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(pdfText(input.since), W / 2 + 6, y)

  /* Le QR occupe le pied de carte : c'est la face « affichable en boutique »,
     celle qu'un client scanne sans avoir à lire le reste. Sa position (`qrY`) a
     été fixée avec la zone réservée, avant tout tracé. */
  doc.addImage(input.qrDataUrl, 'PNG', M, qrY, qrSize, qrSize)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(INK)
  doc.text(
    doc.splitTextToSize(pdfText(labels.qrHint), W - M * 2 - qrSize - 6) as string[],
    M + qrSize + 6,
    qrY + 8,
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)
  doc.text(
    doc.splitTextToSize(pdfText(input.url), W - M * 2 - qrSize - 6) as string[],
    M + qrSize + 6,
    qrY + 18,
  )

  /* Mention légale au bas de page, à la position calculée plus haut. */
  doc.setFontSize(6.5)
  doc.setTextColor(MUTED)
  doc.text(footerLines, M, footerY)

  return doc
}

export interface CertificateLabels {
  institution: string
  /** « Certificat de Fondation ». */
  document: string
  /** Phrase de délivrance, avec le nom du commerce en argument. */
  awarded: string
  /** Ce que le certificat atteste, en une phrase. */
  statement: string
  postLabel: string
  idLabel: string
  dateLabel: string
  signature: string
}

/**
 * Certificat de Fondation — A4 paysage, fait pour être encadré.
 *
 * Un certificat qui ressemble à une facture ne sera jamais affiché : d'où le
 * double filet, la respiration au centre et le nom du commerce en très grand.
 * C'est le seul document de CLYDE qui a le droit d'être décoratif.
 */
export function buildFoundationCertificate(input: {
  businessName: string
  engineerName: string
  post: string
  engineerId: string
  date: string
  url: string
  brand: string
  labels: CertificateLabels
}): jsPDF {
  const W = 297
  const H = 210
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const { labels } = input
  const [br, bg, bb] = rgb(input.brand)

  /* Double filet : le trait épais de marque à l'extérieur, le trait fin à
     l'intérieur. Un seul cadre ferait « bordure Word ». */
  doc.setDrawColor(br, bg, bb)
  doc.setLineWidth(1.4)
  doc.rect(10, 10, W - 20, H - 20)
  doc.setDrawColor(215)
  doc.setLineWidth(0.3)
  doc.rect(15, 15, W - 30, H - 30)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(br, bg, bb)
  doc.text('CLYDE', W / 2, 34, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)
  doc.text(pdfText(labels.institution.toUpperCase()), W / 2, 40, {
    align: 'center',
    charSpace: 1.2,
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(INK)
  doc.text(pdfText(labels.document), W / 2, 68, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(MUTED)
  doc.text(pdfText(labels.awarded), W / 2, 86, { align: 'center' })

  /* Le nom du commerce est le sujet du document : il occupe la place la plus
     grande, et se réduit plutôt que de déborder du cadre. */
  let size = 40
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(INK)
  const name = pdfText(input.businessName)
  doc.setFontSize(size)
  while (size > 18 && doc.getTextWidth(name) > W - 80) {
    size -= 2
    doc.setFontSize(size)
  }
  /* Le corps est descendu de ~10 mm : ancré plus haut, il laissait un vide
     mort entre l'attestation et les mentions de pied, et le certificat
     paraissait tomber vers le bas de la feuille. */
  doc.text(name, W / 2, 108, { align: 'center' })

  doc.setDrawColor(br, bg, bb)
  doc.setLineWidth(0.8)
  doc.line(W / 2 - 18, 119, W / 2 + 18, 119)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(MUTED)
  doc.text(
    doc.splitTextToSize(pdfText(labels.statement), W - 110) as string[],
    W / 2,
    133,
    { align: 'center' },
  )

  /* Trois mentions en pied, chacune sur son axe : lues de gauche à droite,
     elles disent qui, sous quel numéro, et quand. */
  const foot = H - 42
  const column = (x: number, label: string, value: string, mono = false) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(MUTED)
    doc.text(pdfText(label.toUpperCase()), x, foot, { charSpace: 0.6 })
    doc.setFont(mono ? 'courier' : 'helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(INK)
    doc.text(pdfText(value), x, foot + 6)
  }
  column(34, labels.postLabel, input.post)
  column(W / 2 - 24, labels.idLabel, input.engineerId, true)
  column(W - 76, labels.dateLabel, input.date)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  doc.text(pdfText(labels.signature), W / 2, H - 24, { align: 'center' })
  doc.text(pdfText(input.url), W / 2, H - 18, { align: 'center' })

  return doc
}

export interface QrSheetCard {
  /** Libellé imprimé sous le code : « Table 3 », « Chambre 105 ». */
  label: string
  /** Image PNG du QR en data URL, produite depuis un canvas. */
  dataUrl: string
}

/**
 * Planche de QR codes à découper.
 *
 * Trois colonnes sur A4 donnent des codes d'environ 55 mm de côté : assez
 * grands pour être scannés d'une main tenant le téléphone à 20 cm, assez
 * petits pour que six tables tiennent sur une page. Les traits de coupe sont
 * en pointillé gris, jamais en noir : imprimés plein, ils restent visibles sur
 * l'étiquette découpée.
 */
export function buildQrSheet(input: {
  businessName: string
  cards: QrSheetCard[]
  /** Consigne imprimée sous chaque code, dans la langue du commerçant. */
  scanHint: string
  /** Pied de page : rappel de l'adresse publique de la boutique. */
  footer: string
}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const columns = 3
  const rows = 3
  const perPage = columns * rows

  const usableWidth = PAGE.width - MARGIN * 2
  const usableHeight = PAGE.height - MARGIN * 2
  const cellWidth = usableWidth / columns
  const cellHeight = usableHeight / rows

  input.cards.forEach((card, index) => {
    const slot = index % perPage
    if (index > 0 && slot === 0) doc.addPage()

    const col = slot % columns
    const row = Math.floor(slot / columns)
    const x = MARGIN + col * cellWidth
    const y = MARGIN + row * cellHeight

    /* Bordure pointillée : c'est la ligne de découpe. */
    doc.setDrawColor(200)
    doc.setLineDashPattern([1, 1], 0)
    doc.setLineWidth(0.2)
    doc.rect(x, y, cellWidth, cellHeight)
    doc.setLineDashPattern([], 0)

    const padding = 5
    const innerWidth = cellWidth - padding * 2
    let cursor = y + padding + 4

    /* Nom du commerce, en petit : le client doit savoir chez qui il commande
       même si l'étiquette se retrouve seule sur la table. */
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(INK)
    doc.text(pdfText(input.businessName), x + cellWidth / 2, cursor, {
      align: 'center',
      maxWidth: innerWidth,
    })

    cursor += 3

    /* Le QR occupe toute la largeur utile moins une marge de confort : c'est
       la dimension qui décide de la distance de scan. */
    const qrSize = Math.min(innerWidth, cellHeight - 34)
    doc.addImage(
      card.dataUrl,
      'PNG',
      x + (cellWidth - qrSize) / 2,
      cursor,
      qrSize,
      qrSize,
    )
    cursor += qrSize + 6

    /* Libellé de l'emplacement, le plus gros élément textuel : c'est ce que le
       serveur lit d'un coup d'œil pour savoir où poser l'étiquette. */
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(INK)
    doc.text(pdfText(card.label), x + cellWidth / 2, cursor, {
      align: 'center',
      maxWidth: innerWidth,
    })

    cursor += 4.5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(MUTED)
    const hint = doc.splitTextToSize(
      pdfText(input.scanHint),
      innerWidth,
    ) as string[]
    /* Deux lignes au maximum : au-delà, la consigne dépasse de la cellule et
       chevauche l'étiquette suivante. */
    doc.text(hint.slice(0, 2), x + cellWidth / 2, cursor, { align: 'center' })
  })

  /* Pied de page sur chaque planche : sans lui, une étiquette illisible ou un
     QR abîmé ne laisse aucun moyen de retrouver la boutique. */
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(MUTED)
    doc.text(pdfText(input.footer), PAGE.width / 2, PAGE.height - 6, {
      align: 'center',
    })
  }

  return doc
}

export interface CatalogPdfLabels {
  /** « Catalogue », « Menu », « Carte » — le mot du métier. */
  catalogWord: string
  unavailable: string
  /** Ligne d'appel imprimée en tête : comment commander. */
  orderVia: string
  page: (current: number, total: number) => string
}

/**
 * Catalogue en PDF, prêt à partager.
 *
 * Pensé pour être lu sur un téléphone après un partage WhatsApp : une seule
 * colonne, des prix alignés à droite, et surtout le lien de la boutique en
 * tête de page — un PDF qui circule doit toujours ramener vers la vitrine, où
 * les prix sont à jour et la commande possible.
 */
export function buildCatalogPdf(input: {
  businessName: string
  url: string
  currency: Currency
  products: Product[]
  labels: CatalogPdfLabels
}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const { labels } = input
  const right = PAGE.width - MARGIN

  let y = MARGIN + 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(INK)
  doc.text(pdfText(input.businessName), MARGIN, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(MUTED)
  doc.text(pdfText(`${labels.catalogWord} · ${labels.orderVia}`), MARGIN, y)

  y += 5
  doc.setFontSize(9)
  doc.text(pdfText(input.url), MARGIN, y)

  y += 6
  doc.setDrawColor(220)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, right, y)
  y += 8

  /* Regroupement par rayon, dans l'ordre d'apparition du catalogue : le client
     retrouve la structure qu'il connaît de la page publique. */
  const groups = new Map<string, Product[]>()
  for (const p of input.products) {
    const key = p.category_label ?? ''
    const list = groups.get(key) ?? []
    list.push(p)
    groups.set(key, list)
  }

  /** Saut de page dès que la place manque, avant d'écrire quoi que ce soit. */
  const ensureSpace = (needed: number) => {
    if (y + needed <= PAGE.height - MARGIN - 8) return
    doc.addPage()
    y = MARGIN + 6
  }

  for (const [category, items] of groups) {
    if (category) {
      ensureSpace(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(MUTED)
      /* Capitales espacées : la hiérarchie se lit sans avoir besoin d'une
         seconde police ni d'une couleur d'accent. */
      doc.text(pdfText(category.toUpperCase()), MARGIN, y, { charSpace: 0.6 })
      y += 5.5
    }

    for (const product of items) {
      /* Le prix est assaini avant toute mesure : l'espace fine insécable du
         format français y est remplacée, et la largeur calculée doit
         correspondre au texte réellement tracé. */
      const price = pdfText(formatPrice(product.price, input.currency))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      const priceWidth = doc.getTextWidth(price)

      /* Le nom s'arrête avant le prix : sans cette réserve, un nom long passe
         sous le montant et les deux se superposent. */
      const nameWidth = right - MARGIN - priceWidth - 6
      const nameLines = doc.splitTextToSize(
        pdfText(product.name),
        nameWidth,
      ) as string[]

      const descLines = product.description
        ? (
            doc.splitTextToSize(
              pdfText(product.description),
              right - MARGIN - 4,
            ) as string[]
          ).slice(0, 2)
        : []

      ensureSpace(nameLines.length * 5 + descLines.length * 4 + 5)

      doc.setTextColor(INK)
      doc.text(nameLines, MARGIN, y)
      doc.text(price, right, y, { align: 'right' })
      y += nameLines.length * 5

      if (descLines.length) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(MUTED)
        doc.text(descLines, MARGIN, y)
        y += descLines.length * 4
      }

      /* Un article indisponible reste imprimé — il fait partie de l'offre —
         mais le dit, pour ne pas provoquer une commande impossible à honorer. */
      if (!product.available) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text(pdfText(labels.unavailable), MARGIN, y)
        y += 4
      }

      y += 3
    }

    y += 3
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(MUTED)
    doc.text(pdfText(labels.page(p, pages)), PAGE.width / 2, PAGE.height - 7, {
      align: 'center',
    })
    doc.text(pdfText(input.url), MARGIN, PAGE.height - 7)
  }

  return doc
}
