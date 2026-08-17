import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { HelpContent } from '@/components/clyde/pages/help-content'

export const metadata: Metadata = {
  title: 'Centre d’aide',
  description:
    'Comment créer votre page, recevoir vos commandes sur WhatsApp, utiliser les QR codes par table et modifier vos prix. Les réponses aux questions les plus fréquentes.',
}

export default function HelpPage() {
  return (
    <PageShell>
      <HelpContent />
    </PageShell>
  )
}
