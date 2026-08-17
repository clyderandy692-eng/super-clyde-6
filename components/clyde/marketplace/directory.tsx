'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Heart, MapPin, Search, SearchX, Store, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BusinessCard } from '@/components/clyde/marketplace/business-card'
import { Reveal } from '@/components/clyde/reveal'
import { demoCover } from '@/lib/clyde/demo-media'
import { markInternalNavigation } from '@/lib/clyde/navigation'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import { useT } from '@/lib/clyde/i18n'
import { CATEGORY_MAP, FAMILIES, type FamilyId } from '@/lib/clyde/taxonomy'
import { cn } from '@/lib/utils'

export function MarketplaceDirectory() {
  const t = useT()
  const businesses = useClyde((s) => s.businesses)
  const pages = useClyde((s) => s.pages)
  const followers = useClyde((s) => s.followers)
  const userId = useSession((s) => s.userId)

  /* Session et abonnements viennent du stockage local : on attend la
     réhydratation, sinon serveur et client divergent au premier rendu. */
  const ready = useClydeReady()
  const signedIn = ready && Boolean(userId)

  const [query, setQuery] = useState('')
  const [family, setFamily] = useState<FamilyId | 'all'>('all')
  const [city, setCity] = useState<string>('all')

  /* Seules les pages que le commerçant a choisi de publier apparaissent ici. */
  const listed = useMemo(
    () => businesses.filter((b) => b.listed_in_marketplace),
    [businesses],
  )

  /* Villes réellement présentes : une liste figée afficherait des villes vides. */
  const cities = useMemo(() => {
    const set = new Set<string>()
    for (const b of listed) if (b.city) set.add(b.city)
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [listed])

  /* Familles réellement représentées, pour la même raison. */
  const families = useMemo(() => {
    const present = new Set<FamilyId>()
    for (const b of listed) {
      const meta = CATEGORY_MAP[b.category]
      if (meta) present.add(meta.family)
    }
    return FAMILIES.filter((f) => present.has(f.id))
  }, [listed])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listed.filter((b) => {
      const meta = CATEGORY_MAP[b.category]
      if (family !== 'all' && meta?.family !== family) return false
      if (city !== 'all' && b.city !== city) return false
      if (!q) return true
      /* La recherche couvre aussi le métier et le quartier : un client cherche
         « coiffure » ou « Bonapriso » plus souvent qu'un nom d'enseigne. */
      return [b.name, b.city, b.neighborhood, meta?.label, b.description]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    })
  }, [listed, query, family, city])

  const themeFor = (businessId: string) =>
    pages.find((p) => p.business_id === businessId)?.theme_json

  /**
   * Couverture affichée sur la vignette.
   *
   * Beaucoup de commerçants remplissent leur page avant de penser au champ
   * « couverture ». On reprend donc, dans l'ordre, l'image du hero puis la
   * première photo de galerie, et enfin la couverture de démonstration — la
   * même que la vitrine — afin que l'aperçu montre la vraie boutique plutôt
   * qu'un aplat de couleur.
   */
  const coverFor = (business: (typeof listed)[number]) => {
    if (business.cover_url) return business.cover_url
    const layout = pages.find((p) => p.business_id === business.id)?.layout_json
    if (layout) {
      for (const block of layout) {
        if (block.type === 'hero' && block.imageUrl) return block.imageUrl
        if (block.type === 'image_gallery' && block.images.length > 0)
          return block.images[0]
      }
    }
    return demoCover(business.id)
  }

  /* Pages suivies par le visiteur connecté : c'est la raison principale pour
     laquelle un simple client revient sur l'annuaire. */
  const followed = useMemo(() => {
    if (!userId) return []
    const ids = new Set(
      followers.filter((f) => f.user_id === userId).map((f) => f.business_id),
    )
    return businesses.filter((b) => ids.has(b.id))
  }, [followers, businesses, userId])

  /* Recommandations : les commerces des mêmes familles que ceux que le
     visiteur suit déjà, qu'il ne suit pas encore. Suivre deux restaurants
     dit clairement ce qu'il aime — on lui en propose d'autres. */
  const recommended = useMemo(() => {
    if (!userId || followed.length === 0) return []
    const followedIds = new Set(followed.map((b) => b.id))
    const likedFamilies = new Set(
      followed
        .map((b) => CATEGORY_MAP[b.category]?.family)
        .filter(Boolean) as FamilyId[],
    )
    return listed
      .filter((b) => {
        if (followedIds.has(b.id)) return false
        const fam = CATEGORY_MAP[b.category]?.family
        return fam ? likedFamilies.has(fam) : false
      })
      .slice(0, 3)
  }, [userId, followed, listed])

  const filtered = query.trim() !== '' || family !== 'all' || city !== 'all'

  const reset = () => {
    setQuery('')
    setFamily('all')
    setCity('all')
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
      {/* ---- Espace du visiteur connecté ---- */}
      {signedIn ? (
        <section
          id="mes-abonnements"
          className="mb-8 scroll-mt-28 rounded-2xl border border-border bg-card p-4 sm:p-5"
          aria-labelledby="mes-abonnements-titre"
        >
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-brand" aria-hidden="true" />
            <h2 id="mes-abonnements-titre" className="text-base font-bold tracking-tight">
              {t.marketplace.myFollowsTitle}
            </h2>
            <span className="ml-auto font-mono text-[11px] font-bold text-muted-foreground">
              {followed.length}
            </span>
            {/* Porte d'entrée vers l'espace client : commandes, réservations,
                favoris — le suivi complet vit là-bas. */}
            <Link
              href="/espace-client"
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-secondary"
            >
              Mon espace
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t.marketplace.myFollowsBody}
          </p>

          {followed.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {followed.map((b) => (
                <Link
                  key={b.id}
                  href={`/r/${b.slug}`}
                  onClick={markInternalNavigation}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 transition-colors hover:border-input hover:bg-secondary/50"
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold"
                    style={{
                      background: themeFor(b.id)?.brand ?? 'var(--color-brand)',
                      color: '#FFFFFF',
                    }}
                  >
                    {b.logo_url ? (
                      <img
                        src={b.logo_url || '/placeholder.svg'}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      b.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold">
                      {b.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {[b.neighborhood, b.city].filter(Boolean).join(', ') ||
                        CATEGORY_MAP[b.category]?.label}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
              {t.marketplace.myFollowsEmpty}
            </p>
          )}

          {/* ---- Recommandations personnalisées ---- */}
          {recommended.length > 0 ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-[12px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Parce que vous aimez ces métiers
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recommended.map((b) => (
                  <Link
                    key={b.id}
                    href={`/r/${b.slug}`}
                    onClick={markInternalNavigation}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background p-2.5 transition-colors hover:border-brand/50 hover:bg-secondary/50"
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold"
                      style={{
                        background: themeFor(b.id)?.brand ?? 'var(--color-brand)',
                        color: '#FFFFFF',
                      }}
                    >
                      {b.logo_url ? (
                        <img
                          src={b.logo_url || '/placeholder.svg'}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        b.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold">
                        {b.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">
                        {CATEGORY_MAP[b.category]?.label}
                        {b.city ? ` · ${b.city}` : ''}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ---- Recherche et filtres ----
          Des menus déroulants plutôt que des rangées de puces qui glissaient :
          sur téléphone, la moitié des options restait hors écran sans que rien
          ne l'indique. Un select donne la vue d'ensemble en un geste. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-4 sm:p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mp-search" className="sr-only">
            {t.marketplace.searchLabel}
          </Label>
          <div className="relative">
            <Search
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="mp-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.marketplace.searchPlaceholder}
              /* scroll-mt-28 : « Explorer » du menu mobile pointe ici, et le
                 champ se retrouvait masqué par la barre fixe. */
              className="h-11 scroll-mt-28 bg-background pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            value={family}
            onValueChange={(v) => setFamily((v ?? 'all') as FamilyId | 'all')}
            /* Base UI : sans cette table valeur → libellé, le déclencheur
               affichait la valeur brute (« all ») au lieu du libellé. */
            items={[
              { value: 'all', label: t.marketplace.allFamilies },
              ...families.map((f) => ({ value: f.id, label: f.label })),
            ]}
          >
            <SelectTrigger
              aria-label={t.marketplace.familyLabel}
              className="h-11 w-full rounded-xl border-border bg-background data-[size=default]:h-11"
            >
              <Store size={15} className="shrink-0 text-brand" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.marketplace.allFamilies}</SelectItem>
              {families.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {cities.length > 1 ? (
            <Select
              value={city}
              onValueChange={(v) => setCity(v ?? 'all')}
              items={[
                { value: 'all', label: t.marketplace.allCities },
                ...cities.map((c) => ({ value: c, label: c })),
              ]}
            >
              <SelectTrigger
                aria-label={t.marketplace.cityLabel}
                className="h-11 w-full rounded-xl border-border bg-background data-[size=default]:h-11"
              >
                <MapPin size={15} className="shrink-0 text-brand" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.marketplace.allCities}</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {/* Rappel des filtres actifs : chaque pastille se retire d'un geste,
            sans rouvrir le menu. */}
        {filtered ? (
          <div className="flex flex-wrap items-center gap-2">
            {family !== 'all' ? (
              <ActiveFilterChip
                label={families.find((f) => f.id === family)?.label ?? family}
                onRemove={() => setFamily('all')}
              />
            ) : null}
            {city !== 'all' ? (
              <ActiveFilterChip label={city} onRemove={() => setCity('all')} />
            ) : null}
            {query.trim() !== '' ? (
              <ActiveFilterChip
                label={`« ${query.trim()} »`}
                onRemove={() => setQuery('')}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ---- Compteur ---- */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <p
          className="text-[13px] font-semibold text-muted-foreground"
          aria-live="polite"
        >
          {results.length}{' '}
          {results.length === 1
            ? t.marketplace.resultsOne
            : t.marketplace.resultsMany}
        </p>
        {/* Le panneau « aucun résultat » porte déjà son propre bouton : on
            évite d'afficher deux fois la même action. */}
        {filtered && results.length > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="text-[13px] font-semibold text-brand underline-offset-4 hover:underline"
          >
            {t.marketplace.reset}
          </button>
        ) : null}
      </div>

      {/* ---- Grille ---- */}
      {results.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((b, i) => (
            <Reveal key={b.id} variant="up" delay={Math.min(i * 40, 200)}>
              <BusinessCard
                business={b}
                theme={themeFor(b.id)}
                cover={coverFor(b)}
              />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <SearchX size={24} className="text-muted-foreground" aria-hidden="true" />
          <p className="text-[15px] font-semibold">{t.marketplace.empty}</p>
          <p className="text-[13px] text-muted-foreground">
            {t.marketplace.emptyHint}
          </p>
          <Button variant="outline" size="sm" onClick={reset} className="mt-1">
            {t.marketplace.reset}
          </Button>
        </div>
      )}

      {/* ---- Invitation à créer sa page ---- */}
      <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl border border-border bg-foreground px-6 py-8 text-background sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
            {t.marketplace.ctaTitle}
          </h2>
          <p className="mt-1.5 text-pretty text-sm text-background/70">
            {t.marketplace.ctaBody}
          </p>
        </div>
        <Link
          href="/inscription"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-brand text-brand-foreground hover:bg-brand/90',
          )}
        >
          {t.marketplace.ctaButton}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}

/** Pastille de filtre actif — cliquer dessus le retire. */
function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-semibold text-brand-foreground transition-opacity hover:opacity-85"
    >
      {label}
      <X size={12} aria-hidden="true" />
      <span className="sr-only">Retirer ce filtre</span>
    </button>
  )
}
