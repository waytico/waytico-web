'use client'

/**
 * Admin photo details modal.
 *
 * Opened from the `Details` button on `PhotoReviewCard`. Shows the full
 * photo + classifier-derived metadata, split visually by routing tier:
 *
 *   - **L1** (sky-tinted panel): scene_type, season, geo (city / country
 *     / region), landmarks, quality_score, hero candidate. These are the
 *     fields the suggest scorer reads to match photos onto trip days.
 *     `scene_type` and `season` are written only by the classifier and
 *     therefore rendered **read-only**; everything else in L1 is
 *     editable.
 *
 *   - **L2** (neutral panel): ai_description, ai_categories, ai_tags,
 *     plus pure provenance/file fields (dimensions, file size, mime
 *     type, license, attribution). Editable except provenance.
 *
 * Save → same `onSave(id, patch)` contract the inline editor used →
 * backend `PATCH /api/admin/global-bank/photos/:id`. Keep / Delete pipe
 * straight through to the review hook so the operator can decide right
 * from the modal without bouncing back to the grid.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Trash2,
  X,
  Star,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { AttributionPopover } from '@/components/trip/attribution-popover'
import { PHOTO_CATEGORIES } from '@/lib/photo-categories'
import type { ReviewPhoto, PhotoPatch } from './photo-review-card'
import { ReviewLightbox } from './photo-review-card'

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

export interface PhotoDetailsModalProps {
  photo: ReviewPhoto
  busy?: boolean
  onClose: () => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  onSave: (id: string, patch: PhotoPatch) => void
}

export function PhotoDetailsModal(props: PhotoDetailsModalProps) {
  const { photo, busy, onClose, onApprove, onDelete, onSave } = props

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

  // Re-sync local edit state if the underlying row changes (e.g. after
  // a server-side save round-trip).
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

  // Escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const sortedCategories = useMemo(() => [...PHOTO_CATEGORIES].sort(), [])
  const notClassified = photo.ai_processed === false
  const orientation = orientationOf(photo.width, photo.height)
  const dimsLabel =
    photo.width && photo.height ? `${photo.width}×${photo.height}` : null
  const sizeLabel = fmtFileSize(photo.file_size)

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
  }

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Photo details"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4"
        onClick={onClose}
      >
        <div
          className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-zinc-800">Photo details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — photo + info; stacks on mobile, side-by-side on desktop */}
        <div className="grid flex-1 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-2">
          {/* Photo side */}
          <div className="relative flex items-center justify-center bg-zinc-900 p-3 md:p-4">
            <img
              src={photo.cdn_url}
              alt={photo.ai_description || ''}
              className="max-h-[80vh] w-full cursor-zoom-in object-contain"
              draggable={false}
              onClick={() => setLightboxOpen(true)}
            />
            <span className="absolute left-3 top-3 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
              {photo.license}
            </span>
            <span className="absolute bottom-3 right-3">
              <AttributionPopover html={photo.attribution_html} />
            </span>
          </div>

          {/* Info side */}
          <div className="flex flex-col gap-3 overflow-y-auto p-4 text-sm">
            {/* Status pills */}
            {(notClassified || photo.reviewed_at) && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {notClassified && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 font-medium text-rose-800">
                    <AlertTriangle className="h-3 w-3" />
                    Not classified — won&apos;t appear in suggest engine
                  </span>
                )}
                {photo.reviewed_at && !notClassified && (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Reviewed
                  </span>
                )}
                {typeof photo.usage_count === 'number' && photo.usage_count > 0 && (
                  <span className="rounded bg-violet-100 px-2 py-0.5 font-medium text-violet-800">
                    Used in {photo.usage_count} trip{photo.usage_count === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}

            {/* ─────────── L1 — what the suggest scorer reads ─────────── */}
            <section className="rounded-md border-l-4 border-sky-400 bg-sky-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">
                  L1 — suggest signals
                </h3>
                {typeof photo.ai_quality_score === 'number' && (
                  <span
                    title="Quality score"
                    className={
                      'rounded px-1.5 py-0.5 text-[10px] font-medium ' +
                      (photo.ai_quality_score >= 70
                        ? 'bg-emerald-600 text-white'
                        : photo.ai_quality_score >= 40
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-600 text-white')
                    }
                  >
                    Q {photo.ai_quality_score}
                  </span>
                )}
              </div>

              {/* scene_type / season — read-only (classifier writes only) */}
              <div className="mb-3 flex flex-wrap gap-1">
                {photo.scene_type ? (
                  <span
                    title="Scene type — classifier only"
                    className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-800"
                  >
                    {photo.scene_type.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] italic text-zinc-500">
                    no scene_type
                  </span>
                )}
                {photo.season ? (
                  <span
                    title="Season — classifier only"
                    className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-800"
                  >
                    ☀ {photo.season}
                  </span>
                ) : (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] italic text-zinc-500">
                    no season
                  </span>
                )}
              </div>

              {/* Geo — editable */}
              <div className="mb-2 grid grid-cols-3 gap-1">
                <label className="block">
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
                    City
                  </span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="—"
                    className="block w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                    maxLength={100}
                  />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
                    Country
                  </span>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="—"
                    className="block w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                    maxLength={100}
                  />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
                    Region
                  </span>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="—"
                    className="block w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                    maxLength={100}
                  />
                </label>
              </div>

              {/* Landmarks — editable chip input */}
              <div className="mb-2">
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

              {/* Hero candidate — editable */}
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
            </section>

            {/* ─────────── L2 — auxiliary metadata ─────────── */}
            <section className="rounded-md bg-zinc-50 p-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                L2 — auxiliary
              </h3>

              {/* Description */}
              <div className="mb-2">
                <label className="mb-0.5 block text-[10px] uppercase tracking-wide text-zinc-500">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="What's in the photo…"
                  className="block w-full resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-snug"
                />
              </div>

              {/* Categories — multi-select */}
              <div className="mb-2">
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

              {/* Tags — editable chip input */}
              <div className="mb-2">
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

              {/* Provenance / file (read-only) */}
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-600">
                {dimsLabel && (
                  <>
                    <dt className="text-zinc-500">Dimensions</dt>
                    <dd>
                      {dimsLabel}
                      {orientation && <span className="ml-1 text-zinc-400">· {orientation}</span>}
                    </dd>
                  </>
                )}
                {sizeLabel && (
                  <>
                    <dt className="text-zinc-500">File size</dt>
                    <dd>{sizeLabel}</dd>
                  </>
                )}
                {photo.mime_type && (
                  <>
                    <dt className="text-zinc-500">MIME</dt>
                    <dd className="truncate">{photo.mime_type}</dd>
                  </>
                )}
                <dt className="text-zinc-500">License</dt>
                <dd>{photo.license}</dd>
              </dl>
            </section>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            Close
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(photo.id)}
            className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApprove(photo.id)}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            <Check className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>
    </div>

    {lightboxOpen && (
      <ReviewLightbox
        url={photo.cdn_url}
        alt={photo.ai_description || ''}
        onClose={() => setLightboxOpen(false)}
      />
    )}
    </>
  )
}