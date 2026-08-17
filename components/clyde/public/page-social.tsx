'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Heart,
  Link as LinkIcon,
  LoaderCircle,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/lib/clyde/i18n'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import type { Business, PageTheme } from '@/lib/clyde/types'

/**
 * Logo d'un réseau, servi depuis `public/brands` (source : theSVG.org).
 *
 * Les marques ont quitté Lucide : on utilise les vrais logos plutôt que des
 * pictogrammes approchants, qu'un visiteur reconnaîtrait mal. Ils sont décoratifs,
 * le libellé de la tuile portant déjà le nom.
 */
function BrandMark({ src }: { src: string }) {
  return <img src={src} alt="" aria-hidden="true" className="size-5" />
}

/**
 * Destination de partage.
 *
 * La couleur du réseau n'est qu'une pastille derrière l'icône : elle rend la
 * cible reconnaissable d'un coup d'œil sans imposer un aplat de marque
 * étrangère à la palette de la boutique.
 */
function ShareTile({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  tone: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 text-left text-[13px] font-semibold transition-colors hover:border-input hover:bg-secondary/60"
    >
      <span
        className="grid size-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `${tone}1f`, color: tone }}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

/**
 * Abonnement et partage d'une page publique.
 *
 * Les deux actions vivent ensemble parce qu'elles répondent à la même
 * intention : garder la boutique sous la main. L'abonnement suppose un compte,
 * mais un client venu de WhatsApp n'ira pas remplir une inscription complète —
 * on ouvre donc un formulaire de trois champs, puis on suit la page dans le
 * même geste.
 */
export function PageSocial({
  business,
  theme,
  offsetTop = false,
  hideButtons = false,
}: {
  business: Business
  theme: PageTheme
  /** Vrai quand la bannière de table QR occupe le haut de page. */
  offsetTop?: boolean
  /**
   * Vrai quand le bloc couverture affiche déjà « S'abonner » et « Partager »
   * dans sa bande profil : la même paire flottait alors en double en haut de
   * page. Les boutons disparaissent mais le composant reste monté — il porte
   * l'écouteur `clyde:follow-request` et les dialogues d'abonnement et de
   * partage dont les boutons du bloc dépendent pour les visiteurs sans compte.
   */
  hideButtons?: boolean
}) {
  const t = useT()
  const followers = useClyde((s) => s.followers)
  const toggleFollow = useClyde((s) => s.toggleFollow)
  const userId = useSession((s) => s.userId)
  const signUpWithEmail = useSession((s) => s.signUpWithEmail)

  /* Session et abonnements viennent du stockage local : avant réhydratation le
     rendu serveur ne connaît personne, et afficher « Abonné » créerait un
     écart d'hydratation. */
  const ready = useClydeReady()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  /* Message de confirmation de la surcouche : la copie doit se voir, un toast
     fugace passerait inaperçu au milieu d'un choix de réseau. */
  const [notice, setNotice] = useState<string | null>(null)
  /* Message « témoin » : le seul moment de lore accordé au client. Affiché
     une fois à l'abonnement, disparaît seul, ne revient jamais. */
  const [witness, setWitness] = useState<string | null>(null)
  useEffect(() => {
    if (!witness) return
    const id = window.setTimeout(() => setWitness(null), 5000)
    return () => window.clearTimeout(id)
  }, [witness])
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '' })
  const [error, setError] = useState<string | null>(null)

  const following = useMemo(
    () =>
      ready && userId
        ? followers.some(
            (f) => f.business_id === business.id && f.user_id === userId,
          )
        : false,
    [followers, business.id, userId, ready],
  )
  /* Compteur masqué avant réhydratation, pour la même raison. */
  const count = ready
    ? followers.filter((f) => f.business_id === business.id).length
    : 0

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  /* Le bouton « S'abonner » de la couverture délègue ici quand le visiteur n'a
     pas de compte : un seul dialogue d'inscription pour toute la page, au lieu
     d'un doublon dans chaque bloc. preventDefault() signale au bloc héros que
     la demande est prise en charge. */
  useEffect(() => {
    function onFollowRequest(e: Event) {
      e.preventDefault()
      setDialogOpen(true)
    }
    window.addEventListener('clyde:follow-request', onFollowRequest)
    return () => window.removeEventListener('clyde:follow-request', onFollowRequest)
  }, [])

  /**
   * Lien partagé : l'adresse propre de la boutique.
   *
   * On repart du slug plutôt que de `window.location.href`, qui traînerait le
   * `?table=` d'un QR code : envoyer ce lien à un ami l'assiérait à votre
   * table. Absolu, car il finit dans WhatsApp ou une story.
   */
  const [shareUrl, setShareUrl] = useState('')
  useEffect(() => {
    setShareUrl(`${window.location.origin}/r/${business.slug}`)
  }, [business.slug])

  /**
   * Copie le lien, et renvoie l'issue.
   *
   * `navigator.clipboard` exige un contexte sécurisé et peut être refusé : on
   * retombe alors sur une sélection de texte masquée, seul moyen fiable de ne
   * pas laisser le visiteur sans lien.
   */
  async function copyLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(shareUrl)
      return true
    } catch {
      try {
        const field = document.createElement('textarea')
        field.value = shareUrl
        field.setAttribute('readonly', '')
        field.className = 'sr-only'
        document.body.append(field)
        field.select()
        const ok = document.execCommand('copy')
        field.remove()
        return ok
      } catch {
        return false
      }
    }
  }

  async function handleCopy() {
    const ok = await copyLink()
    setCopied(ok)
    if (ok) setNotice(t.marketplace.shareCopied)
  }

  /**
   * Instagram n'expose aucune URL de partage web : impossible de préremplir une
   * story depuis un navigateur. On copie donc le lien et on l'annonce, plutôt
   * que d'ouvrir un onglet qui ne ferait rien.
   */
  async function handleInstagram() {
    const ok = await copyLink()
    setCopied(ok)
    setNotice(ok ? t.marketplace.shareInstagramNote : null)
  }

  function openShareWindow(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
    setShareOpen(false)
  }

  function handleFollow() {
    if (!userId) {
      setDialogOpen(true)
      return
    }
    /* Le rôle du client dans le monde CLYDE est volontairement discret : un
       seul message ponctuel au moment de l'abonnement, jamais de badge
       permanent — quelqu'un qui veut commander n'a pas de temps pour du
       lore. Le message n'apparaît qu'à l'abonnement, pas au désabonnement. */
    const wasFollowing = following
    toggleFollow(business.id, userId)
    if (!wasFollowing) {
      setWitness(`Vous êtes désormais témoin de ${business.name}.`)
    }
  }

  function handleSignUp() {
    const name = form.name.trim()
    const email = form.email.trim()
    const whatsapp = form.whatsapp.trim()
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || whatsapp.length < 6) {
      setError(t.marketplace.followInvalid)
      return
    }
    setPending(true)
    const result = signUpWithEmail({ email, name, whatsapp, role: 'customer' })
    setPending(false)
    if (!result.ok || !result.userId) {
      setError(result.error ?? t.marketplace.followInvalid)
      return
    }
    /* On enchaîne l'abonnement : le visiteur a cliqué « S'abonner », pas
       « créer un compte ». */
    toggleFollow(business.id, result.userId)
    setWitness(`Vous êtes désormais témoin de ${business.name}.`)
    setError(null)
    setDialogOpen(false)
    setForm({ name: '', email: '', whatsapp: '' })
  }

  const surface = `${theme.background}e8`
  const border = `${theme.ink}22`

  return (
    <>
      <div
        className={cn(
          'fixed right-3 z-50 flex items-center gap-1.5 sm:right-4 sm:gap-2',
          offsetTop ? 'top-12' : 'top-3 sm:top-4',
        )}
      >
        {!hideButtons && (
          <>
            <button
              type="button"
              onClick={() => {
                setNotice(null)
                setShareOpen(true)
              }}
              className="inline-flex size-9 items-center justify-center rounded-full border text-[11px] font-semibold shadow-md backdrop-blur transition-transform active:scale-95 sm:h-10 sm:w-auto sm:gap-2 sm:px-3.5 sm:text-[13px]"
              style={{ background: surface, borderColor: border, color: theme.ink }}
            >
              <Share2 size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{t.marketplace.share}</span>
            </button>

            <button
              type="button"
              onClick={handleFollow}
              aria-pressed={following}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold shadow-md backdrop-blur transition-transform active:scale-95 sm:h-10 sm:gap-2 sm:px-3.5 sm:text-[13px]"
              style={
                following
                  ? { background: surface, borderColor: border, color: theme.ink }
                  : {
                      background: theme.brand,
                      borderColor: theme.brand,
                      color: theme.background,
                    }
              }
            >
              <Heart
                size={15}
                aria-hidden="true"
                fill={following ? 'currentColor' : 'none'}
              />
              <span>{following ? t.marketplace.following : t.marketplace.follow}</span>
              {business.followers_public && count > 0 ? (
                <span className="font-mono text-[11px] opacity-70">{count}</span>
              ) : null}
            </button>
          </>
        )}

        {witness ? (
          <p
            role="status"
            className="absolute top-full right-0 mt-2 w-max max-w-[78vw] rounded-full border px-3.5 py-2 text-[12px] font-semibold shadow-lg backdrop-blur"
            style={{ background: surface, borderColor: border, color: theme.ink }}
          >
            {witness}
          </p>
        ) : null}
      </div>

      {/* Surcouche de partage : quatre destinations explicites plutôt qu'une
          feuille système qui varie d'un téléphone à l'autre. */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-96">
          <DialogHeader>
            <DialogTitle>{t.marketplace.shareTitle}</DialogTitle>
            <DialogDescription>{t.marketplace.shareBody}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2.5">
            <ShareTile
              label={t.marketplace.shareWhatsapp}
              icon={<BrandMark src="/brands/whatsapp.svg" />}
              tone="#25D366"
              onClick={() =>
                openShareWindow(
                  `https://wa.me/?text=${encodeURIComponent(`${business.name} — ${shareUrl}`)}`,
                )
              }
            />
            <ShareTile
              label={t.marketplace.shareFacebook}
              icon={<BrandMark src="/brands/facebook.svg" />}
              tone="#1877F2"
              onClick={() =>
                openShareWindow(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                )
              }
            />
            <ShareTile
              label={t.marketplace.shareInstagram}
              icon={<BrandMark src="/brands/instagram.svg" />}
              tone="#E1306C"
              onClick={handleInstagram}
            />
            <ShareTile
              label={copied ? t.marketplace.shareCopied : t.marketplace.shareCopy}
              icon={
                copied ? (
                  <Check className="size-5" aria-hidden="true" />
                ) : (
                  <LinkIcon className="size-5" aria-hidden="true" />
                )
              }
              tone={theme.brand}
              onClick={handleCopy}
            />
          </div>

          {/* Le lien reste lisible : sur un navigateur qui refuse le
              presse-papier, le visiteur peut encore le recopier. */}
          <p className="truncate rounded-lg bg-secondary px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
            {shareUrl}
          </p>

          {notice ? (
            <p role="status" className="text-[13px] font-medium text-foreground">
              {notice}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle>{t.marketplace.followTitle}</DialogTitle>
            <DialogDescription>{t.marketplace.followBody}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="follow-name">{t.marketplace.followName}</Label>
              <Input
                id="follow-name"
                value={form.name}
                autoComplete="name"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="follow-email">{t.marketplace.followEmail}</Label>
              <Input
                id="follow-email"
                type="email"
                inputMode="email"
                value={form.email}
                autoComplete="email"
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="follow-whatsapp">
                {t.marketplace.followWhatsapp}
              </Label>
              <Input
                id="follow-whatsapp"
                type="tel"
                inputMode="tel"
                value={form.whatsapp}
                autoComplete="tel"
                onChange={(e) =>
                  setForm((f) => ({ ...f, whatsapp: e.target.value }))
                }
              />
            </div>
            {error ? (
              <p role="alert" className="text-[13px] font-medium text-destructive">
                {error}
              </p>
            ) : null}
            {business.follower_data_notice ? (
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                {business.follower_data_notice}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              {t.marketplace.followCancel}
            </Button>
            <Button onClick={handleSignUp} disabled={pending}>
              {pending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Heart aria-hidden="true" />
              )}
              {t.marketplace.followSubmit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
