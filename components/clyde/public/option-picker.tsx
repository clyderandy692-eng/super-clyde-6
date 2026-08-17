'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import {
  missingRequiredGroups,
  optionGroupsOf,
  toggleOption,
  unitPrice,
} from '@/lib/clyde/options'
import { formatPrice } from '@/lib/clyde/taxonomy'
import { tint } from '@/lib/clyde/theme'
import type { Currency, Product } from '@/lib/clyde/types'
import { Overlay } from './overlay'

/**
 * Choix des options avant l'ajout au panier.
 *
 * Deux partis pris :
 *
 * 1. Le total est affiché en permanence sur le bouton d'ajout et se met à jour
 *    à chaque choix. Découvrir le supplément au moment du panier est la
 *    première cause d'abandon — autant l'annoncer pendant qu'on choisit.
 *
 * 2. Les groupes obligatoires non renseignés désactivent le bouton et sont
 *    nommés dans le message d'aide, plutôt que de laisser passer une commande
 *    « pizza sans taille » que le commerçant devra rattraper au téléphone.
 */
export function OptionPicker({
  product,
  currency,
  theme,
  onClose,
  onConfirm,
}: {
  product: Product
  currency: Currency
  theme: { brand: string; ink: string; background: string }
  onClose: () => void
  onConfirm: (optionIds: string[]) => void
}) {
  const groups = optionGroupsOf(product)

  /* Pré-sélection : la première option de chaque groupe unique obligatoire.
     Le client n'a alors rien à faire dans le cas courant, et le prix affiché
     correspond dès l'ouverture à ce qu'il paiera. */
  const [chosen, setChosen] = useState<string[]>(() =>
    groups
      .filter((g) => g.required && g.select === 'unique' && g.options.length > 0)
      .map((g) => g.options[0].id),
  )

  const missing = missingRequiredGroups(product, chosen)
  const price = unitPrice(product, chosen)

  return (
    <Overlay onClose={onClose} theme={theme}>
      <div className="flex max-h-[80vh] flex-col">
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${tint(theme.ink, 0.1)}` }}
        >
          <h2 className="min-w-0 truncate text-base font-bold">{product.name}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <fieldset key={group.id} className="flex flex-col gap-2">
              <legend className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                {group.label}
                <span className="text-xs font-normal opacity-55">
                  {group.required
                    ? group.select === 'unique'
                      ? 'obligatoire'
                      : 'au moins un'
                    : 'facultatif'}
                </span>
              </legend>

              {group.options.map((option) => {
                const active = chosen.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    /* Rôle explicite : les boutons radio et cases natifs
                       n'acceptent pas cette mise en forme, mais un lecteur
                       d'écran doit tout de même entendre s'il s'agit d'un choix
                       exclusif ou d'une case à cocher. */
                    role={group.select === 'unique' ? 'radio' : 'checkbox'}
                    aria-checked={active}
                    onClick={() =>
                      setChosen(toggleOption(group, option.id, chosen))
                    }
                    className="flex items-center gap-3 px-3 py-2.5 text-left text-sm"
                    style={{
                      borderRadius: 12,
                      border: `1.5px solid ${active ? theme.brand : tint(theme.ink, 0.14)}`,
                      background: active ? tint(theme.brand, 0.08) : 'transparent',
                    }}
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center"
                      style={{
                        borderRadius: group.select === 'unique' ? 999 : 6,
                        border: `1.5px solid ${active ? theme.brand : tint(theme.ink, 0.25)}`,
                        background: active ? theme.brand : 'transparent',
                      }}
                      aria-hidden="true"
                    >
                      {active ? <Check size={13} color={theme.background} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">{option.label}</span>
                    {option.price_delta !== 0 ? (
                      <span
                        className="shrink-0 text-[13px] font-semibold"
                        style={{ color: theme.brand }}
                      >
                        {option.price_delta > 0 ? '+' : '−'}
                        {formatPrice(Math.abs(option.price_delta), currency)}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </fieldset>
          ))}
        </div>

        <div
          className="flex flex-col gap-2 px-5 py-4"
          style={{ borderTop: `1px solid ${tint(theme.ink, 0.1)}` }}
        >
          {missing.length > 0 ? (
            <p className="text-[13px] opacity-70" role="status">
              À choisir : {missing.map((g) => g.label).join(', ')}
            </p>
          ) : null}
          <button
            type="button"
            disabled={missing.length > 0}
            onClick={() => onConfirm(chosen)}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold disabled:opacity-45"
            style={{
              borderRadius: 999,
              background: theme.brand,
              color: theme.background,
            }}
          >
            Ajouter — {formatPrice(price, currency)}
          </button>
        </div>
      </div>
    </Overlay>
  )
}
