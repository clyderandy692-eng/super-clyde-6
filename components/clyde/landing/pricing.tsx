'use client'

import Link from 'next/link'
import { Check, Sparkles, Zap } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { cn } from '@/lib/utils'

import { PLANS } from '@/lib/clyde/plans'
import { useT } from '@/lib/clyde/i18n'

function formatXaf(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
}

export function Pricing() {
  const t = useT()
  return (
    <section
      id="tarifs"
      className="border-t border-border bg-secondary/40 px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t.pricing.kicker}
          </span>
          <h2 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {t.pricing.body}
          </p>
        </Reveal>

        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((plan, i) => {
            /* `plans.ts` garde le prix, le lien et la mise en avant ;
               le dictionnaire ne porte que le texte. */
            const copy = t.pricing.plans[plan.id]
            return (
            <Reveal
              key={plan.id}
              variant={plan.featured ? 'scale' : 'up'}
              delay={i * 90}
              className="h-full"
            >
              <div
                className={cn(
                  'flex h-full flex-col rounded-3xl border p-7 transition-transform duration-300 hover:-translate-y-1',
                  plan.featured
                    ? 'border-transparent bg-brand text-brand-foreground shadow-[0_28px_60px_-24px_rgba(255,107,53,0.55)] lg:p-9'
                    : 'border-border bg-background',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3
                      className={cn(
                        'text-lg font-semibold',
                        plan.featured && 'text-brand-foreground',
                      )}
                    >
                      {copy.name}
                    </h3>
                    <p
                      className={cn(
                        'mt-1 max-w-[24ch] text-[13px] leading-relaxed',
                        plan.featured
                          ? 'text-brand-foreground/85'
                          : 'text-muted-foreground',
                      )}
                    >
                      {copy.tagline}
                    </p>
                  </div>
                  {plan.featured && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-foreground/15 px-3 py-1.5 text-[11px] font-semibold tracking-wide backdrop-blur">
                      <Zap className="size-3" aria-hidden="true" />
                      {t.pricing.mostChosen}
                    </span>
                  )}
                </div>

                <div className="mt-7 flex items-end gap-1.5">
                  {plan.price === null ? (
                    <span className="text-3xl leading-none font-semibold tracking-tight">
                      {t.pricing.onRequest}
                    </span>
                  ) : (
                    <>
                      <span className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
                        {formatXaf(plan.price)}
                      </span>
                      <span
                        className={cn(
                          'pb-1 text-sm font-medium',
                          plan.featured
                            ? 'text-brand-foreground/80'
                            : 'text-muted-foreground',
                        )}
                      >
                        {t.pricing.perMonth}
                      </span>
                    </>
                  )}
                </div>

                <Link
                  href={plan.href}
                  className={cn(
                    'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-transform active:scale-[0.99]',
                    plan.featured
                      ? 'bg-brand-foreground text-brand hover:bg-brand-foreground/92'
                      : 'bg-foreground text-background hover:bg-foreground/90',
                  )}
                >
                  {copy.cta}
                  {plan.featured && (
                    <Sparkles className="size-4" aria-hidden="true" />
                  )}
                </Link>

                <ul className="mt-7 flex flex-col gap-3 border-t pt-6 text-[13px] leading-relaxed lg:mt-5">
                  {copy.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full',
                          plan.featured
                            ? 'bg-brand-foreground/20'
                            : 'bg-brand/12 text-brand',
                        )}
                      >
                        <Check className="size-2.5" aria-hidden="true" />
                      </span>
                      <span
                        className={
                          plan.featured
                            ? 'text-brand-foreground/92'
                            : 'text-foreground/85'
                        }
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            )
          })}
        </div>

        <Reveal
          delay={220}
          className="mt-10 text-center text-[13px] text-muted-foreground"
        >
          {t.pricing.footnote}
        </Reveal>
      </div>
    </section>
  )
}
