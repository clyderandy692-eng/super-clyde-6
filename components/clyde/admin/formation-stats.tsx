'use client'

/* ============================================================
   Suivi des formations

   Ce que l'admin a besoin de savoir n'est pas « combien de cours
   existent » — il les a écrits — mais lesquels sont RÉELLEMENT suivis,
   et surtout lesquels sont commencés puis abandonnés.

   D'où la colonne « abandon » : un cours très ouvert et jamais
   terminé est un cours à réécrire, pas un succès d'audience. Sans
   elle, un tableau de progression flatte au lieu d'informer.
   ============================================================ */

import { GraduationCap } from 'lucide-react'
import { COURSES, courseLessons } from '@/lib/clyde/formation'
import { useClyde } from '@/lib/clyde/store'

export function AdminFormationStats() {
  const completions = useClyde((s) => s.lessonCompletions)
  const certificates = useClyde((s) => s.certificates)

  const rows = COURSES.map((course) => {
    const lessons = courseLessons(course)
    const lessonIds = new Set(lessons.map((l) => l.id))

    /* Un « inscrit » est un commerce qui a validé au moins une leçon du
       cours. Il n'existe pas de table d'inscription : la seule preuve
       d'intérêt disponible est un acte, pas une intention. */
    const startedBy = new Set(
      completions
        .filter((c) => lessonIds.has(c.lesson_id))
        .map((c) => c.business_id),
    )
    /* Filtré sur `type === 'formation'` en plus du cours : les certificats de
       fondation et des 200 abonnés n'ont pas de cours associé, et les compter
       ici gonflerait le nombre de certifiés d'un cours qu'ils n'ont pas suivi. */
    const finishedBy = new Set(
      certificates
        .filter((c) => c.type === 'formation' && c.related_course_id === course.id)
        .map((c) => c.business_id),
    )
    /* Compté sur les commerces ayant commencé sans finir, et non par
       différence de totaux : un certificat peut exister sans complétion
       enregistrée (données de démonstration), et la soustraction aurait
       alors produit un abandon négatif. */
    const abandoned = [...startedBy].filter((b) => !finishedBy.has(b)).length

    return {
      id: course.id,
      title: course.title.fr,
      track: course.track,
      lessons: lessons.length,
      started: startedBy.size,
      finished: finishedBy.size,
      abandoned,
    }
  }).sort((a, b) => b.started - a.started)

  const totalStarted = rows.reduce((sum, r) => sum + r.started, 0)
  const totalFinished = rows.reduce((sum, r) => sum + r.finished, 0)

  return (
    <section
      id="formations"
      className="scroll-mt-20 rounded-2xl border border-border bg-background p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <GraduationCap className="size-4 text-brand" aria-hidden="true" />
            Formations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {COURSES.length} cours publiés · {totalStarted} commencés ·{' '}
            {totalFinished} certifiés.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <caption className="sr-only">
            Engagement par cours : commencés, terminés, abandonnés
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="pb-2 font-semibold">
                Cours
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Leçons
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Commencé
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Terminé
              </th>
              <th scope="col" className="pb-2 text-right font-semibold">
                Abandon
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="py-2.5 pr-3">
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                    {r.track === 'usine' ? 'Usine' : 'Communauté'}
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono text-muted-foreground">
                  {r.lessons}
                </td>
                <td className="py-2.5 text-right font-mono">{r.started}</td>
                <td className="py-2.5 text-right font-mono">{r.finished}</td>
                <td
                  className={`py-2.5 text-right font-mono ${
                    r.abandoned > 0 ? 'font-bold text-brand' : 'text-muted-foreground'
                  }`}
                >
                  {r.abandoned}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
