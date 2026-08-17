'use client'

import Link from 'next/link'
import { Award, BadgeCheck, Gift, GraduationCap, Users } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { PageHeader } from '@/components/clyde/pages/page-shell'
import { useLocale, useT } from '@/lib/clyde/i18n'
import {
  bi,
  courseLessons,
  courseMinutes,
  courseProgress,
  coursesByTrack,
  type Course,
  type CourseTrack,
} from '@/lib/clyde/formation'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'

/**
 * Le catalogue de la Formation.
 *
 * Les deux niveaux sont présentés comme deux registres distincts, et non
 * mélangés dans une grille unique : la valeur de la section vient précisément
 * du fait qu'un cours de CLYDE et un cours d'un confrère ne se lisent pas de
 * la même façon. L'un est la doctrine, l'autre l'expérience.
 */
export function FormationCatalogue() {
  const t = useT()
  const f = t.formation

  return (
    <>
      <PageHeader badge={f.badge} title={f.title} subtitle={f.subtitle} />

      <div className="mx-auto w-full max-w-5xl px-5 md:px-8">
        <SignedOutNotice />
        <Track track="usine" icon={GraduationCap} />
        <Track track="communaute" icon={Users} />
        <TeachInvite />
      </div>
    </>
  )
}

/**
 * Rappel de connexion.
 *
 * Un visiteur peut lire tous les cours sans compte — c'est voulu, la Formation
 * sert aussi à recruter. Mais cocher une leçon sans session ne serait inscrit
 * nulle part : mieux vaut le dire avant qu'il ne s'y engage.
 */
function SignedOutNotice() {
  const t = useT()
  const ready = useClydeReady()
  const userId = useSession((s) => s.userId)

  /* Avant réhydratation, on n'affiche rien : rendre l'avertissement puis le
     retirer ferait sauter la page sous les yeux du visiteur connecté. */
  if (!ready || userId) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5">
      <p className="text-sm text-muted-foreground">{t.formation.signedOut}</p>
      <Link
        href="/connexion"
        className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
      >
        {t.formation.signedOutCta}
      </Link>
    </div>
  )
}

function Track({
  track,
  icon: Icon,
}: {
  track: CourseTrack
  icon: typeof GraduationCap
}) {
  const t = useT()
  const meta = t.formation.tracks[track]
  const courses = coursesByTrack(track)

  return (
    <section className="mt-14 first-of-type:mt-10">
      <Reveal>
        <header className="flex items-start gap-3 border-b border-border pb-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{meta.label}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {meta.note}
            </p>
          </div>
        </header>
      </Reveal>

      <ul className="mt-6 grid gap-5 md:grid-cols-2">
        {courses.map((course, i) => (
          <Reveal key={course.id} delay={i * 70} as="li">
            <CourseCard course={course} index={i + 1} />
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  const t = useT()
  const { locale } = useLocale()
  const f = t.formation
  const ready = useClydeReady()
  const businessId = useSession((s) => s.activeBusinessId)
  const completions = useClyde((s) => s.lessonCompletions)
  const certificates = useClyde((s) => s.certificates)

  const lessons = courseLessons(course)
  /* Tant que le stockage n'est pas relu, on affiche une progression nulle :
     c'est l'état du serveur, donc celui qui ne casse pas l'hydratation. */
  const doneIds = ready
    ? completions
        .filter((l) => l.business_id === businessId)
        .map((l) => l.lesson_id)
    : []
  const progress = courseProgress(course, doneIds)
  const certified =
    ready &&
    certificates.some(
      (c) =>
        c.business_id === businessId &&
        c.type === 'formation' &&
        c.related_course_id === course.id,
    )

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-foreground/25">
      {/* L'en-tête numérote le cours comme une pièce de dossier : c'est une
          vraie séquence pédagogique, pas une décoration. */}
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <span className="font-mono text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
          {course.track === 'usine' ? 'CLYDE' : bi(course.author.role, locale)}
          {' · '}
          {String(index).padStart(2, '0')}
        </span>
        <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] uppercase">
          {f.levels[course.level]}
        </span>
      </header>

      <div className="flex flex-1 flex-col px-5 py-5">
        <h3 className="text-pretty text-lg leading-snug font-semibold">
          {bi(course.title, locale)}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {bi(course.summary, locale)}
        </p>

        <p className="mt-4 font-mono text-[11px] tracking-wide text-muted-foreground">
          {(lessons.length === 1
            ? f.lessonsCountOne
            : f.lessonsCount.replace('{n}', String(lessons.length))) +
            ' · ' +
            f.minutesShort.replace('{n}', String(courseMinutes(course)))}
        </p>

        {/* Auteur : pour un cours communautaire, c'est l'information la plus
            importante de la carte — on apprend de quelqu'un, pas d'un logo. */}
        {course.track === 'communaute' && (
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">{f.by} </span>
            <span className="font-semibold">{course.author.name}</span>
          </p>
        )}

        <div className="mt-auto pt-5">
          {progress.done > 0 && !progress.complete && (
            <ProgressBar ratio={progress.ratio} />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {certified ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
                <BadgeCheck className="size-4" aria-hidden="true" />
                {f.certificateHeld}
              </span>
            ) : (
              course.certificate && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Award className="size-4" aria-hidden="true" />
                  {f.certificateAward}
                </span>
              )
            )}
            {course.goodie && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gift className="size-4" aria-hidden="true" />
                {bi(course.goodie, locale)}
              </span>
            )}
          </div>

          <Link
            href={`/formation/${course.slug}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background transition-transform active:scale-[0.98]"
          >
            {progress.done > 0 && !progress.complete ? f.resume : f.open}
          </Link>
        </div>
      </div>
    </article>
  )
}

export function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.round(ratio * 100)
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/**
 * L'appel à enseigner.
 *
 * Sans lui, le second registre resterait décoratif : le commerçant comprend
 * qu'il peut consommer des cours de ses pairs, mais pas qu'il peut en donner.
 */
function TeachInvite() {
  const t = useT()
  const f = t.formation

  return (
    <Reveal>
      <section className="mt-16 rounded-2xl border border-border bg-secondary px-6 py-8 md:px-9 md:py-10">
        <h2 className="text-pretty text-xl font-bold tracking-tight md:text-2xl">
          {f.teachTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {f.teachBody}
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.97]"
        >
          {f.teachCta}
        </Link>
      </section>
    </Reveal>
  )
}
