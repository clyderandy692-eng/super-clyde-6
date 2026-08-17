import { cn } from '@/lib/utils'

/** Monogramme CLYDE : quatre points = quatre modules, celui en haut à gauche est toujours actif. */
export function ClydeMark({
  className,
  accent = 'bg-brand',
}: {
  className?: string
  accent?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-5 grid-cols-2 gap-[3px]', className)}
    >
      <span className={cn('rounded-full', accent)} />
      <span className="rounded-full bg-current opacity-90" />
      <span className="rounded-full bg-current opacity-90" />
      <span className="rounded-full bg-current opacity-90" />
    </span>
  )
}

/**
 * Deux tailles seulement, et la grande vaut exactement 1,5 fois la petite :
 * monogramme 20 → 30 px, texte 15 → 22 px, écart 8 → 12 px. Un rapport unique
 * garde le monogramme et le mot solidaires — les agrandir séparément aurait
 * décalé les points par rapport à la hauteur des lettres.
 *
 * La taille du texte est fixée ici et non héritée : `className="text-lg"` posé
 * par les appelants ne produisait AUCUN effet, la classe `text-[15px]` interne
 * l'emportant toujours. D'où l'impression d'un logo qui refusait de grandir.
 */
const WORDMARK_SIZES = {
  sm: { gap: 'gap-2', mark: 'size-5', text: 'text-[15px]' },
  /* `gap-[5px]` entre les quatre points : l'écart interne suit lui aussi le
     rapport (3 → 4,5 px), sinon les points d'un grand monogramme se serrent et
     la figure se lit comme une tache. */
  lg: { gap: 'gap-3', mark: 'size-[30px] gap-[5px]', text: 'text-[22px]' },
} as const

export function ClydeWordmark({
  className,
  accent,
  size = 'sm',
}: {
  className?: string
  accent?: string
  /** `lg` = 1,5 × `sm`. Réservé aux endroits où la marque doit s'imposer. */
  size?: keyof typeof WORDMARK_SIZES
}) {
  const scale = WORDMARK_SIZES[size]
  return (
    <span className={cn('flex items-center', scale.gap, className)}>
      <ClydeMark accent={accent} className={scale.mark} />
      <span className={cn('font-extrabold tracking-tight', scale.text)}>
        CLYDE
      </span>
    </span>
  )
}
