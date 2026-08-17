/**
 * Règles de récompense — les invariants que le code documente le plus
 * soigneusement, et que rien ne vérifiait.
 *
 * Ces tests ne décrivent pas l'implémentation mais la PROMESSE : un palier ne
 * récompense qu'une fois, un essai ne s'allonge pas indéfiniment, un quota ne
 * se contourne pas. Ce sont exactement les règles qu'un remaniement casse sans
 * bruit, parce qu'elles ne se voient pas à l'écran.
 */

import { describe, expect, it } from 'vitest'
import {
  BASE_TRIAL_DAYS,
  activeBonusDays,
  deferredBonusDays,
  followersToNextMilestone,
  isTrialActive,
  nextMilestone,
  pageQuota,
  ownerPlan,
  pendingMilestones,
  trialDaysLeft,
} from '../rewards'
import type { Business, Subscription, TrialBonus } from '../types'

function bonus(over: Partial<TrialBonus> = {}): TrialBonus {
  return {
    id: 'tb_1',
    business_id: 'bu_1',
    reason: 'follower_milestone',
    days: 7,
    related_business_id: null,
    related_milestone: null,
    deferred: false,
    granted_at: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('paliers d’abonnés — idempotence', () => {
  it('récompense un palier franchi', () => {
    expect(pendingMilestones(20, [])).toContain(20)
  })

  it('ne récompense JAMAIS deux fois le même palier', () => {
    /* Le cœur du sujet : `checkFollowerMilestones` est appelé à chaque
       abonnement. Sans cette garde, 25 abonnés = 5 récompenses pour le seul
       palier de 20, et l'essai devient infini. */
    const already = [bonus({ related_milestone: 20 })]
    expect(pendingMilestones(20, already)).not.toContain(20)
    expect(pendingMilestones(25, already)).toEqual([])
  })

  it('rattrape plusieurs paliers franchis d’un coup', () => {
    /* Un partage viral peut faire passer de 0 à 100 abonnés entre deux visites.
       Ne donner que le dernier palier volerait les précédents. */
    const pending = pendingMilestones(60, [])
    expect(pending.length).toBeGreaterThan(1)
    expect(Math.max(...pending)).toBeLessThanOrEqual(60)
  })

  it('n’accorde aucun palier non atteint', () => {
    expect(pendingMilestones(19, [])).toEqual([])
  })

  it('annonce le palier suivant, et rien après le dernier', () => {
    expect(nextMilestone(0)).toBe(20)
    expect(followersToNextMilestone(15)).toBe(5)
    expect(nextMilestone(100000)).toBeNull()
    expect(followersToNextMilestone(100000)).toBeNull()
  })
})

/* Les 35 jours d'ouverture ne sont pas un implicite du calcul : ils sont une
   LIGNE de bonus comme les autres. C'est ce qui rend l'essai auditable ligne à
   ligne — et ce que ces tests doivent donc fournir explicitement. */
const baseTrial = bonus({ id: 'tb_base', reason: 'base_trial', days: BASE_TRIAL_DAYS })

describe('jours d’essai', () => {
  it('sépare les jours actifs des jours mis en réserve', () => {
    /* Un bonus gagné en étant déjà payant ne doit pas gonfler l'essai courant,
       mais ne doit pas être perdu non plus. */
    const list = [bonus({ days: 10 }), bonus({ id: 'tb_2', days: 30, deferred: true })]
    expect(activeBonusDays(list)).toBe(10)
    expect(deferredBonusDays(list)).toBe(30)
  })

  it('décompte les jours restants depuis la création', () => {
    const business = { created_at: '2026-01-01T00:00:00.000Z' } as Business
    const left = trialDaysLeft(business, [baseTrial], new Date('2026-01-11T00:00:00.000Z'))
    /* 35 jours de base moins les 10 écoulés. */
    expect(left).toBe(BASE_TRIAL_DAYS - 10)
  })

  it('clôt l’essai une fois le terme passé', () => {
    const business = { created_at: '2026-01-01T00:00:00.000Z' } as Business
    const late = new Date('2026-06-01T00:00:00.000Z')
    expect(isTrialActive(business, [baseTrial], late)).toBe(false)
    expect(trialDaysLeft(business, [baseTrial], late)).toBe(0)
  })

  it('prolonge l’essai des bonus actifs, jamais des différés', () => {
    const business = { created_at: '2026-01-01T00:00:00.000Z' } as Business
    /* Après les 35 jours de base : seuls les bonus peuvent encore prolonger. */
    const at = new Date('2026-02-20T00:00:00.000Z')
    const withActive = trialDaysLeft(business, [baseTrial, bonus({ days: 30 })], at)
    const withDeferred = trialDaysLeft(
      business,
      [baseTrial, bonus({ days: 30, deferred: true })],
      at,
    )
    expect(withActive).toBeGreaterThan(withDeferred)
  })
})

describe('quota de pages', () => {
  const owner = 'us_1'
  function biz(ownerId: string): Pick<Business, 'owner_id'> {
    return { owner_id: ownerId }
  }
  function sub(plan: Subscription['plan']): Pick<Subscription, 'owner_id' | 'plan' | 'status'> {
    return { owner_id: owner, plan, status: 'active' }
  }

  it('limite le plan gratuit à une seule page', () => {
    const quota = pageQuota(owner, [biz(owner)], [])
    expect(quota.used).toBe(1)
    expect(quota.limit).toBe(1)
    expect(quota.reached).toBe(true)
  })

  it('ouvre trois pages au plan Pro', () => {
    const quota = pageQuota(owner, [biz(owner)], [sub('pro')])
    expect(quota.reached).toBe(false)
    expect(
      pageQuota(owner, [biz(owner), biz(owner), biz(owner)], [sub('pro')]).reached,
    ).toBe(true)
  })

  it('ne compte que les pages du propriétaire concerné', () => {
    /* Les vitrines des autres ne consomment pas mon quota — l'oubli d'un
       filtre par propriétaire bloquerait tout le monde dès la première page
       créée sur la plateforme. */
    const quota = pageQuota(owner, [biz('us_autre'), biz('us_encore')], [])
    expect(quota.used).toBe(0)
    expect(quota.reached).toBe(false)
  })

  it('refuse la création sans compte', () => {
    /* Sans compte, aucune page n'est comptée et le plan retombe au gratuit. */
    expect(pageQuota(null, [], []).used).toBe(0)
    expect(pageQuota(null, [], []).plan).toBe('free')
    expect(ownerPlan(null, [])).toBe('free')
  })

  it('ignore un abonnement résilié', () => {
    /* Un plan Pro annulé qui continuerait d'ouvrir trois pages serait une
       fuite de revenu silencieuse. */
    const cancelled = { owner_id: owner, plan: 'pro' as const, status: 'cancelled' as const }
    expect(ownerPlan(owner, [cancelled])).toBe('free')
  })
})
