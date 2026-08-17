'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BarChart3, MessageCircle, QrCode } from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { PageRenderer } from '@/components/clyde/page/renderer'
import { useT } from '@/lib/clyde/i18n'
import { markInternalNavigation } from '@/lib/clyde/navigation'
import { openWhatsapp } from '@/lib/clyde/whatsapp'
import {
  DEMO_AVAILABILITY,
  DEMO_BUSINESSES,
  DEMO_PAGES,
  DEMO_PRODUCTS,
} from '@/lib/clyde/demo-data'

/* Blob liquide orange : seul le fond bouge, le mockup reste net (§22) */
function LiquidBlob() {
  return (
    <div
      aria-hidden="true"
      className="clyde-blob-stage pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
    >
      <svg
        viewBox="0 0 800 700"
        className="h-[135%] w-[135%] max-w-none"
        style={{ filter: 'blur(40px)' }}
      >
        <defs>
          <radialGradient id="clyde-blob-grad" cx="45%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.95" />
            <stop offset="52%" stopColor="#FFB199" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FFB199" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          className="clyde-blob"
          fill="url(#clyde-blob-grad)"
          d="M420 90C520 60 640 120 690 230C740 340 700 480 600 560C500 640 340 660 240 590C140 520 80 380 110 260C140 140 320 120 420 90Z"
        />
      </svg>
    </div>
  )
}

function Sticker({
  icon: Icon,
  label,
  className,
  style,
}: {
  icon: typeof QrCode
  label: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`clyde-glass clyde-float absolute hidden items-center gap-2 rounded-2xl px-3 py-2.5 lg:flex ${className ?? ''}`}
      style={style}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
        <Icon size={15} />
      </span>
      <span className="text-[12px] leading-tight font-semibold whitespace-nowrap">
        {label}
      </span>
    </div>
  )
}

export function LandingHero() {
  const router = useRouter()
  const t = useT()
  const business = DEMO_BUSINESSES[0]
  const page = DEMO_PAGES.find((p) => p.business_id === business.id)
  const products = DEMO_PRODUCTS.filter((p) => p.business_id === business.id)
  const availability = DEMO_AVAILABILITY.filter(
    (a) => a.business_id === business.id,
  )

  return (
    <section className="relative overflow-hidden px-5 pt-28 pb-16 sm:pt-32 lg:pb-24">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* ---- Colonne texte ---- */}
        <div className="flex flex-col items-start gap-6">
          {/* Le premier écran utilise `priority` : ces trois blocs sont ce que
              l'utilisateur juge en arrivant, ils ne partent donc pas d'un fondu
              qui retarderait l'affichage du texte. */}
          <Reveal variant="priority">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-brand uppercase">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-brand opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
              </span>
              {t.hero.badge}
            </span>
          </Reveal>

          <Reveal variant="priority" delay={40}>
            {/* Les lignes vides sont ignorées : le titre garde des retours à
                la ligne maîtrisés (une idée par ligne) sans jamais afficher
                de ligne fantôme qui casserait le rythme sur mobile. */}
            <h1 className="text-[2.5rem] leading-[1.04] font-bold tracking-[-0.03em] sm:text-6xl sm:leading-[0.98] lg:text-[4.1rem]">
              {t.hero.titleLine1}
              {t.hero.titleLine2 && (
                <>
                  <br />
                  {t.hero.titleLine2}
                </>
              )}
              <br />
              <span className="text-brand">{t.hero.titleAccent}</span>
            </h1>
          </Reveal>

          <Reveal variant="priority" delay={80}>
            <p className="max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
              {t.hero.subtitle}
            </p>
          </Reveal>

          <Reveal variant="up" delay={180} className="w-full sm:w-auto">
            {/* Sur mobile les deux actions prennent toute la largeur et
                s'empilent — même gabarit, texte centré. Deux boutons de
                largeurs aléatoires alignés à gauche font brouillon. */}
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/inscription"
                /* Bordure transparente de même épaisseur que le bouton
                   secondaire : sans elle, les deux actions empilées sur mobile
                   n'avaient pas la même hauteur (52 px contre 56 px). */
                className="group inline-flex items-center justify-center gap-2 rounded-xl border-2 border-transparent bg-brand px-6 py-4 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98]"
              >
                {t.hero.ctaPrimary}
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href={`/r/${business.slug}`}
                onClick={markInternalNavigation}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-input px-5 py-4 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                {t.hero.ctaSecondary}
              </Link>
            </div>
          </Reveal>

          <Reveal variant="up" delay={240}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[12px] text-muted-foreground">
              {t.hero.proofs.map((proof) => (
                <span key={proof} className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-success" />
                  {proof}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* ---- Colonne mockup ---- */}
        <Reveal variant="scale" delay={140}>
          <div className="relative mx-auto flex w-full max-w-[420px] items-center justify-center lg:max-w-none">
            <LiquidBlob />

            <div className="relative z-10 w-[286px]">
              <div className="relative rounded-[2.6rem] border-[7px] border-foreground bg-foreground shadow-2xl">
                <div className="absolute top-2.5 left-1/2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-background/25" />
                <div className="clyde-mock relative h-[560px] overflow-hidden rounded-[2.05rem]">
                  {/* La vitrine est dessinée pour un écran de 390 px ; le
                      cadre du mockup n'en fait que 272. Rendue directement,
                      chaque texte paraissait trop gros pour son bouton —
                      « Voir le menu » débordait visuellement. On rend donc à
                      taille réelle puis on miniaturise le tout (272/390),
                      comme un téléphone vu à distance : les proportions sont
                      exactement celles que verra un vrai client. */}
                  <div
                    className="overflow-y-auto clyde-no-scrollbar"
                    style={{
                      width: 390,
                      height: 803,
                      transform: 'scale(0.6974)',
                      transformOrigin: 'top left',
                    }}
                  >
                    {page && (
                      <PageRenderer
                        business={business}
                        products={products}
                        availability={availability}
                        theme={page.theme_json}
                        blocks={page.layout_json}
                        device="mobile"
                        interactive={true}
                        /* Le bouton WhatsApp de la couverture doit marcher
                           aussi dans le mockup : un visiteur qui l'essaie et
                           ne voit rien conclut que le produit est factice. */
                        onContact={() =>
                          openWhatsapp(
                            business.whatsapp_number,
                            `Bonjour ${business.name}, j'ai une question.`,
                          )
                        }
                      />
                    )}
                  </div>
                  {/* Pas de fondu en bas d'écran : le voile clair recouvrait le
                      dock de navigation de la vitrine et le rendait illisible.
                      Un vrai téléphone coupe net au bord — le cadre suffit à
                      signaler que la page continue au scroll. */}
                </div>
              </div>

              {/* Stickers ancrés hors du cadre, jamais par-dessus l'écran */}
              <Sticker
                icon={MessageCircle}
                label={t.hero.stickerWhatsapp}
                className="top-10 right-full mr-4 translate-y-8"
                style={
                  { '--dur': '7s', '--amp': '12px' } as React.CSSProperties
                }
              />
              <Sticker
                icon={QrCode}
                label={t.hero.stickerQr}
                className="top-1/2 left-full ml-4"
                style={
                  {
                    '--dur': '8.5s',
                    '--amp': '14px',
                    '--delay': '0.6s',
                  } as React.CSSProperties
                }
              />
              <Sticker
                icon={BarChart3}
                label={t.hero.stickerGrowth}
                className="bottom-16 right-full mr-6"
                style={
                  {
                    '--dur': '9s',
                    '--amp': '10px',
                    '--delay': '1.2s',
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
