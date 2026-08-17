'use client'

import { useState } from 'react'
import { Loader2, Mail, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/clyde/pages/page-shell'
import { useT } from '@/lib/clyde/i18n'

/* Coordonnées de démonstration : à remplacer par les vraies avant lancement. */
const CLYDE_WHATSAPP = '237699000000'
const CLYDE_EMAIL = 'bonjour@clyde.cm'

/** Message d'erreur d'un champ, relié à son entrée par aria-describedby. */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-[12px] font-medium text-destructive">
      {message}
    </p>
  )
}

export function ContactContent() {
  const t = useT()
  const [name, setName] = useState('')
  const [business, setBusiness] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  /* Erreurs indexées par champ : chaque message s'affiche sous l'entrée
     concernée, et non en bas du formulaire où l'on ne sait pas à quoi il se
     rapporte. On valide tout d'un coup pour ne pas révéler les problèmes
     un par un. */
  type Field = 'name' | 'email' | 'message'
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [pending, setPending] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    const next: Partial<Record<Field, string>> = {}
    if (name.trim().length < 2) next.name = t.contact.errors.name
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t.contact.errors.email
    if (message.trim().length < 10) next.message = t.contact.errors.message

    setErrors(next)
    if (Object.keys(next).length > 0) {
      document.getElementById(`ct-${Object.keys(next)[0]}`)?.focus()
      return
    }

    /* Pas de backend à ce stade : on confirme l'envoi et on vide le
       formulaire, sans prétendre qu'un message a réellement été transmis
       ailleurs que dans cette démonstration. */
    setPending(true)
    window.setTimeout(() => {
      setPending(false)
      setName('')
      setBusiness('')
      setEmail('')
      setMessage('')
      setErrors({})
      toast.success(t.contact.sent)
    }, 600)
  }

  return (
    <>
      <PageHeader
        badge={t.contact.badge}
        title={t.contact.title}
        subtitle={t.contact.subtitle}
      />

      <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
        {/* ---- Canaux directs ---- */}
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={`https://wa.me/${CLYDE_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-input"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-success/12 text-success">
              <MessageCircle size={17} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-bold">
              {t.contact.whatsappTitle}
            </span>
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              {t.contact.whatsappBody}
            </span>
            <span className="mt-1 text-[13px] font-bold text-brand">
              {t.contact.whatsappCta}
            </span>
          </a>

          <a
            href={`mailto:${CLYDE_EMAIL}`}
            className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-input"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand/12 text-brand">
              <Mail size={17} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-bold">{t.contact.emailTitle}</span>
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              {t.contact.emailBody}
            </span>
            <span className="mt-1 text-[13px] font-bold text-brand">
              {t.contact.emailCta}
            </span>
          </a>
        </div>

        {/* ---- Formulaire ---- */}
        <form
          onSubmit={submit}
          noValidate
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-border p-5 sm:p-6"
        >
          <h2 className="text-[17px] font-bold tracking-tight">
            {t.contact.formTitle}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-name">{t.contact.fields.name}</Label>
              <Input
                id="ct-name"
                autoComplete="name"
                placeholder={t.contact.fields.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'ct-name-error' : undefined}
              />
              <FieldError id="ct-name-error" message={errors.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-business">{t.contact.fields.business}</Label>
              <Input
                id="ct-business"
                placeholder={t.contact.fields.businessPlaceholder}
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-email">{t.contact.fields.email}</Label>
            <Input
              id="ct-email"
              type="email"
              autoComplete="email"
              placeholder={t.contact.fields.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'ct-email-error' : undefined}
            />
            <FieldError id="ct-email-error" message={errors.email} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-message">{t.contact.fields.message}</Label>
            <Textarea
              id="ct-message"
              rows={5}
              placeholder={t.contact.fields.messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'ct-message-error' : undefined}
            />
            <FieldError id="ct-message-error" message={errors.message} />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
          >
            {pending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t.contact.sending}
              </>
            ) : (
              t.contact.submit
            )}
          </Button>
        </form>
      </div>
    </>
  )
}
