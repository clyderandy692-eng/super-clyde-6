'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Eye,
  EyeOff,
  FileDown,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/clyde/i18n'
import { useClyde } from '@/lib/clyde/store'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { isLimitReached } from '@/lib/clyde/plans'
import { foldAccents } from '@/lib/clyde/text'
import type { Currency, Product, ProductOptionGroup } from '@/lib/clyde/types'
import { OptionGroupsField } from './option-groups-field'
import { useOwnerContext } from './use-owner'

/** Champs qu'un propriétaire peut modifier depuis cet écran. */
type ProductDraft = {
  name: string
  description: string | null
  price: number
  /** Prix barré : c'est lui qui déclenche la promotion sur la page publique. */
  compare_at_price: number | null
  media_urls: string[]
  active: boolean
  available: boolean
  option_groups: ProductOptionGroup[]
}

/** Formulaire vide, utilisé pour une création. */
const BLANK = {
  name: '',
  description: '',
  price: '',
  compare_at_price: '',
  image_url: '',
  active: true,
  available: true,
}

/** Remise en pourcentage, arrondie — `null` si l'article n'est pas en promo. */
function discountPercent(product: Product): number | null {
  if (!product.compare_at_price || product.compare_at_price <= product.price) {
    return null
  }
  return Math.max(1, Math.round((1 - product.price / product.compare_at_price) * 100))
}

export function Catalog() {
  /* La coquille du tableau de bord garantit qu'un commerce est présent
     avant de monter cette section. */
  const { business, plan, catalogWord } = useOwnerContext()
  const t = useT()
  const d = t.dashboard.catalog
  const allProducts = useClyde((s) => s.products)
  const upsertProduct = useClyde((s) => s.upsertProduct)
  const deleteProduct = useClyde((s) => s.deleteProduct)

  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  /* Génération du PDF en cours : évite deux téléchargements sur double appui. */
  const [busy, setBusy] = useState(false)

  const products = useMemo(
    () => (business ? allProducts.filter((p) => p.business_id === business.id) : []),
    [allProducts, business],
  )

  const limit = plan.limits.products
  const atLimit = isLimitReached(products.length, limit)

  /**
   * Catalogue en PDF, pour le statut WhatsApp.
   *
   * Beaucoup de commerçants photographient déjà leur ardoise pour la mettre en
   * statut. Le PDF remplace la photo floue par une page lisible, et surtout il
   * porte le lien de la boutique : le client qui le reçoit peut commander au
   * lieu de devoir écrire.
   *
   * `jspdf` est chargé à la demande : c'est une grosse dépendance, inutile
   * d'alourdir le tableau de bord de tous ceux qui ne l'utilisent pas.
   */
  async function handleSharePdf() {
    if (!business) return
    /* Seuls les articles visibles partent dans le PDF : envoyer un menu qui
       annonce un plat retiré crée une déception en boutique. */
    const printable = products.filter((p) => p.active)
    if (printable.length === 0) {
      toast.error(
        t.dashboard.common.share.catalogPdfEmpty(catalogWord.toLowerCase()),
      )
      return
    }

    setBusy(true)
    try {
      const { buildCatalogPdf } = await import('@/lib/clyde/pdf')
      const { downloadBlob, safeFilename } = await import('@/lib/clyde/export')

      const doc = buildCatalogPdf({
        businessName: business.name,
        url: `${window.location.origin}/r/${business.slug}`,
        currency: business.currency,
        products: printable,
        labels: {
          catalogWord,
          unavailable: t.dashboard.common.catalogPdf.unavailable,
          orderVia: t.dashboard.common.catalogPdf.orderVia,
          page: t.dashboard.common.catalogPdf.page,
        },
      })

      downloadBlob(
        doc.output('blob'),
        `${safeFilename(catalogWord, business.slug)}.pdf`,
      )
      toast.success(t.dashboard.common.share.catalogPdfDone)
    } finally {
      /* Le drapeau retombe même en cas d'échec : un bouton bloqué en
         « chargement » forcerait un rechargement de page. */
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    /* Recherche insensible aux accents : personne ne tape « ndolé » avec
       son accent dans un champ de recherche. */
    const q = foldAccents(query)
    if (!q) return products
    /* La description est incluse : sur un menu, on cherche souvent un
       ingrédient (« crevettes », « manioc ») plutôt que le nom du plat. */
    return products.filter(
      (p) =>
        foldAccents(p.name).includes(q) ||
        foldAccents(p.description ?? '').includes(q),
    )
  }, [products, query])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">{catalogWord}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length > 1
              ? d.countMany(products.length)
              : d.countOne(products.length)}
            {limit !== null ? d.ofLimit(limit) : ''}
          </p>
        </div>
        {/* Deux actions, la création d'abord. Sur mobile elles passent à la
            ligne plutôt que de se comprimer : un bouton tronqué ne se lit pas. */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (atLimit) {
                toast.error(d.limitError(limit ?? 0))
                return
              }
              setCreating(true)
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            {d.add}
          </Button>
          <Button
            variant="outline"
            onClick={handleSharePdf}
            disabled={busy}
          >
            <FileDown className="size-4" aria-hidden="true" />
            {t.dashboard.common.share.catalogPdf(catalogWord.toLowerCase())}
          </Button>
        </div>
      </header>

      <p className="-mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {t.dashboard.common.share.catalogPdfHint(catalogWord.toLowerCase())}
      </p>

      {products.length > 4 ? (
        <div className="relative max-w-sm">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.search}
            aria-label={d.searchLabel}
            className="pl-9"
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          hasProducts={products.length > 0}
          label={catalogWord}
          onCreate={() => setCreating(true)}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((product) => (
            <li key={product.id}>
              <Row
                product={product}
                currency={business.currency}
                onEdit={() => setEditing(product)}
                onDelete={() => setConfirmDelete(product)}
                onToggle={() =>
                  upsertProduct(business.id, {
                    id: product.id,
                    active: !product.active,
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}

      {atLimit ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
          {d.limitBanner(limit ?? 0)}
          <a
            href="/tableau-de-bord/abonnement"
            className="font-medium text-foreground underline underline-offset-4"
          >
            {d.seePlans}
          </a>
        </p>
      ) : null}

      <ProductDialog
        open={creating || editing !== null}
        product={editing}
        currency={business.currency}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSave={(values) => {
          if (editing) {
            upsertProduct(business.id, { id: editing.id, ...values })
            toast.success(d.saved)
          } else {
            upsertProduct(business.id, values)
            toast.success(d.created)
          }
          setCreating(false)
          setEditing(null)
        }}
      />

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{d.deleteTitle(confirmDelete?.name ?? '')}</DialogTitle>
            <DialogDescription>{d.deleteBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {/* `Button` rend déjà un <button> natif : forcer `nativeButton`
                à false ferait ajouter des attributs ARIA en double. */}
            <DialogClose render={<Button variant="outline" />}>
              {d.cancel}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  deleteProduct(confirmDelete.id)
                  toast.success(d.deleted)
                }
                setConfirmDelete(null)
              }}
            >
              {d.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Row({
  product,
  currency,
  onEdit,
  onDelete,
  onToggle,
}: {
  product: Product
  currency: Currency
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const t = useT()
  const d = t.dashboard.catalog
  const discount = discountPercent(product)
  return (
    <div
      className={cn(
        /* Cinq colonnes ne tiennent pas sur un téléphone : image, nom, prix et
           trois actions laissaient au nom une largeur d'une lettre. Les
           actions descendent donc sur une seconde ligne en mobile, et la
           rangée d'origine revient dès qu'il y a la place. */
        'flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 transition-colors sm:flex-row sm:items-center sm:gap-4',
        !product.active && 'bg-muted/40',
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:flex-1 sm:gap-4">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {product.media_urls[0] ? (
          <Image
            src={product.media_urls[0]}
            alt=""
            fill
            sizes="64px"
            className={cn('object-cover', !product.active && 'opacity-50')}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Les pastilles passent à la ligne au lieu de comprimer le nom : à
            416 px, une pastille de promotion réduisait « Ndolé crevettes » à
            la lettre « N ». Le nom de l'article est ce qui permet de le
            reconnaître, il passe donc avant l'étiquette. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 font-medium break-words">{product.name}</p>
          {!product.active ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {d.hidden}
            </span>
          ) : null}
          {discount !== null ? (
            <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-brand-foreground">
              {d.promoBadge(discount)}
            </span>
          ) : null}
          {!product.available ? (
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {d.unavailableBadge}
            </span>
          ) : null}
        </div>
        {product.description ? (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {product.description}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p className="font-medium tabular-nums">
          {formatPrice(product.price, currency)}
        </p>
        {discount !== null && product.compare_at_price ? (
          <p className="text-xs text-muted-foreground line-through tabular-nums">
            {formatPrice(product.compare_at_price, currency)}
          </p>
        ) : null}
      </div>
      </div>

      {/* Actions à droite sur la seconde ligne en mobile : le pouce droit les
          atteint sans traverser l'écran. */}
      <div className="flex shrink-0 items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={
            product.active
              ? d.hideFromPage(product.name)
              : d.showOnPage(product.name)
          }
        >
          {product.active ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4" aria-hidden="true" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={d.edit(product.name)}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label={d.deleteOne(product.name)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

function EmptyState({
  hasProducts,
  label,
  onCreate,
}: {
  hasProducts: boolean
  label: string
  onCreate: () => void
}) {
  const t = useT()
  const d = t.dashboard.catalog
  if (hasProducts) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
        {d.noResults}
      </p>
    )
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/70 px-4 py-12 text-center">
      <p className="font-medium">{d.emptyTitle(label.toLowerCase())}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {d.emptyBody}
      </p>
      <Button onClick={onCreate} className="mt-1">
        <Plus className="size-4" aria-hidden="true" />
        {d.add}
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ProductDialog({
  open,
  product,
  currency,
  onClose,
  onSave,
}: {
  open: boolean
  product: Product | null
  currency: Currency
  onClose: () => void
  onSave: (values: ProductDraft) => void
}) {
  /* La clé remonte le formulaire à chaque changement de cible, ce qui évite
     de traîner les valeurs de l'entrée précédemment ouverte. */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <ProductForm
          key={product?.id ?? 'nouveau'}
          product={product}
          currency={currency}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  )
}

function ProductForm({
  product,
  currency,
  onSave,
}: {
  product: Product | null
  currency: Currency
  onSave: (values: ProductDraft) => void
}) {
  const [values, setValues] = useState(
    product
      ? {
          name: product.name,
          description: product.description ?? '',
          price: String(product.price),
          compare_at_price: product.compare_at_price
            ? String(product.compare_at_price)
            : '',
          image_url: product.media_urls[0] ?? '',
          active: product.active,
          available: product.available,
        }
      : BLANK,
  )
  /* Les groupes vivent à part du reste du formulaire : ce sont des objets
     imbriqués, les fondre dans le même état de chaînes rendrait chaque frappe
     illisible. */
  const [groups, setGroups] = useState<ProductOptionGroup[]>(
    product?.option_groups ?? [],
  )
  const [error, setError] = useState<string | null>(null)
  const t = useT()
  const d = t.dashboard.catalog

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const name = values.name.trim()
    if (!name) {
      setError(d.errorName)
      return
    }
    const price = Number(values.price)
    if (!Number.isFinite(price) || price < 0) {
      setError(d.errorPrice)
      return
    }
    const rawPromo = values.compare_at_price.trim()
    let compareAt: number | null = null
    if (rawPromo) {
      const parsed = Number(rawPromo)
      /* Un prix barré inférieur au prix de vente afficherait une remise
         négative sur la page publique : on refuse tout de suite. */
      if (!Number.isFinite(parsed) || parsed <= price) {
        setError(d.errorPromo)
        return
      }
      compareAt = Math.round(parsed)
    }
    /* Validation des options avant enregistrement. Un groupe sans nom ou une
       réponse sans intitulé s'afficherait comme un bouton vide sur la page
       publique : le client ne saurait pas ce qu'il coche. */
    const cleanGroups: ProductOptionGroup[] = []
    for (const group of groups) {
      const label = group.label.trim()
      /* Un groupe entièrement vide est simplement abandonné : le commerçant a
         cliqué « ajouter un choix » puis changé d'avis, ce n'est pas une
         erreur à lui signaler. */
      const hasContent = label !== '' || group.options.some((o) => o.label.trim() !== '')
      if (!hasContent) continue
      if (!label) {
        setError(d.options.errorGroupLabel)
        return
      }
      const options = group.options.filter((o) => o.label.trim() !== '' || o.price_delta !== 0)
      if (options.some((o) => o.label.trim() === '')) {
        setError(d.options.errorOptionLabel)
        return
      }
      if (options.some((o) => !Number.isFinite(o.price_delta))) {
        setError(d.options.errorDelta)
        return
      }
      if (options.length === 0) continue
      cleanGroups.push({
        ...group,
        label,
        options: options.map((o) => ({
          ...o,
          label: o.label.trim(),
          price_delta: Math.round(o.price_delta),
        })),
      })
    }

    setError(null)
    const image = values.image_url.trim()
    onSave({
      name,
      description: values.description.trim() || null,
      price: Math.round(price),
      compare_at_price: compareAt,
      media_urls: image ? [image] : [],
      active: values.active,
      available: values.available,
      option_groups: cleanGroups,
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>
          {product ? d.editEntry : d.newEntry}
        </DialogTitle>
        <DialogDescription>
          {d.formHint}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-name">{d.name}</Label>
        <Input
          id="p-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder={d.namePlaceholder}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-price">{d.price(currency)}</Label>
        <Input
          id="p-price"
          value={values.price}
          onChange={(e) => setValues({ ...values, price: e.target.value })}
          inputMode="numeric"
          placeholder={d.pricePlaceholder}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-promo">
          {d.promoPrice(currency)}{' '}
          <span className="font-normal text-muted-foreground">{d.optional}</span>
        </Label>
        <Input
          id="p-promo"
          value={values.compare_at_price}
          onChange={(e) =>
            setValues({ ...values, compare_at_price: e.target.value })
          }
          inputMode="numeric"
          placeholder="4500"
          aria-describedby="p-promo-hint"
        />
        <p id="p-promo-hint" className="text-xs text-muted-foreground">
          {d.promoHint}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-desc">
          {d.description}{' '}
          <span className="font-normal text-muted-foreground">{d.optional}</span>
        </Label>
        <Textarea
          id="p-desc"
          value={values.description}
          onChange={(e) =>
            setValues({ ...values, description: e.target.value })
          }
          rows={2}
          placeholder={d.descriptionPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-img">
          {d.photoLink}{' '}
          <span className="font-normal text-muted-foreground">{d.optional}</span>
        </Label>
        <Input
          id="p-img"
          value={values.image_url}
          onChange={(e) => setValues({ ...values, image_url: e.target.value })}
          placeholder="https://…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
          <Label htmlFor="p-active" className="cursor-pointer font-normal">
            {d.visibleOnPage}
          </Label>
          <Switch
            id="p-active"
            checked={values.active}
            onCheckedChange={(v) => setValues({ ...values, active: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-3 py-2.5">
          <Label htmlFor="p-available" className="cursor-pointer font-normal">
            {d.availableLabel}
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {d.availableHint}
            </span>
          </Label>
          <Switch
            id="p-available"
            checked={values.available}
            onCheckedChange={(v) => setValues({ ...values, available: v })}
          />
        </div>
      </div>

      <OptionGroupsField
        groups={groups}
        currency={currency}
        onChange={setGroups}
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          {d.cancel}
        </DialogClose>
        <Button type="submit">
          {product ? d.save : d.addToPage}
        </Button>
      </DialogFooter>
    </form>
  )
}
