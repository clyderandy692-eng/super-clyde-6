'use client'

import Link from 'next/link'
import { AuthShell } from '@/components/clyde/auth/auth-shell'
import { SignupForm } from '@/components/clyde/auth/signup-form'
import { useT } from '@/lib/clyde/i18n'

/**
 * Enveloppe client de l'écran d'inscription : la page reste un Server
 * Component pour garder son `metadata`, et toute la copie traduite est lue
 * ici via le dictionnaire.
 */
export function SignupScreen() {
  const t = useT()
  return (
    <AuthShell
      title={t.auth.signup.title}
      subtitle={t.auth.signup.subtitle}
      aside={{
        heading: t.auth.signup.asideHeading,
        points: t.auth.signup.asidePoints,
      }}
      footer={
        <>
          {t.auth.signup.footerText}{' '}
          <Link
            href="/connexion"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            {t.auth.signup.footerLink}
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  )
}
