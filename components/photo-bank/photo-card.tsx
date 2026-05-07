'use client'

/**
 * Photo Bank — paid-only card with hover overlay actions (TZ §7.2).
 *
 * Stub: minimal hover affordances + processing/failed indicator. End-to-end
 * pin/edit/delete actions wire through to `/api/photo-bank/:id` PATCH/DELETE
 * endpoints (Stage 2 backend). Not run in Stage 4 — code-only per
 * Execution policy.
 */

import { Loader2, Pin, Pencil, Trash2 } from 'lucide-react'
import { AttributionPopover } from '@/components/trip/attribution-popover'
import type { UserPhotoItem } from '@/lib/photo-bank-api'

export interface PhotoCardProps {
  photo: UserPhotoItem
  onEdit?: (photo: UserPhotoItem) => void
  onPinToggle?: (photo: UserPhotoItem) => void
  onDelete?: (photo: UserPhotoItem) => void
}

export function PhotoCard({ photo, onEdit, onPinToggle, onDelete }: PhotoCardProps) {
  const pinned = !!(photo.pin_region || photo.pin_landmark)
  const processing = !photo.ai_processed && !photo.ai_failed
  return (
    <div className="group relative aspect-square overflow-hidden rounded border border-zinc-200">
      <img
        src={photo.cdn_url}
        alt={photo.manual_caption || photo.ai_description || ''}
        loading="lazy"
        className="h-full w-full object-cover"
        draggable={false}
      />
      {processing && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/60">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-700" />
        </span>
      )}
      {pinned && (
        <span className="absolute left-1 top-1 rounded bg-blue-600/90 px-1 text-[10px] uppercase text-white">
          Pinned
        </span>
      )}
      {(photo.is_hero_candidate || photo.hero_override) && (
        <span className="absolute right-1 top-1 rounded bg-amber-500/90 px-1 text-[10px] uppercase text-white">
          Hero
        </span>
      )}
      <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onPinToggle && (
          <button
            type="button"
            onClick={() => onPinToggle(photo)}
            className="rounded bg-black/60 p-1 text-white"
            aria-label="Pin"
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(photo)}
            className="rounded bg-black/60 p-1 text-white"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(photo)}
            className="rounded bg-black/60 p-1 text-white"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <span className="absolute bottom-1 left-1">
        <AttributionPopover html={null} />
      </span>
    </div>
  )
}
