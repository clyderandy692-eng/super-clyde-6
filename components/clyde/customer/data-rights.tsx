'use client'

/**
 * Droits sur les données, exerçables sans écrire à personne.
 *
 * Une politique de confidentialité qui renvoie à une adresse e-mail est une
 * promesse ; un bouton qui télécharge le dossier et un bouton qui supprime le
 * compte sont des droits. La différence se voit en due diligence, et devant un
 * régulateur.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClyde, useSession } from '@/lib/clyde/store'
import { exportFileName } from '@/lib/clyde/privacy'

export function DataRights() {
  const userId = useSession((s) => s.userId)
  const signOut = useSession((s) => s.signOut)
  const exportUserData = useClyde((s) => s.exportUserData)
  const deleteUserAccount = useClyde((s) => s.deleteUserAccount)
  const router = useRouter()

  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exported, setExported] = useState(false)

  /* Sans session, ces boutons n'auraient aucun sujet : le panneau disparaît
     plutôt que de proposer un droit qu'il ne peut pas exercer. */
  if (!userId) return null

  function download() {
    const dump = exportUserData(userId!)
    if (!dump) return
    /* L'export se fabrique et se télécharge côté client : aucune donnée
       personnelle ne transite par un serveur pour être rendue à son
       propriétaire. */
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportFileName({ id: userId! })
    link.click()
    URL.revokeObjectURL(url)
    setExported(true)
  }

  function remove() {
    const result = deleteUserAccount(userId!)
    if (result.ok) {
      signOut()
      router.push('/')
      return
    }
    setError(
      result.reason === 'owner'
        ? 'Votre compte détient une ou plusieurs vitrines. Transférez-les ou fermez-les d’abord : les supprimer ici laisserait des pages en ligne sans personne pour honorer les commandes.'
        : 'Ce compte est introuvable.',
    )
    setConfirming(false)
  }

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">Vos données</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Ce que nous détenons vous appartient. Emportez-en une copie complète, ou
            fermez votre compte définitivement.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={download} className="justify-start sm:w-auto">
          <Download data-icon="inline-start" />
          Télécharger mes données
        </Button>
        {!confirming ? (
          <Button
            variant="outline"
            onClick={() => {
              setError(null)
              setConfirming(true)
            }}
            className="justify-start text-destructive hover:text-destructive sm:w-auto"
          >
            <Trash2 data-icon="inline-start" />
            Supprimer mon compte
          </Button>
        ) : null}
      </div>

      {exported ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Fichier JSON téléchargé : compte, abonnements avec leur preuve de consentement,
          commandes, réservations et avis.
        </p>
      ) : null}

      {/* La confirmation est explicite et nomme les conséquences : un
          effacement irréversible derrière un simple clic serait un piège. */}
      {confirming ? (
        <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-start gap-2 text-sm font-medium">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <span>
              Cette action est définitive. Vos abonnements et vos avis seront effacés.
              Vos commandes passées seront conservées par les commerçants sans votre nom
              ni votre numéro, car elles font partie de leur comptabilité.
            </span>
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="destructive" onClick={remove} className="sm:w-auto">
              Supprimer définitivement
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} className="sm:w-auto">
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed">
          {error}
        </p>
      ) : null}
    </section>
  )
}
