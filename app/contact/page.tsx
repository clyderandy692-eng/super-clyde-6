import type { Metadata } from 'next'
import { PageShell } from '@/components/clyde/pages/page-shell'
import { ContactContent } from '@/components/clyde/pages/contact-content'

export const metadata: Metadata = {
  title: 'Nous contacter',
  description:
    'Une question sur votre page, vos commandes WhatsApp ou votre abonnement ? Écrivez-nous sur WhatsApp, par e-mail ou via le formulaire.',
}

export default function ContactPage() {
  return (
    <PageShell>
      <ContactContent />
    </PageShell>
  )
}
