'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

/**
 * Feuille modale de la vitrine — fiche produit, panier, réservation.
 *
 * Elle vit dans son propre fichier parce que trois feuilles la partagent
 * désormais : la garder dans la vitrine aurait obligé la feuille de
 * réservation à recopier la même gestion d'Échap et de fond cliquable.
 *
 * Remonte du bas sur téléphone, centrée sur grand écran : le pouce atteint
 * ainsi les actions sans traverser l'écran.
 */
export function Overlay({
  children,
  onClose,
  theme,
}: {
  children: React.ReactNode
  onClose: () => void
  theme: { background: string; ink: string }
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full overflow-hidden shadow-2xl sm:max-w-md',
          'rounded-t-2xl sm:rounded-2xl',
        )}
        style={{ background: theme.background, color: theme.ink }}
      >
        {children}
      </div>
    </div>
  )
}
