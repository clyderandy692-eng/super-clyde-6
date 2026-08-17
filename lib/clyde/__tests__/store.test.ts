/**
 * Règles métier du store — parrainage, consentement, effacement.
 *
 * Le store est un singleton persistant : chaque test remet l'état aux graines
 * de démonstration pour ne pas dépendre de l'ordre d'exécution.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { useClyde } from '../store'
import { DEMO_BUSINESSES, DEMO_USERS } from '../demo-data'

const initial = useClyde.getState()

beforeEach(() => {
  useClyde.setState({
    users: [...DEMO_USERS],
    businesses: [...DEMO_BUSINESSES],
    followers: [],
    trialBonuses: [],
    referrals: [],
    orders: [...initial.orders],
    bookings: [...initial.bookings],
    reviews: [...initial.reviews],
    teamMembers: [...initial.teamMembers],
    abandonedCarts: [...initial.abandonedCarts],
    postComments: [...initial.postComments],
  })
})

const business = DEMO_BUSINESSES[0]
const customer = DEMO_USERS.find((u) => u.role === 'customer')!

describe('abonnement et consentement', () => {
  it('enregistre la date ET le texte accepté', () => {
    /* La conformité tient à ces deux champs : sans eux, on ne peut pas
       démontrer ce que la personne a accepté. */
    useClyde.getState().toggleFollow(business.id, customer.id)
    const follower = useClyde.getState().followers[0]
    expect(follower.consent_at).toBeTruthy()
    expect(follower.consent_notice).toBe(business.follower_data_notice)
    expect(follower.consent_source).toBe('page')
  })

  it('fige une COPIE du texte : la réécrire ne change pas la preuve', () => {
    /* Le point essentiel. Si la preuve renvoyait au commerce, un commerçant
       pourrait réécrire après coup ce que ses abonnés ont accepté. */
    useClyde.getState().toggleFollow(business.id, customer.id)
    const before = useClyde.getState().followers[0].consent_notice
    useClyde.setState((s) => ({
      businesses: s.businesses.map((b) =>
        b.id === business.id ? { ...b, follower_data_notice: 'Texte réécrit après coup' } : b,
      ),
    }))
    expect(useClyde.getState().followers[0].consent_notice).toBe(before)
  })

  it('se désabonne sans laisser de trace', () => {
    const store = useClyde.getState()
    expect(store.toggleFollow(business.id, customer.id)).toBe(true)
    expect(useClyde.getState().toggleFollow(business.id, customer.id)).toBe(false)
    expect(useClyde.getState().followers).toHaveLength(0)
  })

  it('n’inscrit pas deux fois la même personne', () => {
    useClyde.getState().toggleFollow(business.id, customer.id)
    useClyde.getState().toggleFollow(business.id, customer.id)
    useClyde.getState().toggleFollow(business.id, customer.id)
    expect(useClyde.getState().followers).toHaveLength(1)
  })
})

describe('droit d’accès et de portabilité', () => {
  it('rassemble le dossier complet d’une personne', () => {
    useClyde.getState().toggleFollow(business.id, customer.id)
    const dump = useClyde.getState().exportUserData(customer.id)
    expect(dump).not.toBeNull()
    expect(dump!.account.id).toBe(customer.id)
    expect(dump!.subscriptions).toHaveLength(1)
    /* Le nom du commerce, pas son identifiant : un export illisible ne
       satisfait pas le droit d'accès. */
    expect(dump!.subscriptions[0].business_name).toBe(business.name)
    expect(dump!.generated_at).toBeTruthy()
  })

  it('renvoie null pour un inconnu, sans lever d’erreur', () => {
    expect(useClyde.getState().exportUserData('us_inexistant')).toBeNull()
  })
})

describe('droit à l’effacement', () => {
  it('supprime le compte et ses abonnements', () => {
    useClyde.getState().toggleFollow(business.id, customer.id)
    const result = useClyde.getState().deleteUserAccount(customer.id)
    expect(result.ok).toBe(true)
    expect(useClyde.getState().users.find((u) => u.id === customer.id)).toBeUndefined()
    expect(useClyde.getState().followers).toHaveLength(0)
  })

  it('anonymise les commandes au lieu de les détruire', () => {
    /* Une commande est aussi la pièce comptable du commerçant : elle reste,
       privée de l'identité du client. */
    const order = { ...useClyde.getState().orders[0], customer_id: customer.id }
    useClyde.setState({ orders: [order] })
    useClyde.getState().deleteUserAccount(customer.id)
    const after = useClyde.getState().orders[0]
    expect(after).toBeTruthy()
    expect(after.customer_id).toBeNull()
    expect(after.customer_phone).toBe('')
    expect(after.total_estimate).toBe(order.total_estimate)
  })

  it('refuse d’effacer un propriétaire, avec un motif explicite', () => {
    /* Effacer un propriétaire laisserait des vitrines en ligne sans personne
       pour honorer les commandes. Le refus doit être motivé, pas muet. */
    const result = useClyde.getState().deleteUserAccount(business.owner_id)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('owner')
    expect(useClyde.getState().users.find((u) => u.id === business.owner_id)).toBeTruthy()
  })

  it('signale un compte inconnu', () => {
    expect(useClyde.getState().deleteUserAccount('us_inexistant')).toEqual({
      ok: false,
      reason: 'unknown',
    })
  })
})

describe('paliers d’abonnés, vus du store', () => {
  it('n’accorde le bonus du palier qu’une fois, malgré les appels répétés', () => {
    /* `checkFollowerMilestones` est appelé à CHAQUE abonnement. C'est le
       scénario réel de la double récompense. */
    for (let i = 0; i < 21; i++) {
      useClyde.getState().toggleFollow(business.id, `us_visiteur_${i}`)
    }
    useClyde.getState().checkFollowerMilestones(business.id)
    useClyde.getState().checkFollowerMilestones(business.id)
    const milestoneBonuses = useClyde
      .getState()
      .trialBonuses.filter(
        (b) => b.business_id === business.id && b.related_milestone === 20,
      )
    expect(milestoneBonuses).toHaveLength(1)
  })
})
