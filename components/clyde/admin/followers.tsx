'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, ShieldCheck, Users } from 'lucide-react'
import { Backdrop } from '@/components/clyde/backdrop'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import { buildCsv, downloadCsv, safeFilename, todayStamp } from '@/lib/clyde/export'

/**
 * Console admin — tous les abonnés de la plateforme, segmentés par boutique.
 *
 * L'admin ne cherche pas un contact : il contrôle la répartition. La page
 * s'ouvre donc sur le classement des boutiques par nombre d'abonnés, et un
 * filtre permet de descendre dans la liste nominative d'une boutique donnée.
 * L'export Excel suit le filtre : tout, ou une seule boutique.
 */
export function AdminFollowers() {
  const router = useRouter()
  const role = useSession((s) => s.role)
  const userId = useSession((s) => s.userId)
  const ready = useClydeReady()
  const followers = useClyde((s) => s.followers)
  const users = useClyde((s) => s.users)
  const businesses = useClyde((s) => s.businesses)
  const [filter, setFilter] = useState<string>('all')

  /* Même règle d'accès que la vue d'ensemble : rôle admin, ou mode démo. */
  const allowed = role === 'admin' || !userId
  useEffect(() => {
    if (!allowed) router.replace('/tableau-de-bord')
  }, [allowed, router])

  if (!allowed) {
    return <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Vérification des accès…</main>
  }
  if (!ready) {
    return <main className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Chargement des données de la plateforme…</main>
  }

  /* Classement par boutique — la vue « répartition » demandée avant la liste. */
  const byBusiness = businesses
    .map((b) => ({
      business: b,
      count: followers.filter((f) => f.business_id === b.id).length,
    }))
    .sort((a, b) => b.count - a.count)

  const visible = followers
    .filter((f) => filter === 'all' || f.business_id === filter)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((f) => {
      const account = users.find((u) => u.id === f.user_id) ?? null
      const business = businesses.find((b) => b.id === f.business_id) ?? null
      return {
        id: f.id,
        boutique: business?.name ?? 'Boutique supprimée',
        name: account?.name ?? 'Visiteur',
        whatsapp: account?.whatsapp_number ?? null,
        email: account?.email ?? null,
        neighborhood: account?.neighborhood ?? null,
        since: f.created_at,
      }
    })

  function exportExcel() {
    const scope =
      filter === 'all'
        ? 'plateforme'
        : (businesses.find((b) => b.id === filter)?.name ?? 'boutique')
    const csv = buildCsv(
      ['Boutique', 'Nom', 'WhatsApp', 'E-mail', 'Quartier', 'Abonné depuis'],
      visible.map((r) => [
        r.boutique,
        r.name,
        r.whatsapp,
        r.email,
        r.neighborhood,
        new Date(r.since).toLocaleDateString('fr-FR'),
      ]),
    )
    downloadCsv(csv, `${safeFilename('abonnes', scope, todayStamp())}.csv`)
  }

  return (
    <main className="relative min-h-dvh bg-secondary/30 px-4 py-6 md:px-8 md:py-10">
      <Backdrop pattern="ledger" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 pb-20 md:pb-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden="true" /> Vue d&apos;ensemble
            </Link>
            <div className="mt-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand text-brand-foreground"><ShieldCheck className="size-5" aria-hidden="true" /></span>
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-brand uppercase">Administration</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">Abonnés</h1>
              </div>
            </div>
          </div>
          {visible.length > 0 ? (
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-transform active:scale-[0.98]"
            >
              <Download className="size-4" aria-hidden="true" />
              Exporter (Excel)
            </button>
          ) : null}
        </header>

        {/* Répartition par boutique — cliquer une carte filtre la liste. */}
        <section aria-label="Répartition par boutique" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-2xl border bg-background p-4 text-left transition-colors ${filter === 'all' ? 'border-brand ring-1 ring-brand/30' : 'border-border hover:border-brand/40'}`}
          >
            <Users className="size-4 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-2xl font-bold tabular-nums">{followers.length}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">Toute la plateforme</p>
          </button>
          {byBusiness.map(({ business, count }) => (
            <button
              key={business.id}
              onClick={() => setFilter(business.id)}
              className={`rounded-2xl border bg-background p-4 text-left transition-colors ${filter === business.id ? 'border-brand ring-1 ring-brand/30' : 'border-border hover:border-brand/40'}`}
            >
              <Users className="size-4 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold tabular-nums">{count}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{business.name}</p>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-background">
          {visible.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">Aucun abonné pour cette sélection.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-4 py-3">Boutique</th>
                    <th scope="col" className="px-4 py-3">Nom</th>
                    <th scope="col" className="px-4 py-3">WhatsApp</th>
                    <th scope="col" className="px-4 py-3">E-mail</th>
                    <th scope="col" className="px-4 py-3">Quartier</th>
                    <th scope="col" className="px-4 py-3">Depuis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-muted-foreground">{r.boutique}</td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3">{r.whatsapp ?? '—'}</td>
                      <td className="px-4 py-3">{r.email ?? '—'}</td>
                      <td className="px-4 py-3">{r.neighborhood ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.since).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
