'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  GripVertical,
  Image,
  LayoutGrid,
  MapPin,
  MessageCircleQuestionMark,
  Monitor,
  Paintbrush,
  Phone,
  Plus,
  Search,
  Settings2,
  Smartphone,
  Star,
  Tags,
  Trash2,
  Video,
  X,
  CalendarClock,
  GalleryHorizontal,
  BadgePercent,
  Undo2,
  Redo2,
  Circle,
} from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PageRenderer } from '@/components/clyde/page/renderer'
import { MediaUploader } from './media-uploader'
import { BLOCK_LIBRARY, BLOCK_META, createBlock } from '@/lib/clyde/blocks'
import { useEditorDock } from '@/lib/clyde/editor-dock'
import { useLocale } from '@/lib/clyde/i18n'
import { useClyde, useSession } from '@/lib/clyde/store'
import { useOwnerContext } from './use-owner'
import {
  AMBIANCES,
  activeAmbianceId,
  applyAmbiance,
  hasCustomColors,
  resetBlockColors,
  resetOneBlockColors,
} from '@/lib/clyde/ambiances'
import type {
  Block,
  BlockStyle,
  Business,
  CatalogueBlock,
  ContactBlock,
  HeroBlock,
  HoursLocationBlock,
  PageTheme,
  BookingBlock,
  CategoriesBlock,
  CarouselBlock,
  PromoBlock,
  Product,
  SearchBlock,
  ReviewBlock,
  FaqBlock,
  BottomNavBlock,
  ImageGalleryBlock,
  VideoBlock,
  IdentityMediaBlock,
} from '@/lib/clyde/types'

const ICONS = {
  Image,
  Search,
  Tags,
  LayoutGrid,
  GalleryHorizontal,
  BadgePercent,
  CalendarClock,
  Star,
  MessageCircleQuestionMark,
  MapPin,
  Video,
  Phone,
} as const

const LABELS = {
  fr: {
    title: 'Éditer ma page',
    description: 'Construisez votre page publique, puis vérifiez-la en direct.',
    preview: 'Aperçu en direct',
    previewDesktop: 'Aperçu ordinateur',
    previewMobile: 'Aperçu mobile',
    structure: 'Structure',
    settings: 'Réglages du bloc',
    /* Libellé court réservé à la barre du téléphone : « Réglages du bloc » y
       tient sur deux lignes face à « Structure » sur une seule, ce qui déséquilibre
       les deux moitiés. L'en-tête du tiroir, lui, garde le libellé entier — c'est
       là qu'il faut dire de quoi on règle les propriétés. */
    settingsShort: 'Réglages',
    addBlock: 'Ajouter un bloc',
    visible: 'Visible sur ma page',
    hidden: 'Masqué',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    delete: 'Supprimer',
    noSelection: 'Style de la page',
    pageStyle: 'Style de la page',
    pageStyleHint: 'Fond, couleurs et identité de toute la page',
    pageGenre: 'Genre de la page',
    pageGenreHint: 'Deux façons de présenter la même page : le contenu ne change pas, seule la mise en scène change.',
    genreVitrine: 'Vitrine',
    genreVitrineDesc: 'Page magazine : couverture, sections aérées, pour se présenter.',
    genreCommande: 'Commande rapide',
    genreCommandeDesc: 'Façon appli de livraison : rayons à gauche, liste dense, pour commander vite.',
    ambiance: 'Ambiance de la page',
    ambianceHint: 'Une ambiance règle d’un coup le fond de la page, le texte et la couleur des boutons. Chaque bloc suit automatiquement — sauf si vous lui donnez ses propres couleurs.',
    pageColors: 'Couleurs de la page',
    pageBackground: 'Fond de la page',
    pageInk: 'Texte',
    pageBrand: 'Boutons & accents',
    resetColors: 'Revenir aux couleurs de la page',
    customColorsOn: 'Ce bloc a ses propres couleurs.',
    contentSection: 'Contenu',
    style: 'Apparence',
    typography: 'Typographie',
    alignment: 'Alignement',
    left: 'Gauche',
    center: 'Centre',
    right: 'Droite',
    scale: 'Taille du texte',
    weight: 'Graisse',
    colors: 'Couleurs',
    background: 'Fond du bloc',
    textColor: 'Couleur du texte',
    brandColor: 'Couleur de marque',
    spacing: 'Espacement',
    vertical: 'Vertical',
    horizontal: 'Horizontal',
    radius: 'Angles',
    sharp: 'Carré',
    soft: 'Doux',
    round: 'Rond',
    hero: 'Couverture',
    titleField: 'Titre',
    subtitle: 'Sous-titre',
    cta: 'Libellé du bouton',
    imageUrl: 'URL de l’image',
    variant: 'Position du contenu',
    height: 'Hauteur',
    overlay: 'Voile sombre',
    ctaTarget: 'Le bouton mène à',
    ctaCatalogue: 'Le catalogue',
    ctaBooking: 'Les réservations',
    ctaContact: 'WhatsApp',
    heroLogo: 'Logo dans la couverture',
    heroLogoSize: 'Taille',
    heroLogoAlign: 'Position',
    sizeS: 'Petit',
    sizeM: 'Moyen',
    sizeL: 'Grand',
    alignLeft: 'Gauche',
    alignCenter: 'Centre',
    alignRight: 'Droite',
    heroLogoHint: 'Sans image, le logo de la boutique est utilisé.',
    catalogue: 'Catalogue',
    catalogueTitle: 'Titre de section',
    display: 'Affichage',
    grid: 'Grille',
    list: 'Liste',
    columns: 'Colonnes',
    showPrice: 'Afficher les prix',
    showRating: 'Afficher les avis',
    actionLabel: 'Action produit',
    categories: 'Catégories',
    autoCategories: 'Générer depuis le catalogue',
    categoryItems: 'Catégories manuelles',
    categoryHint: 'Une catégorie par ligne.',
    categoryDisplay: 'Affichage',
    categoryWrap: 'Pastilles sur plusieurs lignes',
    categoryScroll: 'Une ligne qui glisse',
    categoryCard: 'Vignettes illustrées',
    booking: 'Réservation',
    bookingDays: 'Jours ouverts à la réservation',
    hours: 'Horaires & localisation',
    address: 'Adresse',
    mapQuery: 'Recherche de carte',
    contact: 'Contact',
    phone: 'Téléphone',
    email: 'Email',
    descriptionField: 'Description',
    publicPage: 'Ouvrir ma page',
  undo: 'Annuler',
  redo: 'Rétablir',
  readiness: 'Votre page est prête à',
  readinessDone: 'Votre page est complète.',
    empty: 'Ajoutez un bloc pour commencer.',
    demoTitle: 'Explorer le constructeur de page',
    demoDescription: 'Connectez-vous en mode démo pour inspecter les blocs, les réglages et la preview live.',
    demoButton: 'Entrer dans la démo',
  },
  en: {
    title: 'Edit my page',
    description: 'Build your public page, then check it live as you edit.',
    preview: 'Live preview',
    previewDesktop: 'Desktop preview',
    previewMobile: 'Mobile preview',
    structure: 'Structure',
    settings: 'Block settings',
    settingsShort: 'Settings',
    addBlock: 'Add a block',
    visible: 'Visible on my page',
    hidden: 'Hidden',
    moveUp: 'Move up',
    moveDown: 'Move down',
    delete: 'Delete',
    noSelection: 'Page style',
    pageStyle: 'Page style',
    pageStyleHint: 'Background, colors, and identity of the whole page',
    pageGenre: 'Page genre',
    pageGenreHint: 'Two ways to present the same page: content stays, only the staging changes.',
    genreVitrine: 'Showcase',
    genreVitrineDesc: 'Magazine page: cover, airy sections, made to present yourself.',
    genreCommande: 'Quick order',
    genreCommandeDesc: 'Delivery-app style: aisles on the left, dense list, made to order fast.',
    ambiance: 'Page mood',
    ambianceHint: 'A mood sets the page background, text, and button color at once. Every block follows automatically — unless you give it its own colors.',
    pageColors: 'Page colors',
    pageBackground: 'Page background',
    pageInk: 'Text',
    pageBrand: 'Buttons & accents',
    resetColors: 'Back to page colors',
    customColorsOn: 'This block has its own colors.',
    contentSection: 'Content',
    style: 'Appearance',
    typography: 'Typography',
    alignment: 'Alignment',
    left: 'Left',
    center: 'Center',
    right: 'Right',
    scale: 'Text size',
    weight: 'Weight',
    colors: 'Colors',
    background: 'Block background',
    textColor: 'Text color',
    brandColor: 'Brand color',
    spacing: 'Spacing',
    vertical: 'Vertical',
    horizontal: 'Horizontal',
    radius: 'Corners',
    sharp: 'Sharp',
    soft: 'Soft',
    round: 'Round',
    hero: 'Cover',
    titleField: 'Title',
    subtitle: 'Subtitle',
    cta: 'Button label',
    imageUrl: 'Image URL',
    variant: 'Content position',
    height: 'Height',
    overlay: 'Dark overlay',
    ctaTarget: 'Button goes to',
    ctaCatalogue: 'The catalog',
    ctaBooking: 'Bookings',
    ctaContact: 'WhatsApp',
    heroLogo: 'Logo on the cover',
    heroLogoSize: 'Size',
    heroLogoAlign: 'Position',
    sizeS: 'Small',
    sizeM: 'Medium',
    sizeL: 'Large',
    alignLeft: 'Left',
    alignCenter: 'Center',
    alignRight: 'Right',
    heroLogoHint: 'Without an image, the shop logo is used.',
    catalogue: 'Catalog',
    catalogueTitle: 'Section title',
    display: 'Display',
    grid: 'Grid',
    list: 'List',
    columns: 'Columns',
    showPrice: 'Show prices',
    showRating: 'Show ratings',
    actionLabel: 'Product action',
    categories: 'Categories',
    autoCategories: 'Generate from catalog',
    categoryItems: 'Manual categories',
    categoryHint: 'One category per line.',
    categoryDisplay: 'Display',
    categoryWrap: 'Chips on several lines',
    categoryScroll: 'Single sliding row',
    categoryCard: 'Illustrated tiles',
    booking: 'Booking',
    bookingDays: 'Days open for booking',
    hours: 'Hours & location',
    address: 'Address',
    mapQuery: 'Map search',
    contact: 'Contact',
    phone: 'Phone',
    email: 'Email',
    descriptionField: 'Description',
    publicPage: 'Open my page',
  undo: 'Undo',
  redo: 'Redo',
  readiness: 'Your page is',
  readinessDone: 'Your page is complete.',
    empty: 'Add a block to get started.',
    demoTitle: 'Explore the Page Builder',
    demoDescription: 'Use demo mode to inspect blocks, settings, and the live preview before connecting your account.',
    demoButton: 'Enter demo mode',
  },
} as const

type Copy = (typeof LABELS)[keyof typeof LABELS]

/**
 * Enveloppe triable d'une ligne de bloc. La poignée seule saisit le bloc
 * (`handleProps` posés sur le grip) : le reste de la ligne garde ses taps —
 * sélection, flèches, interrupteur.
 */
function SortableBlockRow({
  id,
  children,
}: {
  id: string
  children: (args: { handleProps: Record<string, unknown> }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 rounded-lg bg-background opacity-90 shadow-lg' : undefined}
    >
      {children({ handleProps: { ...attributes, ...listeners, ref: setActivatorNodeRef } })}
    </div>
  )
}

function updateBlock<T extends Block>(blocks: Block[], id: string, patch: Partial<T>) {
  return blocks.map((block) =>
    block.id === id ? ({ ...block, ...patch } as Block) : block,
  )
}

export function PageEditor() {
  const { locale } = useLocale()
  const copy = LABELS[locale]
  const { business, page } = useOwnerContext()
  const updateLayout = useClyde((s) => s.updateLayout)
  const updateTheme = useClyde((s) => s.updateTheme)
  const products = useClyde((s) => s.products)
  const availability = useClyde((s) => s.availability)
  const [selectedId, setSelectedId] = useState<string | null>(page?.layout_json[0]?.id ?? null)
  const [addOpen, setAddOpen] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  /* Sur téléphone, structure et réglages vivent dans des tiroirs bas : la
     page ne montre que l'aperçu — trois cartes empilées noyaient l'écran. */
  const [mobilePanel, setMobilePanel] = useState<'structure' | 'settings' | null>(null)
  /* Dans le tiroir Structure (mobile), les réglages du bloc s'ouvrent en
     accordéon SOUS le bloc touché : pas d'aller-retour entre deux tiroirs. */
  const [expandedId, setExpandedId] = useState<string | null>(null)
  /* Historique d'annulation. Deux piles d'états de mise en page : `commit()`
     étant l'entonnoir unique de TOUTE modification (ajout, suppression,
     réglage, réordonnancement), il suffit d'y empiler l'état précédent pour
     que chaque geste devienne réversible. Plafonné à 50 pas : au-delà,
     personne ne remonte, et la mémoire n'a pas à grandir sans fin. */
  const [past, setPast] = useState<Block[][]>([])
  const [future, setFuture] = useState<Block[][]>([])

  /* Glisser-déposer de la liste de blocs : la souris exige 6 px de mouvement
     avant de saisir (un clic reste un clic), le doigt 200 ms d'appui (un
     défilement reste un défilement). */
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /* Publie les trois actions du constructeur dans le dock mobile tant que
     l'éditeur est à l'écran, et les retire en partant pour que le dock retrouve
     sa navigation. « Ajouter » ouvre le tiroir Structure directement sur la
     bibliothèque : sur un téléphone, ajouter un bloc est le geste le plus
     fréquent, et il ne doit pas coûter deux appuis. */
  const registerDock = useEditorDock((s) => s.register)
  useEffect(() => {
    registerDock((panel) => {
      if (panel === 'library') {
        setAddOpen(true)
        setMobilePanel('structure')
        return
      }
      setMobilePanel(panel)
    })
    return () => registerDock(null)
  }, [registerDock])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    setPreviewDevice(media.matches ? 'mobile' : 'desktop')
  }, [])

  /* Raccourcis d'annulation. Ignorés pendant une saisie : dans un champ de
     texte, Ctrl+Z doit annuler les caractères tapés, pas la mise en page.
     Les fonctions `undo`/`redo` sont des déclarations hoistées du corps du
     composant, donc résolues à l'exécution de l'écouteur. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })


  const blocks = page?.layout_json ?? []
  const selected = blocks.find((block) => block.id === selectedId) ?? null
  const availableBlocks = useMemo(
    () => BLOCK_LIBRARY.filter((meta) => !meta.unique || !blocks.some((b) => b.type === meta.type)),
    [blocks],
  )

  if (!business || !page) return null


  function commit(next: Block[]) {
    /* L'état AVANT modification part sur la pile d'annulation, et la pile de
       rétablissement se vide : une nouvelle branche efface l'ancien futur,
       comme dans tout éditeur. */
    setPast((stack) => [...stack.slice(-49), blocks])
    setFuture([])
    updateLayout(business!.id, next)
    setPreviewKey((key) => key + 1)
  }

  /* Restaure un état sans l'empiler à son tour : on déplace entre les deux
     piles au lieu de passer par `commit()`, qui écraserait l'historique. */
  function restore(next: Block[]) {
    updateLayout(business!.id, next)
    setPreviewKey((key) => key + 1)
    /* Le bloc sélectionné peut ne plus exister dans l'état restauré (annulation
       d'un ajout) : la sélection retombe alors sur le style global. */
    setSelectedId((current) =>
      current && next.some((block) => block.id === current) ? current : null,
    )
  }

  function undo() {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    setPast((stack) => stack.slice(0, -1))
    setFuture((stack) => [blocks, ...stack])
    restore(previous)
  }

  function redo() {
    if (future.length === 0) return
    const [next, ...rest] = future
    setFuture(rest)
    setPast((stack) => [...stack, blocks])
    restore(next)
  }

  function patchSelected(patch: Partial<Block>) {
    if (!selected) return
    commit(updateBlock(blocks, selected.id, patch))
  }

  function toggleHidden(id: string) {
    commit(blocks.map((block) => (block.id === id ? { ...block, hidden: !block.hidden } : block)))
  }

  function move(id: string, direction: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return
    const next = [...blocks]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    commit(next)
  }

  /* Réordonnancement par glisser-déposer — complète les flèches, qui restent
     là pour l'accessibilité et les petits ajustements. */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((block) => block.id === active.id)
    const newIndex = blocks.findIndex((block) => block.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    commit(arrayMove(blocks, oldIndex, newIndex))
  }

  function add(type: Block['type']) {
    const block = createBlock(type)
    commit([...blocks, block])
    setSelectedId(block.id)
    setAddOpen(false)
  }

  function removeSelected() {
    if (!selected) return
    const next = blocks.filter((block) => block.id !== selected.id)
    commit(next)
    setSelectedId(next[0]?.id ?? null)
  }

  /* Garde-fou de qualité : ce qui manque pour qu'une vitrine soit vendeuse.
     Rien n'est bloqué — on montre. Un commerçant qui publie sans photo ni
     numéro n'a pas fait un choix, il a oublié une étape. Les critères sont
     ceux qui décident d'une commande : voir, comprendre le prix, contacter. */
  const mine = products.filter((p) => p.business_id === business.id && p.active)
  const checks = [
    { done: mine.length >= 3, label: locale === 'fr' ? '3 articles au catalogue' : '3 items in the catalogue' },
    {
      done: mine.length > 0 && mine.filter((p) => p.media_urls.length > 0).length >= Math.min(3, mine.length),
      label: locale === 'fr' ? 'Une photo par article' : 'A photo on each item',
    },
    {
      done: mine.some((p) => p.price > 0),
      label: locale === 'fr' ? 'Des prix renseignés' : 'Prices filled in',
    },
    {
      done: Boolean(business.whatsapp_number?.trim()),
      label: locale === 'fr' ? 'Un numéro WhatsApp' : 'A WhatsApp number',
    },
    {
      done: blocks.some((b) => b.type === 'catalogue' && !b.hidden),
      label: locale === 'fr' ? 'Le catalogue affiché' : 'The catalogue shown',
    },
    {
      done: blocks.some((b) => b.type === 'contact' && !b.hidden),
      label: locale === 'fr' ? 'Un moyen de vous joindre' : 'A way to reach you',
    },
  ]
  const doneCount = checks.filter((c) => c.done).length
  const readiness = Math.round((doneCount / checks.length) * 100)

  /* Panneaux partagés entre les cartes desktop et les tiroirs mobiles : une
     seule source de vérité pour la liste des blocs et l'inspecteur, deux
     conteneurs différents. */
  const structurePanel = (
    <>
      {/* Accès permanent au style GLOBAL de la page (fond, ambiance,
          couleurs) : il était introuvable — caché derrière « aucun bloc
          sélectionné ». En tête de liste, il précède les blocs comme la page
          précède ses sections. */}
      <button
        type="button"
        onClick={() => {
          setSelectedId(null)
          if (mobilePanel === 'structure') setMobilePanel('settings')
        }}
        className={`mb-2 flex min-h-11 w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm font-medium ${selectedId === null ? 'border-primary/40 bg-primary/10 text-primary' : 'border-dashed hover:bg-muted'}`}
      >
        <Paintbrush className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{copy.pageStyle}</span>
      </button>
      {addOpen && (
        <div className="mb-2 flex flex-col gap-1 rounded-xl border bg-muted/40 p-2">
          {availableBlocks.map((meta) => {
            const Icon = ICONS[meta.icon as keyof typeof ICONS] ?? LayoutGrid
            return (
              <button
                key={meta.type}
                type="button"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-background"
                onClick={() => add(meta.type)}
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                <Plus className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
            )
          })}
        </div>
      )}
      {blocks.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center p-5 text-center text-sm text-muted-foreground">{copy.empty}</div>
      ) : (
        /* Le glisser-déposer complète les flèches : saisir la poignée et poser
           le bloc où l'on veut va plus vite que de le faire monter cran par
           cran. `restrictToVerticalAxis` : la liste est une colonne, le bloc
           ne doit pas partir en diagonale sous le doigt. */
        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {blocks.map((block, index) => {
                const meta = BLOCK_LIBRARY.find((item) => item.type === block.type)
                const Icon = ICONS[meta?.icon as keyof typeof ICONS] ?? LayoutGrid
                const active = selectedId === block.id
                /* Accordéon réservé au tiroir mobile : sur bureau, la colonne
                   Réglages (ou son tiroir) fait déjà ce travail. */
                const expanded = mobilePanel === 'structure' && expandedId === block.id
                return (
                  <SortableBlockRow key={block.id} id={block.id}>
                    {({ handleProps }) => (
                      <>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            {...handleProps}
                            className="flex min-h-9 shrink-0 cursor-grab touch-none items-center rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
                            aria-label={`${meta?.label ?? block.type} — glisser pour déplacer`}
                          >
                            <GripVertical className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(block.id)
                              /* Dans le tiroir mobile, le tap déplie les réglages
                                 SOUS le bloc — pas de second tiroir à ouvrir. */
                              if (mobilePanel === 'structure') {
                                setExpandedId((current) => (current === block.id ? null : block.id))
                              }
                            }}
                            className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                          >
                            <Icon className="size-4 shrink-0" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{meta?.label ?? block.type}</span>
                            {block.hidden && <span className="text-[11px] text-muted-foreground">{copy.hidden}</span>}
                            {mobilePanel === 'structure' && (
                              <ChevronDown
                                className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
                                aria-hidden
                              />
                            )}
                          </button>
                          <div className="flex shrink-0 items-center">
                            <button type="button" onClick={() => move(block.id, -1)} disabled={index === 0} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label={copy.moveUp}>
                              <ChevronUp className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => move(block.id, 1)} disabled={index === blocks.length - 1} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label={copy.moveDown}>
                              <ChevronDown className="size-3.5" />
                            </button>
                            <Switch checked={!block.hidden} onCheckedChange={() => toggleHidden(block.id)} aria-label={copy.visible} />
                          </div>
                        </div>
                        {expanded && (
                          <div className="mt-1 mb-2 rounded-xl border bg-muted/30 p-3">
                            <BlockSettings
                              block={block}
                              businessId={business.id}
                              products={products}
                              copy={copy}
                              onChange={(patch) => commit(updateBlock(blocks, block.id, patch))}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-3 w-full justify-center text-destructive hover:text-destructive"
                              onClick={() => {
                                setExpandedId(null)
                                const next = blocks.filter((b) => b.id !== block.id)
                                commit(next)
                                if (selectedId === block.id) setSelectedId(next[0]?.id ?? null)
                              }}
                            >
                              <Trash2 data-icon="inline-start" />
                              {copy.delete}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </SortableBlockRow>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  )

  /* Sans bloc sélectionné, le panneau montre le STYLE DE LA PAGE (ambiances,
     couleurs globales) puis l'identité de la vitrine — au lieu d'un simple
     « sélectionnez un bloc » : c'est là qu'on cherchait en vain le fond de la
     page entière. */
  const settingsPanel = selected ? (
    <BlockSettings block={selected} businessId={business.id} products={products} copy={copy} onChange={patchSelected} />
  ) : (
    <div className="flex flex-col gap-6">
      <PageStyleSettings
        theme={page.theme_json}
        onTheme={(theme, alsoResetBlocks) => {
          updateTheme(business.id, theme)
          if (alsoResetBlocks) commit(resetBlockColors(blocks))
          else setPreviewKey((key) => key + 1)
        }}
      />
      <Separator />
      <StorefrontIdentity business={business} locale={locale} />
    </div>
  )

  /* `pb-28` : le bas de page ne doit dégager que le dock (≈ 5.5rem + son
     retrait). `pb-40` réservait 160 px pour deux barres empilées — la seconde
     ayant disparu, cette marge laissait un vide sous le contenu. */
  return (
    <main className="flex min-h-dvh flex-col gap-6 p-4 pb-28 md:p-8 lg:pb-8">
      {/* Sur téléphone le titre et le bouton partagent la même ligne, et la
          phrase d'explication passe dessous. Empilés, ils poussaient l'aperçu à
          253 px du haut d'un écran de 844 : l'essentiel de l'outil — voir sa
          page changer — commençait sous le premier tiers de l'écran. */}
      <header className="flex flex-col gap-2">
        {/* Titre et bouton sur une seule ligne, la phrase d'explication dessous.
            Un seul bouton pour toutes les tailles : le dupliquer par point de
            rupture laisserait deux copies à maintenir, avec le risque qu'elles
            divergent. */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{copy.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {/* Annuler / Rétablir. Un builder sans marche arrière rend chaque
                suppression définitive : c'est le défaut le plus cité en test
                utilisateur. Désactivés quand la pile est vide, pour que l'état
                de l'historique soit lisible sans cliquer. */}
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                onClick={undo}
                disabled={past.length === 0}
                aria-label={copy.undo}
                title={`${copy.undo} (Ctrl+Z)`}
                className="flex size-9 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Undo2 className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={future.length === 0}
                aria-label={copy.redo}
                title={`${copy.redo} (Ctrl+Shift+Z)`}
                className="flex size-9 items-center justify-center rounded-r-lg border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <Redo2 className="size-4" aria-hidden="true" />
              </button>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(`/r/${business.slug}`, '_blank', 'noopener,noreferrer')}
            >
              <Eye data-icon="inline-start" />
              {/* Sous 640 px le libellé disputerait sa place au titre : l'icône
                  seule suffit, le nom restant lisible par les lecteurs d'écran. */}
              <span className="hidden sm:inline">{copy.publicPage}</span>
              <span className="sr-only sm:hidden">{copy.publicPage}</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{copy.description}</p>

        {/* Score de complétion : une jauge et les deux manques les plus
            proches. Complet, le bandeau disparaît — un indicateur toujours
            présent finit par ne plus rien signaler. */}
        {readiness < 100 && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="text-sm font-medium">
                {copy.readiness} <span className="font-semibold">{readiness}%</span>
              </p>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuenow={readiness}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${readiness}%` }} />
              </div>
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {checks
                .filter((c) => !c.done)
                .slice(0, 3)
                .map((c) => (
                  <li key={c.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Circle className="size-3 shrink-0" aria-hidden="true" />
                    {c.label}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </header>

      {/* `2xl:` (1536px) plutôt que `min-[1600px]:` : les deux variantes ont la
          même spécificité, et Tailwind émet les variantes arbitraires AVANT les
          variantes nommées. La règle à trois colonnes était donc écrasée par le
          `lg:` à deux colonnes qui la suivait dans la feuille de style — la
          troisième colonne ne s'ouvrait à aucune taille d'écran. L'ordre
          lg < xl < 2xl, lui, est garanti. */}
      {/* `lg:h-…` fixe (et non seulement min-h) : les cartes héritent d'une
          hauteur bornée, condition pour que `flex-1` + `overflow-auto` fassent
          défiler l'aperçu et la liste de blocs À L'INTÉRIEUR de leur carte.
          Avec une simple min-height, l'aperçu grandissait à la taille de son
          contenu (page entière) et rien ne défilait en interne. */}
      {/* Sur téléphone, pas de `min-h` calée sur la hauteur d'écran : elle
          forçait la grille (donc l'aperçu) à dépasser sous le dock d'outils
          flottant, qui recouvrait alors la barre basse de la vitrine simulée.
          La grille se dimensionne au contenu, et c'est l'aperçu (ligne
          suivante) qui borne sa propre hauteur pour rester au-dessus du dock.
          Sur grand écran, le dock n'existe pas : la hauteur pleine revient. */}
      <div className="grid min-w-0 gap-5 lg:h-[calc(100dvh-150px)] lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Structure : carte visible sur grand écran seulement — sur téléphone
            elle vit dans le tiroir bas. */}
        <Card className="hidden min-h-0 min-w-0 flex-col overflow-hidden lg:flex">
          <CardHeader className="gap-3 border-b">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{copy.structure}</CardTitle>
                <CardDescription>{blocks.length} blocks</CardDescription>
              </div>
              <Button size="icon" variant="outline" aria-label={copy.addBlock} onClick={() => setAddOpen((open) => !open)}>
                <Plus />
              </Button>
            </div>
          </CardHeader>
          {/* `overflow-x-hidden` : la rangée flèches + interrupteur pouvait
              dépasser d'un ou deux pixels et faire apparaître une glissière
              horizontale sous la liste — un défaut visuel sans utilité. */}
          <CardContent className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2">{structurePanel}</CardContent>
        </Card>

        <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-4">
            <CardTitle className="flex items-center gap-2 text-base"><Eye className="size-4" />{copy.preview}</CardTitle>
            <div className="flex items-center rounded-lg bg-muted p-1" role="group" aria-label={copy.preview}>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                aria-label={copy.previewDesktop}
                aria-pressed={previewDevice === 'desktop'}
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Monitor className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                aria-label={copy.previewMobile}
                aria-pressed={previewDevice === 'mobile'}
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Smartphone className="size-4" aria-hidden="true" />
              </button>
            </div>
          </CardHeader>
          {/* Mêmes proportions que l'aperçu de la page d'accueil : `PageRenderer`
              rendu directement, plafonné à 330 px en mode téléphone. L'iframe
              précédente chargeait la vitrine publique entière, ce qui ajoutait
              sa barre d'actions flottante par-dessus celle du bloc couverture —
              d'où les boutons « S'abonner » et « Partager » en double — et
              écrasait la mise en page dans la largeur du cadre. */}
          {/* `p-1.5` sur téléphone, décoratif `md:p-6` seulement à partir de la
              tablette : sur un écran de 416 px, les marges empilées (page, carte,
              contenu) réduisaient le cadre d'aperçu à 280 px — une largeur
              qu'aucun téléphone réel n'a. Le titre de la couverture s'y repliait
              en plein mot, ce que le commerçant lisait comme « ma page est
              cassée » alors que seule la maquette était trop étroite.

              Même raison pour `max-w-[390px]` au lieu de 330 : c'est la largeur
              d'un téléphone courant, donc ce que la page donnera vraiment. */}
          {/* `flex-1` + `lg:h-full` sur le défilement interne : sur bureau,
              l'aperçu occupe toute la hauteur disponible de la grille (elle-même
              calée sur la hauteur de l'écran) au lieu d'un plafond arbitraire de
              540 px — les réglages de bloc, plus hauts, le dépassaient de loin. */}
          <CardContent className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/30 p-1.5 md:p-6">
            <div
              className={`clyde-mock overflow-hidden rounded-xl border shadow-sm transition-all duration-300 ${previewDevice === 'mobile' ? 'w-full max-w-[390px]' : 'w-full'}`}
            >
              {/* Téléphone : la hauteur du simulateur se cale sur l'espace
                  réellement libre entre l'en-tête de l'éditeur et le dock
                  d'outils flottant (`~27rem` de chrome au-dessus + dock en
                  dessous), avec un plancher pour rester utilisable sur les
                  petits écrans. Une hauteur fixe de 540px passait sous le
                  dock, qui masquait la barre basse de la vitrine simulée.
                  Sur grand écran, le simulateur occupe toute la carte. */}
              <div className="clyde-no-scrollbar h-[calc(100dvh-27rem)] min-h-[20rem] overflow-y-auto lg:h-full lg:min-h-[540px]">
                <PageRenderer
                  key={`${previewKey}-${previewDevice}`}
                  business={business}
                  products={products}
                  availability={availability}
                  theme={page.theme_json}
                  blocks={blocks.filter((block) => !block.hidden)}
                  device={previewDevice}
                  /* Aperçu « en direct » au sens plein : les boutons, filtres
                     et cartes répondent comme sur la page publique, pour que le
                     commerçant teste sa page sans quitter l'éditeur. */
                  interactive
                  /* Sélection au clic DANS l'aperçu — le geste naturel, celui
                     de Framer ou Webflow. La liste latérale restait le seul
                     moyen de désigner une section, alors que le commerçant
                     pointe naturellement ce qu'il voit.

                     Pas de `stopPropagation` : le clic sélectionne ET traverse
                     jusqu'au bouton visé, pour que l'aperçu reste jouable. */
                  wrapBlock={(block, node) => (
                    <div
                      onClick={() => {
                        setSelectedId(block.id)
                        /* Sous 1280px les réglages vivent dans un tiroir :
                           sélectionner sans l'ouvrir ne montrerait rien. */
                        if (window.innerWidth < 1280) setMobilePanel('settings')
                      }}
                      className={`group/blk relative cursor-pointer ${
                        selectedId === block.id
                          ? 'outline-2 -outline-offset-2 outline-primary'
                          : 'hover:outline-2 hover:-outline-offset-2 hover:outline-primary/40'
                      }`}
                    >
                      {node}
                      <span
                        className={`pointer-events-none absolute top-1 left-1 z-30 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground transition-opacity ${
                          selectedId === block.id ? 'opacity-100' : 'opacity-0 group-hover/blk:opacity-100'
                        }`}
                      >
                        {BLOCK_META[block.type]?.label ?? block.type}
                      </span>
                    </div>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Réglages : carte seulement là où la grille lui donne vraiment une
            troisième colonne, donc au même seuil `2xl:` que celle-ci.

            Elle s'affichait dès `lg:` (1024px) alors que la grille n'y définit
            que deux colonnes : la carte passait à la ligne suivante, sous
            l'aperçu, dans une colonne de 260px — à plus de 1000px de haut. En
            dessous de `2xl:`, on garde le tiroir bas, qui présente les mêmes
            réglages sur toute la largeur. */}
        <Card className="hidden min-h-0 min-w-0 overflow-hidden xl:block">
          <CardHeader className="flex flex-row items-start justify-between gap-3 border-b">
            <div>
              {/* Sans bloc sélectionné, le panneau montre le style GLOBAL :
                  titrer « Réglages du bloc » ferait chercher un bloc qui
                  n'existe pas. */}
              <CardTitle className="text-base">
                {selected ? copy.settings : copy.pageStyle}
              </CardTitle>
              <CardDescription>
                {selected ? (BLOCK_META[selected.type]?.label ?? selected.type) : copy.pageStyleHint}
              </CardDescription>
            </div>
            {selected && <Button size="icon" variant="ghost" onClick={removeSelected} aria-label={copy.delete}><Trash2 /></Button>}
          </CardHeader>
          <CardContent className="min-h-0 overflow-y-auto p-4">
            {/* Aucun bloc sélectionné : plutôt qu'un panneau vide, on expose
                l'identité de la vitrine — c'est elle qui alimente la vignette
                de la marketplace. */}
            {settingsPanel}
          </CardContent>
        </Card>
      </div>

      {/* Accès aux réglages pour la seule plage `lg` → `2xl`.

          Sur téléphone et tablette (< `lg`), ces outils vivent maintenant dans
          le dock du bas, qui est le repère permanent de l'application : une
          seconde barre flottante juste au-dessus de lui coûtait 157 px de haut à
          elles deux sur un écran de 844, au détriment de l'aperçu.

          Reste la plage `lg` → `2xl` : le dock y est masqué, la carte Structure
          est visible, mais la carte Réglages n'a pas encore sa colonne. Ce
          bouton compact, ancré en bas à droite, est alors le seul accès aux
          réglages. */}
      {/* `right-24` et non `right-6` : le lecteur de musique flottant occupe
          déjà le coin bas-droit (`sm:right-6`, z-60) — les deux se
          chevauchaient. Le bouton se décale à sa gauche. */}
      <div className="fixed right-24 bottom-6 z-40 hidden items-center rounded-2xl border border-border bg-background/95 p-1.5 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:flex xl:hidden">
        <button
          type="button"
          onClick={() => setMobilePanel('settings')}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold transition-transform active:scale-95"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          {copy.settingsShort}
        </button>
      </div>

      {/* Tiroir Structure. */}
      <Sheet open={mobilePanel === 'structure'} onOpenChange={(open) => setMobilePanel(open ? 'structure' : null)}>
        {/* Même seuil que la barre qui l'ouvre : en `lg:hidden`, le tiroir était
            masqué alors que son bouton restait cliquable — un tap n'ouvrait rien
            entre 1024 et 1600px. */}
        <SheetContent side="bottom" className="max-h-[78dvh] gap-0 rounded-t-2xl p-0 xl:hidden">
          {/* pr-12 : la croix de fermeture du Sheet occupe le coin droit. */}
          <SheetHeader className="flex-row items-center justify-between border-b py-3 pr-12 pl-4">
            <SheetTitle className="text-base">{copy.structure} · {blocks.length}</SheetTitle>
            <Button size="sm" variant="outline" onClick={() => setAddOpen((open) => !open)}>
              <Plus data-icon="inline-start" />
              {copy.addBlock}
            </Button>
          </SheetHeader>
          <div className="min-h-0 overflow-x-hidden overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{structurePanel}</div>
        </SheetContent>
      </Sheet>

      {/* Tiroir Réglages. */}
      <Sheet open={mobilePanel === 'settings'} onOpenChange={(open) => setMobilePanel(open ? 'settings' : null)}>
        <SheetContent side="bottom" className="max-h-[78dvh] gap-0 rounded-t-2xl p-0 xl:hidden">
          <SheetHeader className="flex-row items-center justify-between border-b py-3 pr-12 pl-4">
            <SheetTitle className="text-base">
              {selected ? copy.settings : copy.pageStyle}
              {/* Le nom lisible du bloc, pas son type technique : la liste
                  juste avant affiche « Barre de recherche », afficher ici
                  « search » obligerait à faire le rapprochement soi-même. */}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {selected ? (BLOCK_META[selected.type]?.label ?? selected.type) : ''}
              </span>
            </SheetTitle>
            {selected && (
              <Button size="icon" variant="ghost" onClick={removeSelected} aria-label={copy.delete}>
                <Trash2 />
              </Button>
            )}
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{settingsPanel}</div>
        </SheetContent>
      </Sheet>
    </main>
  )
}

/**
 * Identité de la vitrine : couverture, logo et présence dans l'annuaire.
 *
 * La couverture ne servait nulle part alors que la marketplace en a besoin pour
 * distinguer les commerces. Elle se règle donc ici, à côté du logo.
 */
function StorefrontIdentity({
  business,
  locale,
}: {
  business: Business
  locale: 'fr' | 'en'
}) {
  const updateBusiness = useClyde((s) => s.updateBusiness)
  const fr = locale === 'fr'

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">
          {fr ? 'Identité de la vitrine' : 'Storefront identity'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {fr
            ? 'Ces images représentent votre commerce dans la marketplace et en haut de votre page.'
            : 'These images represent your business in the marketplace and at the top of your page.'}
        </p>
      </div>

      <Field label={fr ? 'Image de couverture' : 'Cover image'}>
        <MediaUploader
          businessId={business.id}
          kind="cover"
          accept="image/*"
          value={business.cover_url ?? ''}
          onChange={(value) =>
            updateBusiness(business.id, {
              cover_url: (Array.isArray(value) ? value[0] : value) || null,
            })
          }
          label={fr ? 'Ajouter une couverture' : 'Add a cover'}
        />
      </Field>

      <Field label={fr ? 'Logo' : 'Logo'}>
        <MediaUploader
          businessId={business.id}
          kind="logo"
          accept="image/*"
          value={business.logo_url ?? ''}
          onChange={(value) =>
            updateBusiness(business.id, {
              logo_url: (Array.isArray(value) ? value[0] : value) || null,
            })
          }
          label={fr ? 'Ajouter un logo' : 'Add a logo'}
        />
      </Field>

      <ToggleRow
        label={fr ? 'Visible dans la marketplace' : 'Listed in the marketplace'}
        checked={business.listed_in_marketplace}
        onChange={(listed_in_marketplace) =>
          updateBusiness(business.id, { listed_in_marketplace })
        }
      />
      <ToggleRow
        label={fr ? 'Afficher le nombre d’abonnés' : 'Show follower count'}
        checked={business.followers_public}
        onChange={(followers_public) =>
          updateBusiness(business.id, { followers_public })
        }
      />
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label>{label}</Label>{children}</div>
}

/* Distingue un fichier téléversé (Blob / fichier direct) d'un lien YouTube,
   pour router la même valeur `url` vers le bon champ des réglages Vidéo. */
function isUploadedVideo(url: string): boolean {
  if (!url) return false
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url) || url.includes('blob.vercel-storage.com')
}

function BlockSettings({ block, businessId, products, copy, onChange }: { block: Block; businessId: string; products: Product[]; copy: Copy; onChange: (patch: Partial<Block>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      {(['hero', 'catalogue', 'categories', 'carousel', 'promo', 'search', 'reviews', 'faq', 'booking', 'hours_location', 'contact', 'identity_media', 'image_gallery', 'bottom_nav', 'video'] as const).includes(block.type as never) && (
        <CoreSettings block={block} businessId={businessId} products={products} copy={copy} onChange={onChange} />
      )}
      <StyleSettings block={block} copy={copy} onChange={onChange} />
    </div>
  )
}

function CoreSettings({ block, businessId, products, copy, onChange }: { block: Block; businessId: string; products: Product[]; copy: Copy; onChange: (patch: Partial<Block>) => void }) {
  if (block.type === 'hero') {
    const b = block as HeroBlock
    {/* Plus de champs « bouton » : la couverture n'a plus de CTA — le
        catalogue est immédiatement dessous, un bouton n'y menait qu'en
        doublon. Rester sur titre, sous-titre, image et photo de profil garde
        l'inspecteur aussi minimal que le rendu. */}
    return <section className="flex flex-col gap-4"><h3 className="font-medium">{copy.hero}</h3><Field label={copy.titleField}><Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} /></Field><Field label={copy.subtitle}><Textarea value={b.subtitle} onChange={(e) => onChange({ subtitle: e.target.value })} /></Field><Field label="Image de couverture">
      {/* Téléversement d'abord (le vendeur a la photo sur son téléphone),
          l'URL reste possible en dessous pour une image déjà hébergée. */}
      <MediaUploader
        businessId={businessId}
        kind="cover"
        accept="image/*"
        value={b.imageUrl}
        onChange={(url) => onChange({ imageUrl: (Array.isArray(url) ? url[0] : url) || '' })}
        label="Téléverser une image de couverture"
      />
      <Input className="mt-2" placeholder={copy.imageUrl} value={b.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} />
    </Field><div className="grid grid-cols-2 gap-3"><Field label={copy.variant}><select className="h-8 rounded-lg border bg-background px-2 text-sm" value={b.variant} onChange={(e) => onChange({ variant: e.target.value as HeroBlock['variant'] })}><option value="center">Center</option><option value="bottom">Bottom</option><option value="edge">Edge</option></select></Field><Field label={copy.height}><select className="h-8 rounded-lg border bg-background px-2 text-sm" value={b.height} onChange={(e) => onChange({ height: e.target.value as HeroBlock['height'] })}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></select></Field></div><Field label={copy.overlay}><Input type="range" min="0" max="90" value={b.overlay} onChange={(e) => onChange({ overlay: Number(e.target.value) })} /></Field>
      <Separator />
      <ToggleRow
        label={copy.heroLogo}
        /* `?? true` : le rendu affiche le cercle par défaut, l'interrupteur
           doit refléter cet état — sinon il paraît éteint alors que le cercle
           est visible. */
        checked={b.logo?.enabled ?? true}
        onChange={(enabled) =>
          onChange({
            /* On complète les réglages manquants : un logo activé sans taille
               ni position ne saurait pas où se dessiner. */
            logo: { size: 'md', align: 'left', ...b.logo, enabled },
          })
        }
      />
      {/* `!== false` et non truthy : les pages existantes n'ont pas d'objet
          `logo`, or le cercle s'y affiche par défaut — leurs réglages doivent
          donc être accessibles aussi. */}
      {b.logo?.enabled !== false ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.heroLogoSize}>
              <select
                className="h-8 rounded-lg border bg-background px-2 text-sm"
                value={b.logo?.size ?? 'md'}
                onChange={(e) => onChange({ logo: { align: 'left', enabled: true, ...b.logo, size: e.target.value as 'sm' | 'md' | 'lg' } })}
              >
                <option value="sm">{copy.sizeS}</option>
                <option value="md">{copy.sizeM}</option>
                <option value="lg">{copy.sizeL}</option>
              </select>
            </Field>
            <Field label={copy.heroLogoAlign}>
              <select
                className="h-8 rounded-lg border bg-background px-2 text-sm"
                value={b.logo?.align ?? 'left'}
                onChange={(e) => onChange({ logo: { size: 'md', enabled: true, ...b.logo, align: e.target.value as 'left' | 'center' | 'right' } })}
              >
                <option value="left">{copy.alignLeft}</option>
                <option value="center">{copy.alignCenter}</option>
                <option value="right">{copy.alignRight}</option>
              </select>
            </Field>
          </div>
          <MediaUploader
            businessId={businessId}
            kind="logo"
            accept="image/*"
            value={b.logo?.url ?? ''}
            onChange={(url) => onChange({ logo: { size: 'md', align: 'left', enabled: true, ...b.logo, url: typeof url === 'string' ? url : url[0] } })}
          />
          <p className="text-xs text-muted-foreground">{copy.heroLogoHint}</p>
        </>
      ) : null}
    </section>
  }
  if (block.type === 'catalogue') {
    const b = block as CatalogueBlock
    return <section className="flex flex-col gap-4"><h3 className="font-medium">{copy.catalogue}</h3><Field label={copy.catalogueTitle}><Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} /></Field><div className="grid grid-cols-2 gap-3"><Field label={copy.display}><select className="h-8 rounded-lg border bg-background px-2 text-sm" value={b.display} onChange={(e) => onChange({ display: e.target.value as CatalogueBlock['display'] })}><option value="grid">{copy.grid}</option><option value="list">{copy.list}</option></select></Field><Field label={copy.columns}><select className="h-8 rounded-lg border bg-background px-2 text-sm" value={b.columns} onChange={(e) => onChange({ columns: Number(e.target.value) as CatalogueBlock['columns'] })}><option value="2">2</option><option value="3">3</option></select></Field></div><Field label={copy.actionLabel}><Input value={b.actionLabel} onChange={(e) => onChange({ actionLabel: e.target.value })} /></Field><ToggleRow label={copy.showPrice} checked={b.showPrice} onChange={(showPrice) => onChange({ showPrice })} /><ToggleRow label={copy.showRating} checked={b.showRating} onChange={(showRating) => onChange({ showRating })} /></section>
  }
  if (block.type === 'categories') {
    const b = block as CategoriesBlock
    return <section className="flex flex-col gap-4"><h3 className="font-medium">{copy.categories}</h3>
      {/* Au-delà d'une poignée de catégories, le mode `wrap` empilait les
          pastilles jusqu'à repousser le catalogue hors de l'écran. */}
      <Field label={copy.categoryDisplay}>
        <select
          className="h-8 rounded-lg border bg-background px-2 text-sm"
          value={b.display ?? 'wrap'}
          onChange={(e) => onChange({ display: e.target.value as CategoriesBlock['display'] })}
        >
          <option value="wrap">{copy.categoryWrap}</option>
          <option value="scroll">{copy.categoryScroll}</option>
          <option value="card">{copy.categoryCard}</option>
        </select>
      </Field>
      <ToggleRow label={copy.autoCategories} checked={b.autoFromCatalogue} onChange={(autoFromCatalogue) => onChange({ autoFromCatalogue })} /><Field label={copy.categoryItems}><Textarea value={b.items.join('\n')} onChange={(e) => onChange({ items: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /><p className="text-xs text-muted-foreground">{copy.categoryHint}</p></Field></section>
  }
  if (block.type === 'booking') {
    const b = block as BookingBlock
    return <section className="flex flex-col gap-4"><h3 className="font-medium">{copy.booking}</h3><Field label={copy.titleField}><Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} /></Field><Field label={copy.descriptionField}><Textarea value={b.description} onChange={(e) => onChange({ description: e.target.value })} /></Field><Field label={copy.cta}><Input value={b.ctaLabel} onChange={(e) => onChange({ ctaLabel: e.target.value })} /></Field><Field label={copy.bookingDays}><Input type="number" min="1" max="60" value={b.daysAhead} onChange={(e) => onChange({ daysAhead: Math.max(1, Number(e.target.value) || 1) })} /></Field></section>
  }
  if (block.type === 'hours_location') {
    const b = block as HoursLocationBlock
    /* Les horaires eux-mêmes étaient invisibles ici : le bloc les AFFICHE sur
       la page mais l'éditeur n'offrait que titre et adresse — pour changer
       « Lun–Ven 9h–18h » il fallait fouiller ailleurs. Une ligne par jour. */
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">{copy.hours}</h3>
        <Field label={copy.titleField}>
          <Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label={copy.address}>
          <Input value={b.address} onChange={(e) => onChange({ address: e.target.value })} />
        </Field>
        <Field label={copy.mapQuery}>
          <Input value={b.mapQuery} onChange={(e) => onChange({ mapQuery: e.target.value })} />
        </Field>
        <Field label="Horaires affichés">
          <div className="flex flex-col gap-2">
            {b.hours.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="w-2/5"
                  placeholder="Jour(s)"
                  value={h.day}
                  onChange={(e) =>
                    onChange({
                      hours: b.hours.map((it, j) => (j === i ? { ...it, day: e.target.value } : it)),
                    })
                  }
                />
                <Input
                  className="flex-1"
                  placeholder="Ex. : 9h – 18h"
                  value={h.value}
                  onChange={(e) =>
                    onChange({
                      hours: b.hours.map((it, j) => (j === i ? { ...it, value: e.target.value } : it)),
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Supprimer la ligne ${h.day || i + 1}`}
                  className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onChange({ hours: b.hours.filter((_, j) => j !== i) })}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange({ hours: [...b.hours, { day: '', value: '' }] })}
            >
              Ajouter une ligne
            </Button>
          </div>
        </Field>
      </section>
    )
  }
  if (block.type === 'contact') {
    const b = block as ContactBlock
    /* Les réseaux sociaux s'affichent sur la page mais étaient inaccessibles
       ici : impossible d'ajouter son Instagram ou de corriger un lien. */
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">{copy.contact}</h3>
        <Field label={copy.titleField}>
          <Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label={copy.descriptionField}>
          <Textarea value={b.description} onChange={(e) => onChange({ description: e.target.value })} />
        </Field>
        <Field label={copy.cta}>
          <Input value={b.ctaLabel} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
        </Field>
        <Field label={copy.phone}>
          <Input value={b.phone} onChange={(e) => onChange({ phone: e.target.value })} />
        </Field>
        <Field label={copy.email}>
          <Input value={b.email} onChange={(e) => onChange({ email: e.target.value })} />
        </Field>
        <Field label="Réseaux sociaux">
          <div className="flex flex-col gap-2">
            {b.socials.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <Input
                  className="w-2/5"
                  placeholder="Nom (Instagram…)"
                  value={s.label}
                  onChange={(e) =>
                    onChange({
                      socials: b.socials.map((it) => (it.id === s.id ? { ...it, label: e.target.value } : it)),
                    })
                  }
                />
                <Input
                  className="flex-1"
                  placeholder="https://…"
                  value={s.url}
                  onChange={(e) =>
                    onChange({
                      socials: b.socials.map((it) => (it.id === s.id ? { ...it, url: e.target.value } : it)),
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Supprimer ${s.label || 'ce réseau'}`}
                  className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onChange({ socials: b.socials.filter((it) => it.id !== s.id) })}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  socials: [...b.socials, { id: `soc-${Date.now()}`, label: '', url: '' }],
                })
              }
            >
              Ajouter un réseau
            </Button>
          </div>
        </Field>
      </section>
    )
  }
  if (block.type === 'identity_media') {
    const b = block as IdentityMediaBlock
    return <section className="flex flex-col gap-4"><h3 className="font-medium">Logo & profil</h3><Field label={copy.titleField}><Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} /></Field><Field label={copy.subtitle}><Textarea value={b.subtitle} onChange={(e) => onChange({ subtitle: e.target.value })} /></Field><ToggleRow label="Afficher le logo" checked={b.showLogo} onChange={(showLogo) => onChange({ showLogo })} /><ToggleRow label="Afficher la catégorie" checked={b.showProfile} onChange={(showProfile) => onChange({ showProfile })} /></section>
  }
  if (block.type === 'search') {
    const b = block as SearchBlock
    /* La barre de recherche n'avait AUCUN réglage : le texte d'invite était
       figé alors qu'un restaurant veut « Chercher un plat » et un salon
       « Chercher une prestation ». */
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Barre de recherche</h3>
        <Field label="Texte d'invite">
          <Input
            placeholder="Ex. : Chercher un plat…"
            value={b.placeholder}
            onChange={(e) => onChange({ placeholder: e.target.value })}
          />
        </Field>
        <ToggleRow
          label="Bouton de filtres"
          checked={b.showFilter}
          onChange={(showFilter) => onChange({ showFilter })}
        />
      </section>
    )
  }
  if (block.type === 'reviews') {
    const b = block as ReviewBlock
    /* Les avis affichés viennent des VRAIS clients — pas de liste à éditer
       ici, ce serait fabriquer de faux avis. On règle le titre et la forme. */
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Avis & Témoignages</h3>
        <Field label={copy.titleField}>
          <Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <ToggleRow
          label="Afficher en onglets (Infos / Réservation / Avis)"
          checked={b.withTabs}
          onChange={(withTabs) => onChange({ withTabs })}
        />
        <p className="text-xs text-muted-foreground">
          Les avis affichés sont ceux déposés par vos clients sur la page.
        </p>
      </section>
    )
  }
  if (block.type === 'faq') {
    const b = block as FaqBlock
    /* La FAQ n'avait AUCUN réglage : les questions livrées avec le modèle
       restaient gravées — impossible de répondre aux vraies questions de SES
       clients. Une carte par question, ajout et suppression libres. */
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">FAQ</h3>
        <Field label={copy.titleField}>
          <Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label="Questions & réponses">
          <div className="flex flex-col gap-3">
            {b.items.map((item, i) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-xl border p-2.5">
                <Input
                  placeholder={`Question ${i + 1}`}
                  value={item.q}
                  onChange={(e) =>
                    onChange({
                      items: b.items.map((it) => (it.id === item.id ? { ...it, q: e.target.value } : it)),
                    })
                  }
                />
                <Textarea
                  placeholder="Réponse"
                  value={item.a}
                  onChange={(e) =>
                    onChange({
                      items: b.items.map((it) => (it.id === item.id ? { ...it, a: e.target.value } : it)),
                    })
                  }
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-end text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onChange({ items: b.items.filter((it) => it.id !== item.id) })}
                >
                  Supprimer
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  items: [...b.items, { id: `faq-${Date.now()}`, q: '', a: '' }],
                })
              }
            >
              Ajouter une question
            </Button>
          </div>
        </Field>
      </section>
    )
  }
  if (block.type === 'carousel') {
    const b = block as CarouselBlock
    /* `glass` (hérité) est rendu comme `caption` : on le normalise ici. */
    const variant = b.variant === 'glass' ? 'caption' : (b.variant ?? 'overlay')
    const source = b.source ?? 'products'
    /* Seuls les produits de CE commerce : le sélecteur listait sinon tout le
       catalogue de la plateforme. */
    const own = products.filter((p) => p.business_id === businessId)
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Carrousel</h3>
        <Field label={copy.titleField}>
          <Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>

        {/* Que montre le carrousel ? Deux gros boutons, pas un select : le
            choix est structurant et doit se voir d'un coup d'œil. */}
        <Field label="Que montre le carrousel ?">
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant={source === 'products' ? 'default' : 'outline'}
              onClick={() => onChange({ source: 'products' })}
            >
              Mes produits
            </Button>
            <Button
              size="sm"
              variant={source === 'images' ? 'default' : 'outline'}
              onClick={() => onChange({ source: 'images' })}
            >
              Mes images
            </Button>
          </div>
        </Field>

        {source === 'images' ? (
          <Field label="Images du carrousel">
            {/* Visuels promotionnels libres — affiches, offres, coulisses. */}
            <MediaUploader
              businessId={businessId}
              kind="gallery"
              accept="image/*"
              multiple
              value={b.images ?? []}
              onChange={(images) => onChange({ images: Array.isArray(images) ? images : [images] })}
              label="Téléverser des images"
            />
          </Field>
        ) : (
          <Field label="Produits affichés">
            {/* Cases à cocher avec vignette : on voit ce qu'on choisit. Rien
                de coché = les six premiers du catalogue (comportement
                d'origine), dit clairement sous la liste. */}
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border p-1.5">
              {own.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Ajoutez d&apos;abord des produits à votre catalogue.
                </p>
              ) : (
                own.map((p) => {
                  const checked = b.productIds.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 ${checked ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          onChange({
                            productIds: checked
                              ? b.productIds.filter((id) => id !== p.id)
                              : [...b.productIds, p.id],
                          })
                        }
                        className="size-4 shrink-0 accent-primary"
                      />
                      {p.media_urls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.media_urls[0] || '/placeholder.svg'}
                          alt=""
                          className="size-8 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-[10px] text-muted-foreground">
                          —
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                    </label>
                  )
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Rien de coché = les 6 premiers produits du catalogue.
            </p>
          </Field>
        )}

        <Field label="Style des cartes">
          <select
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value={variant}
            onChange={(e) => onChange({ variant: e.target.value as CarouselBlock['variant'] })}
          >
            <option value="overlay">Photo + dégradé sombre</option>
            <option value="caption">Cartouche sombre + badge prix</option>
            <option value="card">Photo + cartouche dessous</option>
          </select>
        </Field>
      </section>
    )
  }
  if (block.type === 'promo') {
    const b = block as PromoBlock
    const own = products.filter((p) => p.business_id === businessId)
    /* La bannière n'avait AUCUN réglage de contenu : titre, texte et bouton
       étaient figés, seule l'apparence s'ouvrait — le commerçant ne pouvait
       même pas écrire son offre. */
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Bannière promo</h3>
        <Field label={copy.titleField}>
          <Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label={copy.descriptionField}>
          <Textarea value={b.description} onChange={(e) => onChange({ description: e.target.value })} />
        </Field>
        <Field label={copy.cta}>
          <Input value={b.ctaLabel} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
        </Field>
        <Field label="Produit mis en avant">
          <select
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value={b.productId ?? ''}
            onChange={(e) => onChange({ productId: e.target.value || null })}
          >
            <option value="">Aucun — offre générale</option>
            {own.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fin de l'offre (compte à rebours)">
          <Input
            type="datetime-local"
            value={b.endsAt ? b.endsAt.slice(0, 16) : ''}
            onChange={(e) =>
              onChange({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
          />
          <p className="text-xs text-muted-foreground">
            Vide = pas de compte à rebours affiché.
          </p>
        </Field>
      </section>
    )
  }
  if (block.type === 'bottom_nav') {
    const b = block as BottomNavBlock
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Menu mobile</h3>
        <Field label="Style du menu">
          <select
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value={b.navStyle ?? 'floating'}
            onChange={(e) => onChange({ navStyle: e.target.value as BottomNavBlock['navStyle'] })}
          >
            <option value="floating">Flottant, action centrale</option>
            <option value="dark-pill">Pilule sombre</option>
            <option value="docked">Barre pleine largeur</option>
            <option value="minimal">Minimal, icônes seules</option>
          </select>
        </Field>
        <p className="text-xs text-muted-foreground">
          Le style s&apos;applique sur téléphone. Aperçu immédiat dans le simulateur mobile.
        </p>
      </section>
    )
  }
  if (block.type === 'video') {
    const b = block as VideoBlock
    /* Le bloc Vidéo n'avait AUCUN réglage : impossible de téléverser ou même
       de coller un lien. Téléversement d'un fichier (lu en <video> natif) ou
       lien YouTube — les deux alimentent le même champ `url`. */
    return (
      <section className="flex flex-col gap-4">
        <h3 className="font-medium">Vidéo</h3>
        <Field label={copy.titleField}>
          <Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label="Fichier vidéo">
          <MediaUploader
            businessId={businessId}
            kind="video"
            accept="video/*"
            value={isUploadedVideo(b.url) ? b.url : ''}
            onChange={(url) => onChange({ url: (Array.isArray(url) ? url[0] : url) || '' })}
            label="Téléverser une vidéo"
          />
        </Field>
        <Field label="Ou lien YouTube">
          <Input
            placeholder="https://youtube.com/watch?v=…"
            value={isUploadedVideo(b.url) ? '' : b.url}
            onChange={(e) => onChange({ url: e.target.value })}
          />
        </Field>
        <Field label="Légende">
          <Input value={b.caption} onChange={(e) => onChange({ caption: e.target.value })} />
        </Field>
      </section>
    )
  }
  if (block.type === 'image_gallery') {
    const b = block as ImageGalleryBlock
    return <section className="flex flex-col gap-4"><h3 className="font-medium">Galerie photos</h3><Field label={copy.titleField}><Input value={b.title} onChange={(e) => onChange({ title: e.target.value })} /></Field><MediaUploader businessId={businessId} kind="gallery" multiple value={b.images} onChange={(images) => onChange({ images: Array.isArray(images) ? images : [images] })} /><Field label="Colonnes"><select className="h-8 rounded-lg border bg-background px-2 text-sm" value={b.columns} onChange={(e) => onChange({ columns: Number(e.target.value) as ImageGalleryBlock['columns'] })}><option value="2">2</option><option value="3">3</option></select></Field></section>
  }
  return null
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-3"><Label>{label}</Label><Switch checked={checked} onCheckedChange={onChange} /></div>
}

/**
 * Apparence d'un bloc, réorganisée en trois groupes nommés — Texte, Couleurs,
 * Espacement — au lieu d'une colonne continue où tout se confondait.
 *
 * Les couleurs restent OPTIONNELLES : par défaut le bloc suit l'ambiance de
 * la page, et « Revenir aux couleurs de la page » efface les choix manuels —
 * le filet de sécurité qui permet d'essayer sans risque.
 */
function StyleSettings({ block, copy, onChange }: { block: Block; copy: Copy; onChange: (patch: Partial<Block>) => void }) {
  const style = block.style ?? {}
  function patchStyle(patch: Partial<BlockStyle>) { onChange({ style: { ...style, ...patch } }) }
  const custom = hasCustomColors(block)
  return (
    <section className="flex flex-col gap-4">
      <Separator />
      <h3 className="font-medium">{copy.style}</h3>

      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{copy.typography}</p>
        <Field label={copy.alignment}>
          <div className="grid grid-cols-3 gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <Button key={align} size="sm" variant={style.align === align ? 'default' : 'outline'} onClick={() => patchStyle({ align })}>
                {copy[align]}
              </Button>
            ))}
          </div>
        </Field>
        <Field label={copy.scale}>
          <Input type="range" min="0.8" max="1.3" step="0.05" value={style.fontScale ?? 1} onChange={(e) => patchStyle({ fontScale: Number(e.target.value) })} />
        </Field>
        <Field label={copy.weight}>
          {/* Des mots, pas des nombres : « 600 » ne dit rien à qui n'est pas
              designer. */}
          <select className="h-8 rounded-lg border bg-background px-2 text-sm" value={style.fontWeight ?? 600} onChange={(e) => patchStyle({ fontWeight: Number(e.target.value) as BlockStyle['fontWeight'] })}>
            <option value="300">Léger</option>
            <option value="400">Normal</option>
            <option value="500">Moyen</option>
            <option value="600">Gras</option>
            <option value="700">Très gras</option>
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{copy.colors}</p>
          {custom && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {copy.customColorsOn}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['background', 'textColor', 'brandColor'] as const).map((key) => (
            <Field key={key} label={copy[key]}>
              <Input type="color" value={style[key] ?? '#ffffff'} onChange={(e) => patchStyle({ [key]: e.target.value })} />
            </Field>
          ))}
        </div>
        {/* Retour à l'ambiance : efface UNIQUEMENT les couleurs manuelles de
            CE bloc, les autres réglages (alignement, taille…) restent. */}
        <Button
          size="sm"
          variant="outline"
          disabled={!custom}
          onClick={() => {
            const reset = resetOneBlockColors(block)
            onChange({ style: reset.style ?? {} })
          }}
        >
          {copy.resetColors}
        </Button>
        {!custom && (
          <p className="text-xs text-muted-foreground">
            Ce bloc suit les couleurs de la page. Touchez une pastille pour le personnaliser.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border p-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{copy.spacing}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={copy.vertical}>
            <Input type="number" min="0" max="120" value={style.paddingY ?? 32} onChange={(e) => patchStyle({ paddingY: Number(e.target.value) })} />
          </Field>
          <Field label={copy.horizontal}>
            <Input type="number" min="0" max="80" value={style.paddingX ?? 20} onChange={(e) => patchStyle({ paddingX: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label={copy.radius}>
          <select className="h-8 rounded-lg border bg-background px-2 text-sm" value={style.radius ?? 'soft'} onChange={(e) => patchStyle({ radius: e.target.value as BlockStyle['radius'] })}>
            <option value="sharp">{copy.sharp}</option>
            <option value="soft">{copy.soft}</option>
            <option value="round">{copy.round}</option>
          </select>
        </Field>
      </div>
    </section>
  )
}

/**
 * Style GLOBAL de la page : ambiances toutes faites + couleurs fines.
 *
 * Les trois couleurs du thème (fond, texte, boutons) existaient dans le
 * modèle depuis le début mais n'avaient AUCUNE interface : impossible de
 * changer le fond de sa page entière. Les ambiances répondent au vrai besoin
 * du public visé — un rendu cohérent sans rien connaître aux couleurs.
 *
 * `onTheme(theme, true)` = appliquer une ambiance : le thème change ET les
 * couleurs posées à la main sur les blocs sont effacées, pour que toute la
 * page bascule d'un coup. Les pastilles fines, elles, ne touchent pas aux
 * blocs personnalisés (`onTheme(theme, false)`).
 */
function PageStyleSettings({
  theme,
  onTheme,
}: {
  theme: PageTheme
  onTheme: (theme: PageTheme, alsoResetBlocks: boolean) => void
}) {
  const { locale } = useLocale()
  const copy = LABELS[locale]
  const active = activeAmbianceId(theme)
  const preset = theme.preset ?? 'vitrine'
  return (
    <section className="flex flex-col gap-4">
      {/* Genre de la page : vitrine (magazine) ou commande (app de
          livraison). Deux cartes descriptives, pas un select : le choix
          restructure toute la page, il mérite d'être compris avant le clic. */}
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{copy.pageGenre}</h3>
        <p className="text-xs text-muted-foreground">{copy.pageGenreHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onTheme({ ...theme, preset: 'vitrine' }, false)}
          aria-pressed={preset === 'vitrine'}
          className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-colors ${preset === 'vitrine' ? 'border-primary ring-2 ring-primary/30' : 'hover:border-muted-foreground/40'}`}
        >
          <span className="text-sm font-semibold">{copy.genreVitrine}</span>
          <span className="text-[11px] leading-snug text-muted-foreground">{copy.genreVitrineDesc}</span>
        </button>
        <button
          type="button"
          onClick={() => onTheme({ ...theme, preset: 'commande' }, false)}
          aria-pressed={preset === 'commande'}
          className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-colors ${preset === 'commande' ? 'border-primary ring-2 ring-primary/30' : 'hover:border-muted-foreground/40'}`}
        >
          <span className="text-sm font-semibold">{copy.genreCommande}</span>
          <span className="text-[11px] leading-snug text-muted-foreground">{copy.genreCommandeDesc}</span>
        </button>
      </div>

      <Separator />

      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{copy.ambiance}</h3>
        <p className="text-xs text-muted-foreground">{copy.ambianceHint}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {AMBIANCES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onTheme(applyAmbiance(theme, a), true)}
            className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-colors ${active === a.id ? 'border-primary ring-2 ring-primary/30' : 'hover:border-muted-foreground/40'}`}
            aria-pressed={active === a.id}
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg border"
              style={{ background: a.background }}
              aria-hidden
            >
              <span className="size-4 rounded-full" style={{ background: a.brand }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{a.label}</span>
              <span className="block truncate text-[11px] opacity-60">
                {a.background === '#171410' || a.background === '#0F172A' ? 'Fond sombre' : 'Fond clair'}
              </span>
            </span>
          </button>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h3 className="font-medium">{copy.pageColors}</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label={copy.pageBackground}>
            <Input type="color" value={theme.background} onChange={(e) => onTheme({ ...theme, background: e.target.value }, false)} />
          </Field>
          <Field label={copy.pageInk}>
            <Input type="color" value={theme.ink} onChange={(e) => onTheme({ ...theme, ink: e.target.value }, false)} />
          </Field>
          <Field label={copy.pageBrand}>
            <Input type="color" value={theme.brand} onChange={(e) => onTheme({ ...theme, brand: e.target.value }, false)} />
          </Field>
        </div>
      </div>
    </section>
  )
}
