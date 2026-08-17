import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { FormationCatalogue } from '@/components/clyde/formation/catalogue'

export const metadata: Metadata = {
  title: 'Formation — apprendre son métier de commerçant en ligne',
  description:
    'Les cours de l’Usine CLYDE et ceux que les commerçants proposent entre eux : publier sa page, vendre sur WhatsApp, photographier ses produits, lire ses chiffres. Chaque cours achevé donne un certificat.',
  openGraph: {
    title: 'La Formation de l’Usine CLYDE',
    description:
      'Des cours produits par CLYDE, et des cours proposés par des commerçants à d’autres commerçants. Certificat à la clé.',
    type: 'website',
  },
}

export default function FormationPage() {
  return (
    /* Cahier réglé : on vient ici pour apprendre et prendre des notes. */
    <PageShell pattern="ruled" glow>
      <FormationCatalogue />
    </PageShell>
  )
}
