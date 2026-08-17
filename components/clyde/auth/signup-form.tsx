'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/lib/clyde/store'
import { useT } from '@/lib/clyde/i18n'
import { toast } from 'sonner'

export function SignupForm() {
  const t = useT()
  const router = useRouter()
  const signUpWithEmail = useSession((s) => s.signUpWithEmail)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 2) {
      setError(t.auth.errors.name)
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t.auth.errors.email)
      return
    }
    if (whatsapp.trim().replace(/\D/g, '').length < 8) {
      setError(t.auth.errors.whatsapp)
      return
    }

    setPending(true)
    const result = signUpWithEmail({
      email,
      name,
      whatsapp,
      role: 'owner',
    })
    if (!result.ok) {
      setError(result.error ?? t.auth.errors.signupFailed)
      setPending(false)
      return
    }
    toast.success(t.auth.signup.created)
    router.push('/onboarding')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t.auth.fields.name}</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder={t.auth.fields.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t.auth.fields.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t.auth.fields.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="whatsapp">{t.auth.fields.whatsapp}</Label>
        <Input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+237 6 90 11 22 33"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          {t.auth.fields.whatsappNote}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t.auth.fields.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder={t.auth.fields.passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        {t.auth.signup.submit}
      </Button>
    </form>
  )
}
