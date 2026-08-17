'use client'

import { Check, Minus, ShoppingBag, QrCode, CalendarClock } from 'lucide-react'
import { Reveal, RevealGroup } from '@/components/clyde/reveal'
import { useT } from '@/lib/clyde/i18n'
import { cn } from '@/lib/utils'

/* Les icônes restent côté composant : elles ne se traduisent pas, et les
   clés servent de jointure avec `t.modules.items`. */
const MODULE_ICONS = {
  commande: ShoppingBag,
  tables: QrCode,
  reservation: CalendarClock,
} as const

const MODULE_ORDER = ['commande', 'tables', 'reservation'] as const

export function Modules() {
  const t = useT()
  return (
    <section
      id="modules"
      className="border-t border-border px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
              {t.modules.kicker}
            </span>
            <h2 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
              {t.modules.title}
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
              {t.modules.body}
            </p>
            <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-5">
              <p className="text-[13px] leading-relaxed">
                <span className="font-semibold">{t.modules.noteStrong}</span>{' '}
                {t.modules.note}
              </p>
            </div>
          </Reveal>

          <RevealGroup className="flex flex-col gap-4" stagger={110}>
            {MODULE_ORDER.map((id) => {
              const m = t.modules.items[id]
              const Icon = MODULE_ICONS[id]
              const isBase = id === 'commande'
              return (
                <div
                  key={id}
                  className={cn(
                    'group flex items-start gap-5 rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-28px_rgba(23,20,18,0.28)]',
                    isBase
                      ? 'border-brand/35 bg-brand/[0.06]'
                      : 'border-border bg-background',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-105',
                      isBase
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-secondary text-foreground',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-semibold">{m.name}</h3>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                          isBase
                            ? 'bg-brand text-brand-foreground'
                            : 'border border-border bg-background text-muted-foreground',
                        )}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {m.role}
                    </p>
                  </div>
                  <span className="hidden shrink-0 self-center font-mono text-[11px] tracking-wide text-muted-foreground sm:block">
                    {m.metric}
                  </span>
                </div>
              )
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}

function Cell({
  value,
  isClyde,
  negatives,
}: {
  value: string
  isClyde: boolean
  /* La liste vient du dictionnaire : « Non » devient « No » en anglais,
     donc comparer à une chaîne codée en dur casserait le rendu gris. */
  negatives: readonly string[]
}) {
  if (negatives.includes(value)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
        <Minus className="size-3.5" aria-hidden="true" />
        <span className="text-[13px]">{value}</span>
      </span>
    )
  }
  if (isClyde) {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-brand">
        <Check className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="text-[13px]">{value}</span>
      </span>
    )
  }
  return <span className="text-[13px] text-foreground/70">{value}</span>
}

export function Comparison() {
  const t = useT()
  return (
    <section className="border-t border-border bg-secondary/40 px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t.comparison.kicker}
          </span>
          <h2 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
            {t.comparison.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {t.comparison.body}
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-12">
          <div className="overflow-hidden rounded-3xl border border-border bg-background">
            <table className="hidden w-full border-collapse text-left sm:table">
              <caption className="sr-only">{t.comparison.caption}</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-5 py-4 text-[13px] font-medium text-muted-foreground">
                    {t.comparison.featureHeader}
                  </th>
                  {t.comparison.columns.map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className={cn(
                        'px-5 py-4 text-[13px] font-semibold',
                        c === 'CLYDE' && 'bg-brand/[0.07] text-brand',
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.comparison.rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-border last:border-0"
                  >
                    <th
                      scope="row"
                      className="px-5 py-4 text-[13px] font-medium"
                    >
                      {row.feature}
                    </th>
                    {row.cells.map((cell, i) => {
                      const isClyde = i === row.cells.length - 1
                      return (
                        <td
                          key={i}
                          className={cn(
                            'px-5 py-4 align-middle',
                            isClyde && 'bg-brand/[0.05]',
                          )}
                        >
                          <Cell
                            value={cell}
                            isClyde={isClyde}
                            negatives={t.comparison.negatives}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-3 p-3 sm:hidden">
              {t.comparison.rows.map((row) => (
                <article key={row.feature} className="rounded-2xl border border-border p-4">
                  <h3 className="text-sm font-semibold">{row.feature}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {row.cells.map((cell, i) => (
                      <div key={`${row.feature}-${t.comparison.columns[i]}`} className={cn('rounded-xl bg-secondary/60 p-2.5', i === row.cells.length - 1 && 'bg-brand/[0.08]')}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t.comparison.columns[i]}</p>
                        <Cell value={cell} isClyde={i === row.cells.length - 1} negatives={t.comparison.negatives} />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function Onboarding() {
  const t = useT()
  return (
    <section className="border-t border-border px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t.onboarding.kicker}
          </span>
          <h2 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
            {t.onboarding.title}
          </h2>
        </Reveal>

        <RevealGroup
          className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
          stagger={70}
        >
          {t.onboarding.steps.map((s, i) => (
            <div key={s.title} className="border-t-2 border-foreground/12 pt-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-semibold text-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base font-semibold">{s.title}</h3>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {s.detail}
              </p>
            </div>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
