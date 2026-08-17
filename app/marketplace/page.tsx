import type { Metadata } from 'next'
import { Backdrop } from '@/components/clyde/backdrop'
import { ScrollReveal } from '@/components/clyde/reveal'
import { LandingNav } from '@/components/clyde/landing/nav'
import { Footer } from '@/components/clyde/landing/footer'
import { MarketplaceHeader } from '@/components/clyde/marketplace/header'
import { MarketplaceDirectory } from '@/components/clyde/marketplace/directory'

export const metadata: Metadata = {
  title: 'Marketplace — Les commerces',
  description:
    'Découvrez les restaurants, salons, hôtels et boutiques qui reçoivent leurs commandes sur WhatsApp avec CLYDE. Filtrez par métier et par ville.',
  openGraph: {
    title: 'Marketplace CLYDE',
    description:
      'Les commerces qui vendent déjà sur CLYDE : restaurants, salons, hôtels, boutiques.',
    type: 'website',
  },
}

export default function MarketplacePage() {
  return (
    <div className="relative min-h-dvh bg-background font-sans text-foreground">
      {/* Étals : un annuaire est un plan de marché, des rangées de vitrines
          que l'on parcourt du regard. Halo à l'entrée. */}
      <Backdrop pattern="stalls" glow />
      <ScrollReveal />
      <LandingNav variant="marketplace" />
      {/* pb-32 : le menu mobile flotte en bas, le pied de page passait dessous. */}
      <main className="relative z-10 pt-28 pb-24 md:pb-20">
        <MarketplaceHeader />
        <MarketplaceDirectory />
      </main>
      <Footer />
    </div>
  )
}
