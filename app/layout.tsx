import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import {
  Kanit,
  Geist_Mono,
  Inter,
  Playfair_Display,
  Space_Grotesk,
  Lora,
} from 'next/font/google'
import { StoreHydrator } from '@/components/clyde/store-hydrator'
import { LofiPlayer } from '@/components/clyde/landing/lofi-player'
import { Toaster } from '@/components/ui/sonner'
import { LocaleProvider } from '@/lib/clyde/i18n'
import { REVEAL_SCRIPT } from '@/lib/clyde/reveal-script'
import './globals.css'

const _kanit = Kanit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kanit',
})
const _mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

/* Liste courte et curatée pour le page builder (plan v5, §7.4) */
const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const _playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})
const _space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })
const _lora = Lora({ subsets: ['latin'], variable: '--font-lora' })

export const metadata: Metadata = {
  metadataBase: new URL('https://clyde.app'),
  title: {
    default: 'CLYDE — Votre commerce, en une page',
    template: '%s · CLYDE',
  },
  description:
    'CLYDE est le constructeur de page des commerçants : catalogue, commandes WhatsApp, QR par table ou chambre, réservations et analytics. Sans code, sans hébergement.',
  applicationName: 'CLYDE',
  keywords: [
    'constructeur de page commerçant',
    'commande WhatsApp',
    'QR code table',
    'réservation en ligne',
    'restaurant',
    'hôtel',
    'salon de coiffure',
  ],
  manifest: '/manifest.webmanifest',
  generator: 'v0.app',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'CLYDE',
    title: 'CLYDE — Votre commerce, en une page',
    description:
      'Construisez la page de votre commerce, recevez commandes et réservations sur WhatsApp, sachez ce qui marche.',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#FAFAF8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /* `data-scroll-behavior="smooth"` déclare à Next que le
       `scroll-behavior: smooth` posé sur `<html>` dans globals.css est
       volontaire — il sert aux ancres de la page publique. Sans cet attribut,
       Next avertit à chaque navigation et applique son propre défilement
       instantané, ce qui rendait le comportement incohérent entre un clic sur
       une ancre et un changement de route. */
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`light bg-background ${_kanit.variable} ${_mono.variable} ${_inter.variable} ${_playfair.variable} ${_space.variable} ${_lora.variable}`}
    >
      <body className="font-sans antialiased">
        {/* Les animations d'entrée démarrent ici, avant l'hydratation de React.
            `beforeInteractive` fait injecter ce script par Next lui-même,
            dans le `<head>` généré au tout premier rendu — sans qu'on ait à
            écrire un `<script>` littéral dans notre propre JSX de `<head>`.
            Un `<script>` posé à la main à cet endroit occupait la même
            position que le script d'amorçage propre à la plateforme
            d'aperçu, ce qui provoquait un écart d'hydratation React à cet
            emplacement et cassait le chargement de la preview. Cette
            stratégie garde le même bénéfice (le contenu visible apparaît dès
            l'analyse du HTML, pas après hydratation) sans ce risque. */}
        <Script
          id="clyde-reveal"
          strategy="beforeInteractive"
          // eslint-disable-next-line react/no-danger -- script pré-hydratation, contenu littéral sans donnée externe
          dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }}
        />
        {/* Sans JavaScript, on neutralise les états de départ des animations
            d'entrée : le contenu s'affiche immédiatement au lieu de rester
            invisible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important;filter:none !important}`}</style>
        </noscript>
        {/* Relecture du stockage déclenchée pour toutes les routes : voir le
            commentaire du composant, c'est un garde-fou contre l'écrasement
            des données par l'état de démonstration. */}
        <StoreHydrator />
        <LocaleProvider>{children}</LocaleProvider>
        <LofiPlayer />
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
