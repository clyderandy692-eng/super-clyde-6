'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  Monitor,
  QrCode,
  Smartphone,
} from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { PageRenderer } from '@/components/clyde/page/renderer'
import { blockLabel } from '@/lib/clyde/blocks'
import { useCategoryLabel, useT } from '@/lib/clyde/i18n'
import { markInternalNavigation } from '@/lib/clyde/navigation'
import {
  DEMO_AVAILABILITY,
  DEMO_BUSINESSES,
  DEMO_PAGES,
  DEMO_PRODUCTS,
} from '@/lib/clyde/demo-data'
import { cn } from '@/lib/utils'

const SHOWCASE_IDS = ['b-1', 'b-2', 'b-3', 'b-5', 'b-6', 'b-8']

export function LandingShowcase() {
  const t = useT()
  const categoryLabel = useCategoryLabel()
  const options = useMemo(
    () => DEMO_BUSINESSES.filter((b) => SHOWCASE_IDS.includes(b.id)),
    [],
  )
  const [activeId, setActiveId] = useState('b-2')
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const activeIndex = Math.max(0, options.findIndex((b) => b.id === activeId))

  /* Rail des boutiques : on doit pouvoir l'amener sur la vignette active,
     sinon les flèches et le défilement automatique changeaient l'aperçu
     sans jamais bouger la rangée — elles semblaient mortes. */
  const railRef = useRef<HTMLDivElement>(null)
  /* `paused` : l'auto-défilement s'arrête dès que le visiteur choisit
     lui-même une boutique, pour ne pas lui arracher sa sélection. */
  const pausedRef = useRef(false)

  function select(id: string, manual = false) {
    if (manual) pausedRef.current = true
    setActiveId(id)
  }

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const chip = rail.querySelector<HTMLElement>(`[data-chip-id="${activeId}"]`)
    if (!chip) return
    /* scrollLeft direct plutôt que scrollIntoView : ce dernier fait aussi
       défiler la page verticalement et secouait tout l'écran. */
    const target = chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2
    rail.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [activeId])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 639px)').matches
    if (reduced || !mobile || options.length < 2) return
    const timer = window.setInterval(() => {
      if (pausedRef.current) return
      setActiveId(options[(activeIndex + 1) % options.length]?.id ?? options[0].id)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [activeIndex, options])

  const business = options.find((b) => b.id === activeId) ?? options[0]
  const page = DEMO_PAGES.find((p) => p.business_id === business.id)
  const products = DEMO_PRODUCTS.filter((p) => p.business_id === business.id)
  const availability = DEMO_AVAILABILITY.filter(
    (a) => a.business_id === business.id,
  )
  const blocks = page?.layout_json ?? []
  const showcaseTypes = new Set(['hero', 'identity_media', 'search', 'categories', 'catalogue', 'booking', 'reviews', 'bottom_nav'])
  const displayBlocks = blocks.filter((block) => showcaseTypes.has(block.type))

  return (
    <section
      id="builder"
      className="border-y border-border bg-secondary/45 px-5 py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal variant="up">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-brand uppercase">
              {t.showcase.kicker}
            </span>
            <h2 className="max-w-2xl text-balance text-3xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.75rem]">
              {t.showcase.title}
            </h2>
            <p className="max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
              {t.showcase.body}
            </p>
          </div>
        </Reveal>

        <Reveal variant="up" delay={80}>
          <div className="relative mt-8">
            <div
              ref={railRef}
              className="clyde-no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
            >
            {options.map((b) => {
              const active = b.id === activeId
              return (
                <button
                  key={b.id}
                  data-chip-id={b.id}
                  type="button"
                  onClick={() => select(b.id, true)}
                  aria-pressed={active}
                  className={cn(
                    'shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all',
                    active
                      ? 'border-brand bg-brand text-brand-foreground'
                      : 'border-border bg-background hover:border-input',
                  )}
                >
                  <span className="block text-[13px] leading-tight font-bold whitespace-nowrap">
                    {b.name}
                  </span>
                  <span
                    className={cn(
                      'block text-[11px] whitespace-nowrap',
                      active ? 'opacity-75' : 'text-muted-foreground',
                    )}
                  >
                    {categoryLabel(b.category)}
                  </span>
                </button>
              )
            })}
            </div>
            {/* Points + flèches : on voit où on en est, et chaque flèche fait
                réellement glisser le rail vers la vignette suivante. */}
            <div className="mt-3 flex items-center justify-between sm:hidden">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {options.map((b, i) => (
                  <span
                    key={b.id}
                    className={cn(
                      'rounded-full transition-all',
                      i === activeIndex ? 'h-1.5 w-5 bg-brand' : 'size-1.5 bg-border',
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-transform active:scale-95"
                  aria-label="Boutique précédente"
                  onClick={() => select(options[(activeIndex - 1 + options.length) % options.length]?.id ?? options[0].id, true)}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-transform active:scale-95"
                  aria-label="Boutique suivante"
                  onClick={() => select(options[(activeIndex + 1) % options.length]?.id ?? options[0].id, true)}
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-stretch">
          {/* ---- Panneau structure ---- */}
          <Reveal variant="left" delay={120}>
            <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">{t.showcase.structureTitle}</h3>
                <span className="rounded-md bg-secondary px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground">
                  {displayBlocks.length} {t.showcase.blocksCount}
                </span>
              </div>

              <ol className="flex flex-col gap-1.5">
                  {displayBlocks.map((b, i) => (
                  <li
                    key={b.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-secondary/50 px-2.5 py-2"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded bg-background font-mono text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-[13px] font-medium">
                      {blockLabel(b.type)}
                    </span>
                    <Check size={13} className="shrink-0 text-success" />
                  </li>
                ))}
              </ol>

              <div className="flex flex-col gap-2 rounded-xl bg-brand/8 p-3.5">
                <p className="text-[12px] leading-snug font-semibold">
                  {t.showcase.modulesTitle}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active>{t.showcase.chipOrder}</Chip>
                  <Chip active={business.module_locations} icon={QrCode}>
                    {t.showcase.chipLocations}
                  </Chip>
                  <Chip active={business.module_booking} icon={CalendarClock}>
                    {t.showcase.chipBooking}
                  </Chip>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {t.showcase.modulesNote}
                </p>
              </div>

              <Link
                href={`/r/${business.slug}`}
                onClick={markInternalNavigation}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-input px-4 py-3 text-[13px] font-bold transition-colors hover:bg-secondary"
              >
                {t.showcase.open} {business.name}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </Reveal>

          {/* ---- Aperçu ---- */}
          <Reveal variant="right" delay={160}>
            <div className="flex h-full min-h-[680px] flex-col overflow-hidden rounded-2xl border border-border bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-destructive/25" />
                    <span className="size-2.5 rounded-full bg-warning/30" />
                    <span className="size-2.5 rounded-full bg-success/25" />
                  </span>
                  <span className="ml-1 truncate rounded-md bg-secondary px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                    clyde.app/r/{business.slug}
                  </span>
                </div>
                <div className="flex shrink-0 items-center rounded-lg bg-secondary p-0.5">
                  {(
                    [
                      ['desktop', Monitor],
                      ['mobile', Smartphone],
                    ] as const
                  ).map(([id, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDevice(id)}
                      aria-label={
                        id === 'mobile'
                          ? t.showcase.previewMobile
                          : t.showcase.previewDesktop
                      }
                      aria-pressed={device === id}
                      className={cn(
                        'flex size-7 items-center justify-center rounded-md transition-colors',
                        device === id
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground',
                      )}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center bg-secondary/50 p-4 sm:p-6">
                <div
                  className={cn(
                    'clyde-mock overflow-hidden rounded-xl border border-border shadow-sm transition-all duration-300',
                    device === 'mobile' ? 'w-full max-w-[330px]' : 'w-full',
                  )}
                >
                  <div className="clyde-no-scrollbar h-[540px] overflow-y-auto">
                    {page && (
                      <PageRenderer
                        key={`${business.id}-${device}`}
                        business={business}
                        products={products}
                        availability={availability}
                        theme={page.theme_json}
                        blocks={blocks}
                        device={device}
                        interactive={false}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Chip({
  children,
  active,
  icon: Icon,
}: {
  children: React.ReactNode
  active?: boolean
  icon?: typeof QrCode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold',
        active
          ? 'bg-brand text-brand-foreground'
          : 'bg-background text-muted-foreground line-through decoration-1',
      )}
    >
      {Icon && <Icon size={11} />}
      {children}
    </span>
  )
}
