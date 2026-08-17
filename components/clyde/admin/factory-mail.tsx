'use client'

import { useMemo } from 'react'
import { Mailbox, UsersRound, Phone, Mail } from 'lucide-react'
import { useClyde, useClydeReady } from '@/lib/clyde/store'
import { whatsappLink } from '@/lib/clyde/whatsapp'
import type { AdminMessage } from '@/lib/clyde/types'

/**
 * Le courrier de l'Usine, côté administration.
 *
 * Sans cet écran, les messages envoyés depuis le tableau de bord s'écriraient
 * dans le magasin sans que personne ne les lise : un formulaire qui promet une
 * réponse doit avoir un destinataire réel, sinon la promesse est fausse.
 *
 * La liste des membres de l'équipe est affichée à côté, parce que la première
 * question que se pose l'administration devant un message est « qui est-ce ? ».
 */

const LIBELLES_SUJET: Record<AdminMessage['topic'], string> = {
  idee: 'Idée',
  probleme: 'Problème',
  aide: 'Demande d’aide',
  autre: 'Autre',
}

const LIBELLES_SOURCE: Record<string, string> = {
  landing: 'Page d’accueil',
  forum: 'Forum',
  'page-creee': 'Après création de page',
  'tableau-de-bord': 'Tableau de bord',
}

function dateCourte(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminFactoryMail() {
  /* Sans cette demande, l'écran afficherait une boîte vide alors que des
     messages sont enregistrés — le défaut déjà rencontré sur les avis. */
  useClydeReady()
  const messages = useClyde((s) => s.adminMessages)
  const members = useClyde((s) => s.teamMembers)
  const markRead = useClyde((s) => s.markAdminMessageRead)

  /* Les non-lus d'abord : c'est ce qui demande une action. À date égale, le plus
     récent en tête. */
  const tries = useMemo(
    () =>
      [...messages].sort((a, b) => {
        if (!a.read_at !== !b.read_at) return a.read_at ? 1 : -1
        return b.created_at.localeCompare(a.created_at)
      }),
    [messages],
  )

  const nonLus = messages.filter((m) => m.read_at === null).length

  return (
    <section
      id="courrier"
      className="scroll-mt-20 rounded-2xl border border-border bg-background p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Mailbox className="size-5 text-muted-foreground" aria-hidden="true" />
          Courrier de l’Usine
          {/* Le compteur ne s'affiche que s'il demande quelque chose : un « 0 »
              permanent perd sa force d'alerte. */}
          {nonLus > 0 ? (
            <span className="rounded-full border border-brand bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
              {nonLus} non lu{nonLus > 1 ? 's' : ''}
            </span>
          ) : null}
        </h2>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <UsersRound className="size-4" aria-hidden="true" />
          {members.length} membre{members.length > 1 ? 's' : ''} dans l’équipe de
          développement
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* --- Les messages --- */}
        <div className="flex flex-col gap-3">
          {tries.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Aucun message pour l’instant. Les commerçants écrivent à l’Usine
              depuis leur tableau de bord.
            </p>
          ) : (
            tries.map((m) => (
              <article
                key={m.id}
                className={`flex flex-col gap-2 rounded-xl border p-4 ${
                  m.read_at === null
                    ? 'border-brand/50 bg-brand/[0.03]'
                    : 'border-border'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase">
                      {LIBELLES_SUJET[m.topic]}
                    </span>
                    <span className="text-sm font-semibold">{m.sender_name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateCourte(m.created_at)}
                  </span>
                </div>

                <p className="text-pretty text-sm leading-relaxed whitespace-pre-line">
                  {m.body}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Répondre est à un clic : l'administration lit et répond dans
                      le même geste, sinon le message reste lu et sans réponse. */}
                  {m.whatsapp ? (
                    <a
                      href={whatsappLink(m.whatsapp, `Bonjour ${m.sender_name}, l’Usine CLYDE vous répond.`)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      {m.whatsapp}
                    </a>
                  ) : null}
                  {m.email ? (
                    <a
                      href={`mailto:${m.email}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
                    >
                      <Mail className="size-3.5" aria-hidden="true" />
                      {m.email}
                    </a>
                  ) : null}
                  {m.read_at === null ? (
                    <button
                      type="button"
                      onClick={() => markRead({ messageId: m.id })}
                      className="ml-auto inline-flex items-center justify-center rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                    >
                      Marquer comme lu
                    </button>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Lu le {dateCourte(m.read_at)}
                    </span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {/* --- L'équipe de développement --- */}
        <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
          <h3 className="text-sm font-bold">Équipe de développement</h3>
          {members.length === 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Personne encore. Les inscriptions arrivent du Forum, du tableau de
              bord et de l’écran qui suit la création d’une page.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {members.slice(0, 12).map((m) => (
                <li key={m.id} className="flex flex-col gap-0.5 py-2.5">
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.whatsapp}
                    {m.email ? ` · ${m.email}` : ''}
                  </span>
                  {/* La provenance est affichée : c'est elle qui dira lequel des
                      trois emplacements recrute vraiment, et lequel ne sert à
                      rien. Sans elle, on n'en jugerait que par intuition. */}
                  <span className="text-[11px] text-muted-foreground">
                    {LIBELLES_SOURCE[m.source] ?? m.source} ·{' '}
                    {dateCourte(m.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
