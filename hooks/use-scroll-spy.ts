'use client'

import { useEffect, useState } from 'react'

const SECTION_IDS = [
  'overview',
  'itinerary',
  'included',
  'map',
  'photos',
  'price',
  'ratings',
  'host',
  'contact',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export const TRIP_SECTION_IDS = SECTION_IDS

/**
 * useScrollSpy
 *
 * Watches a fixed set of section ids and returns the id of the section
 * currently anchored at the top of the viewport. Used by all three
 * theme navs to highlight the active block as the visitor scrolls.
 *
 * Implementation:
 *   - IntersectionObserver fires when a section's visibility changes.
 *   - rootMargin '-80px 0px -60% 0px' biases the active band to the
 *     top third of the viewport, accounting for sticky owner chrome
 *     (header + action bar ≈ 80px combined).
 *   - On each callback we scan the live DOM for sections whose top
 *     edge is above the rootMargin band, and pick the lowest-most
 *     of those (i.e. the section the reader has just scrolled into).
 *   - Sections that aren't yet in the page (e.g. Ratings hidden when
 *     ratings is null) are simply skipped — no false-positive nav
 *     highlights.
 *
 * SSR-safe: returns null until first effect run on the client.
 */
export function useScrollSpy(): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const elements = SECTION_IDS.map(
      (id) => [id, document.getElementById(id)] as const,
    ).filter((pair): pair is readonly [SectionId, HTMLElement] => pair[1] !== null)

    if (elements.length === 0) return

    const compute = () => {
      // Prefer the last section whose top has crossed the band threshold.
      const bandTop = 80 // matches rootMargin offset
      let candidate: SectionId | null = null
      for (const [id, el] of elements) {
        const rect = el.getBoundingClientRect()
        if (rect.top - bandTop <= 0) {
          candidate = id
        } else {
          break // SECTION_IDS preserves on-page order
        }
      }
      // If nothing has scrolled past — pick the first visible section.
      if (!candidate) {
        for (const [id, el] of elements) {
          const rect = el.getBoundingClientRect()
          if (rect.bottom > 0) {
            candidate = id
            break
          }
        }
      }
      setActive((prev) => (prev === candidate ? prev : candidate))
    }

    compute()

    const observer = new IntersectionObserver(compute, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    })
    for (const [, el] of elements) observer.observe(el)

    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', compute)
      window.removeEventListener('resize', compute)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return active
}
