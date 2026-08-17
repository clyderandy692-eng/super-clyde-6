'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Clock,
  Download,
  Eye,
  Lightbulb,
  Lock,
  MapPin,
  Percent,
  ScrollText,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { useLocale, useT, type Locale } from '@/lib/clyde/i18n'
import { useClyde } from '@/lib/clyde/store'
import { formatPrice } from '@/lib/clyde/taxonomy'
import type { Currency } from '@/lib/clyde/types'
import {
  conversionFunnel,
  hesitationSignals,
  locationPerformance,
  mostViewed,
  ordersByHour,
  peakHour,
  revenueFromStats,
  statSeries,
  statTotals,
  statTotalsPrevious,
  topSellers,
  trend,
  type FunnelStage,
} from '@/lib/clyde/metrics'
import { buildCsv, downloadCsv, safeFilename, todayStamp } from '@/lib/clyde/export'
import { cn } from '@/lib/utils'
import { EmptyState, Kpi, SectionHeader } from './shell'
import { useOwnerContext } from './use-owner'

/**
 * Fenêtres d'observation proposées.
 *
 * Sept jours répond à « comment va la semaine », trente à « est-ce que ça
 * progresse ». Au-delà, les données consolidées de démonstration s'épuisent.
 */
const RANGES = [7, 30] as const

/*
 * Neutre pour le trafic, accent de la marque pour les commandes : la couleur
 * distingue ce qui se regarde de ce qui rapporte. Le jaune clair `--chart-2`
 * a été écarté, illisible en étiquette d'axe sur fond blanc.
 */
export function DashboardAnalytics() {
  const { business, plan, catalogWord, locationWord, locationWordPlural } =
    useOwnerContext()
  const t = useT()
  const { locale } = useLocale()
  const d = t.dashboard.analytics

  /* Les libellés alimentent les infobulles du graphique : ils doivent être
     recalculés à chaque changement de langue. */
  const chartConfig = useMemo(
    () =>
      ({
        views: { label: d.views, color: 'var(--chart-4)' },
        orders: { label: d.orders, color: 'var(--chart-1)' },
      }) satisfies ChartConfig,
    [d],
  )
  const allStats = useClyde((s) => s.productStats)
  const allProducts = useClyde((s) => s.products)
  const allOrders = useClyde((s) => s.orders)
  const allLocations = useClyde((s) => s.locations)

  const [days, setDays] = useState<number>(7)

  const products = useMemo(
    () => allProducts.filter((p) => p.business_id === business?.id),
    [allProducts, business?.id],
  )

  const orders = useMemo(
    () => allOrders.filter((o) => o.business_id === business?.id),
    [allOrders, business?.id],
  )

  const locations = useMemo(
    () => allLocations.filter((l) => l.business_id === business?.id),
    [allLocations, business?.id],
  )

  /* Tout se lit dans les stats consolidées : compter les visites ici et les
     commandes dans la table `orders` donnerait un taux de conversion calculé
     sur deux périmètres différents, donc faux. */
  const stats = useMemo(() => {
    const ids = new Set(products.map((p) => p.id))
    return allStats.filter((s) => ids.has(s.product_id))
  }, [allStats, products])

  if (!business) return null

  const totals = statTotals(stats, days)
  const before = statTotalsPrevious(stats, days)
  const series = statSeries(stats, days, locale)

  /* Même source que le compteur de commandes, sinon les deux chiffres de la
     rangée de KPI se contrediraient. */
  const revenue = revenueFromStats(products, stats, days)

  const conversion = totals.views === 0 ? 0 : totals.orders / totals.views
  const conversionBefore = before.views === 0 ? 0 : before.orders / before.views

  const sellers = topSellers(products, stats, days).slice(0, 5)
  const hesitations = hesitationSignals(products, stats, days).slice(0, 4)
  /* Classement par attention (vues), complément du classement par ventes :
     l'écart entre les deux désigne les produits à retravailler. */
  const viewed = mostViewed(products, stats, days)
  const viewedTop = viewed.slice(0, 5)

  /* Rapport téléchargeable : le classement complet vues / paniers / commandes
     / taux de conversion par produit, dans un CSV que le tableur ouvre tel
     quel. L'écran montre le top 5 ; le fichier, tout le catalogue. */
  function downloadReport() {
    if (!business) return
    const csv = buildCsv(
      ['Produit', 'Vues', 'Mises au panier', 'Commandes', 'Taux de conversion (%)'],
      viewed.map((r) => [
        r.product.name,
        r.views,
        r.carts,
        r.orders,
        r.views === 0 ? 0 : Number(((r.orders / r.views) * 100).toFixed(2)),
      ]),
    )
    downloadCsv(csv, `${safeFilename('rapport-produits', business.name, todayStamp())}.csv`)
  }

  /* Le tunnel se lit dans les mêmes stats consolidées que les KPI, pour que
     l'étape « ont commandé » égale exactement le compteur de commandes. */
  const funnel = conversionFunnel(stats, days)

  /* Les deux panneaux suivants s'appuient sur les commandes elles-mêmes : eux
     seuls portent l'heure et l'emplacement, absents des stats par produit. */
  const byLocation = locationPerformance(orders, locations, days)
  const hours = ordersByHour(orders, days, locale)
  const peak = peakHour(hours)

  /* Sur 30 jours, une étiquette par jour devient illisible : on en garde une
     sur cinq. */
  const tickInterval = days > 14 ? 4 : 0

  return (
    <>
      <SectionHeader
        title={d.title}
        description={d.description}
        action={
          <div
            className="inline-flex rounded-lg border border-border p-0.5"
            role="group"
            aria-label={d.rangeLabel}
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                aria-pressed={days === r}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  days === r
                    ? 'bg-brand text-brand-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {d.days(r)}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Eye}
          label={d.views}
          value={String(totals.views)}
          /* La comparaison de périodes fait partie de l'offre Pro. */
          delta={plan.limits.analyticsPro ? trend(totals.views, before.views) : undefined}
          hint={plan.limits.analyticsPro ? undefined : d.overDays(days)}
        />
        <Kpi
          icon={ScrollText}
          label={d.orders}
          value={String(totals.orders)}
          delta={
            plan.limits.analyticsPro ? trend(totals.orders, before.orders) : undefined
          }
          hint={plan.limits.analyticsPro ? undefined : d.overDays(days)}
        />
        <Kpi
          icon={Percent}
          label={d.conversion}
          value={`${(conversion * 100).toFixed(1)} %`}
          delta={
            plan.limits.analyticsPro
              ? trend(
                  Math.round(conversion * 1000),
                  Math.round(conversionBefore * 1000),
                )
              : undefined
          }
          hint={
            plan.limits.analyticsPro ? undefined : d.conversionHint
          }
        />
        <Kpi
          icon={Wallet}
          label={d.revenue}
          value={formatPrice(revenue, business.currency)}
        />
      </div>

      {/* Courbe visites / commandes */}
      <section className="mt-8 rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-5">
          <h2 className="text-base font-semibold">{d.chartTitle}</h2>
          {/* Deux séries, deux échelles : sans le dire, on lirait les barres
              de commandes comme si elles se comparaient aux visites. */}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: 'var(--chart-4)' }}
                aria-hidden="true"
              />
              {d.legendViews}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: 'var(--chart-1)' }}
                aria-hidden="true"
              />
              {d.legendOrders}
            </span>
          </p>
        </div>

        {totals.views === 0 ? (
          <EmptyState
            icon={Eye}
            title={d.emptyTitle}
            description={d.emptyBody}
            action={
              <Button
                nativeButton={false}
                render={<Link href={`/r/${business.slug}`} target="_blank" />}
              >
                {d.viewMyPage}
              </Button>
            }
          />
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            {/* Sans marge latérale, les étiquettes des deux axes se font
                rogner : « 600 » s'affichait « 00 ». */}
            <ComposedChart data={series} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
                tickMargin={10}
                className="text-xs"
              />
              {/* Deux échelles, car quelques commandes face à des centaines de
                  visites disparaîtraient sur un axe commun. Les deux axes
                  restent visibles et colorés : masquer celui des commandes
                  laisserait croire à un rapport de un pour un. */}
              <YAxis
                yAxisId="views"
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: 'var(--color-views)' }}
                className="text-xs"
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={34}
                tick={{ fill: 'var(--color-orders)' }}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {/* Les barres passent derrière la courbe : elles servent de
                  repère, la tendance des visites reste au premier plan. */}
              <Bar
                yAxisId="orders"
                dataKey="orders"
                fill="var(--color-orders)"
                radius={[3, 3, 0, 0]}
                maxBarSize={10}
              />
              <Area
                yAxisId="views"
                dataKey="views"
                type="monotone"
                fill="var(--color-views)"
                fillOpacity={0.14}
                stroke="var(--color-views)"
                strokeWidth={2}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </section>

      <FunnelPanel funnel={funnel} d={d} locale={locale} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <LocationPanel
          rows={byLocation}
          d={d}
          currency={business.currency}
          locationWord={locationWord}
          locationWordPlural={locationWordPlural}
        />
        <HoursPanel hours={hours} peak={peak} d={d} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Meilleures ventes */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <h2 className="pb-1 text-base font-semibold">
            {d.bestTitle}
          </h2>
          <p className="pb-4 text-sm text-muted-foreground">
            {d.bestBody}
          </p>

          {sellers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {d.noOrders}
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {sellers.map((row, i) => {
                /* Barre proportionnelle au meilleur vendeur : le rapport entre
                   les lignes se lit d'un coup d'œil. */
                const share = Math.round((row.orders / sellers[0].orders) * 100)
                return (
                  <li key={row.product.id} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium">
                          {row.product.name}
                        </p>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {row.orders}
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Les plus regardés — attention portée aux produits, avec le rapport
            complet téléchargeable. Placé juste après les meilleures ventes :
            les deux classements se comparent d'un regard. */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start justify-between gap-3 pb-1">
            <h2 className="text-base font-semibold">Les plus regardés</h2>
            <Button variant="outline" size="sm" onClick={downloadReport} disabled={viewed.length === 0}>
              <Download className="size-4" aria-hidden="true" />
              Rapport CSV
            </Button>
          </div>
          <p className="pb-4 text-sm text-muted-foreground">
            Vos produits classés par vues : très regardé mais peu commandé
            signale une photo ou un prix à revoir. Le rapport CSV contient tout
            le catalogue.
          </p>

          {viewedTop.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {d.notEnough}
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {viewedTop.map((row, i) => {
                const share = Math.round((row.views / viewedTop[0].views) * 100)
                const rate = row.views === 0 ? 0 : (row.orders / row.views) * 100
                return (
                  <li key={row.product.id} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium">
                          {row.product.name}
                        </p>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {row.views} vues · {row.orders} cmd · {rate.toFixed(1)} %
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-chart-4"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Signaux d'hésitation — réservé à l'offre Pro */}
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start gap-2 pb-1">
            <Lightbulb
              className="mt-0.5 size-4 shrink-0 text-brand"
              aria-hidden="true"
            />
            <h2 className="text-base font-semibold">{d.hesitationTitle}</h2>
          </div>
          <p className="pb-4 text-sm text-muted-foreground">
            {d.hesitationBody}
          </p>

          {!plan.limits.analyticsPro ? (
            <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
              <span
                className="mx-auto grid size-10 place-items-center rounded-xl bg-brand/10 text-brand"
                aria-hidden="true"
              >
                <Lock className="size-4" />
              </span>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {d.lockedBody}
              </p>
              <Button
                className="mt-4"
                nativeButton={false}
                render={<Link href="/tableau-de-bord/abonnement" />}
              >
                <TrendingUp className="size-4" aria-hidden="true" />
                {d.seePro}
              </Button>
            </div>
          ) : hesitations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {d.notEnough}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {hesitations.map((row) => (
                <li
                  key={row.product.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {d.viewsOrders(row.views, row.orders)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-medium tabular-nums text-amber-700 dark:text-amber-500">
                    {`${(row.rate * 100).toFixed(1)} %`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {plan.limits.analyticsPro && hesitations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              nativeButton={false}
              render={<Link href="/tableau-de-bord/catalogue" />}
            >
              {d.editCatalog(catalogWord.toLowerCase())}
            </Button>
          )}
        </section>
      </div>
    </>
  )
}

type AnalyticsDict = ReturnType<typeof useT>['dashboard']['analytics']

/* ------------------------------------------------------------
   Tunnel de conversion
   ------------------------------------------------------------ */

/**
 * Les trois étapes du parcours, en barres décroissantes.
 *
 * Un taux global de 2 % ne dit pas quoi faire. Séparer « regardé », « mis au
 * panier » et « commandé » désigne l'étape fautive : une chute à la deuxième
 * renvoie aux photos et aux prix, une chute à la troisième au dernier écran.
 * Le diagnostic est écrit sous les barres, plutôt que laissé à déduire.
 */
function FunnelPanel({
  funnel,
  d,
  locale,
}: {
  funnel: FunnelStage[]
  d: AnalyticsDict
  locale: Locale
}) {
  /* `toLocaleString()` sans argument suit la langue du navigateur, pas celle
     choisie dans l'app : « 3 238 » s'affichait « 3,238 » sur une page en
     français. On impose donc la locale de l'interface. */
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale])

  const labels: Record<FunnelStage['key'], string> = {
    views: d.funnelViews,
    carts: d.funnelCarts,
    orders: d.funnelOrders,
  }

  const carts = funnel.find((s) => s.key === 'carts')
  const orders = funnel.find((s) => s.key === 'orders')

  /* On ne commente que la perte dominante : deux conseils à la fois se
     neutralisent et personne ne sait par où commencer. */
  const dropToCarts = 1 - (carts?.keptFromPrevious ?? 1)
  const dropToOrders = 1 - (orders?.keptFromPrevious ?? 1)
  const verdict =
    Math.max(dropToCarts, dropToOrders) < 0.45
      ? d.funnelHealthy
      : dropToCarts >= dropToOrders
        ? d.funnelDropCarts
        : d.funnelDropOrders

  return (
    <section className="mt-8 rounded-2xl border border-border bg-background p-5">
      <h2 className="text-base font-semibold">{d.funnelTitle}</h2>
      <p className="pt-1 pb-5 text-sm leading-relaxed text-muted-foreground">
        {d.funnelBody}
      </p>

      <ol className="flex flex-col gap-4">
        {funnel.map((stage, i) => (
          <li key={stage.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{labels[stage.key]}</p>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {number.format(stage.value)}
              </p>
            </div>

            {/* Largeur proportionnelle à la première étape : c'est le
                rétrécissement d'une barre à l'autre qui porte l'information. */}
            <div
              className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                /* Plancher à 1,5 % : une étape non nulle doit rester visible,
                   sinon « 3 commandes » s'affiche comme une barre vide. */
                style={{
                  width: `${Math.max(stage.shareOfTop * 100, stage.value > 0 ? 1.5 : 0)}%`,
                }}
              />
            </div>

            {/* La première étape n'a pas de précédente : rien à comparer. */}
            {i > 0 && (
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {d.funnelKept(`${(stage.keptFromPrevious * 100).toFixed(1)} %`)}
              </p>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-5 flex items-start gap-2 rounded-xl bg-muted/60 px-4 py-3 text-sm leading-relaxed">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        {verdict}
      </p>
    </section>
  )
}

/* ------------------------------------------------------------
   Performance par emplacement
   ------------------------------------------------------------ */

/**
 * Classement des tables, chambres ou box par chiffre d'affaires.
 *
 * Le nombre de commandes seul trompe : une terrasse qui enchaîne les cafés
 * passe devant une salle qui sert des repas complets. Le panier moyen est donc
 * affiché à côté, pas laissé à calculer.
 */
function LocationPanel({
  rows,
  d,
  currency,
  locationWord,
  locationWordPlural,
}: {
  rows: ReturnType<typeof locationPerformance>
  d: AnalyticsDict
  currency: Currency
  locationWord: string
  locationWordPlural: string
}) {
  /* Les emplacements sans commande sur la période sont écartés : une liste de
     zéros pousse les lignes utiles hors de l'écran. */
  const active = rows.filter((r) => r.orders > 0)
  const best = active[0]

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-start gap-2 pb-1">
        <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        <h2 className="text-base font-semibold">
          {d.byLocationTitle(locationWord.toLowerCase())}
        </h2>
      </div>
      <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
        {d.byLocationBody}
      </p>

      {active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {d.byLocationEmpty(locationWordPlural.toLowerCase())}
        </p>
      ) : (
        <>
          <ol className="flex flex-col gap-3">
            {active.slice(0, 6).map((row, i) => {
              const share = Math.round((row.revenue / active[0].revenue) * 100)
              return (
                <li key={row.locationId} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{row.label}</p>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatPrice(row.revenue, currency)}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {`${row.orders} ${d.byLocationOrders} · ${d.byLocationAverage} ${formatPrice(row.average, currency)}`}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>

          {best && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {d.byLocationBest(best.label)}
            </p>
          )}
        </>
      )}
    </section>
  )
}

/* ------------------------------------------------------------
   Heures d'affluence
   ------------------------------------------------------------ */

/**
 * Répartition des commandes sur la journée.
 *
 * Un pic à 13 h et un second à 20 h ne se gèrent pas avec la même équipe.
 * L'heure de pointe est énoncée en clair au-dessus du graphique : le chiffre
 * qui décide d'un renfort ne doit pas dépendre d'une lecture d'axe.
 */
function HoursPanel({
  hours,
  peak,
  d,
}: {
  hours: ReturnType<typeof ordersByHour>
  peak: ReturnType<typeof peakHour>
  d: AnalyticsDict
}) {
  const config = useMemo(
    () =>
      ({
        orders: { label: d.hoursOrders, color: 'var(--chart-1)' },
      }) satisfies ChartConfig,
    [d],
  )

  /* Au-delà de dix heures affichées, une étiquette sur deux : « 11 h 12 h 13 h »
     se chevauchaient sur mobile. */
  const interval = hours.length > 10 ? 1 : 0

  return (
    <section className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-start gap-2 pb-1">
        <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        <h2 className="text-base font-semibold">{d.hoursTitle}</h2>
      </div>
      <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
        {d.hoursBody}
      </p>

      {hours.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {d.hoursEmpty}
        </p>
      ) : (
        <>
          {peak && (
            <p className="pb-4 text-sm font-medium">
              {d.hoursPeak(peak.label, peak.orders)}
            </p>
          )}
          <ChartContainer config={config} className="h-[200px] w-full">
            <BarChart data={hours} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={interval}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={28}
                allowDecimals={false}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="orders"
                fill="var(--color-orders)"
                radius={[3, 3, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ChartContainer>
        </>
      )}
    </section>
  )
}
