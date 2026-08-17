'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useT } from '@/lib/clyde/i18n'
import type { Currency, ProductOptionGroup } from '@/lib/clyde/types'

/**
 * Saisie des groupes d'options d'un article.
 *
 * Choix d'ergonomie : le supplément se saisit en écart (+500) et non en prix
 * final. Un commerçant qui augmente le prix de son ndolé n'a alors rien à
 * reprendre dans ses variantes, alors qu'avec des prix absolus il devrait
 * corriger chaque ligne — et en oublierait une.
 *
 * Les identifiants sont créés ici et jamais réattribués ensuite : un panier
 * ouvert dans un autre onglet référence ces identifiants, les renuméroter à
 * chaque frappe changerait la commande en cours de route.
 */

let seq = 0
function newId(prefix: string): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`
}

export function OptionGroupsField({
  groups,
  currency,
  onChange,
}: {
  groups: ProductOptionGroup[]
  currency: Currency
  onChange: (groups: ProductOptionGroup[]) => void
}) {
  const t = useT()
  const d = t.dashboard.catalog.options

  function patchGroup(id: string, patch: Partial<ProductOptionGroup>) {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border/70 p-3">
      <legend className="px-1 text-sm font-medium">{d.title}</legend>
      <p className="text-xs text-muted-foreground">{d.hint}</p>

      {groups.map((group) => (
        <div
          key={group.id}
          className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-3"
        >
          <div className="flex items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor={`g-${group.id}`}>{d.groupLabel}</Label>
              <Input
                id={`g-${group.id}`}
                value={group.label}
                onChange={(e) => patchGroup(group.id, { label: e.target.value })}
                placeholder={d.groupLabelPlaceholder}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(groups.filter((g) => g.id !== group.id))}
              aria-label={`${d.removeGroup} : ${group.label || d.groupLabelPlaceholder}`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Deux réglages de la règle du groupe. Le mode de choix passe par
              deux boutons plutôt qu'un interrupteur : « une seule / plusieurs »
              se lit directement, là où un interrupteur oblige à deviner ce que
              signifie sa position haute. */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={group.select === 'unique' ? 'default' : 'outline'}
              onClick={() => patchGroup(group.id, { select: 'unique' })}
              aria-pressed={group.select === 'unique'}
            >
              {d.selectUnique}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={group.select === 'multiple' ? 'default' : 'outline'}
              onClick={() => patchGroup(group.id, { select: 'multiple' })}
              aria-pressed={group.select === 'multiple'}
            >
              {d.selectMultiple}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-background px-3 py-2">
            <Label
              htmlFor={`r-${group.id}`}
              className="cursor-pointer font-normal"
            >
              {d.requiredLabel}
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {d.requiredHint}
              </span>
            </Label>
            <Switch
              id={`r-${group.id}`}
              checked={group.required}
              onCheckedChange={(v) => patchGroup(group.id, { required: v })}
            />
          </div>

          {/* Les réponses. L'intitulé prend la largeur, le supplément reste
              étroit : on tape « Grande » plus souvent que « 500 ». */}
          <div className="flex flex-col gap-2">
            {group.options.map((option) => (
              <div key={option.id} className="flex items-end gap-2">
                <div className="flex min-w-0 flex-[2] flex-col gap-1">
                  <Label
                    htmlFor={`o-${option.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {d.optionLabel}
                  </Label>
                  <Input
                    id={`o-${option.id}`}
                    value={option.label}
                    onChange={(e) =>
                      patchGroup(group.id, {
                        options: group.options.map((o) =>
                          o.id === option.id ? { ...o, label: e.target.value } : o,
                        ),
                      })
                    }
                    placeholder={d.optionLabelPlaceholder}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Label
                    htmlFor={`d-${option.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {d.optionDelta(currency)}
                  </Label>
                  <Input
                    id={`d-${option.id}`}
                    value={option.price_delta === 0 ? '' : String(option.price_delta)}
                    onChange={(e) =>
                      patchGroup(group.id, {
                        options: group.options.map((o) =>
                          o.id === option.id
                            ? {
                                ...o,
                                /* Champ vidé = gratuit. Sans ce repli, effacer
                                   le supplément donnait NaN, puis un prix
                                   « NaN FCFA » sur la page publique. */
                                price_delta:
                                  e.target.value.trim() === ''
                                    ? 0
                                    : Number(e.target.value),
                              }
                            : o,
                        ),
                      })
                    }
                    inputMode="numeric"
                    placeholder="0"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    patchGroup(group.id, {
                      options: group.options.filter((o) => o.id !== option.id),
                    })
                  }
                  aria-label={`${d.removeOption} : ${option.label || d.optionLabelPlaceholder}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}

            {group.options.length === 0 ? (
              <p className="text-xs text-muted-foreground">{d.emptyGroup}</p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                patchGroup(group.id, {
                  options: [
                    ...group.options,
                    { id: newId('o'), label: '', price_delta: 0 },
                  ],
                })
              }
            >
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {d.addOption}
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() =>
          onChange([
            ...groups,
            {
              id: newId('g'),
              label: '',
              /* Par défaut : un seul choix et obligatoire. C'est le cas le plus
                 courant (taille, cuisson) et le plus sûr — un groupe facultatif
                 oublié laisse passer une commande incomplète. */
              select: 'unique',
              required: true,
              options: [{ id: newId('o'), label: '', price_delta: 0 }],
            },
          ])
        }
      >
        <Plus className="mr-1 size-4" aria-hidden="true" />
        {d.addGroup}
      </Button>
    </fieldset>
  )
}
