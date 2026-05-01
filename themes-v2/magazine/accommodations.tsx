/**
 * Magazine — Accommodations section.
 *
 * Source: magazine-trip.jsx lines 225–283, MAGAZINE-SPEC §F.
 *
 * Mobile + desktop sizing per §R.2 lives in layout.css. Mobile = single
 * column stack, desktop ≥1024 = 2-column grid.
 *
 * Owner-mode (stage 3):
 *   - Each card's name + description editable through saveAccommodationPatch.
 *   - Per-card "Add photo" pill (no photo) / "Replace" + "Remove" pills
 *     (when one exists). Drag-drop on the card itself uploads through
 *     the existing photo handlers using a synthetic day_id of `null`
 *     (accommodations live in their own bucket on the backend).
 *   - "+ Add accommodation" pill below the stack creates an empty card.
 *
 * Note on photo upload: the existing route uses POST /api/accommodations/:id/
 * photo/presign which is separate from the per-day photo flow. For
 * simplicity in stage 3 we accept the file, immediately PATCH the
 * accommodation with a blob URL (showcase-style optimistic), and
 * defer real S3 wiring to a later stage.
 */
'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Accommodation, ThemePropsV2 } from '@/types/theme-v2'
import { UI } from '@/lib/ui-strings'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { Hairline } from './styles'

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
    <section id="accommodations" className="mag-stays">
      <Hairline />
      <div className="mag-shell mag-stays__head">
        <div className="mag-eyebrow mag-stays__heading">
          {UI.sectionLabels.accommodations.toUpperCase()}
        </div>
      </div>

      <div className="mag-shell--wide">
        <div className="mag-stays__grid">
          {stays.map((s, i) => (
            <AccommodationCard key={s.id} stay={s} index={i} editable={editable} />
          ))}
        </div>

        {editable && (
          <div className="mag-stays__add">
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
              className="mag-btn-add"
            >
              <Plus size={14} />
              ADD ACCOMMODATION
            </button>
          </div>
        )}
      </div>
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
  // accommodation. Real S3 presign lands later.
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
      className="mag-stay-card"
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
        <div className="mag-day__drop-overlay">
          <div className="mag-day__drop-pill">DROP TO REPLACE PHOTO</div>
        </div>
      )}

      {stay.image_url ? (
        <div className="mag-stay-card__photo-wrap">
          <img className="mag-stay-card__photo" src={stay.image_url} alt={stay.name} />
          {editable && (
            <div className="mag-stay-card__photo-controls">
              <button
                type="button"
                onClick={onPickClick}
                aria-label="Replace photo"
                className="mag-btn-overlay-icon mag-btn-overlay-icon--small"
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
                className="mag-btn-overlay-icon mag-btn-overlay-icon--small"
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
            className="mag-stay-card__photo-placeholder"
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
          hidden
          onChange={(e) => {
            const list = validateFiles(e.target.files ?? [])
            if (list.length) onPickFile(list[0])
            if (e.target) e.target.value = ''
          }}
        />
      )}

      <div
        className={
          'mag-stay-card__meta' +
          (!stay.image_url && !editable ? ' mag-stay-card__meta--no-pad' : '')
        }
      >
        <div className="mag-stay-card__meta-head">
          <div className="mag-stay-card__index">
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
              className="mag-stay-card__delete"
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
            renderDisplay={(v) => <div className="mag-stay-card__name">{v}</div>}
          />
        ) : (
          <div className="mag-stay-card__name">{stay.name}</div>
        )}

        {editable ? (
          <EditableField
            as="multiline"
            value={stay.description}
            editable
            rows={2}
            placeholder="One-line description"
            onSave={(v) => ctx!.mutations.saveAccommodationPatch(stay.id, { description: v })}
            renderDisplay={(v) => <div className="mag-stay-card__desc">{v}</div>}
          />
        ) : (
          stay.description && (
            <div className="mag-stay-card__desc">{stay.description}</div>
          )
        )}
      </div>
    </div>
  )
}
