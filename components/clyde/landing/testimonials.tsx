'use client'

import { Play, Star } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { useT } from '@/lib/clyde/i18n'
import { cn } from '@/lib/utils'

export function LandingTestimonials() {
  const t = useT()
  return (
    <section
      id="temoignages"
      className="border-y border-border bg-secondary/45 px-5 py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal variant="up">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-brand uppercase">
              {t.testimonials.kicker}
            </span>
            <h2 className="max-w-xl text-balance text-3xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.75rem]">
              {t.testimonials.title}
            </h2>
            {/* Honnêteté avant tout : ces cartes sont des scénarios types,
                pas des citations clients — et la page le dit. */}
            <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              {t.testimonials.note}
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.testimonials.items.map((item, i) => (
            <Reveal
              key={item.name}
              variant="up"
              delay={60 + i * 60}
              className={cn(i === 0 && 'lg:row-span-2')}
            >
              {/* Ni <figure> ni <blockquote> : ce sont des scénarios types,
                  pas des citations attribuées à quelqu'un. */}
              <article
                className={cn(
                  'flex h-full flex-col gap-4 rounded-2xl border border-border bg-background p-5',
                  i === 0 && 'lg:justify-between lg:p-6',
                )}
              >
                <span
                  className="h-1 w-8 shrink-0 rounded-full bg-brand"
                  aria-hidden="true"
                />
                <p
                  className={cn(
                    'text-pretty leading-relaxed font-medium',
                    i === 0 ? 'text-base lg:text-lg' : 'text-[14px]',
                  )}
                >
                  {item.quote}
                </p>
                <div className="mt-auto flex flex-col gap-2">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-brand/10 px-2 py-1 text-[11px] font-bold text-brand">
                    {item.stat}
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">
                      {item.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold">
                        {item.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {item.role}
                      </span>
                    </span>
                  </span>
                </div>
              </article>
            </Reveal>
          ))}

          {/* Emplacement témoignage vidéo */}
          <Reveal variant="up" delay={300}>
            <div className="relative flex h-full min-h-[220px] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-foreground p-5">
              <div
                className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,color-mix(in_oklab,var(--brand)_38%,transparent),transparent_70%)]"
                aria-hidden="true"
              />
              {/* Aperçu vidéo à venir : plutôt qu'un bouton « Lire » qui ne
                  déclenche rien (un contrôle mort trompe le clavier et le
                  lecteur d'écran), on montre une pastille désactivée honnête.
                  Elle reste focalisable et annonce son état « bientôt ». */}
              <span
                className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-brand-foreground"
                aria-hidden="true"
              >
                <Play size={20} className="ml-0.5 fill-current" />
              </span>
              <span className="absolute top-4 right-4 rounded-full bg-background/15 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-background uppercase backdrop-blur">
                {t.testimonials.videoSoon}
              </span>
              <div className="relative">
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={12}
                      className="fill-brand text-brand"
                    />
                  ))}
                </span>
                <p className="mt-1.5 text-[13px] leading-snug font-bold text-background">
                  {t.testimonials.videoQuote}
                </p>
                <p className="text-[11px] text-background/60">
                  {t.testimonials.videoMeta}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
