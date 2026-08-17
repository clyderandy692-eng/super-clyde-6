'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Flag, GraduationCap, LayoutDashboard, Package, ShieldCheck, ShoppingBag, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Backdrop } from '@/components/clyde/backdrop'
import { NotificationsBell } from '@/components/clyde/notifications-bell'
import { adminNotifications } from '@/lib/clyde/notifications'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import { AdminFormationStats } from './formation-stats'
import { AdminFulfilment } from './fulfilment'
import { AdminModeration } from './moderation'
import { AdminFactoryMail } from './factory-mail'

/**
 * Masque une adresse en gardant la première lettre et le domaine.
 *
 * On conserve le domaine : il permet de distinguer deux comptes dans une
 * liste sans révéler qui se cache derrière.
 */
function maskEmail(email: string | null): string {
  /* `email` est nullable dans le modèle : un compte client créé depuis une
     commande n'en a pas forcément. */
  if (!email) return 'Sans adresse'
  const [local, domain] = email.split('@')
  if (!domain) return '•••'
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(local.length - 1, 3))}@${domain}`
}

export function AdminOverview() {
  const router = useRouter()
  const role = useSession((state) => state.role)
  const userId = useSession((state) => state.userId)
  const businesses = useClyde((state) => state.businesses)
  const users = useClyde((state) => state.users)
  const products = useClyde((state) => state.products)
  const orders = useClyde((state) => state.orders)
  const followers = useClyde((state) => state.followers)
  const forumReports = useClyde((state) => state.forumReports)
  const reviewReports = useClyde((state) => state.reviewReports)
  const redemptions = useClyde((state) => state.goodieRedemptions)
  const referrals = useClyde((state) => state.referrals)
  const trialBonuses = useClyde((state) => state.trialBonuses)
  const adminMessages = useClyde((state) => state.adminMessages)
  const teamMembers = useClyde((state) => state.teamMembers)

  /* Indispensable, et non un confort : le store est monté en `skipHydration`,
     la lecture du stockage local n'a donc lieu que si une page la déclenche.
     Sans cet appel, la console n'affichait QUE les données de démonstration —
     aucun signalement, aucun échange, aucun compte créé depuis. L'admin
     supervisait une plateforme qui n'existait pas. */
  const ready = useClydeReady()

  /* Accès : rôle admin, ou mode démo (aucune session) pour explorer la
     console. Un compte connecté non-admin, lui, est bien renvoyé. */
  const allowed = role === 'admin' || !userId

  useEffect(() => {
    if (!allowed) router.replace('/tableau-de-bord')
  }, [allowed, router])

  if (!allowed) {
    return <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Vérification des accès…</main>
  }

  /* On attend la lecture du stockage avant d'afficher un seul compteur. Sinon
     la console s'ouvre sur « 0 à arbitrer » avant de se corriger : un admin
     qui jette un œil à ce moment-là repart en croyant la file vide. Mieux vaut
     une demi-seconde d'attente qu'un chiffre faux. */
  if (!ready) {
    return (
      <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
        Chargement des données de la plateforme…
      </main>
    )
  }

  /* Les deux compteurs qui appellent une action passent devant les volumes :
     un admin ouvre cette page pour voir ce qui l'attend, pas pour admirer un
     total de produits. */
  /* Forum ET avis : ce compteur doit annoncer exactement la file que l'écran
     d'arbitrage affiche. En ne comptant que le forum, il affichait « 0 à
     arbitrer » au-dessus d'un signalement d'avis en attente — et l'admin
     repartait en croyant la file vide, ce que le garde-fou `ready` juste
     au-dessus cherche précisément à éviter. */
  const pendingReportCount =
    forumReports.filter((r) => r.resolved_at === null).length +
    reviewReports.filter((r) => r.resolved_at === null).length
  const openRedemptionCount = redemptions.filter((r) => r.status !== 'remise').length

  const cards: {
    label: string
    value: number
    icon: typeof Flag
    alert?: boolean
    /** Destination du détail — la carte devient cliquable. */
    href?: string
  }[] = [
    { label: 'À arbitrer', value: pendingReportCount, icon: Flag, alert: pendingReportCount > 0 },
    { label: 'Échanges dus', value: openRedemptionCount, icon: Package, alert: openRedemptionCount > 0 },
    { label: 'Commerces', value: businesses.length, icon: Building2 },
    { label: 'Utilisateurs', value: users.length, icon: Users },
    /* Le compteur d'abonnés mène à la liste segmentée par boutique : un
       chiffre plateforme sans répartition ne dit rien à l'admin. */
    { label: 'Abonnés', value: followers.length, icon: Users, href: '/admin/abonnes' },
    { label: 'Produits', value: products.length, icon: ShoppingBag },
    { label: 'Commandes', value: orders.length, icon: LayoutDashboard },
  ]

  return (
    <main className="relative min-h-dvh bg-secondary/30 px-4 py-6 md:px-8 md:py-10">
      {/* Registre : le quadrillage d'un livre de comptes, le lieu où l'on
          arbitre et où l'on compte. */}
      <Backdrop pattern="ledger" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 pb-20 md:pb-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden="true" /> Marketplace
            </Link>
            <div className="mt-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand text-brand-foreground"><ShieldCheck className="size-5" aria-hidden="true" /></span>
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-brand uppercase">Administration</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Cloche admin : signalements et courrier en rouge, goodies en
                vert, recrues et ouvertures en bleu — pas les mêmes alertes
                que le vendeur, mais le même instrument. */}
            <NotificationsBell
              notifications={adminNotifications({
                forumReports,
                reviewReports,
                adminMessages,
                redemptions,
                teamMembers,
                businesses,
              })}
            />
            <Link href="/tableau-de-bord" className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-secondary">Tableau de bord vendeur</Link>
          </div>
        </header>

        <section id="apercu" className="grid scroll-mt-6 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Indicateurs plateforme">
          {cards.map(({ label, value, icon: Icon, alert, href }) => {
            const inner = (
              <>
                <Icon
                  className={`size-5 ${alert ? 'text-brand' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                />
                <p className="mt-5 text-3xl font-bold tracking-tight">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </>
            )
            /* Un compteur qui demande une action se distingue par sa
               bordure, pas seulement par sa couleur : la couleur seule
               échappe à qui ne la perçoit pas. */
            const surface = `rounded-2xl border bg-background p-5 ${
              alert ? 'border-brand ring-1 ring-brand/30' : 'border-border'
            }`
            return href ? (
              <Link key={label} href={href} className={`${surface} block transition-colors hover:border-brand/40`}>
                {inner}
              </Link>
            ) : (
              <article key={label} className={surface}>
                {inner}
              </article>
            )
          })}
        </section>

        <AdminModeration />
        {/* Placé juste après l'arbitrage : ce sont les deux endroits où
            l'administration doit répondre à quelqu'un qui attend. */}
        <AdminFactoryMail />
        <AdminFulfilment />
        <AdminFormationStats />

        {/* Registre parrainage : l'admin voit le tunnel complet, pas seulement
            le nombre de bonus. Une visite, une inscription et une page publiée
            sont trois événements différents ; les mélanger rend impossible le
            contrôle des abus et des bonus dus. */}
        <section id="parrainage" className="scroll-mt-20 rounded-2xl border border-border bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Parrainage et bonus</h2>
              <p className="mt-1 text-sm text-muted-foreground">Suivi des liens, des publications et des jours accordés.</p>
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="rounded-full bg-secondary px-3 py-1.5">{referrals.filter((r) => r.status === 'lien_partage').length} visites</span>
              <span className="rounded-full bg-secondary px-3 py-1.5">{referrals.filter((r) => r.status === 'inscrit').length} inscrits</span>
              <span className="rounded-full bg-brand px-3 py-1.5 text-brand-foreground">{referrals.filter((r) => r.status === 'page_publiee').length} publiés</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {referrals.slice(0, 12).map((referral) => {
              const source = businesses.find((b) => b.id === referral.referrer_business_id)
              const target = businesses.find((b) => b.id === referral.referred_business_id)
              const days = trialBonuses.filter((bonus) => bonus.related_business_id === referral.referred_business_id || bonus.business_id === referral.referrer_business_id).reduce((sum, bonus) => sum + bonus.days, 0)
              return (
                <article key={referral.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{source?.name ?? 'Commerce parrain'}</p>
                      <p className="truncate text-xs text-muted-foreground">Code {referral.referral_code}{target ? ` · ${target.name}` : ' · en attente'}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-bold uppercase">{referral.status.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(referral.created_at).toLocaleDateString('fr-FR')}</span>
                    <span>{days} jours de bonus liés</span>
                  </div>
                </article>
              )
            })}
          </div>
          {referrals.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Aucun parrainage enregistré.</p> : null}
        </section>

        <section id="commerces" className="scroll-mt-20 rounded-2xl border border-border bg-background p-5">
          <h2 className="text-lg font-bold">Commerces à surveiller</h2>
          <div className="mt-4 flex flex-col divide-y divide-border">
            {businesses.slice(0, 8).map((business) => (
              <Link key={business.id} href={`/r/${business.slug}`} className="flex items-center justify-between gap-4 py-3 hover:text-brand">
                <span className="min-w-0 truncate font-semibold">{business.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{business.city || 'En ligne'}</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="utilisateurs" className="scroll-mt-20 rounded-2xl border border-border bg-background p-5">
          <h2 className="text-lg font-bold">Utilisateurs</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tous les comptes de la plateforme, par rôle.</p>
          <div className="mt-4 flex flex-col divide-y divide-border">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user.name}</p>
                  {/* L'adresse n'est lisible que par un admin authentifié. En
                      visite libre, la console reste explorable mais ne livre
                      pas le carnet d'adresses de la plateforme : une donnée
                      personnelle n'est pas un élément de démonstration. */}
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {role === 'admin' ? user.email : maskEmail(user.email)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${user.role === 'admin' ? 'bg-brand text-brand-foreground' : user.role === 'owner' ? 'bg-secondary text-foreground' : 'border border-border text-muted-foreground'}`}>
                  {user.role === 'admin' ? 'Admin' : user.role === 'owner' ? 'Commerçant' : 'Client'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="commandes" className="scroll-mt-20 rounded-2xl border border-border bg-background p-5">
          <h2 className="text-lg font-bold">Dernières commandes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Activité transactionnelle récente, tous commerces confondus.</p>
          <div className="mt-4 flex flex-col divide-y divide-border">
            {orders.slice(0, 8).map((order) => {
              const shop = businesses.find((b) => b.id === order.business_id)
              return (
                <div key={order.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{shop?.name ?? 'Commerce'}</p>
                    <p className="text-xs text-muted-foreground">{order.status}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold">{(order.total_estimate ?? 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      {/* Menu mobile adapté au profil admin : les sections de supervision de
          la plateforme, pas les outils d'une boutique. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-background/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-18px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden" aria-label="Navigation administration">
        {/* Les sections qui appellent une décision d'abord : sur mobile, la
            barre est la seule table des matières disponible. Le compteur est
            porté sur l'onglet pour qu'un arbitrage en attente se voie sans
            avoir à ouvrir la section. */}
        <a href="#apercu" className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-brand"><ShieldCheck className="size-5" aria-hidden="true" /><span>Aperçu</span></a>
        <a href="#arbitrage" className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
          <Flag className="size-5" aria-hidden="true" />
          <span>Arbitrage</span>
          {pendingReportCount > 0 ? (
            <span className="absolute top-0 right-1.5 grid size-4 place-items-center rounded-full bg-brand font-mono text-[9px] font-bold text-brand-foreground">
              {pendingReportCount}
            </span>
          ) : null}
        </a>
        <a href="#echanges" className="relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
          <Package className="size-5" aria-hidden="true" />
          <span>Échanges</span>
          {openRedemptionCount > 0 ? (
            <span className="absolute top-0 right-1.5 grid size-4 place-items-center rounded-full bg-brand font-mono text-[9px] font-bold text-brand-foreground">
              {openRedemptionCount}
            </span>
          ) : null}
        </a>
        <a href="#formations" className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-muted-foreground"><GraduationCap className="size-5" aria-hidden="true" /><span>Cours</span></a>
        <a href="#utilisateurs" className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-muted-foreground"><Users className="size-5" aria-hidden="true" /><span>Comptes</span></a>
      </nav>
    </main>
  )
}
