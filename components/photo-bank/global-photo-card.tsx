'use client'

/**
 * Global Photo Bank — read-only card with attribution badge (TZ §7).
 *
 * Used by the free-tier dashboard preview. License pill in the top-left,
 * AttributionPopover ("i" button) in the bottom-right — matches the
 * trip-page rendering so operators see exactly what their clients will
 * see when a global photo lands in a trip.
 */

import { AttributionPopover } from '@/components/trip/attribution-popover'
import type { GlobalPhotoItem } from '@/lib/photo-bank-api'

export function GlobalPhotoCard({ photo }: { photo: GlobalPhotoItem }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded border border-zinc-200">
      <img
        src={photo.cdn_url}
        alt={photo.ai_description || ''}
        loading="lazy"
        className="h-full w-full object-cover"
        draggable={false}
      />
      {photo.license && (
        <span className="absolute left-1 top-1 rounded bg-zinc-900/75 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
          {photo.license}
        </span>
      )}
      {photo.city && (
        <span className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-zinc-700">
          {photo.city}
        </span>
      )}
      <span className="absolute bottom-1 right-1">
        <AttributionPopover html={photo.attribution_html} />
      </span>
    </div>
  )
}
