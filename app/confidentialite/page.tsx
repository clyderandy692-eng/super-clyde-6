import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { LegalContent } from '@/components/clyde/pages/legal-content'

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Quelles données CLYDE traite, pourquoi, combien de temps elles sont conservées, et quels sont vos droits.',
}

export default function PrivacyPage() {
  return (
    <PageShell>
      <LegalContent doc="privacy" />
    </PageShell>
  )
}
