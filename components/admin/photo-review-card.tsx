'use client'

/**
 * Admin photo review card — Stage 11 expanded.
 *
 * Single row in the review grid. Renders **everything** the classifier
 * stored on the row so the operator can decide Keep / Delete from the
 * card itself without bouncing into a separate detail view.
 *
 * Visible fields (in addition to the original Keep / Delete + city
 * inline-edit):
 *   - thumbnail (cdn_url or thumbnail_url) → click opens fullscreen
 *     lightbox with the master cdn_url
 *   - license + attribution badges
 *   - quality_score badge (top-right)
 *   - hero-candidate icon (when true)
 *   - "Not classified" red banner when ai_processed=false
 *   - dimensions + orientation chip (computed from width/height)
 *   - all ai_categories (chips, scrollable horizontally if many)
 *   - ai_tags (chips)
 *   - ai_landmarks (line)
 *   - ai_description (truncated paragraph, full visible in lightbox)
 *   - reviewed_at indicator (when set)
 */

import { useEffect, useState } from 'react'
import {
  Pencil,
  Check,
  Trash2,
  X,
  Star,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
} from 'lucide-react'
import { AttributionPopover } from '@/components/trip/attribution-popover'

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
}

export interface PhotoReviewCardProps {
  photo: ReviewPhoto
  focused?: boolean
  busy?: boolean
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  onSave: (
    id: string,
    patch: { city?: string | null; country?: string | null; region?: string | null },
  ) => void
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

/** Fullscreen master-image lightbox. Plain modal — no crop UI, no
 *  trip-page deps. Closes on overlay click or Escape. */
function ReviewLightbox({
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
  const [editing, setEditing] = useState(false)
  const [city, setCity] = useState(photo.city ?? '')
  const [country, setCountry] = useState(photo.country ?? '')
  const [region, setRegion] = useState(photo.region ?? '')
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const notClassified = photo.ai_processed === false
  const orientation = orientationOf(photo.width, photo.height)
  const dimsLabel =
    photo.width && photo.height ? `${photo.width}×${photo.height}` : null
  const sizeLabel = fmtFileSize(photo.file_size)

  // Lightbox always pulls the master cdn_url. Grid uses thumbnail_url
  // when available, falling back to cdn_url for legacy rows pending
  // backfill.
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
          className="h-full w-full cursor-zoom-in object-cover"
          draggable={false}
          onClick={() => setLightboxOpen(true)}
        />
        <span className="absolute left-1 top-1 rounded bg-zinc-900/75 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
          {photo.license}
        </span>
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
        <span className="absolute bottom-1 right-1">
          <AttributionPopover html={photo.attribution_html} />
        </span>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open full size"
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

      {/* Description */}
      {photo.ai_description ? (
        <p
          className="text-[12px] leading-snug text-zinc-700"
          title={photo.ai_description}
        >
          {photo.ai_description.length > 160
            ? photo.ai_description.slice(0, 160) + '…'
            : photo.ai_description}
        </p>
      ) : (
        <p className="text-[11px] italic text-zinc-400">No description</p>
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

      {/* All categories */}
      {photo.ai_categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {photo.ai_categories.map((c) => (
            <span
              key={c}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700"
            >
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {photo.ai_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {photo.ai_tags.map((t) => (
            <span
              key={t}
              className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Landmarks */}
      {photo.ai_landmarks.length > 0 && (
        <div className="text-[11px] text-zinc-700">
          <span className="font-medium">Landmarks:</span>{' '}
          {photo.ai_landmarks.join(', ')}
        </div>
      )}

      {/* Geo edit toggle */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
          aria-label="Edit metadata"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="space-y-1 text-xs">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="block w-full rounded border border-zinc-300 px-2 py-1"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="block w-full rounded border border-zinc-300 px-2 py-1"
          />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Region"
            className="block w-full rounded border border-zinc-300 px-2 py-1"
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setCity(photo.city ?? '')
                setCountry(photo.country ?? '')
                setRegion(photo.region ?? '')
              }}
              className="rounded border border-zinc-300 px-2 py-0.5"
            >
              <X className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(photo.id, {
                  city: city || null,
                  country: country || null,
                  region: region || null,
                })
                setEditing(false)
              }}
              className="rounded bg-zinc-900 px-2 py-0.5 text-white"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1">
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
          disabled={busy}
          onClick={() => onDelete(photo.id)}
          className="flex items-center justify-center gap-1 rounded bg-red-600 px-2 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {lightboxOpen && (
        <ReviewLightbox
          url={photo.cdn_url}
          alt={photo.ai_description || ''}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
