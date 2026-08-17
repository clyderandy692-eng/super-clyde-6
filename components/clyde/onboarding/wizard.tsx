'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Loader2,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Backdrop } from '@/components/clyde/backdrop'
import { CategoryIcon } from '@/components/clyde/category-icon'
import { ClydeWordmark } from '@/components/clyde/mark'
import { PageRenderer } from '@/components/clyde/page/renderer'
import { createTemplate, DEFAULT_THEME } from '@/lib/clyde/blocks'
import { consumePendingReferral } from '@/lib/clyde/rewards'
import { cardSurface } from '@/lib/clyde/theme'
import {
  CATEGORY_MAP,
  CURRENCIES,
  FAMILIES,
  FONT_CHOICES,
  categoriesByFamily,
  palettesFor,
  type FamilyId,
} from '@/lib/clyde/taxonomy'
import { useClyde, useSession } from '@/lib/clyde/store'
import { slugify } from '@/lib/clyde/text'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  BusinessCategory,
  Currency,
  FontChoice,
  PageTheme,
  SurfaceStyle,
} from '@/lib/clyde/types'

const STEPS = [
  'Métier',
  'Activité',
  'Identité',
  'Contact',
  'Modules',
  'Apparence',
] as const

export function OnboardingWizard() {
  const router = useRouter()
  const createBusiness = useClyde((s) => s.createBusiness)
  const updateTheme = useClyde((s) => s.updateTheme)
  const businesses = useClyde((s) => s.businesses)
  const userId = useSession((s) => s.userId)
  const setActiveBusiness = useSession((s) => s.setActiveBusiness)

  const [step, setStep] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [family, setFamily] = useState<FamilyId | null>(null)
  const [category, setCategory] = useState<BusinessCategory | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [description, setDescription] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currency, setCurrency] = useState<Currency>('XAF')
  const [moduleLocations, setModuleLocations] = useState(false)
  const [moduleBooking, setModuleBooking] = useState(false)
  const [paletteId, setPaletteId] = useState('clyde')
  const [font, setFont] = useState<FontChoice>('kanit')
  const [surface, setSurface] = useState<SurfaceStyle>('plain')

  const meta = category ? CATEGORY_MAP[category] : null
  const palettes = useMemo(
    () => palettesFor(family ?? 'commerce'),
    [family],
  )
  const palette = palettes.find((p) => p.id === paletteId) ?? palettes[0]

  const theme: PageTheme = {
    ...DEFAULT_THEME,
    brand: palette.brand,
    background: palette.background,
    ink: palette.ink,
    font,
    surface,
  }

  const effectiveSlug = slugTouched ? slug : slugify(name)

  /* Aperçu : le template se recompose à chaque changement de réglage. */
  const previewBlocks = useMemo(() => {
    if (!category || !meta) return []
    return createTemplate(category, meta.family, {
      booking: moduleBooking,
      businessName: name.trim() || 'Votre commerce',
    })
  }, [category, meta, moduleBooking, name])

  const previewBusiness = useMemo(
    () => ({
      id: 'preview',
      owner_id: userId ?? 'preview',
      slug: effectiveSlug || 'votre-page',
      name: name.trim() || 'Votre commerce',
      category: (category ?? 'boutique') as BusinessCategory,
      whatsapp_number: whatsapp || '+237600000000',
      description: description || null,
      currency,
      followers_public: true,
      listed_in_marketplace: true,
      follower_data_notice: '',
      module_locations: moduleLocations,
      module_booking: moduleBooking,
      city: city || null,
      neighborhood: neighborhood || null,
      cover_url: null,
      logo_url: null,
      /* Aperçu seulement : le vrai code est attribué à la création de la page,
         une fois son unicité vérifiée sur l'ensemble des commerces. */
      referral_code: 'PREVIEW',
      created_at: new Date().toISOString(),
    }),
    [
      userId,
      effectiveSlug,
      name,
      category,
      whatsapp,
      description,
      currency,
      moduleLocations,
      moduleBooking,
      city,
      neighborhood,
    ],
  )

  function pickFamily(id: FamilyId) {
    setFamily(id)
    setCategory(null)
    const firstFit = palettesFor(id)[0]
    if (firstFit) setPaletteId(firstFit.id)
    setStep(1)
  }

  function pickCategory(id: BusinessCategory) {
    setCategory(id)
    const suggests = CATEGORY_MAP[id].suggests
    setModuleLocations(suggests.locations)
    setModuleBooking(suggests.booking)
    setStep(2)
  }

  function validateStep(): string | null {
    if (step === 2) {
      if (name.trim().length < 2) return 'Indiquez le nom de votre commerce.'
      if (effectiveSlug.length < 3)
        return 'L’adresse de la page est trop courte.'
      if (businesses.some((b) => b.slug === effectiveSlug))
        return 'Cette adresse est déjà prise. Modifiez-la.'
    }
    if (step === 3) {
      if (whatsapp.trim().replace(/\D/g, '').length < 8)
        return 'Le numéro WhatsApp est trop court.'
    }
    return null
  }

  function next() {
    const problem = validateStep()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function finish() {
    if (!category) return
    /* Sans session on ne peut rattacher la page à personne : on renvoie
       vers la connexion plutôt que d'échouer sans rien dire. */
    if (!userId) {
      toast.error('Connectez-vous pour enregistrer votre page.')
      router.push('/connexion')
      return
    }
    setPending(true)
    const id = createBusiness({
      ownerId: userId,
      name: name.trim(),
      slug: effectiveSlug,
      category,
      currency,
      whatsapp: whatsapp.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      description: description.trim(),
      moduleLocations,
      moduleBooking,
      referralCode: consumePendingReferral(),
    })
    /* `createBusiness` refuse la création quand le quota du plan est atteint.
       Le wizard doit le dire et renvoyer vers les tarifs : laisser passer un
       `null` planterait sur `updateTheme` avec un message incompréhensible. */
    if (!id) {
      setPending(false)
      toast.error(
        'Votre plan ne permet pas de créer une page supplémentaire. Choisissez une offre plus large pour continuer.',
      )
      /* Les tarifs sont une section de la page d'accueil (`#tarifs`), pas une
         route : `/tarifs` aurait donné un 404. */
      router.push('/#tarifs')
      return
    }
    updateTheme(id, theme)
    setActiveBusiness(id)
    toast.success('Votre page est prête.')
    router.push('/tableau-de-bord')
  }

  /* Les deux premières étapes exigent un choix ; les suivantes sont
     validées au clic sur « Continuer » par validateStep(). */
  const canAdvance =
    step === 0 ? Boolean(family) : step === 1 ? Boolean(category) : true

  return (
    <main className="relative min-h-dvh lg:grid lg:grid-cols-[1fr_420px]">
      {/* Papier millimétré, comme l'accueil : ici on dessine littéralement sa
          boutique. La promesse faite sur la page d'accueil se tient à cet
          endroit, le support est donc le même. */}
      <Backdrop pattern="blueprint" />
      {/* ---------------- Colonne des réglages ---------------- */}
      <div className="relative z-10 flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Link href="/">
            <ClydeWordmark accent="bg-brand" />
          </Link>
          <p className="text-xs font-medium text-muted-foreground">
            Étape {step + 1} sur {STEPS.length}
          </p>
        </header>

        {/* Progression */}
        <ol className="mt-6 flex gap-1.5" aria-label="Progression">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1">
              <span className="sr-only">{label}</span>
              <span
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'block h-1 rounded-full transition-colors',
                  i <= step ? 'bg-brand' : 'bg-border',
                )}
              />
            </li>
          ))}
        </ol>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="w-full max-w-xl">
            {step === 0 && (
              <StepBlock
                title="Quel est votre métier ?"
                hint="Cela nous permet de préparer une page adaptée. Vous pourrez tout modifier ensuite."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {FAMILIES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => pickFamily(f.id)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-colors hover:border-brand hover:bg-secondary',
                        family === f.id
                          ? 'border-brand bg-brand/5'
                          : 'border-input',
                      )}
                    >
                      <span className="block text-sm font-semibold">
                        {f.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {f.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              </StepBlock>
            )}

            {step === 1 && family && (
              <StepBlock
                title="Précisez votre activité"
                hint="Nous pré-remplissons votre page et cochons les modules utiles."
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {categoriesByFamily(family).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickCategory(c.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:border-brand hover:bg-secondary',
                        category === c.id
                          ? 'border-brand bg-brand/5'
                          : 'border-input',
                      )}
                    >
                      <CategoryIcon
                        category={c.id}
                        className="size-4 shrink-0 text-brand"
                      />
                      <span className="text-sm font-medium">{c.label}</span>
                    </button>
                  ))}
                </div>
              </StepBlock>
            )}

            {step === 2 && (
              <StepBlock
                title="Comment s’appelle votre commerce ?"
                hint="Ce nom apparaîtra en haut de votre page et dans les résultats de recherche."
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="biz-name">Nom du commerce</Label>
                    <Input
                      id="biz-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Le Bastos"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="biz-slug">Adresse de votre page</Label>
                    <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-input focus-within:ring-2 focus-within:ring-ring">
                      <span className="shrink-0 bg-secondary px-3 py-2 text-sm text-muted-foreground">
                        clyde.app/r/
                      </span>
                      <input
                        id="biz-slug"
                        value={effectiveSlug}
                        onChange={(e) => {
                          setSlugTouched(true)
                          setSlug(slugify(e.target.value))
                        }}
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                        placeholder="votre-commerce"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="biz-city">Ville</Label>
                      <Input
                        id="biz-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Yaoundé"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="biz-hood">Quartier</Label>
                      <Input
                        id="biz-hood"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Bastos"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="biz-desc">
                      En une phrase, que proposez-vous ?
                    </Label>
                    <Textarea
                      id="biz-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Cuisine camerounaise généreuse, à emporter ou sur place."
                      rows={3}
                    />
                  </div>
                </div>
              </StepBlock>
            )}

            {step === 3 && (
              <StepBlock
                title="Où recevez-vous les commandes ?"
                hint="Chaque commande arrive sur ce numéro WhatsApp, déjà mise en forme."
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="biz-wa">Numéro WhatsApp</Label>
                    <Input
                      id="biz-wa"
                      type="tel"
                      inputMode="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+237 6 90 11 22 33"
                      required
                    />
                  </div>

                  <fieldset className="flex flex-col gap-3">
                    <legend className="text-sm font-medium">
                      Devise affichée
                    </legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCurrency(c.id)}
                          className={cn(
                            'rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-brand',
                            currency === c.id
                              ? 'border-brand bg-brand/5'
                              : 'border-input',
                          )}
                        >
                          <span className="block text-sm font-semibold">
                            {c.symbol}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {c.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </StepBlock>
            )}

            {step === 4 && meta && (
              <StepBlock
                title="Activez ce dont vous avez besoin"
                hint="Nous avons pré-coché ce qui correspond à votre activité. Tout reste modifiable plus tard."
              >
                <div className="flex flex-col gap-3">
                  <ModuleCard
                    icon={MapPin}
                    title={`${meta.locationWord}s et QR codes`}
                    description={`Un QR par ${meta.locationWord.toLowerCase()} : le client scanne, commande, et vous savez d’où vient la commande.`}
                    active={moduleLocations}
                    onToggle={() => setModuleLocations((v) => !v)}
                  />
                  <ModuleCard
                    icon={CalendarClock}
                    title="Réservations et rendez-vous"
                    description="Vos clients réservent un créneau depuis votre page, selon vos horaires."
                    active={moduleBooking}
                    onToggle={() => setModuleBooking((v) => !v)}
                  />
                </div>
              </StepBlock>
            )}

            {step === 5 && (
              <StepBlock
                title="Choisissez votre style"
                hint="L’aperçu se met à jour immédiatement. Vous affinerez tout dans l’éditeur."
              >
                <div className="flex flex-col gap-6">
                  <fieldset className="flex flex-col gap-3">
                    <legend className="text-sm font-medium">Palette</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {palettes.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPaletteId(p.id)}
                          aria-pressed={paletteId === p.id}
                          className={cn(
                            'flex flex-col gap-2 rounded-lg border p-2.5 transition-colors',
                            paletteId === p.id
                              ? 'border-brand'
                              : 'border-input hover:border-brand/50',
                          )}
                        >
                          <span
                            className="h-8 w-full rounded"
                            style={{
                              background: `linear-gradient(120deg, ${p.brand} 55%, ${p.background} 55%)`,
                            }}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col gap-3">
                    <legend className="text-sm font-medium">Matière</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {SURFACE_CHOICES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSurface(s.id)}
                          aria-pressed={surface === s.id}
                          className={cn(
                            'flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors',
                            surface === s.id
                              ? 'border-brand'
                              : 'border-input hover:border-brand/50',
                          )}
                        >
                          <SurfaceSwatch
                            surface={s.id}
                            brand={palette.brand}
                            background={palette.background}
                            ink={palette.ink}
                          />
                          <span className="text-xs font-medium">{s.label}</span>
                          <span className="text-[11px] leading-snug text-muted-foreground">
                            {s.mood}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col gap-3">
                    <legend className="text-sm font-medium">Typographie</legend>
                    <div className="flex flex-col gap-2">
                      {FONT_CHOICES.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFont(f.id)}
                          aria-pressed={font === f.id}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                            font === f.id
                              ? 'border-brand bg-brand/5'
                              : 'border-input hover:border-brand/50',
                          )}
                        >
                          <span
                            className="text-base font-semibold"
                            style={{ fontFamily: f.stack }}
                          >
                            {f.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {f.mood}
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </StepBlock>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center gap-3">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setError(null)
                    setStep((s) => Math.max(0, s - 1))
                  }}
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Retour
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={next}
                  disabled={!canAdvance}
                  className="ml-auto"
                >
                  Continuer
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={finish}
                  disabled={pending}
                  className="ml-auto"
                >
                  {pending && (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  )}
                  Créer ma page
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Aperçu en direct ---------------- */}
      <aside className="sticky top-0 hidden h-dvh flex-col items-center justify-center border-l border-border bg-secondary/40 px-8 lg:flex">
        <p className="mb-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Aperçu en direct
        </p>
        <div className="w-[300px] rounded-[2.4rem] border-[7px] border-foreground bg-foreground shadow-2xl">
          <div className="relative h-[580px] overflow-hidden rounded-[1.9rem]">
            {previewBlocks.length > 0 ? (
              <div className="h-full overflow-y-auto clyde-no-scrollbar">
                <PageRenderer
                  business={previewBusiness}
                  products={[]}
                  availability={[]}
                  theme={theme}
                  blocks={previewBlocks}
                  device="mobile"
                  interactive={false}
                />
              </div>
            ) : (
              <div className="grid h-full place-items-center bg-background px-8 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Choisissez votre métier : votre page apparaît ici.
                </p>
              </div>
            )}
          </div>
        </div>
        <p className="mt-5 max-w-[300px] text-center text-xs leading-relaxed text-muted-foreground">
          Votre page est déjà remplie. Vous n&apos;aurez jamais un écran vide à
          construire de zéro.
        </p>
      </aside>
    </main>
  )
}

const SURFACE_CHOICES: {
  id: SurfaceStyle
  label: string
  mood: string
}[] = [
  { id: 'plain', label: 'Aplat', mood: 'Sobre et lisible' },
  { id: 'glass', label: 'Verre dépoli', mood: 'Translucide, moderne' },
  { id: 'cartoon', label: 'Contour marqué', mood: 'Franc et joyeux' },
]

/**
 * Échantillon de matière.
 *
 * Il applique réellement `cardSurface`, la même fonction que le rendu de la
 * page : un aperçu peint à la main finirait par mentir dès qu'on touche au
 * thème.
 */
function SurfaceSwatch({
  surface,
  brand,
  background,
  ink,
}: {
  surface: SurfaceStyle
  brand: string
  background: string
  ink: string
}) {
  const fake: PageTheme = {
    ...DEFAULT_THEME,
    brand,
    background,
    ink,
    surface,
  }
  return (
    <span
      className="relative grid h-14 w-full place-items-center overflow-hidden rounded"
      style={{
        background:
          surface === 'glass'
            ? `radial-gradient(90% 120% at 15% 0%, ${brand} 0%, ${background} 70%)`
            : background,
      }}
      aria-hidden="true"
    >
      <span
        className="grid h-8 w-[70%] place-items-center"
        style={{ ...cardSurface(fake, { radius: '0.375rem' }), color: ink }}
      >
        <span
          className="h-2 w-8 rounded-full"
          style={{ background: brand }}
        />
      </span>
    </span>
  )
}

function StepBlock({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
        {hint}
      </p>
      <div className="mt-7">{children}</div>
    </div>
  )
}

function ModuleCard({
  icon: Icon,
  title,
  description,
  active,
  onToggle,
}: {
  icon: React.ElementType
  title: string
  description: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'flex items-start gap-4 rounded-xl border p-4 text-left transition-colors',
        active ? 'border-brand bg-brand/5' : 'border-input hover:border-brand/50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg',
          active ? 'bg-brand text-brand-foreground' : 'bg-secondary',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border',
          active ? 'border-brand bg-brand' : 'border-input',
        )}
        aria-hidden="true"
      >
        {active && (
          <Check className="size-3 text-brand-foreground" strokeWidth={3} />
        )}
      </span>
    </button>
  )
}
