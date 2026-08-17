import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { ForumList } from '@/components/clyde/forum/forum-list'
import { JoinTeamCollapsible } from '@/components/clyde/dev-team/join-team'

export const metadata: Metadata = {
  title: 'Forum — l’entraide entre commerçants',
  description:
    'Le forum de l’Usine CLYDE : poser une question à ceux qui tiennent le même métier, montrer sa page et demander un avis franc, comprendre l’outil. Modéré, signé du nom de son commerce.',
  openGraph: {
    title: 'Le Forum CLYDE',
    description:
      'Des commerçants qui se répondent entre eux. Entraide, vitrine, technique.',
    type: 'website',
  },
}

export default function ForumPage() {
  return (
    /* Rainures verticales : la face d'un meuble à casiers. Un forum est un
       mur de cases où chacun dépose et vient relever. */
    <PageShell pattern="louver">
      {/* Replié par défaut : ce que l'on envoie est le compte-rendu des
          décisions prises ici, donc sa place est en tête du Forum. Mais un bloc
          déployé aurait repoussé vers le bas les fils que le visiteur est venu
          lire — il s'ouvre seulement si on le demande. */}
      <JoinTeamCollapsible className="mb-6" />
      <ForumList />
    </PageShell>
  )
}
