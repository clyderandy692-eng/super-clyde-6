import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { CourseDetail } from '@/components/clyde/formation/course-detail'
import { COURSES, courseMinutes, findCourse } from '@/lib/clyde/formation'

/* Le catalogue est connu à la compilation : autant prérendre chaque cours
   plutôt que de les rendre à la demande. */
export function generateStaticParams() {
  return COURSES.map((course) => ({ slug: course.slug }))
}

/* Next 16 : `params` est asynchrone et doit être attendu. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const course = findCourse(slug)
  if (!course) return { title: 'Formation' }

  /* Les métadonnées sont rendues côté serveur, sans connaissance de la langue
     choisie dans le navigateur : on publie donc le français, langue par
     défaut du site. */
  return {
    title: `${course.title.fr} — Formation CLYDE`,
    description: course.summary.fr,
    openGraph: {
      title: course.title.fr,
      description: `${course.summary.fr} — ${courseMinutes(course)} min, par ${course.author.name}.`,
      type: 'article',
    },
  }
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return (
    /* Même cahier réglé que le catalogue, sans halo : sur la page d'un cours
       on lit une leçon, la page n'a plus à accrocher le regard. */
    <PageShell pattern="ruled">
      <CourseDetail slug={slug} />
    </PageShell>
  )
}
