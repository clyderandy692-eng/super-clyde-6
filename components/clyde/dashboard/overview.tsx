'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Check,
  Circle,
  Eye,
  Globe,
  ScrollText,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { useClyde } from '@/lib/clyde/store'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { drawRevelationArtifact, revelationTitle } from '@/lib/clyde/revelation'
import {
  ordersWithin,
  revenueEstimate,
  statTotals,
  statTotalsPrevious,
  trend,
} from '@/lib/clyde/metrics'
import { Kpi, SectionHeader } from './shell'
import {
  JoinTeamPanel,
  FactoryMailSection,
} from '@/components/clyde/dev-team/join-team'
import { EngineerPapers } from './engineer-papers'
import { useOwnerContext } from './use-owner'

const WINDOW_DAYS = 7

export function DashboardOverview() {
  const { business, page, catalogWord, locationWord, locationWordPlural } =
    useOwnerContext()
  const t = useT()
  const { locale } = useLocale()
  const d = t.dashboard.overview
  const [revelationOpen, setRevelationOpen] = useState(false)
  const [artifactUrl, setArtifactUrl] = useState<string | null>(null)
  /* Les dates suivent la langue de l'interface : « 5 août, 14:30 » en
     français, « Aug 5, 2:30 PM » en anglais. */
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR'
  const allOrders = useClyde((s) => s.orders)
  const allStats = useClyde((s) => s.productStats)
  const allFollowers = useClyde((s) => s.followers)
  const allProducts = useClyde((s) => s.products)
  const publishPage = useClyde((s) => s.publishPage)
  const setOrderStatus = useClyde((s) => s.setOrderStatus)
  const activationChecks = useClyde((s) => s.activationChecks)
  const toggleActivationCheck = useClyde((s) => s.toggleActivationCheck)
  /* Un booléen plutôt que la liste : le panneau n'a besoin que de savoir s'il
     y a matière à ouvrir, et sélectionner un tableau recalculerait le rendu à
     chaque écriture du registre. */
  /* `business?.id` et non `business.id` : ce hook s'exécute AVANT le
     `if (!business) return null` ci-dessous — les hooks ne peuvent pas être
     appelés conditionnellement — et planterait donc sur un contexte sans
     commerce. */
  const hasFormationCertificate = useClyde((s) =>
    s.certificates.some(
      (c) => c.business_id === business?.id && c.type === 'formation',
    ),
  )

  if (!business) return null

  const orders = allOrders.filter((o) => o.business_id === business.id)
  const products = allProducts.filter(
    (p) => p.business_id === business.id && p.active,
  )
  const followers = allFollowers.filter((f) => f.business_id === business.id)

  /* L'historique de trafic vit dans les stats produits consolidées ;
     les événements ne couvrent que la session en cours. */
  const productIds = new Set(
    allProducts.filter((p) => p.business_id === business.id).map((p) => p.id),
  )
  const stats = allStats.filter((s) => productIds.has(s.product_id))

  const recentOrders = ordersWithin(orders, WINDOW_DAYS)
  const views = statTotals(stats, WINDOW_DAYS).views
  const viewsBefore = statTotalsPrevious(stats, WINDOW_DAYS).views
  const revenue = revenueEstimate(recentOrders)

  /* Les commandes à traiter en premier : celles qui attendent une réponse. */
  const pending = orders
    .filter((o) => o.status === 'pending' || o.status === 'whatsapp_opened')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <>
      <SectionHeader
        title={d.greeting(business.name)}
        description={d.description(WINDOW_DAYS)}
        action={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/r/${business.slug}`} target="_blank" />}
          >
            <Globe className="size-4" aria-hidden="true" />
            {t.dashboard.common.viewPage}
          </Button>
        }
      />

      {/* Checklist d'activation : le premier compte qui arrive voit 4 KPI à
          zéro et aucune action guidée. Les deux premières étapes se lisent
          dans des données réelles (nombre d'articles, page publiée) — rien
          n'y est déclaré à la main. Les deux dernières demandent une
          confirmation explicite du commerçant, faute d'un signal automatique
          fiable pour « QR imprimé » ou « lien partagé ». La checklist
          disparaît une fois les quatre étapes acquises : elle n'a rien à dire
          à un commerçant déjà installé. */}
      <ActivationChecklist
        business={business}
        page={page}
        productCount={products.length}
        activationChecks={activationChecks}
        onToggle={toggleActivationCheck}
      />

      {/* La publication est l'action la plus importante : elle passe avant les
          chiffres tant que la page n'est pas en ligne. */}
      {!page?.published && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-5">
          <div className="flex items-start gap-3">
            <BadgeCheck
              className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-500"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-semibold">
                {d.draftTitle}
              </h2>
              <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {d.draftBody}
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              /* `publishPage` et non `setPublished` : la première mise en ligne
                 est le seul moment où un parrainage se solde et où les bonus
                 sont versés. Publier sans passer par là laissait le parrain
                 sans récompense, sans aucune erreur visible. */
              const outcome = publishPage(business.id)
              setRevelationOpen(true)
              if (outcome.bonusDays > 0) {
                toast.success(
                  d.bonusGranted.replace('{days}', String(outcome.bonusDays)),
                )
              }
              const title = revelationTitle(business.category, locale)
              const url = drawRevelationArtifact({
                businessName: business.name,
                title,
                slug: business.slug,
                /* Les couleurs de l'artefact partagé doivent être CELLES de
                   CLYDE : le vert citron utilisé ici ne correspondait à aucun
                   jeton de la marque, et l'image circulait donc avec une
                   identité que le site n'a pas. */
                brand: '#E05E10',
                background: '#FAFAF8',
                ink: '#171717',
                labels: {
                  before: t.dashboard.overview.ritual.artifactBefore,
                  after: t.dashboard.overview.ritual.artifactAfter,
                  banner: t.dashboard.overview.ritual.artifactBanner(business.name, title),
                },
              })
              setArtifactUrl(url)
              toast.success(d.published)
            }}
          >
            {d.publish}
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Eye}
          label={d.kpiVisits}
          value={String(views)}
          delta={trend(views, viewsBefore)}
          href="/tableau-de-bord/analytics"
        />
        <Kpi
          icon={ScrollText}
          label={d.kpiOrders}
          value={String(recentOrders.length)}
          href="/tableau-de-bord/commandes"
        />
        <Kpi
          icon={Wallet}
          label={d.kpiRevenue}
          value={formatPrice(revenue, business.currency)}
        />
        <Kpi
          icon={Users}
          label={d.kpiFollowers}
          value={String(followers.length)}
          href="/tableau-de-bord/abonnes"
        />
      </div>

      {/* Commandes à traiter */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4 pb-3">
          <h2 className="text-base font-semibold">{d.todo}</h2>
          {pending.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/tableau-de-bord/commandes" />}
            >
              {d.allOrders}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-border bg-background px-5 py-6 text-sm text-muted-foreground">
            {d.nothingPending}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.slice(0, 4).map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {order.customer_name}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatPrice(order.total_estimate, business.currency)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {order.channel === 'qr_location'
                      ? `${d.onSite} · ${locationWord.toLowerCase()}`
                      : d.online}
                    {' · '}
                    {new Date(order.created_at).toLocaleString(dateLocale, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setOrderStatus(order.id, 'confirmed')
                      toast.success(d.confirmed)
                    }}
                  >
                    {d.confirm}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setOrderStatus(order.id, 'cancelled')
                      toast(d.cancelled)
                    }}
                  >
                    {d.cancel}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Raccourcis vers les sections où il y a quelque chose à faire */}
      <section className="mt-8">
        <h2 className="pb-3 text-base font-semibold">{d.manage}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ShortcutCard
            href="/tableau-de-bord/catalogue"
            icon={ShoppingBag}
            title={catalogWord}
            detail={
              products.length === 0
                ? d.noItems
                : d.itemsOnline(products.length)
            }
          />
          {business.module_booking && (
            <ShortcutCard
              href="/tableau-de-bord/reservations"
              icon={CalendarClock}
              title={t.dashboard.nav.bookings}
              detail={d.bookingsDetail}
            />
          )}
          {business.module_locations && (
            <ShortcutCard
              href="/tableau-de-bord/emplacements"
              icon={ShoppingBag}
              title={`${locationWordPlural} ${t.dashboard.nav.qrSuffix}`}
              detail={d.qrDetail}
            />
          )}
          <ShortcutCard
            href="/tableau-de-bord/analytics"
            icon={ArrowUpRight}
            title={t.dashboard.nav.analytics}
            detail={d.analyticsDetail}
          />
        </div>
      </section>

      {/* Les papiers restent accessibles après le rituel — une carte affichée
          en boutique s'abîme et se réimprime. Réservés aux pages publiées :
          un certificat de fondation sans page en ligne ne certifie rien.

          Une formation achevée, elle, se mérite en étudiant et non en publiant :
          le panneau s'ouvre donc aussi pour la montrer, sinon la page de cours
          annoncerait un certificat « dans votre tableau de bord » introuvable. */}
      {(page?.published || hasFormationCertificate) && (
        <section id="papiers-ingenieur" className="mt-8">
          <EngineerPapers business={business} />
        </section>
      )}

      {/* Le recrutement dans l'équipe de développement arrive une fois la page
          en ligne : à cet instant le commerçant vient de fabriquer quelque chose
          avec les outils de l'Usine, et l'invitation à décider de la suite prend
          son sens. Avant la publication, elle détournerait de la seule chose qui
          compte encore — mettre sa page en ligne.

          Le courrier direct à l'Usine, lui, est offert dans tous les cas : un
          blocage qui empêche justement de publier doit pouvoir être signalé. */}
      <section className="mt-8 flex flex-col gap-4">
        {page?.published ? <JoinTeamPanel source="page-creee" /> : null}
        <FactoryMailSection showJoin={!page?.published} />
      </section>

      {revelationOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/55 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revelation-title"
            className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-2xl sm:p-8"
          >
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-brand uppercase">
                {t.dashboard.overview.ritual.inProgress}
              </span>
              <h2 id="revelation-title" className="text-balance text-2xl font-bold">
                {t.dashboard.overview.ritual.heading}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.dashboard.overview.ritual.visible(business.name)}
              </p>
            </div>
            {artifactUrl && (
              <img
                src={artifactUrl}
                alt={t.dashboard.overview.ritual.artifactBanner(
                  business.name,
                  revelationTitle(business.category, locale),
                )}
                className="mt-5 aspect-[1200/630] w-full rounded-2xl border border-border object-cover"
              />
            )}
            {/* La remise des papiers : le moment le plus chargé du parcours
                est aussi le seul où l'ingénieur a envie d'imprimer sa carte. */}
            <EngineerPapers
              business={business}
              variant="ritual"
              className="mt-5"
            />

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              {artifactUrl && (
                <a
                  href={artifactUrl}
                  download={`${business.slug}-revelation.png`}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  {t.dashboard.overview.ritual.download}
                </a>
              )}
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/r/${business.slug}`} target="_blank" />}
              >
                {t.dashboard.overview.ritual.view}
              </Button>
              <Button onClick={() => setRevelationOpen(false)}>
                {t.dashboard.overview.ritual.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ShortcutCard({
  href,
  icon: Icon,
  title,
  detail,
}: {
  href: string
  icon: typeof Eye
  title: string
  detail: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-5 py-4 transition-colors hover:border-brand/40"
    >
      <span className="flex items-center gap-3">
        <span
          className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand"
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}

/**
 * Checklist des quatre premières actions qui font vivre une page CLYDE.
 *
 * Les deux premières étapes sont dérivées de données réelles — aucun état
 * séparé à faire dériver, donc aucun risque de désynchronisation. Les deux
 * dernières demandent une confirmation du commerçant : aucun signal fiable
 * n'existe aujourd'hui pour détecter un téléchargement de fichier ou un
 * partage WhatsApp effectué hors de l'application.
 */
function ActivationChecklist({
  business,
  page,
  productCount,
  activationChecks,
  onToggle,
}: {
  business: { id: string; slug: string }
  page: { published: boolean } | null | undefined
  productCount: number
  activationChecks: string[]
  onToggle: (businessId: string, step: string) => void
}) {
  const t = useT()
  const ac = t.dashboard.overview.activation

  const step1Done = productCount >= 3
  const step2Done = Boolean(page?.published)
  const step3Key = 'qr_downloaded'
  const step4Key = 'link_shared'
  const step3Done = activationChecks.includes(`${business.id}:${step3Key}`)
  const step4Done = activationChecks.includes(`${business.id}:${step4Key}`)
  const allDone = step1Done && step2Done && step3Done && step4Done

  /* Une fois les quatre étapes acquises, la checklist n'a plus rien à
     annoncer à un commerçant déjà installé : elle disparaît plutôt que de
     rester affichée, satisfaite, indéfiniment. */
  if (allDone) return null

  const steps: {
    key: string
    done: boolean
    title: string
    detail: string | null
    action: { label: string; href?: string; onClick?: () => void }
  }[] = [
    {
      key: 'items',
      done: step1Done,
      title: ac.step1Title,
      detail: productCount > 0 ? ac.step1Done(productCount) : null,
      action: { label: ac.step1Action, href: '/tableau-de-bord/catalogue' },
    },
    {
      key: 'publish',
      done: step2Done,
      title: ac.step2Title,
      detail: step2Done ? ac.step2Done : null,
      /* Le bouton « Publier ma page » se trouve juste en dessous : pas
         d'action distincte ici, un lien suffit à situer l'étape. */
      action: { label: ac.step2Action, href: '#' },
    },
    {
      key: 'qr',
      done: step3Done,
      title: ac.step3Title,
      detail: step3Done ? ac.step3Done : null,
      action: step3Done
        ? { label: ac.undo, onClick: () => onToggle(business.id, step3Key) }
        : { label: ac.step3Action, href: '#papiers-ingenieur' },
    },
    {
      key: 'share',
      done: step4Done,
      title: ac.step4Title,
      detail: step4Done ? ac.step4Done : null,
      action: step4Done
        ? { label: ac.undo, onClick: () => onToggle(business.id, step4Key) }
        : { label: ac.step4Action, href: `/r/${business.slug}` },
    },
  ]

  return (
    <section className="mb-6 rounded-2xl border border-border bg-background p-5">
      <h2 className="text-sm font-semibold">{ac.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{ac.subtitle}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {steps.map((step) => (
          <li
            key={step.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
          >
            <div className="flex items-start gap-3">
              {step.done ? (
                <span
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground"
                  aria-hidden="true"
                >
                  <Check className="size-3.5" />
                </span>
              ) : (
                <Circle
                  className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done && 'text-muted-foreground line-through',
                  )}
                >
                  {step.title}
                </p>
                {step.detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
            {step.key === 'qr' || step.key === 'share' ? (
              step.done ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={step.action.onClick}
                >
                  {step.action.label}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link
                        href={step.action.href!}
                        target={step.key === 'share' ? '_blank' : undefined}
                      />
                    }
                  >
                    {step.action.label}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      onToggle(
                        business.id,
                        step.key === 'qr' ? step3Key : step4Key,
                      )
                    }
                  >
                    {ac.markDone}
                  </Button>
                </div>
              )
            ) : !step.done && step.action.href !== '#' ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={step.action.href!} />}
              >
                {step.action.label}
              </Button>
            ) : !step.done ? (
              /* Étape « publier » : le bouton d'action se trouve juste en
                 dessous, dans la bannière de brouillon — en dupliquer un ici
                 aurait proposé deux boutons pour le même geste. */
              <span className="text-xs text-muted-foreground">
                {t.dashboard.overview.draftTitle}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
