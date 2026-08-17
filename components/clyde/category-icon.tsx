import {
  Armchair,
  BedDouble,
  Building2,
  Cake,
  Camera,
  Car,
  ChefHat,
  Coffee,
  Dumbbell,
  Flower2,
  Hammer,
  Home,
  PartyPopper,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wine,
  WashingMachine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { BusinessCategory } from '@/lib/clyde/types'
import type { FamilyId } from '@/lib/clyde/taxonomy'

export const CATEGORY_ICON: Record<BusinessCategory, LucideIcon> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  bar: Wine,
  boulangerie_patisserie: Cake,
  traiteur: ChefHat,
  hotel: BedDouble,
  location_courte_duree: Home,
  coiffure_beaute: Scissors,
  spa_bienetre: Sparkles,
  sport_coaching: Dumbbell,
  boutique_mode: ShoppingBag,
  epicerie: ShoppingCart,
  fleuriste: Flower2,
  electronique_reparation: Smartphone,
  service_pro: Building2,
  artisan: Hammer,
  pressing: WashingMachine,
  auto_garage: Car,
  immobilier: Home,
  photographe_studio: Camera,
  evenementiel: PartyPopper,
  autre: Store,
}

export const FAMILY_ICON: Record<FamilyId, LucideIcon> = {
  restauration: UtensilsCrossed,
  hebergement: BedDouble,
  beaute: Sparkles,
  commerce: ShoppingBag,
  services: Hammer,
  evenementiel: Camera,
}

export function CategoryIcon({
  category,
  className,
}: {
  category: BusinessCategory
  className?: string
}) {
  const Icon = CATEGORY_ICON[category] ?? Armchair
  return <Icon className={className} aria-hidden="true" />
}

export function FamilyIcon({
  family,
  className,
}: {
  family: FamilyId
  className?: string
}) {
  const Icon = FAMILY_ICON[family] ?? Store
  return <Icon className={className} aria-hidden="true" />
}
