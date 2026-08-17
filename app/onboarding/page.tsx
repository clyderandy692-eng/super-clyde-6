import type { Metadata } from 'next'
import { OnboardingWizard } from '@/components/clyde/onboarding/wizard'

export const metadata: Metadata = {
  title: 'Configurer ma page',
  description: 'Créez votre page commerçante en six étapes guidées.',
}

export default function OnboardingPage() {
  return <OnboardingWizard />
}
