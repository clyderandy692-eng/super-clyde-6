'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import {
  AlertTriangle,
  Camera,
  Check,
  Download,
  ExternalLink,
  Layers,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useClyde } from '@/lib/clyde/store'
import { isLimitReached } from '@/lib/clyde/plans'
import { foldAccents } from '@/lib/clyde/text'
import type { BusinessCategory, BusinessLocation } from '@/lib/clyde/types'
import { useCategoryLabel, useT } from '@/lib/clyde/i18n'
import { SectionHeader } from './shell'
import { useOwnerContext } from './use-owner'

/**
 * Emplacements et QR codes.
 *
 * Un QR est imprimé puis collé sur une table : il doit rester valable après
 * un changement de nom. On encode donc l'identifiant de l'emplacement, jamais
 * son libellé — la page publique accepte les deux.
 */

/**
 * Le type de stockage se déduit de la catégorie, jamais du mot affiché : le
 * libellé change avec la langue, l'identifiant non.
 */
const ROOM_CATEGORIES = new Set<BusinessCategory>([
  'hotel',
  'location_courte_duree',
])
const TABLE_CATEGORIES = new Set<BusinessCategory>(['restaurant', 'cafe', 'bar'])

function typeFromCategory(category: BusinessCategory): BusinessLocation['type'] {
  if (ROOM_CATEGORIES.has(category)) return 'room'
  if (TABLE_CATEGORIES.has(category)) return 'table'
  return 'other'
}

export function Locations() {
  const { business, plan, locationWord, locationWordPlural } =
    useOwnerContext()
  const t = useT()
  const categoryLabel = useCategoryLabel()
  const d = t.dashboard.locations
  const allLocations = useClyde((s) => s.locations)
  const addLocation = useClyde((s) => s.addLocation)
  const addLocationsBulk = useClyde((s) => s.addLocationsBulk)
  const updateLocation = useClyde((s) => s.updateLocation)
  const deleteLocation = useClyde((s) => s.deleteLocation)
  const toggleModule = useClyde((s) => s.toggleModule)

  const [bulkOpen, setBulkOpen] = useState(false)
  const [showing, setShowing] = useState<BusinessLocation | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)

  const locations = useMemo(() => {
    if (!business) return []
    return allLocations
      .filter((l) => l.business_id === business.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [allLocations, business])

  if (!business) return null

  const type = typeFromCategory(business.category)
  const limit = plan.limits.locations
  const atLimit = isLimitReached(locations.length, limit)

  /* Module désactivé : la commande par QR n'a pas de sens pour un garage.
     On explique plutôt que d'afficher une liste vide trompeuse. */
  if (!business.module_locations) {
    return (
      <div>
        <SectionHeader
          title={d.moduleOffTitle(locationWordPlural)}
          description={d.moduleOffDescription}
        />
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <QrCode className="size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-medium">{d.moduleOffHeading}</p>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {d.moduleOffBody(
              locationWord.toLowerCase(),
              locationWordPlural,
            )}
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              toggleModule(business.id, 'locations')
              toast.success(d.moduleEnabled)
            }}
          >
            {d.enableModule}
          </Button>
        </div>
      </div>
    )
  }

  const addOne = () => {
    if (atLimit) {
      toast.error(d.limitError(plan.name, limit ?? 0, locationWordPlural))
      return
    }
    /* La numérotation suit le nombre d'emplacements déjà créés. */
    addLocation(business.id, `${locationWord} ${locations.length + 1}`, type)
    toast.success(d.added(`${locationWord} ${locations.length + 1}`))
  }

  return (
    <div>
      <SectionHeader
        title={d.title(locationWordPlural)}
        description={d.description(locationWord.toLowerCase())}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setVerifyOpen(true)}>
              <ScanLine className="size-4" aria-hidden />
              {d.verify}
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkOpen(true)}
              disabled={atLimit}
            >
              <Layers className="size-4" aria-hidden />
              {d.bulkCreate}
            </Button>
            <Button onClick={addOne} disabled={atLimit}>
              <Plus className="size-4" aria-hidden />
              {d.add}
            </Button>
          </div>
        }
      />

      <p className="pb-6 text-sm text-muted-foreground">
        {d.countLabel(
          locations.length,
          locations.length > 1
            ? locationWordPlural.toLowerCase()
            : locationWord.toLowerCase(),
        )}
        {limit !== null && d.ofLimit(limit, plan.name)}
        {atLimit && limit !== null && d.limitReachedSuffix}
      </p>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <QrCode className="size-8 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-medium">
            {d.emptyTitle(locationWord.toLowerCase())}
          </p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {d.emptyBody}
          </p>
          <Button className="mt-6" onClick={() => setBulkOpen(true)}>
            <Layers className="size-4" aria-hidden />
            {d.bulkCreate}
          </Button>
        </div>
      ) : (
        <>
          <PrintSheetBanner
            locations={locations}
            slug={business.slug}
            businessName={business.name}
            locationWordPlural={locationWordPlural}
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <li key={location.id}>
                <LocationCard
                  location={location}
                  slug={business.slug}
                  locationWord={locationWord}
                  onRename={(label) => {
                    updateLocation(location.id, label)
                    toast.success(d.renamed)
                  }}
                  onDelete={() => {
                    deleteLocation(location.id)
                    toast.success(d.deleted(location.label))
                  }}
                  onShowQr={() => setShowing(location)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <BulkDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        locationWord={locationWord}
        locationWordPlural={locationWordPlural}
        remaining={limit === null ? null : limit - locations.length}
        onConfirm={(count) => {
          addLocationsBulk(business.id, count, locationWord, type)
          setBulkOpen(false)
          toast.success(d.bulkCreated(count, locationWordPlural))
        }}
      />

      <QrDialog
        location={showing}
        slug={business.slug}
        businessName={business.name}
        locationWord={locationWord}
        categoryLabel={business.category ? categoryLabel(business.category) : null}
        onOpenChange={(open) => !open && setShowing(null)}
      />

      <VerifyDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        slug={business.slug}
        locations={locations}
      />
    </div>
  )
}

/**
 * Planche de QR à imprimer.
 *
 * Télécharger douze PNG puis les mettre en page à la main, c'est le genre de
 * corvée qui fait renoncer à coller les QR. Ici une page A4 sort prête à
 * découper.
 *
 * Les QR sont réencodés à 512 px hors écran : les aperçus de la grille font
 * 84 px, une taille qui donne un code baveux une fois posée sur 55 mm de
 * papier.
 */
function PrintSheetBanner({
  locations,
  slug,
  businessName,
  locationWordPlural,
}: {
  locations: BusinessLocation[]
  slug: string
  businessName: string
  locationWordPlural: string
}) {
  const t = useT()
  const d = t.dashboard.locations
  const [busy, setBusy] = useState(false)
  /* Conteneur hors écran : les QR pleine résolution y sont rendus le temps de
     l'export, puis retirés. */
  const [rendering, setRendering] = useState<BusinessLocation[] | null>(null)
  const stage = useRef<HTMLDivElement>(null)

  const pages = Math.ceil(locations.length / 9)

  const generate = async () => {
    setBusy(true)
    setRendering(locations)
    try {
      /* Deux images successives laissent au navigateur le temps de peindre les
         canvas : sans cette attente, `querySelectorAll` ne trouve rien. */
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const canvases = stage.current?.querySelectorAll('canvas') ?? []
      if (canvases.length !== locations.length) throw new Error('render')

      const cards = locations.map((location, i) => ({
        label: location.label,
        dataUrl: (canvases[i] as HTMLCanvasElement).toDataURL('image/png'),
      }))

      /* Import différé : jspdf ne pèse sur le chargement que si on imprime. */
      const { buildQrSheet } = await import('@/lib/clyde/pdf')
      const { downloadBlob, safeFilename } = await import('@/lib/clyde/export')

      const origin =
        typeof window === 'undefined' ? 'https://clyde.app' : window.location.origin
      const doc = buildQrSheet({
        businessName,
        cards,
        scanHint: d.scanHint,
        footer: d.printSheetFooter(`${origin}/r/${slug}`),
      })

      downloadBlob(doc.output('blob'), `${safeFilename('qr', slug)}.pdf`)
      toast.success(d.printSheetDone)
    } catch {
      toast.error(d.printSheetFailed)
    } finally {
      setRendering(null)
      setBusy(false)
    }
  }

  return (
    <section className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"
          aria-hidden="true"
        >
          <Printer className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">
            {d.printSheetTitle(locationWordPlural)}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {d.printSheetBody(locationWordPlural)}
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {d.printSheetPages(pages)}
          </p>
        </div>
      </div>

      <Button className="shrink-0 sm:self-center" onClick={generate} disabled={busy}>
        <Printer className="size-4" aria-hidden />
        {busy ? d.printSheetGenerating : d.printSheetGenerate}
      </Button>

      {/* Hors flux et masqué aux lecteurs d'écran : c'est un atelier de rendu,
          pas du contenu. `aria-hidden` plutôt que `display:none`, qui
          empêcherait les canvas d'être peints. */}
      {rendering && (
        <div
          ref={stage}
          aria-hidden="true"
          className="pointer-events-none fixed left-[-9999px] top-0"
        >
          {rendering.map((location) => (
            <QRCodeCanvas
              key={location.id}
              value={publicUrl(slug, location.id)}
              size={512}
              level="M"
              marginSize={1}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/** URL encodée dans le QR : l'identifiant survit à un changement de nom. */
function publicUrl(slug: string, locationId: string): string {
  const origin =
    typeof window === 'undefined' ? 'https://clyde.app' : window.location.origin
  return `${origin}/r/${slug}?table=${encodeURIComponent(locationId)}`
}

function LocationCard({
  location,
  slug,
  locationWord,
  onRename,
  onDelete,
  onShowQr,
}: {
  location: BusinessLocation
  slug: string
  locationWord: string
  onRename: (label: string) => void
  onDelete: () => void
  onShowQr: () => void
}) {
  const t = useT()
  const d = t.dashboard.locations
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(location.label)

  const commit = () => {
    const value = draft.trim()
    if (!value) {
      setDraft(location.label)
      setEditing(false)
      return
    }
    if (value !== location.label) onRename(value)
    setEditing(false)
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setDraft(location.label)
                  setEditing(false)
                }
              }}
              className="h-8"
              aria-label={d.nameOf(locationWord.toLowerCase())}
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={commit}
              aria-label={d.validate}
            >
              <Check className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <>
            <h2 className="min-w-0 truncate font-medium">{location.label}</h2>
            <div className="flex shrink-0 gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground"
                onClick={() => {
                  setDraft(location.label)
                  setEditing(true)
                }}
                aria-label={d.renameOf(location.label)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground"
                onClick={onDelete}
                aria-label={d.deleteOf(location.label)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Aperçu cliquable : le QR est l'objet utile de cette carte. */}
      <button
        type="button"
        onClick={onShowQr}
        className="mt-4 flex flex-1 flex-col items-center justify-center rounded-lg bg-muted/60 py-6 transition-colors hover:bg-muted"
        aria-label={d.seeQrOf(location.label)}
      >
        <span className="rounded-md bg-card p-2">
          <QRCodeCanvas
            value={publicUrl(slug, location.id)}
            size={84}
            level="M"
            marginSize={0}
          />
        </span>
        <span className="mt-3 text-xs text-muted-foreground">
          {d.seeDownload}
        </span>
      </button>
    </article>
  )
}

/* ------------------------------------------------------------
   Vérification d'un QR déjà collé
   ------------------------------------------------------------ */

/**
 * Résultat d'un scan.
 *
 * Quatre cas seulement, et chacun demande une action différente du commerçant :
 * l'étiquette est bonne, elle est sur la mauvaise table, elle renvoie vers un
 * emplacement supprimé, ou elle n'est pas de chez lui.
 */
type ScanResult =
  | { kind: 'match'; label: string }
  | { kind: 'unknown' }
  | { kind: 'foreign' }

/**
 * `BarcodeDetector` est natif sur Chrome et Android, absent de Safari.
 * On le déclare a minima plutôt que d'élargir les types globaux du projet
 * pour une API utilisée à un seul endroit.
 */
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

/**
 * Contrôle d'une étiquette en place.
 *
 * Un QR collé sur la mauvaise table envoie les commandes au mauvais endroit,
 * et l'erreur ne se voit qu'au moment où un plat part à côté. Vérifier prend
 * deux secondes avec la caméra ; sans cet écran, il faut lire une URL à la
 * loupe et comparer un identifiant.
 */
function VerifyDialog({
  open,
  onOpenChange,
  slug,
  locations,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  locations: BusinessLocation[]
}) {
  const t = useT()
  const d = t.dashboard.locations
  const video = useRef<HTMLVideoElement>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* Le flux et la boucle vivent hors du rendu : les arrêter demande de les
     retrouver à l'identique, y compris au démontage. */
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current)
      timer.current = null
    }
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    setScanning(false)
  }, [])

  /* Fermer la fenêtre doit éteindre la caméra : la laisser tourner garderait
     le voyant allumé et viderait la batterie. */
  useEffect(() => {
    if (!open) {
      stop()
      setResult(null)
      setError(null)
    }
    return stop
  }, [open, stop])

  /** Lit l'identifiant d'emplacement dans l'URL scannée. */
  const interpret = useCallback(
    (raw: string): ScanResult => {
      let url: URL
      try {
        url = new URL(raw)
      } catch {
        return { kind: 'foreign' }
      }
      /* Le chemin doit désigner cette boutique : un QR d'un autre commerce est
         une confusion fréquente quand plusieurs planches ont été imprimées. */
      if (!url.pathname.startsWith(`/r/${slug}`)) return { kind: 'foreign' }

      const table = url.searchParams.get('table')
      if (!table) return { kind: 'unknown' }

      /* La page publique accepte l'identifiant comme le libellé : on reproduit
         la même tolérance, sinon une vieille étiquette serait déclarée fausse
         alors qu'elle fonctionne. */
      const found = locations.find(
        (l) =>
          l.id === table ||
          foldAccents(l.label).toLowerCase() === foldAccents(table).toLowerCase(),
      )
      return found ? { kind: 'match', label: found.label } : { kind: 'unknown' }
    },
    [locations, slug],
  )

  const start = async () => {
    setResult(null)
    setError(null)

    const Detector = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
    ).BarcodeDetector
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError(d.verifyUnsupported)
      return
    }

    try {
      /* Caméra arrière : c'est elle qui vise la table. */
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      stream.current = media
      if (video.current) {
        video.current.srcObject = media
        await video.current.play()
      }
      setScanning(true)

      const detector = new Detector({ formats: ['qr_code'] })
      /* Quatre analyses par seconde : assez réactif à la main, sans faire
         chauffer un téléphone d'entrée de gamme. */
      timer.current = window.setInterval(async () => {
        if (!video.current) return
        try {
          const codes = await detector.detect(video.current)
          if (!codes.length) return
          stop()
          setResult(interpret(codes[0].rawValue))
        } catch {
          /* Image illisible sur ce tour de boucle : on retente au suivant. */
        }
      }, 250)
    } catch {
      setError(d.verifyDenied)
      stop()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{d.verifyTitle}</DialogTitle>
          <DialogDescription>{d.verifyBody}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border bg-muted/50">
          {/* Le cadre garde sa hauteur en toutes circonstances : sans cela, la
              fenêtre sautait au démarrage de la caméra. */}
          <div className="relative aspect-[4/3] w-full">
            <video
              ref={video}
              playsInline
              muted
              className={cn(
                'size-full object-cover',
                scanning ? 'opacity-100' : 'opacity-0',
              )}
            />

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Camera className="size-7 text-muted-foreground" aria-hidden />
                {result ? (
                  <ResultMessage result={result} d={d} />
                ) : error ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {error}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{d.verifyBody}</p>
                )}
              </div>
            )}

            {/* Réticule de visée : indique où placer le code, et confirme que
                la caméra tourne. */}
            {scanning && (
              <div
                className="pointer-events-none absolute inset-0 grid place-items-center"
                aria-hidden="true"
              >
                <span className="size-40 rounded-2xl border-2 border-brand/90" />
              </div>
            )}
          </div>
        </div>

        {scanning && (
          <p aria-live="polite" className="text-center text-sm text-muted-foreground">
            {d.verifyAiming}
          </p>
        )}

        <DialogFooter>
          {scanning ? (
            <Button variant="outline" onClick={stop}>
              {d.verifyStop}
            </Button>
          ) : (
            <Button onClick={start}>
              <ScanLine className="size-4" aria-hidden />
              {result ? d.verifyAgain : d.verifyStart}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Verdict du scan, annoncé aussi aux lecteurs d'écran. */
function ResultMessage({
  result,
  d,
}: {
  result: ScanResult
  d: ReturnType<typeof useT>['dashboard']['locations']
}) {
  if (result.kind === 'match') {
    return (
      <p
        aria-live="polite"
        className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-500"
      >
        <Check className="size-4 shrink-0" aria-hidden />
        {d.verifyMatch(result.label)}
      </p>
    )
  }

  return (
    <p
      aria-live="polite"
      className="flex items-start gap-2 text-left text-sm leading-relaxed text-amber-700 dark:text-amber-500"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {result.kind === 'foreign' ? d.verifyForeign : d.verifyUnknown}
    </p>
  )
}

function BulkDialog({
  open,
  onOpenChange,
  locationWordPlural,
  remaining,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  locationWord: string
  locationWordPlural: string
  remaining: number | null
  onConfirm: (count: number) => void
}) {
  const t = useT()
  const d = t.dashboard.locations
  const [count, setCount] = useState('6')
  const parsed = Number.parseInt(count, 10)
  const valid =
    Number.isFinite(parsed) &&
    parsed > 0 &&
    (remaining === null || parsed <= remaining)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{d.bulkTitle(locationWordPlural)}</DialogTitle>
          <DialogDescription>
            {d.bulkBody(locationWordPlural)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="bulk-count">{d.howMany}</Label>
          <Input
            id="bulk-count"
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))}
          />
          {remaining !== null && (
            <p className="text-sm text-muted-foreground">
              {remaining > 0 ? d.remaining(remaining) : d.noneRemaining}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {d.cancel}
          </Button>
          <Button disabled={!valid} onClick={() => onConfirm(parsed)}>
            {d.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QrDialog({
  location,
  slug,
  businessName,
  locationWord,
  categoryLabel,
  onOpenChange,
}: {
  location: BusinessLocation | null
  slug: string
  businessName: string
  locationWord: string
  categoryLabel: string | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const d = t.dashboard.locations
  const holder = useRef<HTMLDivElement>(null)

  if (!location) return null
  const url = publicUrl(slug, location.id)

  /* Téléchargement en PNG : c'est ce QR-là qui part chez l'imprimeur.
     L'aperçu écran fait 176 px, trop peu pour du papier — un QR imprimé à
     cette résolution se scanne mal. On réencode donc à 1024 px plutôt que
     d'agrandir le canvas affiché. */
  const download = () => {
    const source = holder.current?.querySelector('canvas')
    if (!source) {
      toast.error(d.qrUnavailable)
      return
    }

    const PRINT_SIZE = 1024
    const target = document.createElement('canvas')
    target.width = PRINT_SIZE
    target.height = PRINT_SIZE
    const ctx = target.getContext('2d')
    if (!ctx) {
      toast.error(d.qrUnavailable)
      return
    }

    /* Sans lissage, l'agrandissement garde des modules parfaitement nets :
       c'est exactement ce qu'il faut pour un code à scanner. */
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PRINT_SIZE, PRINT_SIZE)
    ctx.drawImage(source, 0, 0, PRINT_SIZE, PRINT_SIZE)

    const link = document.createElement('a')
    link.href = target.toDataURL('image/png')
    link.download = `qr-${slug}-${foldAccents(location.label).replace(/[^a-z0-9]+/g, '-')}.png`
    link.click()
    toast.success(d.qrDownloaded)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{location.label}</DialogTitle>
          <DialogDescription>
            {d.qrBody(locationWord.toLowerCase())}
          </DialogDescription>
        </DialogHeader>

        {/* Composition prête à imprimer : le client doit savoir où il commande. */}
        <div
          ref={holder}
          className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-8 text-center"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {categoryLabel ?? d.order}
          </p>
          <p className="text-lg font-semibold leading-tight">{businessName}</p>
          <QRCodeCanvas value={url} size={176} level="M" marginSize={1} />
          <p className="font-medium">{location.label}</p>
          <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
            {d.scanHint}
          </p>
        </div>

        <p className="break-all text-center text-xs text-muted-foreground">
          {url}
        </p>

        <DialogFooter className="sm:justify-between">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
            )}
          >
            <ExternalLink className="size-4" aria-hidden />
            {d.testLink}
          </a>
          <Button onClick={download}>
            <Download className="size-4" aria-hidden />
            {d.downloadPng}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
