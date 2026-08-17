'use client'

import { CATEGORIES } from '@/lib/clyde/taxonomy'
import { CategoryIcon } from '@/components/clyde/category-icon'
import { useCategoryLabel, useT } from '@/lib/clyde/i18n'

export function LandingCategoryBand() {
  const t = useT()
  const categoryLabel = useCategoryLabel()
  const items = CATEGORIES.filter((c) => c.id !== 'autre')

  return (
    <section className="border-y border-border bg-background py-8">
      <p className="mb-5 text-center text-[11px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
        {t.band.kicker}
      </p>
      <div className="w-full overflow-hidden">
        <div className="clyde-marquee flex w-max gap-3 py-1 [--dur:42s] hover:[animation-play-state:paused]" aria-label="Catégories de boutiques">
          {[...items, ...items].map((c, index) => (
            <span
              key={`${c.id}-${index}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3.5 py-2.5"
            >
              <CategoryIcon category={c.id} className="size-4 shrink-0 text-brand" />
              <span className="text-[13px] font-semibold whitespace-nowrap">{categoryLabel(c.id)}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
