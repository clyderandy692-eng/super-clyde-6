'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { useT } from '@/lib/clyde/i18n'
import { cn } from '@/lib/utils'

/* ============================================================
   La Révélation — la seule section narrative de la landing.

   Le reste de la page garde son ton direct et factuel ; ici,
   et seulement ici, le monde CLYDE parle : le mouvement
   flou → net, invisible → vu. La maquette passe de la
   silhouette générique à la vitrine nette quand la section
   entre dans le viewport.
   ============================================================ */

export function LandingRevelation() {
  const t = useT()
  const r = t.revelation
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  /* Déclenchement au scroll : le passage flou → net ne se joue qu'une
     fois, comme le rituel qu'il annonce. */
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          /* Petit délai : laisser le visiteur voir l'état « avant »
             avant que la netteté n'arrive. */
          window.setTimeout(() => setRevealed(true), 650)
          observer.disconnect()
        }
      },
      { threshold: 0.45 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="px-5 py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal variant="up">
          <div className="flex flex-col items-start gap-5">
            <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-brand uppercase">
              {r.kicker}
            </span>
            <h2 className="text-balance text-3xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.75rem]">
              {r.title}
            </h2>
            <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">
              {r.body}
            </p>
            <p className="border-l-2 border-brand pl-4 text-[15px] font-semibold italic">
              {r.punch}
            </p>
            <Link
              href="/inscription"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground transition-transform hover:scale-[1.02]"
            >
              {r.cta}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>

        {/* La maquette : une vitrine qui se révèle. */}
        <Reveal variant="scale" delay={120}>
          <div
            ref={ref}
            className="relative mx-auto w-full max-w-105 overflow-hidden rounded-3xl border border-border bg-secondary/60 p-6 sm:p-8"
          >
            <div
              aria-hidden="true"
              className={cn(
                'flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 transition-all duration-1000 ease-out',
                revealed
                  ? 'blur-0 opacity-100 saturate-100'
                  : 'blur-md opacity-60 saturate-0',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-brand-foreground">
                  M
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold">Maison Mbappé</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    clyde.app/r/maison-mbappe
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {[76, 58, 66].map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-secondary px-3.5 py-3"
                  >
                    <span
                      className="h-2.5 rounded-full bg-foreground/25"
                      style={{ width: `${w}%` }}
                    />
                    <span className="h-2.5 w-10 rounded-full bg-brand/50" />
                  </div>
                ))}
              </div>
            </div>

            {/* L'étiquette d'état accompagne la transition. */}
            <p
              role="status"
              className="mt-5 flex items-center justify-center gap-2 font-mono text-[11px] font-bold tracking-[0.2em] uppercase"
            >
              <Eye size={13} className="text-brand" aria-hidden="true" />
              <span className={revealed ? 'text-brand' : 'text-muted-foreground'}>
                {revealed ? r.afterLabel : r.beforeLabel}
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
