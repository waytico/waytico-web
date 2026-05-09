'use client'

/**
 * Admin photo review card.
 *
 * Single row in the review grid. Renders **everything** the classifier
 * stored on the row so the operator can decide Keep / Delete from the
 * card itself without bouncing into a separate detail view.
 *
 * Edit mode (toggled by the pencil button) lets the operator override
 * any of the AI-derived fields:
 *   - geo: city / country / region (free text)
 *   - description: textarea, max 2000 chars
 *   - tags: chip input (Enter or comma adds, X removes)
 *   - landmarks: chip input (free text, no controlled vocab)
 *   - categories: multi-select against the controlled vocab
 *   - hero candidate: toggle
 *
 * All fields are persisted via `onSave` → backend
 *   PATCH /api/admin/global-bank/photos/:id
 * which accepts the same shape (validated by `adminPatchSchema`).
 */

import { useEffect, useMemo, useState } from 'react'
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
import { PHOTO_CATEGORIES } from '@/lib/photo-categories'

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
  /** Stage 11 — number of times this row was used in trip_media.
   *  Surfaced on the browse view as a "Used in N trips" badge. */
  usage_count?: number
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

/** Fullscreen master-image lightbox. */
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

/** Chip-input — array of strings with add-on-Enter / add-on-comma /
 *  click-X to remove. Used for tags and landmarks. */
function ChipInput({
  values,
  onChange,
  placeholder,
  maxLength,
  ariaLabel,
}: {
  values: string[]
  onChange: (next: string[]) => void
  placeholder: string
  maxLength: number
  ariaLabel: string
}) {
  const [draft, setDraft] = useState('')
  const commit = () => {
    const trimmed = draft.trim().slice(0, maxLength)
    if (!trimmed) return
    if (values.includes(trimmed)) {
      setDraft('')
      return
    }
    onChange([...values, trimmed])
    setDraft('')
  }
  return (
    <div className="rounded border border-zinc-300 bg-white p-1">
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="text-zinc-500 hover:text-rose-600"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
              onChange(values.slice(0, -1))
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="min-w-[80px] flex-1 bg-transparent px-1 text-[11px] outline-none"
        />
      </div>
    </div>
  )
}

export function PhotoReviewCard(props: PhotoReviewCardProps) {
  const { photo, focused, busy, onApprove, onDelete, onSave } = props
  const [editing, setEditing] = useState(false)
  const [city, setCity] = useState(photo.city ?? '')
  const [country, setCountry] = useState(photo.country ?? '')
  const [region, setRegion] = useState(photo.region ?? '')
  const [description, setDescription] = useState(photo.ai_description ?? '')
  const [tags, setTags] = useState<string[]>(photo.ai_tags)
  const [landmarks, setLandmarks] = useState<string[]>(photo.ai_landmarks)
  const [categories, setCategories] = useState<string[]>(photo.ai_categories)
  const [heroCandidate, setHeroCandidate] = useState<boolean>(
    photo.is_hero_candidate === true,
  )
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // Reset draft state whenever the underlying photo changes (e.g. after
  // a save returns the canonical row from the server).
  useEffect(() => {
    setCity(photo.city ?? '')
    setCountry(photo.country ?? '')
    setRegion(photo.region ?? '')
    setDescription(photo.ai_description ?? '')
    setTags(photo.ai_tags)
    setLandmarks(photo.ai_landmarks)
    setCategories(photo.ai_categories)
    setHeroCandidate(photo.is_hero_candidate === true)
  }, [
    photo.id,
    photo.city,
    photo.country,
    photo.region,
    photo.ai_description,
    photo.ai_tags,
    photo.ai_landmarks,
    photo.ai_categories,
    photo.is_hero_candidate,
  ])

  const notClassified = photo.ai_processed === false
  const orientation = orientationOf(photo.width, photo.height)
  const dimsLabel =
    photo.width && photo.height ? `${photo.width}×${photo.height}` : null
  const sizeLabel = fmtFileSize(photo.file_size)

  const gridSrc = photo.thumbnail_url || photo.cdn_url

  const sortedCategories = useMemo(() => [...PHOTO_CATEGORIES].sort(), [])

  const handleSave = () => {
    onSave(photo.id, {
      city: city.trim() || null,
      country: country.trim() || null,
      region: region.trim() || null,
      ai_description: description.trim() || null,
      ai_tags: tags,
      ai_landmarks: landmarks,
      ai_categories: categories,
      is_hero_candidate: heroCandidate,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setEditing(false)
    setCity(photo.city ?? '')
    setCountry(photo.country ?? '')
    setRegion(photo.region ?? '')
    setDescription(photo.ai_description ?? '')
    setTags(photo.ai_tags)
    setLandmarks(photo.ai_landmarks)
    setCategories(photo.ai_categories)
    setHeroCandidate(photo.is_hero_candidate === true)
  }

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

      {/* ─────────────── READ-ONLY DISPLAY ─────────────── */}
      {!editing && (
        <>
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

          {(dimsLabel || orientation || sizeLabel) && (
            <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
              {dimsLabel && <span>{dimsLabel}</span>}
              {orientation && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5">{orientation}</span>
              )}
              {sizeLabel && <span>· {sizeLabel}</span>}
            </div>
          )}

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

          {photo.ai_landmarks.length > 0 && (
            <div className="text-[11px] text-zinc-700">
              <span className="font-medium">Landmarks:</span>{' '}
              {photo.ai_landmarks.join(', ')}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded p-1 text-zinc-500 hover:bg-zinc-100"
              aria-label="Edit metadata"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-[11px]">Edit</span>
            </button>
          </div>
        </>
      )}

      {/* ─────────────── EDIT MODE ─────────────── */}
      {editing && (
        <div className="space-y-2 rounded bg-zinc-50 p-2 text-xs">
          {/* Geo */}
          <div className="grid grid-cols-3 gap-1">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="rounded border border-zinc-300 bg-white px-2 py-1"
              maxLength={100}
            />
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country"
              className="rounded border border-zinc-300 bg-white px-2 py-1"
              maxLength={100}
            />
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Region"
              className="rounded border border-zinc-300 bg-white px-2 py-1"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What's in the photo…"
              className="block w-full resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-snug"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
              Tags ({tags.length}/20) — Enter or comma to add
            </label>
            <ChipInput
              values={tags}
              onChange={(v) => setTags(v.slice(0, 20))}
              placeholder={tags.length ? '' : 'paris, sunset, cobblestone…'}
              maxLength={60}
              ariaLabel="Tags"
            />
          </div>

          {/* Landmarks */}
          <div>
            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
              Landmarks ({landmarks.length}/20)
            </label>
            <ChipInput
              values={landmarks}
              onChange={(v) => setLandmarks(v.slice(0, 20))}
              placeholder={landmarks.length ? '' : 'Eiffel Tower, Louvre…'}
              maxLength={100}
              ariaLabel="Landmarks"
            />
          </div>

          {/* Categories — multi-select against controlled vocab */}
          <div>
            <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
              Categories ({categories.length}/20)
            </label>
            <div className="flex flex-wrap gap-1 rounded border border-zinc-300 bg-white p-1">
              {sortedCategories.map((c) => {
                const active = categories.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setCategories(categories.filter((x) => x !== c))
                      } else if (categories.length < 20) {
                        setCategories([...categories, c])
                      }
                    }}
                    className={
                      'rounded px-1.5 py-0.5 text-[10px] transition-colors ' +
                      (active
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')
                    }
                  >
                    {c.replace(/_/g, ' ')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hero candidate */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={heroCandidate}
              onChange={(e) => setHeroCandidate(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-700">
              <Star className="h-3 w-3 text-amber-500" />
              Hero candidate
            </span>
          </label>

          {/* Save / cancel */}
          <div className="flex justify-end gap-1 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-0.5 text-[11px] text-white"
            >
              <Check className="h-3 w-3" /> Save
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
