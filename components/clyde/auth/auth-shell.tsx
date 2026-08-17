import Link from 'next/link'
import { Backdrop } from '@/components/clyde/backdrop'
import { BackButton } from '@/components/clyde/back-button'
import { ClydeWordmark } from '@/components/clyde/mark'
import { LocaleSwitch } from '@/components/clyde/locale-switch'

/**
 * Cadre commun aux écrans de connexion et d'inscription.
 * Deux colonnes sur desktop : le formulaire à gauche garde le focus,
 * la colonne de droite rappelle la promesse produit sans distraire.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
  aside: { heading: string; points: string[] }
}) {
  return (
    <main className="relative flex min-h-dvh flex-col lg:flex-row">
      {/* Cartouche : le cadre d'identification en bas d'un plan, celui où l'on
          inscrit qui signe. C'est exactement ce que fait cet écran. Trame
          discrète et sans halo — un formulaire de connexion doit se remplir,
          pas se contempler. */}
      <Backdrop pattern="cartouche" />
      <div className="relative z-10 flex flex-1 flex-col px-6 py-10 sm:px-10 lg:px-16">
        {/* Ces écrans n'ont pas la barre de navigation : sans ce sélecteur,
            un visiteur arrivé directement ici ne pourrait pas changer de
            langue. */}
        <div className="flex items-center justify-between gap-3">
          {/* Le monogramme à quatre points, comme partout ailleurs : cet écran
              affichait une icône Sparkles générique, si bien que la marque
              changeait de visage entre l'accueil et la connexion. */}
          <Link href="/" className="w-fit">
            <ClydeWordmark accent="bg-brand" />
          </Link>
          <div className="flex items-center gap-1">
            {/* Ces deux écrans n'ont pas la barre de navigation : sans ce
                bouton, quelqu'un qui ouvrait la connexion pour vérifier une
                chose n'avait AUCUN chemin de retour visible — seul le logo
                ramenait à l'accueil, et rien ne dit qu'un logo est cliquable.
                Le repli mène à l'accueil, cas fréquent ici puisqu'on arrive
                souvent d'un lien reçu par message. */}
            <BackButton fallback="/" />
            <LocaleSwitch />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>

            <div className="mt-8">{children}</div>

            <div className="mt-8 text-sm text-muted-foreground">{footer}</div>
          </div>
        </div>
      </div>

      <aside className="relative hidden overflow-hidden bg-foreground px-16 py-20 text-background lg:flex lg:w-[44%] lg:flex-col lg:justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_0%,color-mix(in_oklab,var(--brand)_42%,transparent),transparent_68%)]"
        />
        <div className="relative">
          <h2 className="text-2xl font-semibold leading-snug text-balance">
            {aside.heading}
          </h2>
          <ul className="mt-8 flex flex-col gap-5">
            {aside.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-brand"
                  aria-hidden="true"
                />
                <span className="text-background/80">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}
