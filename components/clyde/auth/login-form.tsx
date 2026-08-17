'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useClyde, useSession } from '@/lib/clyde/store'
import { useT } from '@/lib/clyde/i18n'
import { toast } from 'sonner'

/**
 * Comptes de démonstration, groupés par profil : un accès direct à chacun
 * des trois espaces de la plateforme sans avoir à retenir un e-mail.
 * - Admin : la console de gestion globale (vous, le gérant de CLYDE).
 * - Client : l'espace acheteur — commandes, réservations, boutiques suivies.
 * - Commerçants : le tableau de bord de leur boutique.
 */
const DEMO_GROUPS: {
  heading: string
  hint: string
  accounts: { email: string; label: string; destination?: string }[]
}[] = [
  {
    heading: 'Administrateur',
    hint: 'La console qui supervise toute la plateforme : commerces, utilisateurs, revenus.',
    accounts: [
      { email: 'admin@clyde.app', label: 'Équipe CLYDE · Console d’administration', destination: '/admin' },
    ],
  },
  {
    heading: 'Client',
    hint: 'Un acheteur du marketplace : historique de commandes, réservations, boutiques suivies.',
    accounts: [
      { email: 'awa@example.com', label: 'Awa Diallo · Espace client', destination: '/espace-client' },
      { email: 'karl@example.com', label: 'Karl Fotso · Espace client', destination: '/espace-client' },
    ],
  },
  {
    heading: 'Commerçants',
    hint: 'Les propriétaires de boutique : catalogue, commandes, éditeur de page.',
    accounts: [
      { email: 'nadia@lebastos.cm', label: 'Nadia · Le Bastos (restaurant)' },
      { email: 'sandrine@studio-eclat.cm', label: 'Sandrine · Studio Éclat' },
      { email: 'contact@hotelakwa.cm', label: 'Joseph · Hôtel Akwa' },
    ],
  },
]

/** Compte utilisé par le raccourci « Entrer dans le builder en démo ». */
const BUILDER_DEMO_EMAIL = 'nadia@lebastos.cm'

export function LoginForm() {
  const t = useT()
  const router = useRouter()
  const signInWithEmail = useSession((s) => s.signInWithEmail)
  const businesses = useClyde((s) => s.businesses)
  const users = useClyde((s) => s.users)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function submit(value: string, destination?: string) {
    setError(null)
    setPending(true)
    const result = signInWithEmail(value)
    if (!result.ok) {
      setError(result.error ?? t.auth.errors.loginFailed)
      setPending(false)
      return
    }
    const user = users.find(
      (u) => (u.email ?? '').toLowerCase() === value.trim().toLowerCase(),
    )
    const owned = businesses.find((b) => b.owner_id === user?.id)
    toast.success(
      `${t.auth.login.welcome} ${user?.name?.split(' ')[0] ?? ''}`.trim(),
    )
    if (destination) {
      router.push(destination)
      return
    }
    if (user?.role === 'admin') router.push('/admin')
    else if (owned) router.push('/tableau-de-bord')
    else if (user?.role === 'owner') router.push('/onboarding')
    /* Les clients atterrissent sur leur espace : commandes, réservations,
       boutiques suivies. (`/moi` n'a jamais existé — c'était un 404.) */
    else router.push('/espace-client')
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(email)
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t.auth.fields.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t.auth.fields.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t.auth.fields.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t.auth.login.passwordNote}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="mt-1 w-full"
        >
          {pending && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {t.auth.login.submit}
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t.auth.login.demoDivider}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="rounded-2xl border border-brand/25 bg-brand/[0.06] p-4">
        <p className="text-sm font-semibold">Explorer le constructeur de page</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Ouvrez directement l&apos;éditeur avec une boutique de démonstration, sans créer de compte.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full border-brand/40"
          disabled={pending}
          onClick={() => submit(BUILDER_DEMO_EMAIL, '/tableau-de-bord/page')}
        >
          Entrer dans le constructeur en démo
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {DEMO_GROUPS.map((group) => (
          <div key={group.heading} className="flex flex-col gap-2">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                {group.heading}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {group.hint}
              </p>
            </div>
            {group.accounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email)
                  submit(account.email, account.destination)
                }}
                disabled={pending}
                className="rounded-lg border border-input px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {account.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
