import type { Metadata } from 'next'

import { Equipe } from '@/components/clyde/pages/equipe'
import { PageShell } from '@/components/clyde/pages/page-shell'

export const metadata: Metadata = {
  title: 'L’équipe — CLYDE',
  description:
    'Qui construit CLYDE : une petite équipe à Douala et Yaoundé, ce qu’elle fait et ce à quoi elle tient.',
}

export default function EquipePage() {
  return (
    /* Papier millimétré, comme l'accueil : cette page présente ceux qui
       dessinent l'outil, elle appartient à la même table à dessin. */
    <PageShell pattern="blueprint" glow>
      <Equipe />
    </PageShell>
  )
}
