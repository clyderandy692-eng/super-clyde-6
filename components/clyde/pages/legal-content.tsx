'use client'

import { AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/clyde/pages/page-shell'
import { useT } from '@/lib/clyde/i18n'

/**
 * Rend la politique de confidentialité ou les conditions à partir du
 * dictionnaire, les deux pages ayant exactement la même structure.
 *
 * L'avertissement en tête est délibérément visible : ce texte est un modèle
 * qu'aucun juriste n'a relu, et le publier tel quel serait un risque pour le
 * commerçant comme pour ses clients.
 */
export function LegalContent({ doc }: { doc: 'privacy' | 'terms' }) {
  const t = useT()
  const content = t.legal[doc]

  return (
    <>
      <PageHeader
        badge={content.badge}
        title={content.title}
        subtitle={content.intro}
      />

      <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning/10 p-4">
          <AlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-warning"
            aria-hidden="true"
          />
          <p className="text-[13px] leading-relaxed font-medium">
            {t.legal.templateWarning}
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-9">
          {content.sections.map((s) => (
            <section key={s.h} className="flex flex-col gap-2">
              <h2 className="text-[17px] font-bold tracking-tight">{s.h}</h2>
              <p className="text-pretty text-[14.5px] leading-relaxed text-muted-foreground">
                {s.p}
              </p>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
