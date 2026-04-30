/**
 * Magazine — Hero section.
 *
 * Source: magazine-trip.jsx lines 60–163, MAGAZINE-SPEC §C.
 * Mobile defaults + desktop overrides per §R.2 live in layout.css.
 *
 * Owner-mode (stage 3):
 *   - Title + tagline rendered through EditableField (click to inline-
 *     edit, blur/Enter saves through ctx.mutations.saveProjectPatch).
 *   - Cover photo: top-right "Replace" pill + drag-drop on the section
 *     itself. Anon mode: ctx.interceptPhotoAction short-circuits to a
 *     toast before any S3 attempt.
 *
 * Per MAGAZINE-SPEC §R.3, every size / position / z-index lives in a
 * CSS class. Inline styles only carry data-driven values (the photo
 * URL via <img src>, EditableField's render-display variants).
 */
'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtDate } from '@/lib/trip-format'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

export function Hero({ data }: ThemePropsV2) {
  const p = data.project
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable

  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const brandName = data.owner?.brand_name?.trim() || ''
  const tripRef = `№ ${p.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`

  const issuedDate = fmtDate(p.proposal_date ?? null)
  const validDate = fmtDate(p.valid_until ?? null)
  const dateStrip = issuedDate && validDate
    ? `ISSUED ${issuedDate.toUpperCase()} — VALID UNTIL ${validDate.toUpperCase()}`
    : null

  const country = p.country?.trim() || null
  const durationLabel = p.duration_days ? `${p.duration_days} DAYS` : null
  const eyebrowTop = [country?.toUpperCase(), durationLabel].filter(Boolean).join(' — ') || null

  const region = p.region?.trim() || null

  const heroMedia = data.media.find((m) => m.placement === 'hero')

  const validateFiles = (files: FileList | File[]): File[] =>
    Array.from(files).filter((f) => ALLOWED_MIMES.includes(f.type) && f.size <= MAX_SIZE)

  const onPickClick = () => {
    if (ctx?.interceptPhotoAction) {
      ctx.interceptPhotoAction()
      return
    }
    fileInputRef.current?.click()
  }

  return (
    <section
      className="mag-hero"
      onDragOver={(e) => {
        if (!editable) return
        e.preventDefault()
        if (ctx?.interceptPhotoAction) return
        if (e.dataTransfer?.types?.includes('Files')) setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!editable) return
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={(e) => {
        if (!editable) return
        e.preventDefault()
        setDragOver(false)
        if (ctx?.interceptPhotoAction) {
          ctx.interceptPhotoAction()
          return
        }
        const list = validateFiles(e.dataTransfer?.files ?? [])
        if (list.length) void ctx!.photo.handleHeroUpload(list)
      }}
    >
      {p.cover_image_url ? (
        <img className="mag-hero__photo" src={p.cover_image_url} alt={p.title ?? ''} />
      ) : null}

      <div className="mag-hero__veil" />
      <div className="mag-hero__scrim" />

      {dragOver && (
        <div className="mag-hero__drop-overlay">
          <div className="mag-hero__drop-pill">DROP TO REPLACE HERO</div>
        </div>
      )}

      {/* Top meta strip — brand left, trip ref right */}
      <div className="mag-hero__strip">
        <div className="mag-hero__strip-cell">
          {brandName ? brandName.toUpperCase() : '\u00A0'}
        </div>
        <div className="mag-hero__strip-cell">{tripRef}</div>
      </div>

      {dateStrip && (
        <div className="mag-hero__date-strip">
          <div className="mag-hero__date-strip-text">{dateStrip}</div>
        </div>
      )}

      {/* Owner photo controls — top-right corner */}
      {editable && (
        <div className="mag-hero__owner-controls">
          <button
            type="button"
            onClick={onPickClick}
            aria-label="Replace hero photo"
            className="mag-btn-overlay"
          >
            <ImagePlus size={14} />
            REPLACE
          </button>
          {heroMedia && (
            <button
              type="button"
              onClick={() => {
                if (ctx?.interceptPhotoAction) {
                  ctx.interceptPhotoAction()
                  return
                }
                void ctx!.photo.handleDelete(heroMedia.id)
              }}
              aria-label="Remove hero photo"
              className="mag-btn-overlay-icon"
            >
              <Trash2 size={14} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIMES.join(',')}
            hidden
            onChange={(e) => {
              const list = validateFiles(e.target.files ?? [])
              if (list.length) void ctx!.photo.handleHeroUpload(list)
              if (e.target) e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Headline group */}
      <div className="mag-hero__content">
        {eyebrowTop && (
          <div className="mag-hero__eyebrow-top">{eyebrowTop}</div>
        )}

        <div className="mag-hero__headline">
          {editable ? (
            <EditableField
              as="text"
              value={p.title}
              editable
              placeholder="Trip title"
              onSave={(v) => ctx!.mutations.saveProjectPatch({ title: v })}
              renderDisplay={(v) => <span>{v}</span>}
            />
          ) : (
            <h1 className="mag-hero__headline">
              {p.title || '\u00A0'}
            </h1>
          )}

          {(p.tagline || editable) && (
            <em className="mag-hero__tagline">
              {editable ? (
                <EditableField
                  as="text"
                  value={p.tagline}
                  editable
                  placeholder="Add a tagline"
                  onSave={(v) => ctx!.mutations.saveProjectPatch({ tagline: v })}
                  renderDisplay={(v) => <span>{v}</span>}
                />
              ) : (
                p.tagline
              )}
            </em>
          )}
        </div>

        {region && (
          <div className="mag-hero__region">
            <div className="mag-hero__region-text">{region.toUpperCase()}</div>
          </div>
        )}
      </div>

      <div className="mag-hero__scroll-cue">↓ SCROLL</div>
    </section>
  )
}
