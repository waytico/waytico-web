/**
 * Dashboard trip grouping logic.
 *
 * The dashboard groups trips by what the operator needs to do, NOT by
 * raw status. Sorting/filtering is reduced to one decision: "what are
 * you working on right now?".
 *
 * Order of precedence per trip (first match wins):
 *   1. Needs attention   — drafts, stale quotes, imminent active starts
 *   2. In flight         — fresh quotes + active trips not imminent /
 *                          already running
 *   3. Recently completed — completed within last 30 days
 *   4. Archive           — everything else (archived + old completed)
 *
 * Why 'flight' and not 'active': both quoted and active-status trips
 * land in this bucket, and using the word 'active' as the bucket name
 * would collide with the 'active' status pill rendered on each row —
 * an operator scanning would think the count meant "trips with status
 * = active" rather than "trips currently in your workflow".
 */

import type { Project } from '@/components/project-card'

export type GroupKey =
  | 'attention'
  | 'flight'
  | 'completed'
  | 'archive'

export type GroupedTrips = {
  attention: Project[]
  flight: Project[]
  completed: Project[]
  archive: Project[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const STALE_QUOTE_DAYS = 7
const IMMINENT_START_DAYS = 7
const RECENT_COMPLETION_DAYS = 30

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((t - Date.now()) / DAY_MS)
}

/**
 * Per-trip badge that explains *why* a trip is in "Needs attention".
 * Used by trip-row to render the contextual status pill.
 * Returns null for trips not in Needs attention — those use the default
 * status pill from getStatusMeta().
 */
export function attentionReason(p: Project): string | null {
  if (p.status === 'draft') return 'Draft, not sent'
  if (p.status === 'quoted') {
    const age = daysSince(p.updated_at)
    if (age >= STALE_QUOTE_DAYS) return `Quoted ${age}d, no reply`
  }
  if (p.status === 'active') {
    const startIn = daysUntil(p.dates_start)
    if (startIn !== null && startIn >= 0 && startIn <= IMMINENT_START_DAYS) {
      if (startIn === 0) return 'Active, starts today'
      if (startIn === 1) return 'Active, starts tomorrow'
      return `Active, starts in ${startIn} days`
    }
    if (startIn !== null && startIn < 0) {
      // Trip is currently running
      const endIn = daysUntil(p.dates_end)
      if (endIn !== null && endIn >= 0) return 'Active, in progress'
    }
  }
  return null
}

export function groupTrips(projects: Project[]): GroupedTrips {
  const out: GroupedTrips = {
    attention: [],
    flight: [],
    completed: [],
    archive: [],
  }

  for (const p of projects) {
    if (p.status === 'archived') {
      out.archive.push(p)
      continue
    }

    if (attentionReason(p) !== null) {
      out.attention.push(p)
      continue
    }

    // Fresh quoted (no stale flag) + active (not imminent / already
    // running with no urgency flag) collapse into one 'in flight' bucket.
    if (p.status === 'quoted' || p.status === 'active') {
      out.flight.push(p)
      continue
    }

    if (p.status === 'completed') {
      const age = daysSince(p.updated_at)
      if (age <= RECENT_COMPLETION_DAYS) {
        out.completed.push(p)
      } else {
        out.archive.push(p)
      }
      continue
    }

    // draft without attentionReason — shouldn't happen but be safe
    out.attention.push(p)
  }

  // Sort within each group: attention by age desc (oldest first = most urgent),
  // others by updated_at desc (newest first).
  out.attention.sort((a, b) => +new Date(a.updated_at) - +new Date(b.updated_at))
  for (const k of ['flight', 'completed', 'archive'] as const) {
    out[k].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
  }

  return out
}

export const GROUP_TITLES: Record<GroupKey, string> = {
  attention: 'Needs your attention',
  flight: 'In flight',
  completed: 'Recently completed',
  archive: 'Archive',
}
