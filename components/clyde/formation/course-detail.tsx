'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Check,
  Gift,
  ImageIcon,
  PlayCircle,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Reveal } from '@/components/clyde/reveal'
import { ProgressBar } from '@/components/clyde/formation/catalogue'
import { useLocale, useT } from '@/lib/clyde/i18n'
import {
  bi,
  courseLessons,
  courseMinutes,
  courseProgress,
  findCourse,
  type Lesson,
  type LessonKind,
} from '@/lib/clyde/formation'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'

/** Chaque nature de leçon porte son icône : on voit d'un coup d'œil si la
    leçon se lit, se regarde ou s'observe. */
const KIND_ICONS: Record<LessonKind, typeof FileText> = {
  text: FileText,
  image: ImageIcon,
  video: PlayCircle,
}

/**
 * Un cours, module par module.
 *
 * La progression est enregistrée leçon par leçon dès la coche, sans écran de
 * validation : un commerçant qui suit un cours entre deux clients ne revient
 * pas confirmer quoi que ce soit.
 */
export function CourseDetail({ slug }: { slug: string }) {
  const t = useT()
  const { locale } = useLocale()
  const f = t.formation
  const ready = useClydeReady()
  const userId = useSession((s) => s.userId)
  const businessId = useSession((s) => s.activeBusinessId)
  const completions = useClyde((s) => s.lessonCompletions)
  const certificates = useClyde((s) => s.certificates)
  const toggleLesson = useClyde((s) => s.toggleLesson)

  const course = findCourse(slug)

  /* La route est générée depuis le catalogue, mais un lien périmé peut rester
     dans un signet : on ne laisse pas l'écran planter sur `undefined`. */
  if (!course) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
        <Link
          href="/formation"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {f.back}
        </Link>
      </div>
    )
  }

  const lessons = courseLessons(course)
  const doneIds = ready
    ? completions
        .filter((l) => l.business_id === businessId)
        .map((l) => l.lesson_id)
    : []
  const progress = courseProgress(course, doneIds)
  const doneSet = new Set(doneIds)
  const certified =
    ready &&
    certificates.some(
      (c) =>
        c.business_id === businessId &&
        c.type === 'formation' &&
        c.related_course_id === course.id,
    )

  /* Sans session, cocher n'inscrirait rien : on laisse lire, on empêche de
     croire que la progression est retenue. */
  const canTrack = ready && Boolean(userId)

  function onToggle(lesson: Lesson) {
    /* Sans page active, l'enregistrement serait rattaché à un identifiant vide :
       une progression écrite nulle part, que personne ne pourrait relire ni
       créditer. Le bouton est déjà désactivé — cette garde couvre le clavier et
       tout appel qui contournerait l'attribut `disabled`. */
    if (!canTrack || !businessId) return

    const result = toggleLesson({
      businessId,
      courseId: course!.id,
      lessonId: lesson.id,
      courseLessonIds: lessons.map((l) => l.id),
    })
    if (result.completedCourse) toast.success(f.completedToast)
  }

  let counter = 0

  return (
    <article className="mx-auto w-full max-w-3xl px-5 md:px-8">
      <Link
        href="/formation"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {f.back}
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px] font-bold tracking-[0.16em] uppercase">
            {f.tracks[course.track].label}
          </span>
          <span className="rounded-full border border-border px-3 py-1 font-mono text-[10px] font-bold tracking-[0.16em] uppercase">
            {f.levels[course.level]}
          </span>
        </div>

        <h1 className="mt-5 text-balance text-3xl leading-[1.08] font-bold tracking-[-0.02em] sm:text-4xl">
          {bi(course.title, locale)}
        </h1>
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {bi(course.summary, locale)}
        </p>

        <p className="mt-5 text-sm">
          <span className="text-muted-foreground">{f.by} </span>
          <span className="font-semibold">{course.author.name}</span>
          <span className="text-muted-foreground">
            {' — '}
            {bi(course.author.role, locale)}
          </span>
        </p>

        <p className="mt-3 font-mono text-[11px] tracking-wide text-muted-foreground">
          {(lessons.length === 1
            ? f.lessonsCountOne
            : f.lessonsCount.replace('{n}', String(lessons.length))) +
            ' · ' +
            f.minutesShort.replace('{n}', String(courseMinutes(course)))}
        </p>

        {/* Progression : affichée seulement quand elle veut dire quelque chose,
            pour ne pas ouvrir chaque cours sur une barre vide. */}
        {progress.done > 0 && (
          <div className="mt-6">
            <p className="mb-2 font-mono text-[11px] tracking-wide text-muted-foreground">
              {f.progress
                .replace('{done}', String(progress.done))
                .replace('{total}', String(progress.total))}
            </p>
            <ProgressBar ratio={progress.ratio} />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {course.certificate && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Award className="size-4" aria-hidden="true" />
              {f.certificateAward}
            </span>
          )}
          {course.goodie && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="size-4" aria-hidden="true" />
              {f.goodieAward.replace('{goodie}', bi(course.goodie, locale))}
            </span>
          )}
        </div>
      </header>

      {/* Le certificat obtenu s'annonce en haut : c'est la raison pour
          laquelle beaucoup rouvriront le cours. */}
      {certified && (
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
          <BadgeCheck
            className="mt-0.5 size-5 shrink-0 text-brand"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">{f.completedTitle}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {f.completedBody}
            </p>
          </div>
        </div>
      )}

      {!canTrack && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5">
          <p className="text-sm text-muted-foreground">{f.signedOut}</p>
          <Link
            href="/connexion"
            className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            {f.signedOutCta}
          </Link>
        </div>
      )}

      <div className="mt-10 flex flex-col gap-10 pb-4">
        {course.modules.map((mod, mi) => (
          <Reveal key={mod.id} delay={mi * 60} as="section">
            <h2 className="font-mono text-[11px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
              {bi(mod.title, locale)}
            </h2>

            <ol className="mt-4 flex flex-col gap-4">
              {mod.lessons.map((lesson) => {
                counter += 1
                const Icon = KIND_ICONS[lesson.kind]
                const done = doneSet.has(lesson.id)
                return (
                  <li
                    key={lesson.id}
                    className="overflow-hidden rounded-2xl border border-border bg-background"
                  >
                    <div className="flex items-start gap-3 px-5 pt-5">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-xs font-bold">
                        {String(counter).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-pretty font-semibold leading-snug">
                          {bi(lesson.title, locale)}
                        </h3>
                        <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-muted-foreground">
                          <Icon className="size-3.5" aria-hidden="true" />
                          {f.kinds[lesson.kind]}
                          {' · '}
                          {f.minutesShort.replace(
                            '{n}',
                            String(lesson.minutes),
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="px-5 pt-4 text-[15px] leading-relaxed text-muted-foreground">
                      {bi(lesson.body, locale)}
                    </p>

                    <div className="mt-5 border-t border-border px-5 py-3">
                      <button
                        type="button"
                        onClick={() => onToggle(lesson)}
                        disabled={!canTrack}
                        aria-pressed={done}
                        className={
                          'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
                          (done
                            ? 'text-brand'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground')
                        }
                      >
                        <span
                          className={
                            'grid size-5 place-items-center rounded-md border transition-colors ' +
                            (done
                              ? 'border-brand bg-brand text-brand-foreground'
                              : 'border-border')
                          }
                        >
                          {done && (
                            <Check className="size-3.5" aria-hidden="true" />
                          )}
                        </span>
                        {done ? f.markUndone : f.markDone}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Reveal>
        ))}
      </div>
    </article>
  )
}
