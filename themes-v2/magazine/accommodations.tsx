'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'
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

        {editable && <AddAccommodationButton />}
      </div>
    </section>
  )
}

/* ── Inline-name 'Add accommodation' button (2.11.4) ── */

function AddAccommodationButton() {
  const ctx = useThemeCtxV2()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  if (!adding) {
    return (
      <div className="mag-stays__add">
        <button
          type="button"
          onClick={() => {
            if (ctx?.interceptPhotoAction) {
              ctx.interceptPhotoAction()
              return
            }
            setAdding(true)
          }}
          className="mag-btn-add"
        >
          <Plus size={14} />
          ADD ACCOMMODATION
        </button>
      </div>
    )
  }

  const commit = async () => {
    const name = draft.trim()
    if (!name) {
      setAdding(false)
      return
    }
    const created = await ctx!.mutations.saveAccommodationCreate({
      name,
      description: '',
    })
    if (!created) toast.error('Could not create accommodation')
    setAdding(false)
    setDraft('')
  }

  return (
    <div className="mag-stays__add">
      <input
        type="text"
        autoFocus
        value={draft}
        placeholder="Accommodation name"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setDraft('')
            setAdding(false)
          }
        }}
        className="mag-stays__add-input"
      />
    </div>
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
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFiles = (files: FileList | File[]): File[] => {
    const list = Array.from(files)
    const valid = list.filter(
      (f) => ALLOWED_MIMES.includes(f.type) && f.size <= MAX_SIZE,
    )
    if (valid.length !== list.length) {
      toast.error(
        `${list.length - valid.length} file(s) skipped — use JPEG/PNG/WebP, max 15MB`,
      )
    }
    return valid
  }

  // Real S3 upload (2.11.1) — replaces blob:URL stage-3 stub.
  // ctx.accommodationUpload.upload runs presign → PUT to S3, returns
  // { cdnUrl }; we then PATCH the accommodation with imageUrl=cdnUrl.
  const onPickFile = async (file: File) => {
    if (busy) return
    if (ctx?.interceptPhotoAction) {
      ctx.interceptPhotoAction()
      return
    }
    if (!ctx?.accommodationUpload) {
      // Public mode — should never reach here (button only renders in
      // editable mode), but guard anyway.
      return
    }
    setBusy(true)
    try {
      const result = await ctx.accommodationUpload.upload(stay.id, file)
      if (!result) return
      await ctx.mutations.saveAccommodationPatch(stay.id, {
        imageUrl: result.cdnUrl,
      })
    } finally {
      setBusy(false)
    }
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
        if (list.length) void onPickFile(list[0])
      }}
    >
      {dragOver && (
        <div className="mag-day__drop-overlay">
          <div className="mag-day__drop-pill">DROP TO REPLACE PHOTO</div>
        </div>
      )}

      {busy && (
        <div className="mag-day__drop-overlay">
          <div className="mag-stay-card__busy">
            <Loader2 className="mag-stay-card__busy-spin" size={16} />
            UPLOADING…
          </div>
        </div>
      )}

      {stay.image_url ? (
        <div className="mag-stay-card__photo-wrap">
          <img
            className="mag-stay-card__photo"
            src={stay.image_url}
            alt={stay.name}
            onClick={() =>
              ctx?.lightbox.open({
                id: `acc-${stay.id}`,
                url: stay.image_url!,
                type: 'photo',
              })
            }
          />
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
                  void ctx!.mutations.saveAccommodationPatch(stay.id, {
                    imageUrl: null,
                  })
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
            if (list.length) void onPickFile(list[0])
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
                if (typeof window === 'undefined') return
                if (!window.confirm(`Delete ${stay.name}?`)) return
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
            onSave={(v) =>
              ctx!.mutations.saveAccommodationPatch(stay.id, { name: v })
            }
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
            onSave={(v) =>
              ctx!.mutations.saveAccommodationPatch(stay.id, { description: v })
            }
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
