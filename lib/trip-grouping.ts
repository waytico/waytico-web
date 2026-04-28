/**
 * Per-trip helper — surfaces the operator-facing reason a trip needs
 * attention (used by trip-row to render the contextual pill text).
 *
 * The grouping / bucketing logic that used to live here is gone — the
 * dashboard now sorts a flat list by either status or creation time.
 */

import type { Project } from '@/components/project-card'

const DAY_MS = 24 * 60 * 60 * 1000
const STALE_QUOTE_DAYS = 7
const IMMINENT_START_DAYS = 7

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.floor((t - Date.now()) / DAY_MS)
}

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
      const endIn = daysUntil(p.dates_end)
      if (endIn !== null && endIn >= 0) return 'Active, in progress'
    }
  }
  return null
}
