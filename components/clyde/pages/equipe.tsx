'use client'

import Link from 'next/link'
import { ArrowRight, Mail, MapPin } from 'lucide-react'

import { bi } from '@/lib/clyde/formation'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { TEAM } from '@/lib/clyde/team'

/** Adresse de contact de l'équipe, la même que le compte admin de la démo. */
const TEAM_EMAIL = 'equipe@clyde.app'

export function Equipe() {
  const t = useT()
  const { locale } = useLocale()
  const e = t.team

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-brand uppercase">
          {e.badge}
        </span>
        <h1 className="mt-3 text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl">
          {e.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-pretty text-muted-foreground">
          {e.subtitle}
        </p>
      </header>

      {/* --- Les personnes --------------------------------------------- */}
      <section className="mt-12" aria-labelledby="team-roles">
        <h2
          id="team-roles"
          className="border-b border-border pb-3 text-sm font-bold tracking-tight"
        >
          {e.rolesTitle}
        </h2>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {TEAM.map((m) => (
            <li
              key={m.id}
              className="flex gap-4 rounded-2xl border border-border bg-background p-5"
            >
              {/* Initiales plutôt qu'un portrait inventé : une fausse photo de
                  quelqu'un qui n'existe pas serait plus gênante qu'un rond. */}
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[13px] font-bold text-foreground"
              >
                {m.initials}
              </span>

              <div className="min-w-0">
                <p className="text-[15px] font-bold tracking-tight">{m.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] font-bold tracking-[0.14em] text-brand uppercase">
                  {bi(m.role, locale)}
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="size-3" aria-hidden="true" />
                    {m.city}
                  </span>
                </p>
                <p className="mt-2.5 text-[13px] leading-relaxed text-pretty text-muted-foreground">
                  {bi(m.focus, locale)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Les engagements ------------------------------------------- */}
      <section className="mt-12" aria-labelledby="team-values">
        <h2
          id="team-values"
          className="border-b border-border pb-3 text-sm font-bold tracking-tight"
        >
          {e.valuesTitle}
        </h2>

        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {e.values.map((v) => (
            <li
              key={v.title}
              className="rounded-2xl border border-border bg-secondary p-5"
            >
              <p className="text-[15px] leading-snug font-bold tracking-tight text-balance">
                {v.title}
              </p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-pretty text-muted-foreground">
                {v.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Contact ---------------------------------------------------- */}
      <section
        className="mt-12 rounded-2xl border border-border bg-background p-6 sm:p-8"
        aria-labelledby="team-contact"
      >
        <h2 id="team-contact" className="text-lg font-bold tracking-tight">
          {e.contactTitle}
        </h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-pretty text-muted-foreground">
          {e.contactBody}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {/* Le forum d'abord : une réponse publique sert aux suivants, un
              courriel ne sert qu'à celui qui l'a écrit. */}
          <Link
            href="/forum"
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-[13px] font-bold text-background transition-transform active:scale-[0.97]"
          >
            {e.contactForum}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a
            href={`mailto:${TEAM_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[13px] font-bold transition-colors hover:border-foreground/30"
          >
            <Mail className="size-4" aria-hidden="true" />
            {e.contactMail}
          </a>
        </div>
      </section>
    </div>
  )
}
