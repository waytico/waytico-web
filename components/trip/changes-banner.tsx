'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

type ChangeLogEntry = {
  published_at: string
  sections: string[]
}

type Props = {
  slug: string
  changeLog: ChangeLogEntry[]
}

const STORAGE_PREFIX = 'waytico:acked:'

/**
 * Client-side banner that surfaces unacknowledged changes to a published
 * trip. Reads the trip's change_log from the public payload, compares
 * against a localStorage timestamp of the last acknowledgment, and
 * renders a sticky strip with the merged set of changed sections.
 *
 * Persistence:
 *   - localStorage key `waytico:acked:{slug}` holds the published_at of
 *     the most recent entry the client has dismissed (× or "Got it").
 *   - On every visit we collect entries with published_at > acked into
 *     a single union of section labels, deduplicated.
 *
 * Behaviour:
 *   - Hidden when there are no entries newer than the acked timestamp,
 *     OR when the only entry is the very first ("Initial proposal" —
 *     this is the trip itself, not a change to it).
 *   - Sticky-top, expanded by default. Collapses to a thin "Changes ▼"
 *     strip when the user scrolls past ~120px. Click reopens.
 *   - The × button writes the latest published_at to localStorage and
 *     hides the banner until the next publish.
 *
 * Cookie scope: per-device. Two devices = two banners. Accepted as the
 * MVP trade-off — there's no client-side identity to bind the ack to.
 */
export function ChangesBanner({ slug, changeLog }: Props) {
  const [acked, setAcked] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Read acked timestamp on mount (client-only).
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_PREFIX + slug)
      setAcked(v)
    } catch {
      /* localStorage unavailable — banner just shows until dismissed in-session */
    }
    setHydrated(true)
  }, [slug])

  // Auto-collapse on scroll.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0
      setCollapsed(y > 120)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const { sections, latestAt } = useMemo(() => {
    if (!Array.isArray(changeLog) || changeLog.length === 0) {
      return { sections: [] as string[], latestAt: null as string | null }
    }
    // Filter to entries strictly after the acked timestamp.
    const cutoff = acked ? new Date(acked).getTime() : 0
    const newer = changeLog.filter((e) => {
      if (!e || !e.published_at) return false
      const t = new Date(e.published_at).getTime()
      return t > cutoff
    })
    if (newer.length === 0) return { sections: [], latestAt: null }

    // Special case: the only newer entry is the initial proposal.
    // That's the trip itself, not a change — don't show a banner for it.
    if (
      newer.length === 1 &&
      Array.isArray(newer[0].sections) &&
      newer[0].sections.length === 1 &&
      newer[0].sections[0] === 'Initial proposal'
    ) {
      return { sections: [], latestAt: null }
    }

    // Union of sections, dedup, drop the "Initial proposal" marker.
    const set = new Set<string>()
    newer.forEach((e) => {
      ;(e.sections || []).forEach((s) => {
        if (s && s !== 'Initial proposal') set.add(s)
      })
    })
    const latest = newer.reduce<string | null>((max, e) => {
      if (!max) return e.published_at
      return new Date(e.published_at).getTime() > new Date(max).getTime()
        ? e.published_at
        : max
    }, null)
    return { sections: Array.from(set), latestAt: latest }
  }, [changeLog, acked])

  // Defer first render until we've read localStorage; otherwise SSR
  // would flash the banner for users who already dismissed it.
  if (!hydrated) return null
  if (sections.length === 0) return null

  const dismiss = () => {
    if (latestAt) {
      try {
        window.localStorage.setItem(STORAGE_PREFIX + slug, latestAt)
      } catch {
        /* ignore */
      }
      setAcked(latestAt)
    }
  }

  // Collapsed pill — single line. Click expands.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="sticky top-0 z-30 w-full bg-accent text-accent-foreground py-1.5 px-4 text-xs font-sans flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors"
        aria-expanded="false"
      >
        <span>{sections.length} update{sections.length === 1 ? '' : 's'} since your last visit</span>
        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="sticky top-0 z-30 w-full bg-accent text-accent-foreground border-b border-accent/20">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-start gap-3 text-sm font-sans">
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Updated since your last visit</div>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-90">
            {sections.map((s) => (
              <li key={s} className="inline-flex items-center">
                <span className="w-1 h-1 rounded-full bg-current mr-1.5 opacity-70" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse"
          className="shrink-0 p-1 rounded hover:bg-accent-foreground/10 transition-colors"
        >
          <ChevronUp className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 p-1 rounded hover:bg-accent-foreground/10 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
