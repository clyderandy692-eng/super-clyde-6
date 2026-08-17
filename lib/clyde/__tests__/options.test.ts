/**
 * Options d'articles et calcul de prix.
 *
 * C'est ici que se joue l'argent : un écart de prix mal appliqué se traduit
 * directement en perte pour le commerçant, sans qu'aucun écran ne signale
 * l'erreur. Les prix étant en francs CFA (unités entières), le total doit
 * rester exact au franc.
 */

import { describe, expect, it } from 'vitest'
import {
  cartLineKey,
  linePrice,
  missingRequiredGroups,
  optionsSummary,
  toggleOption,
  unitPrice,
} from '../options'
import type { CartLine, Product, ProductOptionGroup } from '../types'

const taille: ProductOptionGroup = {
  id: 'g_taille',
  label: 'Portion',
  select: 'unique',
  required: true,
  options: [
    { id: 'o_simple', label: 'Simple', price_delta: 0 },
    { id: 'o_grande', label: 'Grande', price_delta: 500 },
  ],
}

const sauces: ProductOptionGroup = {
  id: 'g_sauce',
  label: 'Sauces',
  select: 'multiple',
  required: false,
  options: [
    { id: 'o_piment', label: 'Piment', price_delta: 100 },
    { id: 'o_mayo', label: 'Mayo', price_delta: 200 },
  ],
}

const product: Product = {
  id: 'pr_1',
  business_id: 'bu_1',
  name: 'Poulet DG',
  description: null,
  price: 3000,
  compare_at_price: null,
  media_urls: [],
  type: 'product',
  duration_minutes: null,
  category_label: null,
  active: true,
  available: true,
  option_groups: [taille, sauces],
  created_at: '2026-01-01T00:00:00.000Z',
}

function line(optionIds: string[], quantity = 1): CartLine {
  return { productId: product.id, optionIds, quantity } as CartLine
}

describe('prix unitaire', () => {
  it('vaut le prix de base sans option', () => {
    expect(unitPrice(product, [])).toBe(3000)
  })

  it('ajoute les écarts, pas les prix', () => {
    /* `price_delta` est un ÉCART : « Grande » vaut +500, et non 500. Confondre
       les deux ferait payer 500 F un plat à 3500 F. */
    expect(unitPrice(product, ['o_grande'])).toBe(3500)
  })

  it('cumule les options d’un groupe multiple', () => {
    expect(unitPrice(product, ['o_grande', 'o_piment', 'o_mayo'])).toBe(3800)
  })

  it('ignore un identifiant d’option inconnu', () => {
    /* Une option retirée du catalogue ne doit pas faire exploser un panier
       encore ouvert dans un onglet. */
    expect(unitPrice(product, ['o_fantome'])).toBe(3000)
  })
})

describe('prix de ligne', () => {
  it('multiplie par la quantité', () => {
    expect(linePrice(line(['o_grande'], 3), [product])).toBe(10500)
  })

  it('vaut zéro pour un produit disparu', () => {
    expect(linePrice(line([], 2), [])).toBe(0)
  })
})

describe('groupes obligatoires', () => {
  it('signale le groupe requis non choisi', () => {
    expect(missingRequiredGroups(product, [])).toContain(taille)
  })

  it('ne signale rien une fois le choix fait', () => {
    expect(missingRequiredGroups(product, ['o_simple'])).toHaveLength(0)
  })

  it('n’exige jamais un groupe facultatif', () => {
    expect(missingRequiredGroups(product, ['o_simple']).includes(sauces)).toBe(false)
  })
})

describe('choix d’options', () => {
  it('remplace le choix dans un groupe unique', () => {
    /* Deux portions cochées en même temps produiraient un prix incohérent. */
    const next = toggleOption(taille, 'o_grande', ['o_simple'])
    expect(next).toContain('o_grande')
    expect(next).not.toContain('o_simple')
  })

  it('cumule puis retire dans un groupe multiple', () => {
    const added = toggleOption(sauces, 'o_piment', [])
    const both = toggleOption(sauces, 'o_mayo', added)
    expect(both).toHaveLength(2)
    expect(toggleOption(sauces, 'o_mayo', both)).toEqual(['o_piment'])
  })
})

describe('identité d’une ligne de panier', () => {
  it('distingue deux fois le même plat aux options différentes', () => {
    /* Sans cela, un « Poulet DG grande » écraserait un « Poulet DG simple »
       déjà au panier. */
    expect(cartLineKey(line(['o_grande']))).not.toBe(cartLineKey(line(['o_simple'])))
  })

  it('regroupe le même plat aux mêmes options, quel que soit l’ordre', () => {
    expect(cartLineKey(line(['o_grande', 'o_piment']))).toBe(
      cartLineKey(line(['o_piment', 'o_grande'])),
    )
  })
})

describe('résumé des options', () => {
  it('cite les libellés, pas les identifiants', () => {
    /* Le résumé part dans le message WhatsApp du commerçant : « o_grande » n'y
       serait d'aucune aide en cuisine. */
    const summary = optionsSummary(product, ['o_grande', 'o_piment'])
    expect(summary).toContain('Grande')
    expect(summary).toContain('Piment')
    expect(summary).not.toContain('o_')
  })
})
