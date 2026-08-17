'use client'

import Link from 'next/link'
import {
  BadgeCheck,
  Blocks,
  PiggyBank,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react'
import { Reveal, RevealGroup } from '@/components/clyde/reveal'
import { useLocale, useT, useFamilyMeta } from '@/lib/clyde/i18n'
import { ENGINEER_POSTS } from '@/lib/clyde/factory'
import { FAMILIES } from '@/lib/clyde/taxonomy'

/* Les icônes des six piliers vivent ici : elles ne se traduisent pas, et
   l'ordre suit exactement celui du dictionnaire. */
const PILLAR_ICONS = [Sparkles, Blocks, Zap, Wand2, BadgeCheck, PiggyBank]

/**
 * L'Invitation de l'Usine.
 *
 * Le rituel d'acquisition du monde CLYDE : on n'invite pas à « essayer un
 * outil », on recrute. L'avis de recrutement est l'élément signature de la
 * section — un vrai document administratif, référencé et tamponné — et tout
 * le reste autour reste volontairement silencieux pour qu'il porte seul.
 *
 * La même voix doit servir en publicité et en prospection : ce bloc est la
 * référence visuelle de la carte d'invitation imprimée.
 */
export function FactoryInvitation() {
  const t = useT()
  const { locale } = useLocale()
  const familyMeta = useFamilyMeta()
  const f = t.factory

  return (
    <section
      id="usine"
      className="border-t border-border px-5 py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-16">
          {/* L'avis de recrutement — le document */}
          <Reveal>
            <article className="overflow-hidden rounded-3xl border border-border bg-background shadow-[0_28px_60px_-40px_rgba(23,20,18,0.4)]">
              {/* En-tête : l'institution signe avant de parler. */}
              <header className="flex flex-wrap items-center justify-between gap-3 bg-foreground px-6 py-4 text-background">
                <span className="flex items-baseline gap-2.5">
                  <span className="text-base font-bold tracking-tight">
                    CLYDE
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase opacity-70">
                    {f.invite.institution}
                  </span>
                </span>
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-70">
                  {f.invite.reference}
                </span>
              </header>

              <div className="px-6 py-8 md:px-9 md:py-10">
                <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  {f.invite.addressee}
                </p>

                <h2 className="mt-5 text-3xl leading-[1.08] font-semibold tracking-tight text-balance md:text-4xl">
                  {f.title}
                </h2>

                <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
                  {f.invite.body}
                </p>

                {/* La devise : la seule ligne qui a le droit d'être forte. */}
                <p className="mt-6 border-l-2 border-brand pl-4 text-[15px] leading-relaxed font-semibold">
                  {f.invite.motto}
                </p>

                <p className="mt-5 text-sm text-muted-foreground">
                  {f.invite.requirement}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/inscription"
                    className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.97]"
                  >
                    {f.invite.cta}
                  </Link>
                  <Link
                    href="/marketplace"
                    className="rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
                  >
                    {f.invite.secondary}
                  </Link>
                  {/* Le tampon : léger, jamais centré, il date le document. */}
                  <span className="ml-auto hidden -rotate-6 rounded-md border-2 border-brand/60 px-3 py-1 font-mono text-[10px] font-bold tracking-[0.14em] text-brand uppercase sm:inline-block">
                    {f.invite.stamp}
                  </span>
                </div>
              </div>
            </article>
          </Reveal>

          {/* Les postes ouverts — la contrepartie administrative du document */}
          <Reveal delay={120}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase">
              {f.kicker}
            </span>
            <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
              {f.body}
            </p>

            <h3 className="mt-9 text-sm font-semibold tracking-wide uppercase">
              {f.postsTitle}
            </h3>
            <ul className="mt-4 flex flex-col divide-y divide-border border-y border-border">
              {FAMILIES.map((family) => (
                <li
                  key={family.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <span className="text-sm font-semibold">
                    {ENGINEER_POSTS[family.id][locale]}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {familyMeta(family.id).label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              {f.postsNote}
            </p>
          </Reveal>
        </div>

        {/* Ce que fournit l'Usine — six promesses, chacune adossée à une
            fonctionnalité réelle. */}
        <div className="mt-20">
          <h3 className="text-sm font-semibold tracking-wide uppercase">
            {f.pillarsTitle}
          </h3>
          <RevealGroup
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            stagger={70}
          >
            {f.pillars.map((pillar, i) => {
              const Icon = PILLAR_ICONS[i] ?? Sparkles
              return (
                <div
                  key={pillar.name}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-5"
                >
                  <span
                    className="grid size-9 place-items-center rounded-xl bg-background text-brand"
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <h4 className="text-sm font-semibold">{pillar.name}</h4>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {pillar.body}
                  </p>
                </div>
              )
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}
