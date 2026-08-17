'use client'

import { Globe } from 'lucide-react'
import { LOCALES, useLocale, useT } from '@/lib/clyde/i18n'
import { cn } from '@/lib/utils'

/**
 * Sélecteur de langue partagé.
 *
 * La barre de navigation l'affichait en double (desktop + menu mobile) et les
 * écrans d'authentification n'en avaient aucun : un visiteur arrivé
 * directement sur /connexion restait bloqué en français. Un seul composant
 * évite les deux problèmes.
 *
 * - `inline` : pastille compacte, posée dans une barre existante.
 * - `stacked` : boutons plus larges, pour un menu ou une colonne.
 */
export function LocaleSwitch({
  variant = 'inline',
  className,
}: {
  variant?: 'inline' | 'stacked'
  className?: string
}) {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const inline = variant === 'inline'

  return (
    <div
      className={cn(
        'flex items-center',
        inline ? 'rounded-lg bg-secondary p-0.5' : 'gap-1.5',
        className,
      )}
      role="group"
      aria-label={t.nav.language}
    >
      <Globe
        size={inline ? 13 : 14}
        className={cn('shrink-0 text-muted-foreground', inline && 'mx-1.5')}
        aria-hidden="true"
      />
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => setLocale(l.id)}
          aria-pressed={locale === l.id}
          title={l.label}
          className={cn(
            'font-mono font-bold transition-colors',
            inline
              ? 'rounded-md px-1.5 py-1 text-[10px]'
              : 'rounded-lg px-2.5 py-1.5 text-[11px]',
            locale === l.id
              ? inline
                ? 'bg-background text-foreground shadow-sm'
                : 'bg-brand text-brand-foreground'
              : cn(
                  'text-muted-foreground hover:text-foreground',
                  !inline && 'bg-secondary',
                ),
          )}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
