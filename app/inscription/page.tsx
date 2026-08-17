import type { Metadata } from 'next'
import { SignupScreen } from '@/components/clyde/auth/signup-screen'

export const metadata: Metadata = {
  title: 'Créer un compte',
  description:
    'Créez votre page commerçante CLYDE et recevez vos commandes sur WhatsApp.',
}

export default function SignupPage() {
  return <SignupScreen />
}
