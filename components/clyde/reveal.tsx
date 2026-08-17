'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    /** Posé par `REVEAL_SCRIPT` dès l'analyse du HTML. Voir `lib/clyde/reveal-script.ts`. */
    __clydeRevealBoot?: boolean
  }
}

/**
 * Filet de secours pour les animations d'entrée.
 *
 * Le travail est fait par `REVEAL_SCRIPT`, injecté dans le `<head>` : il agit
 * dès l'analyse du HTML, sans attendre l'hydratation. Ce composant ne sert plus
 * qu'au cas où ce script n'a pas pu s'exécuter (erreur d'analyse, extension qui
 * bloque les scripts en ligne, politique de sécurité stricte). Sans ce garde,
 * deux observateurs suivraient les mêmes nœuds pour rien.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.__clydeRevealBoot) return

    /* Même convention que le script d'amorçage : on marque avec l'attribut
       `data-in`, jamais avec une classe. React réécrit `className` à chaque
       rendu de ces nœuds et emporterait la classe avec lui, laissant le bloc
       invisible sans moyen de revenir. */
    const show = (node: Element) => node.setAttribute('data-in', '1')

    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach(show)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show(entry.target)
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    const revealNode = (node: Element) => {
      if (node.hasAttribute('data-in')) return
      const rect = node.getBoundingClientRect()
      // Les blocs nouvellement rendus (par exemple après un changement de
      // langue) doivent suivre exactement le même chemin que ceux du premier
      // rendu, y compris s'ils sont déjà visibles dans le viewport.
      if (rect.top < window.innerHeight * 0.92) {
        requestAnimationFrame(() => show(node))
      } else {
        observer.observe(node)
      }
    }

    const revealAll = () => {
      document.querySelectorAll('[data-reveal]').forEach(revealNode)
    }

    revealAll()

    // Le changement FR/EN remplace les cartes et leurs clés. Observer les
    // nouveaux nœuds évite qu'un bloc traduit reste invisible après le switch.
    const mutations = new MutationObserver((entries) => {
      for (const mutation of entries) {
        for (const addedNode of mutation.addedNodes) {
          if (addedNode.nodeType !== Node.ELEMENT_NODE) continue
          const element = addedNode as Element
          if (element.matches('[data-reveal]')) revealNode(element)
          element.querySelectorAll('[data-reveal]').forEach(revealNode)
        }
      }
    })
    mutations.observe(document.body, { childList: true, subtree: true })

    /* Filet de sécurité : au bout de 2,5 s, tout bloc encore masqué est
       révélé d'office, y compris ceux ajoutés par une mise à jour de locale. */
    const failsafe = window.setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not([data-in])').forEach(show)
    }, 2500)

    return () => {
      window.clearTimeout(failsafe)
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])

  return null
}

type RevealProps = {
  children: React.ReactNode
  as?: 'div' | 'section' | 'li' | 'span' | 'article' | 'header' | 'h1' | 'p'
  /* `priority` : pour le contenu visible sans défiler (titre du hero et ce qui
     l'accompagne). Il glisse mais reste lisible dès le premier rendu, pour ne
     pas retarder le LCP d'un fondu. */
  variant?: 'up' | 'blur' | 'scale' | 'left' | 'right' | 'tilt' | 'priority'
  delay?: number
  className?: string
  style?: React.CSSProperties
  id?: string
}

export function Reveal({
  children,
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  className,
  style,
  id,
}: RevealProps) {
  return (
    <Tag
      id={id}
      data-reveal={variant}
      className={className}
      style={{ ['--reveal-delay' as string]: `${delay}ms`, ...style }}
      /* Ce nœud est marqué `data-in` par le script d'amorçage AVANT l'hydratation
         — c'est tout l'intérêt : le contenu apparaît sans attendre React. React
         compare alors le DOM reçu à ce qu'il a rendu, trouve un attribut de plus
         et le signale comme une incohérence. Ici l'écart est voulu et connu,
         donc on le déclare tel quel plutôt que de laisser une erreur permanente
         en console — qui finirait par masquer les vraies. */
      suppressHydrationWarning
    >
      {children}
    </Tag>
  )
}

/**
 * Enveloppe une liste d'éléments et applique un délai croissant à chacun,
 * pour une entrée en cascade sans avoir à calculer les délais à la main.
 */
export function RevealGroup({
  children,
  as: Tag = 'div',
  variant = 'up',
  stagger = 80,
  initialDelay = 0,
  className,
  style,
  id,
}: Omit<RevealProps, 'delay'> & { stagger?: number; initialDelay?: number }) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <Tag id={id} className={className} style={style}>
      {items.flat().map((child, i) =>
        child == null || child === false ? null : (
          <div
            key={i}
            data-reveal={variant}
            style={
              {
                '--reveal-delay': `${initialDelay + i * stagger}ms`,
              } as React.CSSProperties
            }
            /* Même raison que dans `Reveal` : `data-in` est posé avant
               l'hydratation, l'écart est intentionnel. */
            suppressHydrationWarning
          >
            {child}
          </div>
        ),
      )}
    </Tag>
  )
}
