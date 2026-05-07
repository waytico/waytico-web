'use client'

/**
 * Photo Bank — detail modal stub (TZ §7.4, paid-only).
 *
 * Full implementation per TZ — lightbox + sidebar with EditableField
 * (region/country/city/manual_tags/manual_caption/pin_region/pin_landmark/
 * hero_override) + "Used in N trips" link list — lands when paid flow
 * is enabled. This stub renders a minimal modal with the photo + a
 * close button so the import path stays valid.
 */

import { X } from 'lucide-react'
import type { UserPhotoItem } from '@/lib/photo-bank-api'

export interface PhotoDetailModalProps {
  photo: UserPhotoItem | null
  onClose: () => void
}

export function PhotoDetailModal(props: PhotoDetailModalProps) {
  const { photo, onClose } = props
  if (!photo) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="mt-12 w-full max-w-3xl overflow-hidden rounded bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 p-3">
          <h2 className="text-sm font-medium">
            {photo.manual_caption || photo.ai_description || 'Photo detail'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <img
            src={photo.cdn_url}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="space-y-2 p-4 text-sm">
            <div className="text-zinc-500">Categories</div>
            <div>{photo.ai_categories.join(', ') || '—'}</div>
            <div className="mt-3 text-zinc-500">Tags</div>
            <div>{photo.ai_tags.join(', ') || '—'}</div>
            <div className="mt-3 text-zinc-500">Region</div>
            <div>
              {[photo.city, photo.country].filter(Boolean).join(', ') || '—'}
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              Inline editing of caption / pins / hero override lands when the
              paid upload flow ships. (Stage 4 stub.)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
