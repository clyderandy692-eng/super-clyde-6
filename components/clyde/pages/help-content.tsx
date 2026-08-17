'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { PageHeader } from '@/components/clyde/pages/page-shell'
import { useT } from '@/lib/clyde/i18n'

export function HelpContent() {
  const t = useT()
  return (
    <>
      <PageHeader
        badge={t.help.badge}
        title={t.help.title}
        subtitle={t.help.subtitle}
      />

      <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
        {/* Base UI : une seule question ouverte à la fois. */}
        <Accordion multiple={false} className="w-full">
          {t.help.faq.map((item, i) => (
            <AccordionItem key={i} value={`q-${i}`}>
              <AccordionTrigger className="text-left text-[15px] font-semibold">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-pretty text-[14px] leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl border border-border bg-secondary/40 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] font-semibold">{t.help.stillStuck}</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-[14px] font-bold text-brand underline-offset-4 hover:underline"
          >
            {t.help.contactCta}
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </>
  )
}
