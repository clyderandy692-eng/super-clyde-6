'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/lib/clyde/i18n'

export function Counter({
  to,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 1600,
  className,
}: {
  to: number
  suffix?: string
  prefix?: string
  decimals?: number
  duration?: number
  className?: string
}) {
  const { locale } = useLocale()
  const ref = useRef<HTMLSpanElement>(null)
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const run = () => {
      if (started.current) return
      started.current = true
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setValue(to)
        return
      }
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(to * eased)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [to, duration])

  /* Le séparateur de milliers change avec la langue : « 2 481 » en français,
     « 2,481 » en anglais. Une locale figée trahit la bascule. */
  const formatted = value.toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
