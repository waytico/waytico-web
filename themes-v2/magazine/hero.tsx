/**
 * Magazine — Hero section.
 *
 * Source: magazine-trip.jsx lines 60–163. Full-bleed photo, height 100vh
 * with min 640. Two narrow strips at the top (brand / trip-id, then
 * issued/valid dates), one headline group bottom-left.
 *
 * Owner-mode additions (stage 3):
 *   - Title + tagline rendered through EditableField (click to inline-
 *     edit, blur/Enter saves through ctx.mutations.saveProjectPatch).
 *   - Cover photo: top-right "Replace" pill + drag-drop on the section
 *     itself. Anon mode: ctx.interceptPhotoAction short-circuits to a
 *     toast before any S3 attempt. We don't reuse the legacy
 *     HeroDropZone/HeroOwnerOverlay — they expect a stateful caller
 *     (drag flag, uploading counters) that's overkill inside a self-
 *     contained Magazine section. The inline overlay below is ~30 lines
 *     and visually matches the cinematic hero.
 */
'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtDate } from '@/lib/trip-format'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { CREAM, BLACK, eyebrow, display, TWEAKS } from './styles'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

export function Hero({ data }: ThemePropsV2) {
  const p = data.project
  const top = TWEAKS.safeAreaTop
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
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 640,
        overflow: 'hidden',
        background: BLACK,
      }}
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
        <img
          src={p.cover_image_url}
          alt={p.title ?? ''}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.86) contrast(1.02)',
          }}
        />
      ) : null}

      {/* Gradient veil */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(26,24,23,0.55) 0%, rgba(26,24,23,0) 22%, rgba(26,24,23,0) 55%, rgba(26,24,23,0.78) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Header scrim */}
      {TWEAKS.headerScrim && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: top + 60,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0))',
          pointerEvents: 'none',
        }} />
      )}

      {/* Drop highlight */}
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: '#FFFCF6', color: BLACK,
            padding: '10px 20px', borderRadius: 999,
            ...eyebrow, fontSize: 11,
          }}>
            DROP TO REPLACE HERO
          </div>
        </div>
      )}

      {/* Top meta strip */}
      <div style={{
        position: 'absolute', top, left: 0, right: 0,
        padding: '20px 38px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: CREAM, zIndex: 2,
      }}>
        <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.9 }}>
          {brandName ? brandName.toUpperCase() : '\u00A0'}
        </div>
        <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.9 }}>
          {tripRef}
        </div>
      </div>

      {dateStrip && (
        <div style={{
          position: 'absolute', top: top + 50, left: 38, right: 38,
          display: 'flex', alignItems: 'center', gap: 10,
          paddingTop: 12, borderTop: '1px solid rgba(245,240,230,0.32)',
          zIndex: 2,
        }}>
          <div style={{
            ...eyebrow, color: CREAM, fontSize: 9, opacity: 0.85,
            letterSpacing: '0.16em', whiteSpace: 'nowrap',
          }}>
            {dateStrip}
          </div>
        </div>
      )}

      {/* Owner photo controls — top-right corner */}
      {editable && (
        <div style={{
          position: 'absolute', top: top + 90, right: 16,
          display: 'flex', gap: 8, zIndex: 4,
        }}>
          <button
            type="button"
            onClick={onPickClick}
            aria-label="Replace hero photo"
            style={{
              ...eyebrow, fontSize: 10, color: CREAM,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(245,240,230,0.4)',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
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
              style={{
                background: 'rgba(0,0,0,0.55)',
                border: '1px solid rgba(245,240,230,0.4)',
                padding: '8px',
                cursor: 'pointer',
                color: CREAM,
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIMES.join(',')}
            style={{ display: 'none' }}
            onChange={(e) => {
              const list = validateFiles(e.target.files ?? [])
              if (list.length) void ctx!.photo.handleHeroUpload(list)
              if (e.target) e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Headline */}
      <div style={{
        position: 'absolute', left: 22, right: 22, bottom: 56,
        color: CREAM, zIndex: 2,
      }}>
        {eyebrowTop && (
          <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.92, marginBottom: 14 }}>
            {eyebrowTop}
          </div>
        )}

        <div style={{ ...display, color: CREAM, fontSize: TWEAKS.heroHeadlineSize, lineHeight: 1.05, maxWidth: 320 }}>
          {editable ? (
            <EditableField
              as="text"
              value={p.title}
              editable
              placeholder="Trip title"
              onSave={(v) => ctx!.mutations.saveProjectPatch({ title: v })}
              renderDisplay={(v) => <span style={{ color: CREAM }}>{v}</span>}
            />
          ) : (
            <h1 style={{ margin: 0, color: 'inherit', font: 'inherit' }}>
              {p.title || '\u00A0'}
            </h1>
          )}

          {(p.tagline || editable) && (
            <em style={{ display: 'block', fontStyle: 'italic', fontWeight: 500, marginTop: 4, fontSize: 'inherit' }}>
              {editable ? (
                <EditableField
                  as="text"
                  value={p.tagline}
                  editable
                  placeholder="Add a tagline"
                  onSave={(v) => ctx!.mutations.saveProjectPatch({ tagline: v })}
                  renderDisplay={(v) => <span style={{ color: CREAM, fontStyle: 'italic' }}>{v}</span>}
                />
              ) : (
                p.tagline
              )}
            </em>
          )}
        </div>

        {region && (
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.85 }}>
              {region.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Scroll cue */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        ...eyebrow, color: CREAM, fontSize: 9, opacity: 0.6, zIndex: 2,
      }}>
        ↓ SCROLL
      </div>
    </section>
  )
}
