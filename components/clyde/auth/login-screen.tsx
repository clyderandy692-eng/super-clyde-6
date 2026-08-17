'use client'

import Link from 'next/link'
import { AuthShell } from '@/components/clyde/auth/auth-shell'
import { LoginForm } from '@/components/clyde/auth/login-form'
import { useT } from '@/lib/clyde/i18n'

/**
 * Enveloppe client de l'écran de connexion : voir `signup-screen.tsx` pour
 * la raison de cette séparation page serveur / écran client.
 */
export function LoginScreen() {
  const t = useT()
  return (
    <AuthShell
      title={t.auth.login.title}
      subtitle={t.auth.login.subtitle}
      aside={{
        heading: t.auth.login.asideHeading,
        points: t.auth.login.asidePoints,
      }}
      footer={
        <>
          {t.auth.login.footerText}{' '}
          <Link
            href="/inscription"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            {t.auth.login.footerLink}
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
