/**
 * Magazine — Accommodations section.
 *
 * Source: magazine-trip.jsx lines 225–283.
 *
 * Owner-mode (stage 3):
 *   - Each card's name + description editable through saveAccommodationPatch.
 *   - Per-card "Add photo" pill (no photo) / "Replace" + "Remove" pills
 *     (when one exists). Drag-drop on the card itself uploads through
 *     the existing photo handlers using a synthetic day_id of `null`
 *     (accommodations live in their own bucket on the backend).
 *   - "+ Add accommodation" pill below the stack creates an empty card.
 *
 * Note on photo upload: the old route uses POST /api/accommodations/:id/
 * photo/presign which is separate from the per-day photo flow. For
 * simplicity in stage 3 we accept the file, immediately PATCH the
 * accommodation with a blob URL (showcase-style optimistic), and
 * defer real S3 wiring to stage 4. In owner mode the operator sees
 * the photo immediately; on F5 it disappears unless we wire the
 * presign flow. Owner workflow is preserved (mutate immediately) and
 * S3 persistence lands with the rest of the upload work in stage 4.
 */
'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Accommodation, ThemePropsV2 } from '@/types/theme-v2'
import { UI } from '@/lib/ui-strings'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { body, CREAM, display, eyebrow, Hairline, MUTED, ACCENT } from './styles'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

export function Accommodations({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const stays = data.accommodations ?? []

  // In public mode hide the entire section if empty. In owner mode
  // always render so the operator has the "+ Add" affordance.
  if (!editable && stays.length === 0) return null

  return (
    <section style={{ background: CREAM, padding: '40px 0 56px' }}>
      <Hairline />
      <div style={{ padding: '40px 24px 28px' }}>
        <div style={{ ...eyebrow, marginBottom: 18 }}>
          {UI.sectionLabels.accommodations.toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {stays.map((s, i) => (
          <AccommodationCard key={s.id} stay={s} index={i} editable={editable} />
        ))}
      </div>

      {editable && (
        <div style={{ padding: '32px 24px 0' }}>
          <button
            type="button"
            onClick={async () => {
              if (ctx?.interceptPhotoAction) {
                ctx.interceptPhotoAction()
                return
              }
              const created = await ctx!.mutations.saveAccommodationCreate({
                name: 'New accommodation',
                description: '',
              })
              if (!created) toast.error('Could not create accommodation')
            }}
            style={{
              ...eyebrow, fontSize: 10, color: ACCENT,
              background: 'transparent',
              border: `1px dashed ${ACCENT}`,
              padding: '14px 20px',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              width: '100%', justifyContent: 'center',
            }}
          >
            <Plus size={14} />
            ADD ACCOMMODATION
          </button>
        </div>
      )}
    </section>
  )
}

function AccommodationCard({
  stay,
  index,
  editable,
}: {
  stay: Accommodation
  index: number
  editable: boolean
}) {
  const ctx = useThemeCtxV2()
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFiles = (files: FileList | File[]): File[] =>
    Array.from(files).filter((f) => ALLOWED_MIMES.includes(f.type) && f.size <= MAX_SIZE)

  // Stage-3 photo upload: locally mint a blob URL and PATCH the
  // accommodation. Real S3 presign lands with stage 4 photo refactor.
  const onPickFile = (file: File) => {
    if (ctx?.interceptPhotoAction) {
      ctx.interceptPhotoAction()
      return
    }
    const blobUrl = URL.createObjectURL(file)
    void ctx!.mutations.saveAccommodationPatch(stay.id, { imageUrl: blobUrl })
  }

  const onPickClick = () => {
    if (ctx?.interceptPhotoAction) {
      ctx.interceptPhotoAction()
      return
    }
    fileInputRef.current?.click()
  }

  return (
    <div
      style={{ padding: '0 24px', position: 'relative' }}
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
        if (list.length) onPickFile(list[0])
      }}
    >
      {dragOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          background: 'rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ background: CREAM, padding: '8px 16px', borderRadius: 999, ...eyebrow, fontSize: 11 }}>
            DROP TO REPLACE PHOTO
          </div>
        </div>
      )}

      {stay.image_url ? (
        <div style={{ position: 'relative' }}>
          <img
            src={stay.image_url}
            alt={stay.name}
            style={{
              width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
              display: 'block', borderRadius: 0,
            }}
          />
          {editable && (
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={onPickClick}
                aria-label="Replace photo"
                style={{
                  background: 'rgba(0,0,0,0.55)', color: CREAM,
                  border: '1px solid rgba(245,240,230,0.4)',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center',
                }}
              >
                <ImagePlus size={14} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ctx?.interceptPhotoAction) {
                    ctx.interceptPhotoAction()
                    return
                  }
                  void ctx!.mutations.saveAccommodationPatch(stay.id, { imageUrl: null })
                }}
                aria-label="Remove photo"
                style={{
                  background: 'rgba(0,0,0,0.55)', color: CREAM,
                  border: '1px solid rgba(245,240,230,0.4)',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        editable && (
          <button
            type="button"
            onClick={onPickClick}
            style={{
              ...eyebrow, fontSize: 10, color: ACCENT,
              background: 'transparent',
              border: `1px dashed ${ACCENT}`,
              padding: '20px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%',
              aspectRatio: '4 / 3',
            }}
          >
            <ImagePlus size={14} />
            ADD PHOTO
          </button>
        )
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIMES.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            const list = validateFiles(e.target.files ?? [])
            if (list.length) onPickFile(list[0])
            if (e.target) e.target.value = ''
          }}
        />
      )}

      <div style={{ paddingTop: stay.image_url || editable ? 14 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ ...eyebrow, fontSize: 10, color: MUTED, marginBottom: 6 }}>
            STAY {String(index + 1).padStart(2, '0')}
          </div>
          {editable && (
            <button
              type="button"
              onClick={() => {
                if (ctx?.interceptPhotoAction) {
                  ctx.interceptPhotoAction()
                  return
                }
                void ctx!.mutations.saveAccommodationDelete(stay.id)
              }}
              aria-label="Delete accommodation"
              style={{
                background: 'transparent',
                border: 'none',
                color: MUTED,
                cursor: 'pointer',
                padding: 4,
                display: 'inline-flex',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {editable ? (
          <EditableField
            as="text"
            value={stay.name}
            editable
            placeholder="Accommodation name"
            onSave={(v) => ctx!.mutations.saveAccommodationPatch(stay.id, { name: v })}
            renderDisplay={(v) => (
              <div style={{ ...display, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>{v}</div>
            )}
          />
        ) : (
          <div style={{ ...display, fontSize: 22, lineHeight: 1.2, marginBottom: 6 }}>
            {stay.name}
          </div>
        )}

        {editable ? (
          <EditableField
            as="multiline"
            value={stay.description}
            editable
            rows={2}
            placeholder="One-line description"
            onSave={(v) => ctx!.mutations.saveAccommodationPatch(stay.id, { description: v })}
            renderDisplay={(v) => (
              <div style={{ ...body, color: MUTED, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{v}</div>
            )}
          />
        ) : (
          stay.description && (
            <div style={{ ...body, color: MUTED, fontSize: 13.5 }}>{stay.description}</div>
          )
        )}
      </div>
    </div>
  )
}
