'use client'

import {
  ArrowUpRight,
  Check,
  MessageCircle,
  MousePointer2,
  Printer,
  QrCode,
  TrendingUp,
  X,
} from 'lucide-react'
import { Reveal } from '@/components/clyde/reveal'
import { useT } from '@/lib/clyde/i18n'
import { cn } from '@/lib/utils'

function Card({
  children,
  className,
  delay = 0,
  variant = 'up',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  variant?: 'up' | 'left' | 'right' | 'scale'
}) {
  return (
    <Reveal variant={variant} delay={delay} className={className}>
      <div className="group flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-background p-5 transition-all duration-300 hover:border-input hover:shadow-[0_20px_50px_-24px] hover:shadow-foreground/22">
        {children}
      </div>
    </Reveal>
  )
}

function Head({
  kicker,
  title,
  body,
}: {
  kicker: string
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-brand uppercase">
        {kicker}
      </span>
      <h3 className="text-balance text-lg leading-tight font-bold tracking-[-0.015em]">
        {title}
      </h3>
      <p className="text-pretty text-[13px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  )
}

/* ---- Aperçu 1 : l'éditeur en cours d'édition ---- */
function EditorPreview() {
  const t = useT()
  /* Le troisième bloc est celui « en cours d'édition » dans la maquette. */
  const activeIndex = 2
  return (
    <div className="clyde-mock relative mt-auto flex overflow-hidden rounded-xl border border-border">
      <div className="w-[42%] shrink-0 border-r border-border bg-muted/45 p-2.5">
        <p className="mb-2 text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
          {t.bento.editorStructure}
        </p>
        <div className="flex flex-col gap-1">
          {t.bento.editorBlocks.map((label, i) => {
            const active = i === activeIndex
            return (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[8.5px] font-medium',
                  active
                    ? 'bg-brand text-brand-foreground'
                    : 'bg-card text-foreground/75',
                )}
              >
                <span
                  className={cn(
                    'size-1 shrink-0 rounded-full',
                    active ? 'bg-brand-foreground' : 'bg-brand',
                  )}
                />
                <span className="truncate">{label}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
        <p className="text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
          {t.bento.editorSettings}
        </p>
        {t.bento.editorRows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between rounded-md bg-muted/60 px-1.5 py-1 text-[8.5px]"
          >
            <span className="text-muted-foreground">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
        <div className="mt-0.5 flex items-center gap-1">
          {['#FF6B35', '#1C1917', '#FAFAF8'].map((c, i) => (
            <span
              key={c}
              className={cn(
                'size-3.5 rounded-full border',
                i === 0 ? 'border-foreground' : 'border-border',
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <MousePointer2
        size={14}
        className="absolute bottom-8 left-[38%] fill-foreground text-background drop-shadow"
      />
    </div>
  )
}

/* ---- Aperçu 2 : le message WhatsApp pré-rempli ---- */
function WhatsappPreview() {
  const t = useT()
  return (
    <div className="clyde-mock mt-auto flex flex-col gap-2 rounded-xl border border-border bg-muted/35 p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-success/15 text-success">
          <MessageCircle size={12} />
        </span>
        <div className="leading-none">
          <p className="text-[9px] font-bold">Le Bastos</p>
          <p className="text-[8px] text-muted-foreground">{t.bento.waOnline}</p>
        </div>
      </div>
      <div className="ml-auto max-w-[86%] rounded-xl rounded-br-sm bg-success/12 p-2.5">
        <p className="text-[8.5px] leading-relaxed font-medium">
          {t.bento.waMessage} <b>{t.bento.waTable}</b>
          <br />
          2× Poulet DG — 9 000 XAF
          <br />
          1× Jus de gingembre — 1 000 XAF
          <br />
          <span className="font-bold">{t.bento.waTotal}</span>
          <br />
          Aïcha M. · 6 99 12 34 56
        </p>
        <p className="mt-1 text-right text-[7.5px] text-muted-foreground">
          {t.bento.waReady}
        </p>
      </div>
      <p className="text-[8px] leading-snug text-muted-foreground">
        {t.bento.waNote}
      </p>
    </div>
  )
}

/* ---- Aperçu 3 : feuille de QR codes ---- */
function QrSheetPreview() {
  const t = useT()
  const labels = t.bento.qrLabels
  return (
    <div className="clyde-mock mt-auto rounded-xl border border-border p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
          {t.bento.qrSheet}
        </p>
        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[8px] font-semibold">
          <Printer size={9} /> PDF
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {labels.map((l) => (
          <div
            key={l}
            className="flex flex-col items-center gap-1 rounded-md border border-border bg-card py-2"
          >
            <QrCode size={18} className="text-foreground" />
            <span className="text-[7.5px] font-semibold">{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- Aperçu 4 : la journée du commerçant, sans CLYDE puis avec ----

   Remplace l'ancien graphique « Analytics » que personne ne comprenait :
   des barres et un compteur de vues ne parlent pas à un restaurateur.
   Une comparaison ligne à ligne de SA journée, si. Les couleurs restent
   dans les jetons du thème : destructive pour l'avant, success pour
   l'après — deux couleurs que tout le monde lit sans légende. */
function BeforeAfterPreview() {
  const t = useT()
  return (
    <div className="mt-auto grid gap-2 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 rounded-xl border border-destructive/25 bg-destructive/6 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-destructive uppercase">
          <X size={11} strokeWidth={3} aria-hidden="true" />
          {t.bento.beforeTitle}
        </p>
        {t.bento.beforeAfter.map((pair) => (
          <p
            key={pair.before}
            className="flex items-start gap-1.5 text-[12px] leading-snug text-foreground/75"
          >
            <X size={11} strokeWidth={3} className="mt-0.5 shrink-0 text-destructive/70" aria-hidden="true" />
            {pair.before}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 rounded-xl border border-success/25 bg-success/8 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-success uppercase">
          <TrendingUp size={11} aria-hidden="true" />
          {t.bento.afterTitle}
        </p>
        {t.bento.beforeAfter.map((pair) => (
          <p
            key={pair.after}
            className="flex items-start gap-1.5 text-[12px] font-medium leading-snug"
          >
            <Check size={11} strokeWidth={3} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            {pair.after}
          </p>
        ))}
      </div>
    </div>
  )
}

export function LandingBento() {
  const t = useT()
  /* Ancre « fonctionnalites » et non « modules » : cet identifiant était en
     double avec la section Modules plus bas, donc les liens du pied de page
     retombaient toujours sur la première des deux. */
  return (
    <section id="fonctionnalites" className="px-5 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <Reveal variant="up">
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] font-bold tracking-[0.3em] text-brand uppercase">
              {t.bento.kicker}
            </span>
            <h2 className="max-w-2xl text-balance text-3xl leading-[1.05] font-bold tracking-[-0.025em] sm:text-[2.75rem]">
              {t.bento.title}
            </h2>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {/* Grande carte : le builder */}
          <Card className="lg:col-span-2 lg:row-span-1" delay={60} variant="left">
            <Head {...t.bento.builder} />
            <EditorPreview />
          </Card>

          {/* WhatsApp */}
          <Card delay={120} variant="right">
            <Head {...t.bento.orders} />
            <WhatsappPreview />
          </Card>

          {/* QR */}
          <Card delay={140} variant="left">
            <Head {...t.bento.qr} />
            <QrSheetPreview />
          </Card>

          {/* Avant / Après — la carte qui répond à la seule vraie question du
              commerçant : « qu'est-ce que ça change pour MOI ? ». Chaque ligne
              met la même situation face à face, sans CLYDE puis avec. */}
          <Card className="lg:col-span-2" delay={180} variant="right">
            <Head {...t.bento.analytics} />
            <BeforeAfterPreview />
          </Card>
        </div>

        <Reveal variant="up" delay={220}>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-secondary/50 px-5 py-4">
            {t.bento.strip.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 text-[13px] font-medium"
              >
                <Check size={14} className="shrink-0 text-brand" />
                {item}
              </span>
            ))}
            <a
              href="#tarifs"
              className="ml-auto inline-flex items-center gap-1 text-[13px] font-bold text-brand"
            >
              {t.bento.seePricing} <ArrowUpRight size={14} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
