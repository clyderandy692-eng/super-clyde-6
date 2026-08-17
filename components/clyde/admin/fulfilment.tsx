'use client'

/* ============================================================
   Échanges de goodies à honorer

   Un commerçant qui dépense 40 points contre un tee-shirt attend un
   colis. Les points étaient bien débités, mais l'échange restait
   éternellement « demandé » : aucun écran ne les listait et aucune
   action ne les faisait avancer. Une dette envers le commerçant,
   invisible côté plateforme.

   Le tri place les demandes les plus ANCIENNES en premier : c'est
   celui qui attend depuis le plus longtemps qui doit être servi, pas
   le dernier arrivé.
   ============================================================ */

import { Package, Truck, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { findGoodie } from '@/lib/clyde/goodies'
import { useClyde } from '@/lib/clyde/store'
import type { GoodieRedemption } from '@/lib/clyde/types'

const STATUS_LABEL: Record<GoodieRedemption['status'], string> = {
  demande: 'Demandé',
  preparee: 'Préparé',
  remise: 'Remis',
}

const NEXT_LABEL: Record<GoodieRedemption['status'], string | null> = {
  demande: 'Marquer préparé',
  preparee: 'Marquer remis',
  /* Terminus : pas de bouton, il n'y a plus rien à faire avancer. */
  remise: null,
}

export function AdminFulfilment() {
  const redemptions = useClyde((s) => s.goodieRedemptions)
  const businesses = useClyde((s) => s.businesses)
  const advanceRedemption = useClyde((s) => s.advanceRedemption)

  const open = redemptions
    .filter((r) => r.status !== 'remise')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const done = redemptions.filter((r) => r.status === 'remise')

  return (
    <section
      id="echanges"
      className="scroll-mt-20 rounded-2xl border border-border bg-background p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Package className="size-4 text-brand" aria-hidden="true" />
            Échanges à honorer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les points sont déjà débités : chaque ligne est une livraison due.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs font-bold ${
            open.length > 0
              ? 'bg-brand text-brand-foreground'
              : 'bg-secondary text-muted-foreground'
          }`}
        >
          {open.length} en cours
        </span>
      </div>

      {open.length === 0 ? (
        <p className="mt-5 rounded-xl bg-secondary/50 px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun échange en attente.
          {done.length > 0 ? ` ${done.length} déjà remis.` : ''}
        </p>
      ) : (
        <ul className="mt-5 flex flex-col divide-y divide-border">
          {open.map((r) => {
            const goodie = findGoodie(r.goodie_id)
            const shop = businesses.find((b) => b.id === r.business_id)
            const nextLabel = NEXT_LABEL[r.status]

            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {goodie ? goodie.name.fr : 'Goodie'}
                    {r.size ? ` · ${r.size}` : ''}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {shop?.name ?? 'Commerce'} · {r.delivery_city} ·{' '}
                    {r.points_spent} pts
                  </p>
                  {/* Le bon de livraison complet : sans destinataire ni
                      téléphone, la ligne disait « livraison due » sans dire à
                      qui ni où — indéliverable en pratique. */}
                  {r.recipient_name || r.recipient_phone ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.recipient_name, r.recipient_phone, r.delivery_address]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                  {r.delivery_note ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground italic">
                      « {r.delivery_note} »
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                    {STATUS_LABEL[r.status]}
                  </span>
                  {nextLabel ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => advanceRedemption(r.id)}
                    >
                      {r.status === 'demande' ? (
                        <Truck className="size-4" aria-hidden="true" />
                      ) : (
                        <Check className="size-4" aria-hidden="true" />
                      )}
                      {nextLabel}
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
