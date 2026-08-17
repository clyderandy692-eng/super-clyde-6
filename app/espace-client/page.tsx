import type { Metadata } from 'next'
import { ClientSpace } from '@/components/clyde/customer/client-space'

export const metadata: Metadata = {
  title: 'Mon espace client',
  description: 'Retrouvez vos commandes, réservations et favoris CLYDE au même endroit.',
}

export default function ClientSpacePage() {
  return <ClientSpace />
}
