/* ============================================================
   Fonds de page — le plancher de l'Usine

   Un seul composant, un motif par page. Le vocabulaire vient de
   l'atelier : papier millimétré, trame de perçage, cotes, plan
   d'implantation. Aucune « forme abstraite » décorative, aucun
   dégradé arc-en-ciel — ce sont les artefacts d'un lieu où l'on
   fabrique, dessinés à la règle.

   Trois principes tenus pour les 29 pages :

   1. Tout est en CSS (gradients répétés), zéro SVG, zéro image.
      Le coût réseau est nul et le motif suit la taille de l'écran.
   2. Les traits utilisent `currentColor` via les jetons du thème,
      jamais une couleur en dur : le fond suit l'identité si elle
      change, et reste sous les seuils de contraste du texte.
   3. `aria-hidden` + `pointer-events-none` : c'est du décor, il ne
      doit jamais intercepter un clic ni être lu à voix haute.
   ============================================================ */

import { cn } from '@/lib/utils'

/**
 * Les motifs disponibles. Le nom dit ce que la page fait, pas à quoi
 * le motif ressemble : on choisit un fond par intention de page.
 */
export type BackdropPattern =
  /** Accueil : papier millimétré, la table à dessin avant le tracé. */
  | 'blueprint'
  /** Hall d'exposition, boutique : trame de perçage, la tôle d'un présentoir. */
  | 'perforated'
  /** Tableau de bord : cotes et repères, la lecture d'instruments. */
  | 'gauge'
  /** Formation : lignes réglées, le cahier d'atelier. */
  | 'ruled'
  /** Forum, équipe : rainures verticales, les casiers du vestiaire. */
  | 'louver'
  /** Admin, arbitrage : quadrillage serré, le registre. */
  | 'ledger'
  /** Formulaires (connexion, inscription) : cartouche de plan, sobre. */
  | 'cartouche'
  /** Annuaire : étals en quinconce, le plan d'implantation d'un marché. */
  | 'stalls'

/* Chaque motif est une pile de `background-image`. Les valeurs sont
   volontairement basses (0.03 → 0.07 d'opacité effective) : un fond
   qui se remarque est un fond qui gêne la lecture. */
const PATTERNS: Record<BackdropPattern, string> = {
  /* Papier millimétré : deux trames, une fine tous les 8 px et une
     forte tous les 80 px — exactement la logique d'une feuille de
     dessin technique. */
  blueprint: `
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 13%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 13%, transparent) 1px, transparent 1px)
  `,
  /* Trame de perçage : des points en quinconce, comme une tôle
     perforée de présentoir. Le décalage vient du second calque. */
  perforated: `
    radial-gradient(circle at center, color-mix(in oklab, var(--foreground) 15%, transparent) 1.5px, transparent 1.6px),
    radial-gradient(circle at center, color-mix(in oklab, var(--foreground) 15%, transparent) 1.5px, transparent 1.6px)
  `,
  /* Cotes : deux densités de hairlines VERTICALES, l'échelle d'un
     instrument de mesure. À ne pas écrire en `to bottom` sur une taille
     `100% Npx` : un dégradé pleine largeur ne donne pas une graduation
     mais une bande pleine, et la page se retrouve zébrée. */
  gauge: `
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 5%, transparent) 1px, transparent 1px),
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 1px)
  `,
  /* Cahier réglé : lignes horizontales seules, sans marge rouge —
     la marge serait un clin d'œil scolaire, pas un outil. */
  ruled: `
    linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 11%, transparent) 1px, transparent 1px)
  `,
  /* Rainures : bandes verticales larges et douces, la face d'un
     meuble à casiers. */
  louver: `
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 1px),
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 6%, transparent) 1px, transparent 1px)
  `,
  /* Registre : quadrillage serré et régulier, celui d'un livre de
     comptes — approprié là où l'on arbitre et où l'on compte. */
  ledger: `
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 9%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 9%, transparent) 1px, transparent 1px)
  `,
  /* Cartouche : rien qu'une trame très large. Sur un formulaire, le
     regard doit aller au champ, pas au fond. */
  cartouche: `
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 8%, transparent) 1px, transparent 1px)
  `,
  /* Étals : deux rangées de cases décalées d'une demi-maille, le plan
     d'implantation d'un marché. Le décalage évite la grille parfaite —
     un marché s'aligne par rangées, pas au cordeau. */
  stalls: `
    linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 1px),
    linear-gradient(to right, color-mix(in oklab, var(--foreground) 10%, transparent) 1px, transparent 1px)
  `,
}

/** Taille de répétition de chaque calque, dans le même ordre que ci-dessus. */
const SIZES: Record<BackdropPattern, string> = {
  blueprint: '8px 8px, 8px 8px, 80px 80px, 80px 80px',
  perforated: '22px 22px, 22px 22px',
  gauge: '16px 100%, 96px 100%',
  ruled: '100% 32px',
  louver: '14px 100%, 56px 100%',
  ledger: '26px 26px, 26px 26px',
  cartouche: '120px 120px, 120px 120px',
  /* Cases larges et basses : la proportion d'un étal vu en plan, pas
     celle d'un carreau de carrelage. */
  stalls: '100% 44px, 68px 100%',
}

/** Décalages, là où le motif l'exige (quinconce, graduations). */
const POSITIONS: Record<BackdropPattern, string | undefined> = {
  blueprint: undefined,
  /* Le second calque de points est décalé d'une demi-maille : c'est
     ce décalage qui produit la quinconce plutôt qu'une grille. */
  perforated: '0 0, 11px 11px',
  gauge: undefined,
  ruled: undefined,
  louver: '0 0, 7px 0',
  ledger: undefined,
  cartouche: undefined,
  stalls: undefined,
}

/**
 * Fond de page. À placer une seule fois par page, en tout premier
 * enfant d'un conteneur `relative`.
 *
 * Le dégradé de masquage n'est pas cosmétique : sans lui, la trame
 * court jusqu'au pied de page et entre en concurrence avec le
 * contenu dense du bas de page (tableaux, listes). Elle s'éteint
 * donc en descendant.
 */
export function Backdrop({
  pattern,
  className,
  /** Halo de marque discret. Réservé aux pages d'accroche. */
  glow = false,
}: {
  pattern: BackdropPattern
  className?: string
  glow?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      /* `z-0`, PAS `-z-10` : le conteneur de page porte `bg-background`, un
         fond opaque. Un calque en z-index négatif passe derrière ce fond et
         n'apparaît jamais. On reste donc au-dessus du fond du parent, et le
         contenu passe devant grâce à son propre `relative z-10`.

         `inset-x-0 top-0` + hauteur bornée, et non `inset-0` : sur une page
         longue le calque ferait toute la hauteur du document et le dégradé
         d'extinction serait impossible à régler. Le fond appartient au haut de
         page — là où le regard arrive. */
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-0 h-[1900px] overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: PATTERNS[pattern],
          backgroundSize: SIZES[pattern],
          backgroundPosition: POSITIONS[pattern],
          /* Le dégradé est exprimé en `px`, jamais en `%`. Une page longue
             mesure ici près de 10 000 px : en pourcentage, la trame était
             déjà éteinte à mi-hauteur du premier écran — donc invisible
             partout. En pixels, elle couvre les deux premiers écrans puis
             s'efface, laissant le contenu dense du bas sur un fond propre. */
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 0px, rgba(0,0,0,0.85) 700px, rgba(0,0,0,0.35) 1400px, transparent 1900px)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,1) 0px, rgba(0,0,0,0.85) 700px, rgba(0,0,0,0.35) 1400px, transparent 1900px)',
        }}
      />
      {glow ? (
        /* Un seul halo, haut et hors-champ à droite : il éclaire la
           zone de titre sans passer sous le texte courant. */
        <div
          className="absolute -top-32 -right-24 size-[34rem] rounded-full opacity-[0.16]"
          style={{
            background:
              'radial-gradient(circle, var(--brand) 0%, transparent 68%)',
          }}
        />
      ) : null}
    </div>
  )
}
