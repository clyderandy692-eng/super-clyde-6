import type { Metadata } from 'next'
import { Backdrop } from '@/components/clyde/backdrop'
import { ScrollReveal } from '@/components/clyde/reveal'
import { LandingNav } from '@/components/clyde/landing/nav'
import { LandingHero } from '@/components/clyde/landing/hero'
import { LandingCategoryBand } from '@/components/clyde/landing/category-band'
import { LandingShowcase } from '@/components/clyde/landing/showcase'
import { LandingBento } from '@/components/clyde/landing/bento'
import { Modules, Comparison, Onboarding } from '@/components/clyde/landing/why'
import { LandingTestimonials } from '@/components/clyde/landing/testimonials'
import { FactoryInvitation } from '@/components/clyde/landing/invitation'
import { Pricing } from '@/components/clyde/landing/pricing'
import { FinalCta, Footer } from '@/components/clyde/landing/footer'

export const metadata: Metadata = {
  title: 'CLYDE — Votre commerce. Une page. Zéro technique.',
  description:
    'CLYDE est le constructeur de page des commerçants : créez votre vitrine, recevez vos commandes et vos réservations sur WhatsApp, générez vos QR codes par table ou par chambre. Sans hébergement, sans code.',
  openGraph: {
    title: 'CLYDE — Le constructeur de page des commerçants',
    description:
      'Créez votre page, recevez vos commandes sur WhatsApp, gérez vos réservations et vos QR par table. Sans code.',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    /* `id="accueil"` : cible de l'entrée « Accueil » du menu mobile du bas.
       Elle pointait vers « #top », un identifiant qui n'existe que dans la
       vitrine rendue à l'intérieur du mockup du téléphone — l'appui menait
       donc au milieu de la page au lieu d'y remonter. */
    <div
      id="accueil"
      className="relative min-h-dvh bg-background font-sans text-foreground"
    >
      {/* Papier millimétré : la table à dessin avant le tracé. C'est la page où
          l'on promet de construire — le fond montre le support, pas l'ouvrage.
          Le halo est réservé aux pages d'accroche. */}
      <Backdrop pattern="blueprint" glow />
      <ScrollReveal />
      <LandingNav />
      {/* `relative z-10` : le fond est peint au-dessus du `bg-background` du
          conteneur, le contenu doit donc repasser devant lui. */}
      <main className="relative z-10">
        <LandingHero />
        <LandingCategoryBand />
        {/* L'Invitation précède le constructeur : on explique d'abord dans quoi
            on entre — l'Usine, le recrutement, la promesse — avant de montrer
            l'outil. Placée après les tarifs, elle arrivait trop tard : le
            visiteur avait déjà vu le prix sans savoir ce qu'il rejoignait. */}
        <FactoryInvitation />
        <LandingShowcase />
        <LandingBento />
        <LandingTestimonials />
        <Modules />
        <Comparison />
        <Onboarding />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
