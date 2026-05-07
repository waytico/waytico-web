import type { Project } from '@/components/project-card'
import type { Client } from '@/components/trip/trip-types'

export type ClientStatus = 'active' | 'prospect' | 'past'

/**
 * Maps a client to one of three lifecycle buckets purely from the trips
 * the operator has on file.
 *
 *   - active   — has at least one currently-running trip (status active).
 *   - prospect — quoted/draft trips on file, OR no trips at all (a fresh
 *                lead the operator just typed in).
 *   - past     — only completed/archived trips, no live work.
 *
 * No persistent status column is needed; the dashboard always reflects
 * what the data says today.
 */
export function deriveClientStatus(client: Client, projects: Project[]): ClientStatus {
  const myTrips = projects.filter((p) => p.client?.id === client.id)
  if (myTrips.length === 0) return 'prospect'
  const hasActive = myTrips.some((t) => t.status === 'active')
  if (hasActive) return 'active'
  const hasLive = myTrips.some((t) => t.status === 'quoted' || t.status === 'draft')
  if (hasLive) return 'prospect'
  return 'past'
}

/**
 * Most recent activity timestamp: latest trip updated_at (or created_at
 * fallback). For prospects with no trips we fall back to the client's
 * own created_at so they don't sink to the bottom of "by activity".
 */
export function clientLastActivity(client: Client, projects: Project[]): Date | null {
  const myTrips = projects.filter((p) => p.client?.id === client.id)
  if (!myTrips.length) return new Date(client.created_at)
  const dates = myTrips.map((t) => +new Date(t.updated_at || t.created_at))
  return new Date(Math.max(...dates))
}

export function clientTripCounts(client: Client, projects: Project[]) {
  const myTrips = projects.filter((p) => p.client?.id === client.id)
  return {
    total: myTrips.length,
    active: myTrips.filter((t) => t.status === 'active').length,
  }
}

/** Stable hash → palette index for client avatar tints. Same client/id
 *  always lands on the same warm pastel. */
const AVATAR_PALETTE = [
  'bg-rose-100 text-rose-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-orange-100 text-orange-800',
] as const

export function clientAvatarClass(client: Client): string {
  const seed = (client.agent_id || '') + ':' + client.id
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

export function clientInitials(client: Client): string {
  const src = (client.nickname || client.name || client.email || '').trim()
  if (!src) return '?'
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return src.slice(0, 2).toUpperCase()
}

/** Lower-case substring filter across a client's display fields. Used by
 *  ClientsTab's search input — server-side smart-search lives in the
 *  /api/clients/search endpoint and is reused via SmartClientPicker. */
export function clientLocalMatch(client: Client, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const onlyDigits = /^\d+$/.test(q)
  if (onlyDigits) {
    const norm = (client.phone || '').replace(/\D+/g, '')
    return norm.includes(q) || (client.whatsapp || '').replace(/\D+/g, '').includes(q)
  }
  const hay = [
    client.nickname,
    client.name,
    client.email,
    client.phone,
    client.whatsapp,
    client.telegram,
    client.instagram,
    client.facebook,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}
