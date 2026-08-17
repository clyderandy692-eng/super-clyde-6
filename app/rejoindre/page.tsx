import type { Metadata } from 'next'
import { JoinScreen } from '@/components/clyde/referral/join-screen'

export const metadata: Metadata = {
  title: 'Rejoindre l’Usine CLYDE',
  description:
    'Vous avez été invité par un commerçant déjà installé. Créez votre page et recevez 65 jours d’essai gratuit au lieu de 35.',
}

/**
 * Porte d'entrée du parrainage : `/rejoindre?ref={code}`.
 *
 * `searchParams` est asynchrone depuis Next 15 — il doit être attendu, sinon la
 * lecture du code échoue silencieusement et le parrain n'est jamais crédité.
 */
export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  return <JoinScreen code={ref ?? null} />
}
