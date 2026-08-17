'use client'

import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from 'sonner'
import { Award, Download, IdCard, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale, useT } from '@/lib/clyde/i18n'
import { useClyde } from '@/lib/clyde/store'
import { engineerId, engineerPost } from '@/lib/clyde/factory'
import { bi, findCourseById } from '@/lib/clyde/formation'
import { revelationTitle } from '@/lib/clyde/revelation'
import type { Business } from '@/lib/clyde/types'
import { cn } from '@/lib/utils'

/* Couleur de marque de l'Usine, en hex : les PDF ne lisent pas les jetons
   CSS. Elle doit rester alignée sur `--brand` dans globals.css. */
const BRAND_HEX = '#E05E10'

/**
 * Les papiers d'ingénieur — Carte et Certificat de Fondation.
 *
 * Les deux documents sont composés côté client : le QR est rendu dans un
 * canvas hors écran, jsPDF est importé à la demande. Aucun serveur, aucune
 * dépendance ajoutée au chargement du tableau de bord.
 *
 * `variant` distingue deux moments qui n'ont pas la même intensité :
 * - `ritual` : juste après la première publication, dans la Révélation. C'est
 *   la remise des papiers, elle mérite d'être appuyée.
 * - `panel` : plus tard, quand l'ingénieur revient réimprimer sa carte parce
 *   que celle affichée en boutique est abîmée. Là, on veut un rangement
 *   discret, pas une cérémonie répétée.
 */
export function EngineerPapers({
  business,
  variant = 'panel',
  className,
}: {
  business: Business
  variant?: 'ritual' | 'panel'
  className?: string
}) {
  const t = useT()
  const { locale } = useLocale()
  const users = useClyde((s) => s.users)
  const certificates = useClyde((s) => s.certificates)
  /* Lu ici plutôt que reçu en prop : le composant est monté à deux endroits, et
     un `published` transmis à la main finirait par diverger de l'état réel. */
  const published = useClyde(
    (s) => s.pages.find((p) => p.business_id === business.id)?.published ?? false,
  )
  const stage = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'card' | 'certificate' | null>(null)
  const a = t.factory.artifacts

  const owner = users.find((u) => u.id === business.owner_id)
  const post = engineerPost(business.category, locale)
  const matricule = engineerId(business.id)
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR'
  const since = new Date(business.created_at).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  /* Les formations achevées par cette page. Le registre garde le fait et sa
     date ; le titre du cours est relu depuis le catalogue, ce qui évite de
     dupliquer un libellé traduit dans les données. */
  const formations = certificates
    .filter((c) => c.business_id === business.id && c.type === 'formation')
    .map((c) => ({
      id: c.id,
      grantedAt: c.granted_at,
      course: c.related_course_id
        ? findCourseById(c.related_course_id)
        : undefined,
    }))
    .filter((c) => c.course)

  const publicUrl = () => {
    const origin =
      typeof window === 'undefined' ? 'https://clyde.app' : window.location.origin
    return `${origin}/r/${business.slug}`
  }

  const download = async (kind: 'card' | 'certificate') => {
    setBusy(kind)
    try {
      /* Imports différés : jspdf pèse quelques centaines de kilo-octets, il
         n'a rien à faire dans le paquet initial du tableau de bord. */
      const [pdf, exportUtils] = await Promise.all([
        import('@/lib/clyde/pdf'),
        import('@/lib/clyde/export'),
      ])
      const url = publicUrl()

      const doc =
        kind === 'card'
          ? pdf.buildEngineerCard({
              engineerName: owner?.name ?? business.name,
              businessName: business.name,
              post,
              revelationTitle: revelationTitle(business.category, locale),
              engineerId: matricule,
              since,
              url,
              /* Le canvas hors écran est déjà monté : sans image, la carte
                 perdrait sa seule fonction utile en boutique. */
              qrDataUrl: (
                stage.current?.querySelector('canvas') as HTMLCanvasElement
              ).toDataURL('image/png'),
              brand: BRAND_HEX,
              labels: {
                institution: t.factory.cardLabels.institution,
                document: t.factory.cardLabels.document,
                postLabel: t.factory.cardLabels.post,
                titleLabel: t.factory.cardLabels.title,
                idLabel: t.factory.cardLabels.id,
                sinceLabel: t.factory.cardLabels.since,
                qrHint: t.factory.cardLabels.qrHint,
                footer: t.factory.cardLabels.footer,
              },
            })
          : pdf.buildFoundationCertificate({
              businessName: business.name,
              engineerName: owner?.name ?? business.name,
              post,
              engineerId: matricule,
              date: since,
              url,
              brand: BRAND_HEX,
              labels: {
                institution: t.factory.certificateLabels.institution,
                document: t.factory.certificateLabels.document,
                awarded: t.factory.certificateLabels.awarded,
                statement: t.factory.certificateLabels.statement,
                postLabel: t.factory.certificateLabels.post,
                idLabel: t.factory.certificateLabels.id,
                dateLabel: t.factory.certificateLabels.date,
                signature: t.factory.certificateLabels.signature,
              },
            })

      exportUtils.downloadBlob(
        doc.output('blob'),
        `${exportUtils.safeFilename(
          business.slug,
          kind === 'card' ? 'carte-ingenieur' : 'certificat-fondation',
        )}.pdf`,
      )
      toast.success(a.ready)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      className={cn(
        variant === 'ritual'
          ? 'flex flex-col gap-3'
          : 'rounded-2xl border border-border bg-background p-5',
        className,
      )}
    >
      {variant === 'panel' && (
        <header className="pb-4">
          <h2 className="text-base font-semibold">{a.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {/* « Deux documents délivrés par l'Usine » serait faux tant que la
                page est en brouillon : ils ne sont pas encore délivrés. */}
            {published ? a.body : a.locked}
          </p>
          {/* Le matricule est le détail qui rend le monde crédible : il est
              stable, donc on peut l'afficher sans crainte. */}
          <p className="mt-3 font-mono text-[11px] tracking-wide text-muted-foreground">
            {post} · {matricule}
          </p>
        </header>
      )}

      {/* Chaque document porte SA description.

          Les deux phrases étaient auparavant concaténées en un seul paragraphe
          sous les boutons : on lisait « ... et le QR de votre page. Atteste la
          publication ... » d'une traite, sans savoir laquelle parlait de quoi.
          En mode rituel on garde les seuls boutons — le contexte est déjà donné
          par la modale. */}
      {/* Les papiers de fondation n'existent qu'une fois la page en ligne. Le
          panneau peut désormais s'ouvrir pour une formation achevée alors que
          la page est encore en brouillon : sans cette condition, il proposerait
          un « Certificat de Fondation » attestant une publication qui n'a pas
          eu lieu. */}
      {published && (
      <div
        className={cn(
          'grid gap-2',
          variant === 'panel' ? 'sm:grid-cols-2' : 'sm:grid-cols-2',
        )}
      >
        <div className="flex flex-col gap-2">
          <Button
            variant={variant === 'ritual' ? 'default' : 'outline'}
            className="justify-start"
            disabled={busy !== null}
            onClick={() => download('card')}
          >
            <IdCard className="size-4" aria-hidden="true" />
            <span className="min-w-0 truncate">{a.card}</span>
            <Download className="ml-auto size-4 shrink-0" aria-hidden="true" />
          </Button>
          {variant === 'panel' && (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {a.cardHint}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="justify-start"
            disabled={busy !== null}
            onClick={() => download('certificate')}
          >
            <ScrollText className="size-4" aria-hidden="true" />
            <span className="min-w-0 truncate">{a.certificate}</span>
            <Download className="ml-auto size-4 shrink-0" aria-hidden="true" />
          </Button>
          {variant === 'panel' && (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {a.certificateHint}
            </p>
          )}
        </div>
      </div>
      )}

      {/* Le registre des formations. Affiché seulement en mode panneau et
          seulement s'il y a quelque chose à montrer : une rubrique vide
          donnerait l'impression d'une fonctionnalité en panne. Le rituel de
          publication, lui, ne parle que des deux documents de fondation. */}
      {variant === 'panel' && formations.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">{a.formationsTitle}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {formations.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
              >
                <span className="inline-flex items-center gap-2 text-sm">
                  <Award
                    className="size-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  {bi(item.course!.title, locale)}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {new Date(item.grantedAt).toLocaleDateString(dateLocale, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Le QR est rendu hors écran, à taille d'impression : un canvas de
          88 px agrandi dans le PDF donne un code baveux, illisible au scan. */}
      <div
        ref={stage}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-[-9999px]"
      >
        <QRCodeCanvas value={publicUrl()} size={512} level="M" marginSize={1} />
      </div>
    </section>
  )
}
