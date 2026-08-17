import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { ThreadView } from '@/components/clyde/forum/thread-view'

/* Titre générique : les fils vivent dans le stockage du navigateur, le serveur
   ne peut donc pas connaître celui-ci. Le jour où le forum passera en base,
   `generateMetadata` lira le fil et rendra son vrai titre. */
export const metadata: Metadata = {
  title: 'Forum — Usine CLYDE',
  description:
    'Une discussion du forum des commerçants CLYDE : questions, réponses et retours d’expérience entre pairs.',
}

export default async function ThreadPage({
  params,
}: {
  /* Next.js 16 : `params` est une promesse, il faut l'attendre. */
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    /* Mêmes rainures que la liste : on reste dans le même meuble, on a juste
       ouvert un casier. */
    <PageShell pattern="louver">
      <ThreadView threadId={id} />
    </PageShell>
  )
}
