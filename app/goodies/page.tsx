import type { Metadata } from 'next'

import { Boutique } from '@/components/clyde/goodies/boutique'
import { PageShell } from '@/components/clyde/pages/page-shell'

export const metadata: Metadata = {
  title: 'Boutique Goodies — CLYDE',
  description:
    'Échangez les points gagnés dans la Formation contre des goodies utiles en boutique : tablier, chevalet QR, autocollants, t-shirt.',
}

export default function GoodiesPage() {
  return (
    /* Tôle perforée : le panneau d'un présentoir d'atelier, celui auquel on
       accroche les objets. C'est exactement ce que fait cette page. */
    <PageShell pattern="perforated" glow>
      <Boutique />
    </PageShell>
  )
}
