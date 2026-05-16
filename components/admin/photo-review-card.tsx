'use client'

/**
 * Admin photo review card — tile (L1-only).
 *
 * Single tile in the review grid. The tile shows only the **L1 signals**
 * the suggest scorer reads to match photos onto trip days:
 *
 *   - image with overlays: license, hero flag, quality score, city,
 *     usage count, attribution, lightbox button.
 *   - scene_type + season as sky-blue L1 chips below the image.
 *   - landmarks as inline text.
 *   - dimensions / orientation / file size in small mono-ish text.
 *   - "Not classified" warning / "Reviewed" indicator.
 *
 * Everything L2 (description, categories, tags, full provenance) and
 * any kind of editing happens inside `<PhotoDetailsModal>`, opened by
 * the Details button.
 *
 * The card exposes three actions back to the parent grid:
 *
 *   - `onApprove(id)`        — Keep button (and keyboard Enter).
 *   - `onDelete(id)`         — Delete button (and keyboard Delete/Backspace).
 *   - `onSave(id, patch)`    — fired by the modal's Save button; backend
 *                              PATCH /api/admin/global-bank/photos/:id.
 *
 * `ReviewPhoto` and `PhotoPatch` are re-exported for `use-admin-photo-review`
 * and the modal to share the same shape.
 */

import { useEffect, useState } from 'react'
import {
  Settings2,
  Trash2,
  X,
  Star,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
} from 'lucide-react'
import { AttributionPopover } from '@/components/trip/attribution-popover'
import { PhotoDetailsModal } from './photo-details-modal'

export interface ReviewPhoto {
  id: string
  cdn_url: string
  thumbnail_url?: string | null
  ai_description: string | null
  ai_categories: string[]
  ai_tags: string[]
  ai_landmarks: string[]
  ai_quality_score?: number | null
  is_hero_candidate?: boolean
  ai_processed?: boolean
  cleanup_processed?: boolean
  /** L1 — single dominant scene_type the v4 classifier picked from
   *  the controlled vocabulary in backend src/lib/photo-scenes.ts.
   *  NULL on legacy rows. */
  scene_type?: string | null
  /** L1 — season as a first-class column. NULL on legacy rows. */
  season?: string | null
  width?: number | null
  height?: number | null
  file_size?: number | null
  mime_type?: string | null
  city: string | null
  country: string | null
  region: string | null
  license: string
  attribution_html: string | null
  reviewed_at: string | null
  /** Stage 11 — number of times this row was used in trip_media.
   *  Surfaced on the browse view as a "Used in N trips" badge. */
  usage_count?: number
  /** Archive flag. TRUE = photo was already used in trip_media when a
   *  delete attempt came in. Kept in DB read-only so the live trip page
   *  keeps rendering; suggest engine skips it. Cannot be hard-deleted. */
  keep_for_existing_trips?: boolean
}

export interface PhotoPatch {
  city?: string | null
  country?: string | null
  region?: string | null
  ai_description?: string | null
  ai_categories?: string[]
  ai_tags?: string[]
  ai_landmarks?: string[]
  is_hero_candidate?: boolean
}

export interface PhotoReviewCardProps {
  photo: ReviewPhoto
  focused?: boolean
  busy?: boolean
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  onSave: (id: string, patch: PhotoPatch) => void
}

function orientationOf(w?: number | null, h?: number | null): string | null {
  if (!w || !h) return null
  if (w > h * 1.2) return 'landscape'
  if (h > w * 1.2) return 'portrait'
  return 'square'
}

function fmtFileSize(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Fullscreen master-image lightbox. Exported so the details modal can
 *  reuse it for "click photo → fullscreen" without duplicating markup. */
export function ReviewLightbox({
  url,
  alt,
  onClose,
}: {
  url: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  )
}

export function PhotoReviewCard(props: PhotoReviewCardProps) {
  const { photo, focused, busy, onApprove, onDelete, onSave } = props
  const [detailsOpen, setDetailsOpen] = useState(false)

  const notClassified = photo.ai_processed === false
  const orientation = orientationOf(photo.width, photo.height)
  const dimsLabel =
    photo.width && photo.height ? `${photo.width}×${photo.height}` : null
  const sizeLabel = fmtFileSize(photo.file_size)

  const gridSrc = photo.thumbnail_url || photo.cdn_url

  return (
    <div
      className={
        'flex flex-col gap-2 rounded border bg-white p-2 transition-shadow ' +
        (notClassified
          ? 'border-rose-400 ring-1 ring-rose-200 '
          : focused
            ? 'border-zinc-900 shadow-md '
            : 'border-zinc-200 ')
      }
      data-photo-id={photo.id}
    >
      {/* Image + overlays */}
      <div className="relative aspect-square overflow-hidden rounded bg-zinc-100">
        <img
          src={gridSrc}
          alt={photo.ai_description || ''}
          loading="lazy"
          className="h-full w-full cursor-pointer object-cover"
          draggable={false}
          onClick={() => setDetailsOpen(true)}
        />
        <span className="absolute left-1 top-1 rounded bg-zinc-900/75 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
          {photo.license}
        </span>
        {photo.keep_for_existing_trips && (
          <span
            title="Archived — used in published trips, read-only"
            className="absolute right-1 top-7 inline-flex items-center gap-0.5 rounded bg-zinc-700/95 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
          >
            archived
          </span>
        )}
        {photo.is_hero_candidate && (
          <span
            title="Hero candidate"
            className="absolute left-1 top-7 inline-flex items-center gap-0.5 rounded bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
          >
            <Star className="h-2.5 w-2.5" /> hero
          </span>
        )}
        {typeof photo.ai_quality_score === 'number' && (
          <span
            title="Quality score"
            className={
              'absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium ' +
              (photo.ai_quality_score >= 70
                ? 'bg-emerald-600/95 text-white'
                : photo.ai_quality_score >= 40
                  ? 'bg-amber-500/95 text-white'
                  : 'bg-rose-600/95 text-white')
            }
          >
            Q {photo.ai_quality_score}
          </span>
        )}
        {photo.city && (
          <span className="absolute right-1 bottom-7 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-zinc-700">
            {photo.city}
          </span>
        )}
        {typeof photo.usage_count === 'number' && photo.usage_count > 0 && (
          <span
            title={`Used in ${photo.usage_count} trip${photo.usage_count === 1 ? '' : 's'}`}
            className="absolute left-1 bottom-1 rounded bg-violet-700/95 px-1.5 py-0.5 text-[10px] font-medium text-white"
          >
            ×{photo.usage_count}
          </span>
        )}
        <span className="absolute bottom-1 right-1">
          <AttributionPopover html={photo.attribution_html} />
        </span>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          aria-label="Open details"
          className="absolute bottom-1 left-1 rounded bg-zinc-900/65 p-1 text-white opacity-0 transition-opacity hover:bg-zinc-900/85 group-hover:opacity-100"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>

      {/* "Not classified" warning */}
      {notClassified && (
        <div className="flex items-center gap-1.5 rounded bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Not classified — won&apos;t appear in suggest engine
        </div>
      )}

      {/* Reviewed indicator */}
      {photo.reviewed_at && !notClassified && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Reviewed
        </div>
      )}

      {/* L1 chips — scene_type + season */}
      {(photo.scene_type || photo.season) && (
        <div className="flex flex-wrap gap-1">
          {photo.scene_type && (
            <span
              title="Scene type (L1)"
              className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800"
            >
              {photo.scene_type.replace(/_/g, ' ')}
            </span>
          )}
          {photo.season && (
            <span
              title="Season (L1)"
              className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800"
            >
              ☀ {photo.season}
            </span>
          )}
        </div>
      )}

      {/* Landmarks — inline text */}
      {photo.ai_landmarks.length > 0 && (
        <div className="text-[11px] text-zinc-700">
          <span className="font-medium">Landmarks:</span>{' '}
          {photo.ai_landmarks.join(', ')}
        </div>
      )}

      {/* Dimensions / orientation / size */}
      {(dimsLabel || orientation || sizeLabel) && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
          {dimsLabel && <span>{dimsLabel}</span>}
          {orientation && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5">{orientation}</span>
          )}
          {sizeLabel && <span>· {sizeLabel}</span>}
        </div>
      )}

      {/* Actions — Keep / Delete / Details */}
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => onApprove(photo.id)}
          className="rounded bg-emerald-600 px-2 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Keep
        </button>
        <button
          type="button"
          disabled={busy || photo.keep_for_existing_trips}
          onClick={() => onDelete(photo.id)}
          title={
            photo.keep_for_existing_trips
              ? 'Archived photos cannot be deleted — they are kept so already-published trip pages keep rendering.'
              : undefined
          }
          className="flex items-center justify-center gap-1 rounded bg-red-600 px-2 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="flex items-center justify-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Settings2 className="h-3.5 w-3.5" /> Details
        </button>
      </div>

      {detailsOpen && (
        <PhotoDetailsModal
          photo={photo}
          busy={busy}
          onClose={() => setDetailsOpen(false)}
          onApprove={(id) => {
            onApprove(id)
            setDetailsOpen(false)
          }}
          onDelete={(id) => {
            onDelete(id)
            setDetailsOpen(false)
          }}
          onSave={(id, patch) => onSave(id, patch)}
        />
      )}
    </div>
  )
}