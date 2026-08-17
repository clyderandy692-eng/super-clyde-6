'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, MessageSquareWarning, PackageX, ScrollText, Star, UserPlus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useSession } from '@/lib/clyde/store'
import type { AppNotification, NotificationLevel } from '@/lib/clyde/notifications'

/* ============================================================
   Cloche de notifications — vendeur et admin

   Le composant reçoit la liste déjà dérivée et triée (rouge, vert, bleu) :
   c'est `vendorNotifications` / `adminNotifications` qui décident du contenu,
   la cloche ne fait qu'afficher. Ainsi vendeur et admin partagent le même
   visuel sans partager leurs règles.
   ============================================================ */

/* Chaque niveau porte sa couleur ET sa pastille textuelle : la couleur seule
   échappe à qui ne la perçoit pas. */
const LEVEL_STYLE: Record<
  NotificationLevel,
  { dot: string; badge: string; label: string }
> = {
  urgent: {
    dot: 'bg-red-500',
    badge: 'bg-red-500/12 text-red-700 dark:text-red-400',
    label: 'Urgent',
  },
  action: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
    label: 'À traiter',
  },
  info: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-500/12 text-blue-700 dark:text-blue-400',
    label: 'Info',
  },
}

/* L'icône dit la nature avant que le titre soit lu. */
function iconFor(n: AppNotification) {
  if (n.id.startsWith('order-')) return ScrollText
  if (n.id.startsWith('complaint-') || n.id.startsWith('forum-report-') || n.id.startsWith('review-report-') || n.id.startsWith('mail-'))
    return MessageSquareWarning
  if (n.id.startsWith('stock-')) return PackageX
  if (n.id.startsWith('review-')) return Star
  if (n.id.startsWith('follower-') || n.id.startsWith('team-') || n.id.startsWith('business-')) return UserPlus
  return Bell
}

export function NotificationsBell({
  notifications,
  className,
  align = 'right',
}: {
  notifications: AppNotification[]
  className?: string
  /**
   * Bord du bouton auquel le panneau s'accroche. `right` (défaut) convient à
   * une cloche en bord droit d'écran ; `left` à une cloche dans la barre
   * latérale gauche — alignée à droite, le panneau sortirait de l'écran.
   */
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  /* Masquage manuel : la croix retire avis, abonnés et autres alertes déjà
     prises en compte. Les COMMANDES n'ont pas de croix — une commande en
     attente ne se balaie pas, elle se confirme ou s'annule dans la page
     Commandes, et sort alors de la cloche d'elle-même. */
  const dismissed = useSession((s) => s.dismissedNotifications)
  const dismissNotification = useSession((s) => s.dismissNotification)
  const visible = notifications.filter((n) => !dismissed.includes(n.id))

  /* Fermeture au clic extérieur et à Échap : le panneau flotte au-dessus du
     contenu, il doit se replier dès que l'attention part ailleurs. */
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const count = visible.length
  const urgentCount = visible.filter((n) => n.level === 'urgent').length

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={
          count === 0
            ? 'Notifications — aucune'
            : `Notifications — ${count}${urgentCount > 0 ? `, dont ${urgentCount} urgente${urgentCount > 1 ? 's' : ''}` : ''}`
        }
        className={cn(
          'relative inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground',
          open && 'text-foreground',
        )}
      >
        <Bell className="size-4" aria-hidden="true" />
        {count > 0 && (
          <>
            {/* Le cercle rouge compteur, façon réseau social : le chiffre
                cerclé crée l'alerte que le texte seul ne crée pas. */}
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-background"
            >
              {count > 99 ? '99+' : count}
            </span>
            {/* Halo pulsé seulement s'il y a de l'urgent : l'animation est un
                cri, on ne crie pas pour un nouvel abonné. */}
            {urgentCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 size-5 animate-ping rounded-full bg-red-500/60 motion-reduce:hidden"
              />
            )}
          </>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            'absolute z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold">Notifications</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {count === 0 ? 'Rien à signaler' : `${count} au total`}
            </span>
          </header>

          {count === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tout est à jour. Les commandes, avis et alertes apparaîtront ici.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {visible.slice(0, 20).map((n) => {
                const style = LEVEL_STYLE[n.level]
                const Icon = iconFor(n)
                /* Une commande ne se masque pas : elle attend un choix réel
                   (confirmer / annuler) dans la page Commandes. */
                const dismissable = !n.id.startsWith('order-')
                return (
                  <li key={n.id} className="group relative border-b border-border last:border-b-0">
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                          style.badge,
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn('size-1.5 shrink-0 rounded-full', style.dot)}
                            aria-hidden="true"
                          />
                          <span className="truncate text-sm font-semibold">{n.title}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {n.detail}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          /* Réserve la place de la croix pour que la pastille
                             ne passe pas dessous. */
                          dismissable && 'mr-6',
                          style.badge,
                        )}
                      >
                        {style.label}
                      </span>
                    </Link>
                    {dismissable && (
                      <button
                        type="button"
                        aria-label={`Masquer la notification : ${n.title}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          dismissNotification(n.id)
                        }}
                        className="absolute top-2.5 right-2 grid size-6 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
