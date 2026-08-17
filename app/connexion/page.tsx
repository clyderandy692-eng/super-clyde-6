import type { Metadata } from 'next'
import { LoginScreen } from '@/components/clyde/auth/login-screen'

export const metadata: Metadata = {
  /* Le gabarit du layout ajoute déjà « · CLYDE » : le répéter ici donnait
     « Connexion · CLYDE · CLYDE » dans l'onglet. */
  title: 'Connexion',
  description: 'Accédez à votre tableau de bord CLYDE.',
}

export default function LoginPage() {
  return <LoginScreen />
}
