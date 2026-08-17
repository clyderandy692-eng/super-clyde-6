'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Plus, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { OptionPicker } from '@/components/clyde/public/option-picker'
import { ReviewsSection } from '@/components/clyde/public/reviews'
import { useT } from '@/lib/clyde/i18n'
import { optionGroupsOf } from '@/lib/clyde/options'
import { cameFromInside } from '@/lib/clyde/navigation'
import { useCart, useClyde } from '@/lib/clyde/store'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { readableOn } from '@/lib/clyde/theme'
import { cn } from '@/lib/utils'

export function ProductPage({ slug, productId }: { slug: string; productId: string }) {
  const router = useRouter()
  const t = useT()
  const businesses = useClyde((state) => state.businesses)
  const products = useClyde((state) => state.products)
  const add = useCart((state) => state.add)
  const cart = useCart((state) => state.carts)
  const [added, setAdded] = useState(false)
  const [configuring, setConfiguring] = useState(false)

  /* Provenance, lue après montage : `sessionStorage` est absent côté serveur. */
  const [fromInside, setFromInside] = useState(false)
  useEffect(() => setFromInside(cameFromInside()), [])

  const business = useMemo(() => businesses.find((item) => item.slug === slug), [businesses, slug])
  const product = useMemo(() => products.find((item) => item.id === productId && item.business_id === business?.id && item.active), [products, productId, business?.id])
  const quantity = product
    ? (cart[business?.id ?? ''] ?? []).find((line) => line.productId === product.id)?.quantity ?? 0
    : 0

  if (!business || !product) {
    return <main className="grid min-h-dvh place-items-center px-6 text-center"><div className="flex flex-col items-center gap-3"><p className="font-semibold">Produit introuvable</p><button type="button" className="text-sm text-brand underline-offset-4 hover:underline" onClick={() => router.push(`/r/${slug}`)}>Retour à la boutique</button></div></main>
  }

  const theme = { brand: '#5B1D77', background: '#FAF8FC', ink: '#24172B' }
  const image = product.media_urls[0]

  /* Même règle que dans la vitrine : un article à options passe par le
     sélecteur. Cette page était une porte dérobée — le lien direct d'un article
     partagé ajoutait au panier sans choix, et le commerçant recevait un « Poulet
     DG » sans portion. */
  function handleAdd(optionIds?: string[]) {
    if (!product?.available || !business) return
    if (optionIds === undefined && optionGroupsOf(product).length > 0) {
      setConfiguring(true)
      return
    }
    add(business.id, product.id, 1, optionIds)
    setConfiguring(false)
    setAdded(true)
  }

  function handleBack() {
    if (fromInside) {
      router.back()
      return
    }
    router.push(`/r/${slug}`)
  }

  return (
    <main className="min-h-dvh pb-10" style={{ background: theme.background, color: theme.ink }}>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur-md">
        {/* Sur un lien de produit partagé, `router.back()` sortirait du site :
            on retombe alors sur la boutique, contexte naturel du produit. */}
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {fromInside ? t.marketplace.back : business.name}
        </button>
        <button type="button" onClick={() => router.push(`/r/${slug}#panier`)} className="relative flex size-10 items-center justify-center rounded-full border" aria-label="Ouvrir le panier"><ShoppingBag className="size-5" aria-hidden="true" />{quantity > 0 ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">{quantity}</span> : null}</button>
      </header>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 md:grid md:grid-cols-2 md:gap-12 md:px-8 md:py-12">
        <div className="overflow-hidden rounded-[2rem] border bg-secondary/40 shadow-sm">
          {image ? <img src={image} alt={product.name} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-7xl font-bold" style={{ color: theme.brand }}>{product.name.charAt(0)}</div>}
        </div>
        <section className="flex flex-col gap-5 self-center">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"><span>{business.name}</span>{product.category_label ? <><span>·</span><span>{product.category_label}</span></> : null}</div>
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">{product.name}</h1>
          <p className="text-2xl font-bold" style={{ color: theme.brand }}>{formatPrice(product.price, business.currency)}</p>
          {product.description ? <p className="max-w-xl text-pretty leading-7 text-muted-foreground">{product.description}</p> : <p className="text-muted-foreground">Un choix préparé avec soin par {business.name}.</p>}
          {product.duration_minutes ? <p className="text-sm text-muted-foreground">Durée : {product.duration_minutes} minutes</p> : null}
          <button type="button" disabled={!product.available} onClick={() => handleAdd()} className={cn('mt-2 flex min-h-14 items-center justify-center gap-3 rounded-2xl px-5 text-sm font-bold transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45')} style={{ background: theme.brand, color: readableOn(theme.brand) }}><span className="grid size-8 place-items-center rounded-full border border-current/30">{added ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}</span>{product.available ? (added ? 'Ajouté au panier' : 'Ajouter au panier') : 'Indisponible'}</button>
          <button type="button" onClick={() => router.push(`/r/${slug}`)} className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Voir toute la boutique</button>
        </section>
      </div>
      {/* Les avis de cet article, et d'aucun autre : « le poulet était froid »
          n'a rien à faire sous une coupe de cheveux. Les avis du commerce vivent
          dans le bloc « Avis » de la page d'accueil. */}
      <ReviewsSection
        businessId={business.id}
        productId={product.id}
        brand={theme.brand}
        className="mx-auto max-w-5xl px-4 pb-4 md:px-8"
      />

      {configuring ? (
        <OptionPicker
          product={product}
          currency={business.currency}
          theme={theme}
          onClose={() => setConfiguring(false)}
          onConfirm={(optionIds) => handleAdd(optionIds)}
        />
      ) : null}
    </main>
  )
}
