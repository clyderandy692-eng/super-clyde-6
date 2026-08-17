'use client'

import { useEffect, useState } from 'react'
import { useTradeWords } from '@/lib/clyde/i18n'
import { useClyde, useClydeReady, useSession } from '@/lib/clyde/store'
import { CATEGORY_MAP } from '@/lib/clyde/taxonomy'
import { getPlan } from '@/lib/clyde/plans'
import {
  deferredBonusDays,
  isTrialActive,
  ownerPlan,
  pageQuota,
  trialDaysLeft,
} from '@/lib/clyde/rewards'
import { DEMO_ACTIVE_BUSINESS_ID } from '@/lib/clyde/demo-data'

/**
 * Le rendu serveur ne connaît pas la session : elle vit dans le stockage
 * local du navigateur. On attend donc le premier rendu client avant de
 * décider quoi que ce soit, sinon le tableau de bord renverrait vers la
 * connexion le temps d'une image à chaque chargement.
 *
 * zustand/persist restaure l'état de façon synchrone à la création du store,
 * si bien qu'au montage la session est déjà disponible.
 */
export function useSessionReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return ready
}

/**
 * Rassemble tout ce dont une section du tableau de bord a besoin : le commerce
 * actif, son vocabulaire métier (« Menu » / « Table » pour un restaurant,
 * « Chambre » pour un hôtel) et les limites de son offre.
 */
export function useOwnerContext() {
  /* `ready` gouverne les redirections du tableau de bord, il doit donc
     attendre DEUX choses : le montage client (pour la session) et la
     réhydratation de `useClyde`, qui est en `skipHydration`.

     Avec le seul montage, la garde tranchait sur les données de démonstration :
     le commerce du propriétaire n'existait pas encore, `business` valait
     `null`, et tout commerçant qui rechargeait son tableau de bord était
     renvoyé à l'onboarding — alors que sa page était publiée. */
  const mounted = useSessionReady()
  const storeReady = useClydeReady()
  const ready = mounted && storeReady
  const userId = useSession((s) => s.userId)
  const activeBusinessId = useSession((s) => s.activeBusinessId)

  const businesses = useClyde((s) => s.businesses)
  const pages = useClyde((s) => s.pages)
  const subscriptions = useClyde((s) => s.subscriptions)
  const trialBonuses = useClyde((s) => s.trialBonuses)

  /* Les commerces du propriétaire connecté, pour le sélecteur d'établissement. */
  const owned = businesses.filter((b) => b.owner_id === userId)
  const demoBusiness = businesses.find((b) => b.id === DEMO_ACTIVE_BUSINESS_ID) ?? null
  const demoMode = !userId && !!demoBusiness
  const business =
    owned.find((b) => b.id === activeBusinessId) ?? owned[0] ?? (demoMode ? demoBusiness : null)

  const page = business
    ? (pages.find((p) => p.business_id === business.id) ?? null)
    : null

  /* L'abonnement se lit sur le COMPTE, pas sur la page : c'est lui qui ouvre
     le droit de créer plusieurs pages. En mode démonstration sans session, on
     retombe sur le propriétaire de la page affichée, sinon le tableau
     annoncerait un plan gratuit sur une page Pro. */
  const planOwnerId = userId ?? business?.owner_id ?? null
  const subscription = planOwnerId
    ? (subscriptions.find((s) => s.owner_id === planOwnerId) ?? null)
    : null

  const plan = getPlan(ownerPlan(planOwnerId, subscriptions))

  /* Quota de pages du compte, pour l'écran Abonnement et le sélecteur. */
  const quota = pageQuota(planOwnerId, businesses, subscriptions)

  /* Récompenses de la page affichée : essai restant, jours en réserve. */
  const ownBonuses = business
    ? trialBonuses.filter((b) => b.business_id === business.id)
    : []
  const trialLeft = business ? trialDaysLeft(business, ownBonuses) : 0
  const trialActive = business ? isTrialActive(business, ownBonuses) : false
  const deferredDays = deferredBonusDays(ownBonuses)
  const category = business ? CATEGORY_MAP[business.category] : null

  /* Le vocabulaire métier suit la langue choisie : sans cela, un propriétaire
     en anglais lisait « Table » et « Chambres » au milieu de son tableau. */
  const tradeWords = useTradeWords()
  const words = tradeWords(business?.category ?? 'autre')

  return {
    ready,
    userId,
    demoMode,
    owned,
    business,
    page,
    subscription,
    plan,
    /** Compte qui porte l'abonnement — cible de `setPlan`. */
    planOwnerId,
    /** Pages utilisées et autorisées par le plan du compte. */
    quota,
    /** Jours d'essai restants sur la page affichée, 0 si l'essai est fini. */
    trialLeft,
    trialActive,
    /** Jours gagnés en réserve, applicables au retour au plan gratuit. */
    deferredDays,
    category,
    /** « Menu », « Carte », « Catalogue »… selon le métier et la langue. */
    catalogWord: words.catalog,
    /** « Table », « Chambre »… au singulier. */
    locationWord: words.location,
    /** Pluriel fourni par le dictionnaire : « Bureaux », pas « Bureaus ». */
    locationWordPlural: words.locationPlural,
  }
}
