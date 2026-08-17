'use client'

import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useT } from '@/lib/clyde/i18n'
import { markInternalNavigation } from '@/lib/clyde/navigation'
import { CATEGORY_MAP } from '@/lib/clyde/taxonomy'
import { readableOn } from '@/lib/clyde/theme'
import { cn } from '@/lib/utils'
import type { Business, PageTheme } from '@/lib/clyde/types'

/**
 * Vignette d'un commerce dans l'annuaire.
 *
 * La bande colorée reprend la couleur de marque et la police réelles de la
 * page : l'annuaire montre ainsi que chaque vitrine a sa propre identité, au
 * lieu d'aligner huit cartes identiques.
 */
export function BusinessCard({
  business,
  theme,
  cover,
}: {
  business: Business
  theme: PageTheme | undefined
  /** Couverture retenue pour ce commerce, calculée par l'annuaire. */
  cover?: string | null
}) {
  const t = useT()
  const meta = CATEGORY_MAP[business.category]
  const place = [business.neighborhood, business.city]
    .filter(Boolean)
    .join(', ')
  const brand = theme?.brand ?? 'var(--color-brand)'
  const coverSrc = cover ?? business.cover_url ?? null

  return (
    <Link
      href={`/r/${business.slug}`}
      /* Marque la provenance pour que la vitrine sache proposer un vrai
         « Retour » plutôt qu'une sortie vers le marketplace. */
      onClick={markInternalNavigation}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-input hover:shadow-[0_22px_50px_-28px] hover:shadow-foreground/25"
    >
      {/* Cover et identité : la marketplace reflète la vitrine réelle. */}
      <div className="relative flex h-36 items-end gap-3 overflow-hidden px-4 pb-3" style={{ background: brand }}>
        {coverSrc ? (
          <img
            src={coverSrc || "/placeholder.svg"}
            alt={`Couverture de ${business.name}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : null}
        {/* Sans couverture, la bande reste la couleur de marque : le dégradé
            garde le nom lisible dans les deux cas. */}
        <div
          className={cn(
            'absolute inset-0',
            coverSrc
              ? 'bg-gradient-to-t from-foreground/85 via-foreground/35 to-foreground/5'
              : 'bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent',
          )}
        />
        {business.logo_url ? (
          <img src={business.logo_url} alt={`Logo de ${business.name}`} className="relative z-10 size-12 rounded-2xl border-2 border-background/80 object-cover shadow-lg" loading="lazy" />
        ) : null}
        <span
          className="relative z-10 truncate text-lg font-bold tracking-tight"
          /* Sur une photo, le dégradé sombre impose le blanc ; sur la couleur
             de marque, on calcule le contraste. */
          style={{ color: coverSrc ? '#FFFFFF' : theme ? readableOn(theme.brand) : '#FFFFFF' }}
        >
          {business.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
            {meta?.label ?? business.category}
          </span>
          {place ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin size={11} aria-hidden="true" />
              {place}
            </span>
          ) : null}
        </div>

        {business.description ? (
          <p className="line-clamp-2 text-pretty text-[13px] leading-relaxed text-muted-foreground">
            {business.description}
          </p>
        ) : null}

        <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-bold text-brand">
          {t.marketplace.visit}
          <ArrowUpRight
            size={14}
            className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>
    </Link>
  )
}
