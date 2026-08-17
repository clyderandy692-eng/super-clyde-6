import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { LegalContent } from '@/components/clyde/pages/legal-content'

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation',
  description:
    'Ce que CLYDE fournit, ce dont le commerçant reste responsable, les contenus interdits et les règles d’abonnement.',
}

export default function TermsPage() {
  return (
    <PageShell>
      <LegalContent doc="terms" />
    </PageShell>
  )
}
