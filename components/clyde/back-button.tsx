'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/clyde/i18n'

/**
 * Retour à l'écran précédent, avec repli sur une destination sûre.
 *
 * Extrait en composant partagé parce que la règle est toujours la même et
 * qu'elle est facile à oublier : `router.back()` seul est un piège pour qui
 * arrive par un lien direct — WhatsApp, favori, QR code. Sans historique dans
 * le site, le geste ne rend rien, ou fait sortir du site entièrement. C'est
 * précisément le cas des écrans de connexion et d'inscription, où l'on atterrit
 * le plus souvent d'un lien reçu.
 */
export function BackButton({
  fallback = '/',
  className,
  label,
}: {
  /** Destination quand il n'y a pas d'historique à remonter. */
  fallback?: string
  className?: string
  /** Par défaut « Retour », traduit. */
  label?: string
}) {
  const router = useRouter()
  const t = useT()
  const text = label ?? t.nav.back

  return (
    <button
      type="button"
      onClick={() => {
        /* `> 1` et non `> 0` : l'entrée courante compte toujours pour une. */
        if (window.history.length > 1) router.back()
        else router.push(fallback)
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        className,
      )}
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
      {text}
    </button>
  )
}
