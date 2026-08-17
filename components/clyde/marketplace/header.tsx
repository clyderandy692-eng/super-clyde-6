'use client'

import { Store } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { useT } from '@/lib/clyde/i18n'

export function MarketplaceHeader() {
  const t = useT()
  return (
    <header className="mx-auto w-full max-w-6xl px-5 pb-10 md:px-8">
      <Reveal variant="up">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[11px] font-bold tracking-[0.2em] text-brand uppercase">
          <Store size={12} aria-hidden="true" />
          {t.marketplace.badge}
        </span>
        <h1 className="mt-5 max-w-2xl text-balance text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-5xl">
          {t.marketplace.title}
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {t.marketplace.subtitle}
        </p>
      </Reveal>
    </header>
  )
}
