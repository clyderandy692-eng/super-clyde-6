'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  BarChart3,
  MessageCircle,
  Palette,
  QrCode,
  CalendarClock,
  Store,
} from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { ClydeWordmark } from '@/components/clyde/mark'
import { useT } from '@/lib/clyde/i18n'

/* Position, rotation et durée d'oscillation : purement visuel, donc hors
   dictionnaire. Le champ `key` fait la jointure avec `t.finalCta.stickers`. */
const STICKERS = [
  { icon: QrCode, key: 'qr', left: '6%', top: '18%', rot: '-9deg', dur: '7s' },
  {
    icon: MessageCircle,
    key: 'whatsapp',
    left: '20%',
    top: '62%',
    rot: '7deg',
    dur: '8.5s',
  },
  {
    icon: Palette,
    key: 'theme',
    left: '76%',
    top: '22%',
    rot: '11deg',
    dur: '9s',
  },
  {
    icon: BarChart3,
    key: 'analytics',
    left: '88%',
    top: '64%',
    rot: '-6deg',
    dur: '7.5s',
  },
  {
    icon: CalendarClock,
    key: 'booking',
    left: '46%',
    top: '78%',
    rot: '5deg',
    dur: '10s',
  },
] as const

export function FinalCta() {
  const t = useT()
  return (
    <section className="relative overflow-hidden border-t border-border px-5 py-24 md:px-8 md:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/16 blur-[110px]" />
        {STICKERS.map((s) => (
          <div
            key={s.key}
            className="clyde-float absolute hidden md:block"
            style={
              {
                left: s.left,
                top: s.top,
                '--dur': s.dur,
                '--amp': '14px',
                '--rot': s.rot,
              } as React.CSSProperties
            }
          >
            <div className="clyde-glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
              <s.icon className="size-4 text-brand" aria-hidden="true" />
              <span className="text-[11px] font-semibold">
                {t.finalCta.stickers[s.key]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Reveal variant="scale" className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl leading-[1.03] font-semibold tracking-tight text-balance md:text-6xl">
          {t.finalCta.titleBefore}{' '}
          <span className="text-brand">{t.finalCta.titleAccent}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          {t.finalCta.body}
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/inscription"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-7 py-4 text-sm font-semibold text-brand-foreground shadow-[0_18px_40px_-16px_rgba(255,107,53,0.6)] transition-transform hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
          >
            {t.finalCta.ctaPrimary}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-input bg-background px-6 py-4 text-sm font-semibold transition-colors hover:bg-secondary sm:w-auto"
          >
            <Store className="size-4" aria-hidden="true" />
            {t.finalCta.ctaSecondary}
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          {t.finalCta.footnote}
        </p>
      </Reveal>
    </section>
  )
}

export function Footer() {
  const t = useT()

  /* Les URL restent ici : elles ne changent pas avec la langue. */
  const columns = [
    {
      title: t.footer.productTitle,
      links: [
        { label: t.footer.product.builder, href: '/#builder' },
        { label: t.footer.product.orders, href: '/#fonctionnalites' },
        { label: t.footer.product.qr, href: '/#fonctionnalites' },
        { label: t.footer.product.booking, href: '/#modules' },
        { label: t.footer.product.analytics, href: '/#fonctionnalites' },
      ],
    },
    {
      title: t.footer.exploreTitle,
      links: [
        { label: t.footer.explore.marketplace, href: '/marketplace' },
        { label: t.footer.explore.formation, href: '/formation' },
        { label: t.footer.explore.forum, href: '/forum' },
        { label: t.footer.explore.goodies, href: '/goodies' },
        { label: t.footer.explore.pricing, href: '/#tarifs' },
        { label: t.footer.explore.signup, href: '/inscription' },
      ],
    },
    {
      title: t.footer.resourcesTitle,
      links: [
        { label: t.footer.resources.help, href: '/aide' },
        { label: t.footer.resources.team, href: '/equipe' },
        { label: t.footer.resources.contact, href: '/contact' },
        { label: t.footer.resources.privacy, href: '/confidentialite' },
        { label: t.footer.resources.terms, href: '/conditions' },
      ],
    },
  ]

  /* `pb-32` en dessous de `lg` : la barre d'onglets de la navigation est en
     `fixed`, donc hors du flux, et recouvrait la ligne de copyright — dernière
     du document. La réserve tombe à `pb-14` en `lg`, où cette barre n'est plus
     affichée. */
  return (
    <footer className="border-t border-border bg-foreground px-5 pt-14 pb-32 text-background md:px-8 lg:pb-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <ClydeWordmark className="text-background" />
            <p className="mt-4 text-sm leading-relaxed text-background/65">
              {t.footer.tagline}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['XAF', 'EUR', 'USD', 'CNY'].map((c) => (
                <span
                  key={c}
                  className="rounded-md border border-background/20 px-2 py-1 font-mono text-[11px] text-background/70"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:gap-16">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[11px] font-semibold tracking-[0.16em] text-background/45 uppercase">
                  {col.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-background/75 transition-colors hover:text-brand"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-background/15 pt-6 text-xs text-background/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} CLYDE. {t.footer.rights}
          </p>
          <p>{t.footer.credo}</p>
        </div>
      </div>
    </footer>
  )
}
