'use client'

import { useState } from 'react'
import { CalendarClock, Info, QrCode, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBlockMeta, useT } from '@/lib/clyde/i18n'
import { useClyde } from '@/lib/clyde/store'
import { BLOCK_META } from '@/lib/clyde/blocks'
import type { Block, BlockType } from '@/lib/clyde/types'
import { cn } from '@/lib/utils'
import { SectionHeader } from './shell'
import { useOwnerContext } from './use-owner'

type ModuleId = 'locations' | 'booking'

/**
 * Blocs de la page publique qui dépendent d'un module.
 *
 * Couper un module sans le dire viderait le bloc correspondant sur la page
 * en ligne : le client verrait un formulaire de réservation qui ne mène plus
 * à rien. On prévient donc avant, en nommant les blocs concernés.
 */
function dependentBlocks(layout: Block[], module: ModuleId): BlockType[] {
  return layout
    .filter((b) => BLOCK_META[b.type]?.requiresModule === module)
    .map((b) => b.type)
}

export function DashboardModules() {
  const { business, page, plan, locationWord, locationWordPlural } =
    useOwnerContext()
  const t = useT()
  const blockMeta = useBlockMeta()
  const d = t.dashboard.modules
  const toggleModule = useClyde((s) => s.toggleModule)
  const [confirming, setConfirming] = useState<ModuleId | null>(null)

  if (!business) return null

  const active: Record<ModuleId, boolean> = {
    locations: business.module_locations,
    booking: business.module_booking,
  }
  const activeCount = (active.locations ? 1 : 0) + (active.booking ? 1 : 0)

  /* `null` = illimité côté offre. */
  const max = plan.limits.modules
  const atLimit = max !== null && activeCount >= max
  /* Cas d'un rétrogradage d'offre alors que deux modules tournaient déjà. */
  const overLimit = max !== null && activeCount > max

  const modules: {
    id: ModuleId
    icon: typeof QrCode
    name: string
    blurb: string
    unlocks: string[]
  }[] = [
    {
      id: 'locations',
      icon: QrCode,
      name: d.locationsName(locationWordPlural),
      blurb: d.locationsBlurb(locationWord.toLowerCase()),
      unlocks: [
        d.locationsUnlock1(locationWordPlural),
        d.locationsUnlock2(locationWord.toLowerCase()),
      ],
    },
    {
      id: 'booking',
      icon: CalendarClock,
      name: d.bookingName,
      blurb: d.bookingBlurb,
      unlocks: [d.bookingUnlock1, d.bookingUnlock2, d.bookingUnlock3],
    },
  ]

  const apply = (id: ModuleId) => {
    toggleModule(business.id, id)
    const name =
      id === 'locations'
        ? d.locationsShort(locationWordPlural)
        : d.bookingName
    toast.success(active[id] ? d.toastDisabled(name) : d.toastEnabled(name))
  }

  const request = (id: ModuleId) => {
    /* Activation : on vérifie d'abord que l'offre le permet. */
    if (!active[id]) {
      if (atLimit) {
        toast.error(d.limitReached(max))
        return
      }
      apply(id)
      return
    }

    /* Désactivation : on confirme seulement si la page en ligne en dépend. */
    const affected = page ? dependentBlocks(page.layout_json, id) : []
    if (affected.length > 0) {
      setConfirming(id)
      return
    }
    apply(id)
  }

  const pending = confirming
  const pendingBlocks =
    pending && page ? dependentBlocks(page.layout_json, pending) : []

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={d.title}
        description={d.description}
      />

      {max !== null && (
        <p
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm',
            overLimit
              ? 'border-amber-500/40 bg-amber-500/10 text-foreground'
              : 'border-border bg-muted/40 text-muted-foreground',
          )}
        >
          {overLimit ? (
            <TriangleAlert
              className="size-4 shrink-0 text-amber-600 dark:text-amber-500"
              aria-hidden="true"
            />
          ) : (
            <Info className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            {overLimit
              ? d.overLimit(plan.name, max)
              : d.withinLimit(plan.name, max, activeCount)}
            <a
              href="/tableau-de-bord/abonnement"
              className="font-medium text-foreground underline underline-offset-2"
            >
              {d.seePlans}
            </a>
          </span>
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((m) => {
          const on = active[m.id]
          /* Un module déjà actif reste toujours désactivable. */
          const blocked = !on && atLimit

          return (
            <section
              key={m.id}
              className={cn(
                'flex flex-col gap-4 rounded-2xl border p-5 transition-colors',
                on ? 'border-brand bg-brand/[0.04]' : 'border-border',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl',
                      on
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <m.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-semibold">{m.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {m.blurb}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={on}
                  onCheckedChange={() => request(m.id)}
                  disabled={blocked}
                  aria-label={`${on ? d.disable : d.enable} ${m.name}`}
                />
              </div>

              <ul className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
                {m.unlocks.map((u) => (
                  <li key={u} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                      aria-hidden="true"
                    />
                    {u}
                  </li>
                ))}
              </ul>

              {blocked && (
                <p className="text-xs text-muted-foreground">
                  {d.blockedHint}
                </p>
              )}
            </section>
          )
        })}
      </div>

      <Dialog
        open={pending !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert
                className="size-4 text-amber-600 dark:text-amber-500"
                aria-hidden="true"
              />
              {d.dialogTitle}
            </DialogTitle>
            <DialogDescription>
              {pendingBlocks.length === 1
                ? d.dialogOne(blockMeta(pendingBlocks[0]).label)
                : d.dialogMany(
                    pendingBlocks
                      .map((type) => `« ${blockMeta(type).label} »`)
                      .join(', '),
                  )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>
              {d.cancel}
            </Button>
            <Button
              onClick={() => {
                if (pending) apply(pending)
                setConfirming(null)
              }}
            >
              {d.disableAnyway}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
