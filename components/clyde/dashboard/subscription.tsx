'use client'

import { Check, Clock3, Info, Layers3, Plus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useClyde } from '@/lib/clyde/store'
import { PLANS } from '@/lib/clyde/plans'
import { useLocale, useT } from '@/lib/clyde/i18n'
import type { Dict } from '@/lib/clyde/i18n'
import type { Plan } from '@/lib/clyde/types'
import { cn } from '@/lib/utils'
import { SectionHeader } from './shell'
import { useOwnerContext } from './use-owner'

/**
 * Les libellés de `PLANS` s'adressent aux visiteurs de la page d'accueil
 * (« Commencer gratuitement »). Ici, la personne a déjà un compte : elle
 * change d'offre, elle ne s'inscrit pas.
 */
function ctaLabel(id: Plan, d: Dict['dashboard']['subscription']): string {
  if (id === 'free') return d.backToFree
  if (id === 'pro') return d.goPro
  return d.contactUs
}

export function DashboardSubscription() {
  const {
    business,
    plan,
    subscription,
    planOwnerId,
    quota,
    trialLeft,
    trialActive,
    deferredDays,
    catalogWord,
    locationWordPlural,
  } = useOwnerContext()
  const t = useT()
  const { locale } = useLocale()
  const d = t.dashboard.subscription
  const allProducts = useClyde((s) => s.products)
  const allLocations = useClyde((s) => s.locations)
  const setPlan = useClyde((s) => s.setPlan)

  if (!business) return null

  const products = allProducts.filter((p) => p.business_id === business.id)
  const locations = allLocations.filter((l) => l.business_id === business.id)
  const activeModules =
    (business.module_locations ? 1 : 0) + (business.module_booking ? 1 : 0)

  const renews = subscription?.renews_at
    ? new Date(subscription.renews_at).toLocaleDateString(
        locale === 'en' ? 'en-GB' : 'fr-FR',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      )
    : null

  function choose(target: Plan) {
    if (target === plan.id) return
    if (target === 'entreprise') {
      toast.success(d.requestSent, { description: d.requestBody })
      return
    }
    /* Le plan appartient au COMPTE : passer `business.id` ici aurait cherché un
       abonnement sur un identifiant de page et n'aurait rien changé — les deux
       étant des chaînes, le compilateur ne pouvait pas le signaler. */
    if (!planOwnerId) return
    /* Redescendre au gratuit alors que le compte détient plus de pages que le
       plan n'en autorise : on refuse plutôt que de laisser des pages hors
       quota, sans dire lesquelles seraient désactivées. */
    if (target === 'free' && quota.used > 1) {
      toast.error(d.downgradeBlocked.replace('{count}', String(quota.used)))
      return
    }
    setPlan(planOwnerId, target)
    toast.success(
      target === 'free' ? d.backOnFree : d.proActive,
    )
  }

  return (
    <>
      <SectionHeader
        title={d.title}
        description={d.description}
      />

      {/* Offre en cours + consommation des limites */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {d.currentPlan}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {t.pricing.plans[plan.id].name}
              </h2>
              {plan.price !== null && plan.price > 0 && (
                <span className="text-sm text-muted-foreground">
                  {`${plan.price} ${d.perMonth}`}
                </span>
              )}
            </div>
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {renews
                ? d.renewsOn(renews)
                : d.noRenewal}
            </p>
          </div>
          {plan.id === 'free' && (
            <Button onClick={() => choose('pro')}>{d.goPro}</Button>
          )}
        </div>

        <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-3">
          <UsageBar
            label={catalogWord}
            used={products.length}
            limit={plan.limits.products}
            unlimitedLabel={d.unlimited}
          />
          <UsageBar
            label={d.activeModules}
            used={activeModules}
            limit={plan.limits.modules}
            unlimitedLabel={d.unlimited}
          />
          <UsageBar
            label={locationWordPlural}
            used={locations.length}
            limit={plan.limits.locations}
            unlimitedLabel={d.unlimited}
          />
        </div>
      </section>

      {/* Le plan limite les pages du COMPTE ; l'essai appartient à la page.
          Les deux cartes les séparent visuellement pour éviter de laisser
          croire qu'un passage Pro prolonge l'essai de tous les commerces. */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                <Layers3 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">{d.pagesTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quota.limit === null
                    ? d.pagesUnlimited.replace('{used}', String(quota.used))
                    : d.pagesUsage
                        .replace('{used}', String(quota.used))
                        .replace('{limit}', String(quota.limit))}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={quota.reached}
              nativeButton={!quota.reached}
              render={
                quota.reached ? undefined : <Link href="/onboarding" />
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              {d.newPage}
            </Button>
          </div>
          {quota.reached && (
            <p className="mt-4 rounded-xl bg-secondary px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              {d.pagesFull}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <Clock3 className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">{d.trialTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {trialActive
                  ? d.trialLeft.replace('{days}', String(trialLeft))
                  : d.trialOver}
              </p>
            </div>
          </div>
          {deferredDays > 0 && (
            <p className="mt-4 rounded-xl bg-secondary px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              {d.trialDeferred.replace('{days}', String(deferredDays))}
            </p>
          )}
        </section>
      </div>

      {/* Comparaison des offres */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {PLANS.map((p) => {
          const current = p.id === plan.id
          return (
            <section
              key={p.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-background p-5',
                current ? 'border-brand ring-1 ring-brand' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">
                  {t.pricing.plans[p.id].name}
                </h2>
                {current && (
                  <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-brand-foreground">
                    {d.yourPlan}
                  </span>
                )}
              </div>

              {/* « Gratuit » comme nom puis comme prix ferait doublon : on
                  affiche le montant. */}
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {p.price === null ? d.onRequest : `${new Intl.NumberFormat('fr-FR').format(p.price)} FCFA`}
                {p.price !== null && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {` ${d.perUnit}`}
                  </span>
                )}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t.pricing.plans[p.id].tagline}
              </p>

              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {t.pricing.plans[p.id].features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-brand"
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-5 w-full"
                variant={current ? 'outline' : p.featured ? 'default' : 'outline'}
                disabled={current}
                onClick={() => choose(p.id)}
              >
                {current ? d.activePlan : ctaLabel(p.id, d)}
              </Button>
            </section>
          )
        })}
      </div>

      {/* Ne pas laisser croire qu'une carte a été débitée. */}
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {d.demoNotice}
      </p>
    </>
  )
}

/**
 * Consommation d'une limite. Une offre illimitée n'affiche pas de barre :
 * une jauge sans plafond ne veut rien dire.
 */
function UsageBar({
  label,
  used,
  limit,
  unlimitedLabel,
}: {
  label: string
  used: number
  limit: number | null
  unlimitedLabel: string
}) {
  const ratio = limit === null ? 0 : Math.min(used / limit, 1)
  const full = limit !== null && used >= limit

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {`${used} / ${limit === null ? unlimitedLabel : limit}`}
        </p>
      </div>
      {limit !== null && (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          aria-hidden="true"
        >
          <div
            className={cn(
              'h-full rounded-full',
              full ? 'bg-amber-500' : 'bg-brand',
            )}
            style={{ width: `${Math.max(ratio * 100, 2)}%` }}
          />
        </div>
      )}
    </div>
  )
}
