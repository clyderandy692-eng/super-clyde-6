import { Backdrop, type BackdropPattern } from '@/components/clyde/backdrop'
import { ScrollReveal } from '@/components/clyde/reveal'
import { LandingNav } from '@/components/clyde/landing/nav'
import { Footer } from '@/components/clyde/landing/footer'

/**
 * Enveloppe commune aux pages annexes (aide, contact, mentions légales) :
 * même navigation et même pied de page que le site, pour qu'un visiteur ne
 * se retrouve jamais sur une page sans issue.
 */
export function PageShell({
  children,
  /* Chaque page choisit son motif de fond. `cartouche` — la trame la plus
     discrète — est le défaut : sur une page de texte ou de formulaire, le
     regard doit aller au contenu. Les pages qui ont une identité forte
     (forum, boutique, formation) passent le leur. */
  pattern = 'cartouche',
  glow = false,
}: {
  children: React.ReactNode
  pattern?: BackdropPattern
  glow?: boolean
}) {
  return (
    <div className="relative min-h-dvh bg-background font-sans text-foreground">
      <Backdrop pattern={pattern} glow={glow} />
      <ScrollReveal />
      <LandingNav />
      {/* `relative z-10` : le fond est peint au-dessus du `bg-background` du
          conteneur, le contenu doit donc repasser devant. */}
      <main className="relative z-10 pt-28 pb-20">{children}</main>
      <Footer />
    </div>
  )
}

/** En-tête de page annexe : pastille, titre, chapô. */
export function PageHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string
  title: string
  subtitle?: string
}) {
  return (
    <header className="mx-auto w-full max-w-3xl px-5 pb-10 md:px-8">
      <span className="inline-flex items-center rounded-full border border-border px-3 py-1 font-mono text-[11px] font-bold tracking-[0.2em] text-brand uppercase">
        {badge}
      </span>
      <h1 className="mt-5 text-balance text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-5xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </header>
  )
}
