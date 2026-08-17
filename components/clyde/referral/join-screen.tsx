'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BadgeCheck, Gift, Store } from 'lucide-react'

import { AuthShell } from '@/components/clyde/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/clyde/i18n'
import { useClyde, useClydeReady } from '@/lib/clyde/store'
import {
  BASE_TRIAL_DAYS,
  REFERRAL_RECEIVED_DAYS,
  rememberPendingReferral,
} from '@/lib/clyde/rewards'

/**
 * Écran d'arrivée par lien de parrainage.
 *
 * Deux responsabilités, et rien d'autre : retenir le code pour qu'il survive
 * jusqu'à la création de la page, et dire au visiteur ce qu'il y gagne. La
 * récompense n'est PAS versée ici — elle attend la publication.
 */
export function JoinScreen({ code }: { code: string | null }) {
  const t = useT()
  const router = useRouter()
  const businesses = useClyde((s) => s.businesses)
  const registerReferralVisit = useClyde((s) => s.registerReferralVisit)
  const [ready, setReady] = useState(false)

  const clean = code?.trim().toUpperCase() ?? null

  /* Le store est monté en `skipHydration` : sans ce signal, cet écran lisait et
     ÉCRIVAIT dans les seules données de démonstration, puis les enregistrait
     par-dessus les vraies. Concrètement, ouvrir un lien de parrainage effaçait
     les parrainages déjà acquis et rendait invisible tout code créé après la
     graine de démonstration — le parrain n'était jamais reconnu. */
  const hydrated = useClydeReady()

  /* Le parrain est résolu pour être nommé à l'écran : « Awa vous invite » porte
     bien plus qu'un code brut, et prouve au visiteur que le lien est valide. */
  const referrer = useMemo(
    () =>
      clean && hydrated
        ? businesses.find((b) => b.referral_code === clean)
        : undefined,
    [businesses, clean, hydrated],
  )

  useEffect(() => {
    if (!clean) {
      setReady(true)
      return
    }
    /* Le code est retenu tout de suite, sans attendre la relecture : il ne
       dépend que de l'URL, et un visiteur qui quitte l'écran aussitôt doit
       quand même arriver à l'inscription avec son code. */
    rememberPendingReferral(clean)

    /* L'écriture, elle, attend la relecture du stockage. */
    if (!hydrated) return
    registerReferralVisit(clean)
    setReady(true)
  }, [clean, hydrated, registerReferralVisit])

  const total = BASE_TRIAL_DAYS + REFERRAL_RECEIVED_DAYS
  const d = t.referral.join

  return (
    <AuthShell
      title={referrer ? d.titleNamed.replace('{name}', referrer.name) : d.title}
      subtitle={d.subtitle.replace('{days}', String(total))}
      aside={{
        heading: d.asideHeading,
        points: d.asidePoints,
      }}
      footer={
        <>
          {d.footerText}{' '}
          <Link
            href="/connexion"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            {d.footerLink}
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Le gain, chiffré et décomposé : un total isolé donnerait
            l'impression d'une promesse en l'air. */}
        <div className="rounded-2xl border border-border bg-secondary/40 p-5">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-brand" aria-hidden="true" />
            <p className="text-sm font-semibold">{d.offerTitle}</p>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-semibold tracking-tight">
              {total}
            </span>
            <span className="text-sm text-muted-foreground">{d.daysUnit}</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {d.offerBreakdown
              .replace('{base}', String(BASE_TRIAL_DAYS))
              .replace('{bonus}', String(REFERRAL_RECEIVED_DAYS))}
          </p>
        </div>

        {referrer ? (
          <div className="flex items-start gap-3 rounded-xl border border-border p-4">
            <Store
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">{referrer.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {d.referrerNote}
              </p>
            </div>
          </div>
        ) : clean ? (
          /* Code fourni mais inconnu : on le dit franchement au lieu de laisser
             croire à un bonus qui ne viendra pas. */
          <p className="text-sm leading-relaxed text-muted-foreground">
            {d.unknownCode}
          </p>
        ) : null}

        {/* La condition, énoncée avant l'inscription : découvrir après coup
            qu'il fallait publier serait vécu comme un piège. */}
        <div className="flex items-start gap-3">
          <BadgeCheck
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {d.condition}
          </p>
        </div>

        <Button
          size="lg"
          disabled={!ready}
          onClick={() => router.push('/inscription')}
        >
          {d.cta}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </AuthShell>
  )
}
