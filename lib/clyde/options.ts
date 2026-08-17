import type { CartLine, Product, ProductOption, ProductOptionGroup } from './types'

/**
 * Options produit — calcul du prix et identité d'une ligne de panier.
 *
 * Tout ce qui touche au prix d'une ligne passe par ici. La règle est simple :
 * aucun écran ne recalcule un total dans son coin. Un prix affiché à côté du
 * bouton, un autre dans le panier et un troisième dans le message WhatsApp,
 * c'est le meilleur moyen d'envoyer au commerçant une commande dont le montant
 * ne correspond pas à ce que le client croyait payer.
 */

/**
 * Clé d'identité d'une ligne de panier.
 *
 * Le produit ne suffit pas : « grande pizza » et « petite pizza » sont le même
 * produit mais deux lignes. Les identifiants sont triés pour que deux
 * sélections identiques faites dans un ordre différent donnent la même clé —
 * sans ce tri, cocher « piment » puis « oignon » créerait une ligne distincte
 * de « oignon » puis « piment », et le panier afficherait deux fois le même
 * plat.
 */
export function cartLineKey(line: Pick<CartLine, 'productId' | 'optionIds'>): string {
  const ids = [...(line.optionIds ?? [])].sort()
  return ids.length > 0 ? `${line.productId}|${ids.join('+')}` : line.productId
}

/** Tous les groupes d'un produit, en tolérant les produits anciens sans champ. */
export function optionGroupsOf(product: Product | undefined): ProductOptionGroup[] {
  return product?.option_groups ?? []
}

/**
 * Les options retenues, dans l'ordre des groupes du produit.
 *
 * L'ordre suit le produit et non la sélection du client : le message WhatsApp
 * doit toujours lister « Portion » avant « Sauce », sinon deux commandes
 * identiques se lisent différemment et le commerçant doit relire deux fois.
 */
export function selectedOptions(
  product: Product | undefined,
  optionIds: string[] | undefined,
): ProductOption[] {
  if (!product || !optionIds || optionIds.length === 0) return []
  const wanted = new Set(optionIds)
  const out: ProductOption[] = []
  for (const group of optionGroupsOf(product)) {
    for (const option of group.options) {
      if (wanted.has(option.id)) out.push(option)
    }
  }
  return out
}

/**
 * Prix unitaire d'une ligne : prix de base + somme des écarts.
 *
 * Les options inconnues sont ignorées, jamais devinées. Si le commerçant a
 * supprimé « grande portion » pendant que le client avait la page ouverte, on
 * facture la portion de base plutôt qu'un supplément fantôme.
 */
export function unitPrice(
  product: Product | undefined,
  optionIds: string[] | undefined,
): number {
  if (!product) return 0
  return selectedOptions(product, optionIds).reduce(
    (sum, option) => sum + option.price_delta,
    product.price,
  )
}

/** Prix d'une ligne complète, quantité comprise. */
export function linePrice(line: CartLine, products: Product[]): number {
  const product = products.find((p) => p.id === line.productId)
  return unitPrice(product, line.optionIds) * line.quantity
}

/**
 * Groupes obligatoires laissés sans réponse.
 *
 * Sert à bloquer l'ajout au panier : une commande de pizza sans taille oblige
 * le commerçant à rappeler le client, ce que CLYDE est précisément censé
 * éviter. Un groupe obligatoire mais vide d'options est ignoré — il ne peut
 * pas être satisfait, autant ne pas enfermer le client.
 */
export function missingRequiredGroups(
  product: Product | undefined,
  optionIds: string[],
): ProductOptionGroup[] {
  const chosen = new Set(optionIds)
  return optionGroupsOf(product).filter(
    (group) =>
      group.required &&
      group.options.length > 0 &&
      !group.options.some((option) => chosen.has(option.id)),
  )
}

/**
 * Applique un choix dans un groupe et renvoie la nouvelle sélection.
 *
 * Dans un groupe à choix unique, retenir une option retire l'autre : c'est le
 * sens de « unique », et le laisser au composant appelant garantissait qu'un
 * écran l'oublierait.
 */
export function toggleOption(
  group: ProductOptionGroup,
  optionId: string,
  current: string[],
): string[] {
  const inGroup = new Set(group.options.map((o) => o.id))
  if (group.select === 'unique') {
    const others = current.filter((id) => !inGroup.has(id))
    /* Re-cliquer sur l'option déjà retenue la retire, sauf si le groupe est
       obligatoire : dans ce cas on garde le choix, puisque l'absence de
       réponse serait de toute façon refusée à l'ajout au panier. */
    const wasChosen = current.includes(optionId)
    if (wasChosen && !group.required) return others
    return [...others, optionId]
  }
  return current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
}

/**
 * Résumé court des options, pour une ligne de panier ou un message.
 *
 * Exemple : « Grande portion · Sauce piment ». Sans les suppléments : le
 * détail chiffré alourdit une ligne déjà dense, et le total est affiché juste
 * en dessous.
 */
export function optionsSummary(
  product: Product | undefined,
  optionIds: string[] | undefined,
): string {
  return selectedOptions(product, optionIds)
    .map((o) => o.label)
    .join(' · ')
}
