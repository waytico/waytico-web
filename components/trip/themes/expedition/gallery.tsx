'use client'

import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaRecord } from '@/lib/upload-photo'
import { padTwo } from '@/lib/trip-format'

type ExpeditionGalleryProps = {
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onOpenPhoto: (m: MediaRecord) => void
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

const DESKTOP_SPANS: Array<{ col: number; row: number }> = [
  { col: 6, row: 1 },
  { col: 6, row: 1 },
  { col: 4, row: 1 },
  { col: 4, row: 1 },
  { col: 4, row: 1 },
  { col: 6, row: 1 },
  { col: 6, row: 1 },
]

/**
 * Expedition — Gallery ("§ 05 — FIELD DOCUMENTS").
 *
 * Cinematic feature plate (PLATE 01/NN) followed by a 12-col PLATE grid.
 * Captions sit on a dark translucent block bottom-left in mono caps. All
 * photos receive a slight saturate(0.9)+contrast(1.05) film filter.
 *
 * Mobile flattens to a single column with first photo taller.
 */
export function ExpeditionGallery({
  media,
  owner,
  uploading,
  onUpload,
  onOpenPhoto,
}: ExpeditionGalleryProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const photos = (media || []).filter(
    (m) => m.placement !== 'hero' && (m.type === 'photo' || !m.type),
  )
  if (!owner && photos.length === 0) return null

  const filterFiles = (list: File[]): File[] => {
    const valid = list.filter((f) => ACCEPT.includes(f.type) && f.size <= MAX_SIZE)
    if (valid.length !== list.length) {
      toast.error('Some files skipped — use JPEG/PNG/WebP, max 15MB')
    }
    return valid
  }

  const dropHandlers = owner
    ? {
        onDragEnter: (e: React.DragEvent) => {
          e.preventDefault()
          if (e.dataTransfer?.types?.includes('Files')) setDragOver(true)
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        },
        onDragLeave: (e: React.DragEvent) => {
          if (e.currentTarget === e.target) setDragOver(false)
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          setDragOver(false)
          const files = filterFiles(Array.from(e.dataTransfer?.files || []))
          if (files.length) onUpload(files, null)
        },
      }
    : {}

  const total = photos.length
  const feature = photos[0]
  const rest = photos.slice(1)

  return (
    <section
      id="photos"
      className="px-4 md:px-14 py-20 md:py-32"
      style={{
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
      {...dropHandlers}
    >
      <div className="e-mono mb-6" style={{ color: 'var(--e-ochre)' }}>
        § 05 — FIELD DOCUMENTS
      </div>
      <h2
        className="e-display"
        style={{
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          lineHeight: 0.88,
          margin: '0 0 60px',
          letterSpacing: '-0.03em',
        }}
      >
        DISPATCHES
        <br />
        <span
          className="e-day-outline"
          style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
        >
          FROM THE FIELD.
        </span>
      </h2>

      {owner && (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = filterFiles(Array.from(e.target.files || []))
            e.target.value = ''
            if (files.length) onUpload(files, null)
          }}
        />
      )}

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading > 0}
          className="w-full py-24 flex flex-col items-center gap-3"
          style={{
            background: dragOver ? 'var(--e-panel)' : 'transparent',
            border: '2px dashed var(--e-rule-2)',
            color: 'var(--e-cream-mute)',
          }}
        >
          <ImagePlus className="w-8 h-8" />
          <span className="e-mono">
            {uploading > 0 ? 'UPLOADING…' : 'ADD FIELD DOCUMENTS'}
          </span>
        </button>
      ) : (
        <>
          {/* Feature plate */}
          {feature && (
            <button
              type="button"
              onClick={() => onOpenPhoto(feature)}
              className="relative block w-full mb-3"
              style={{ height: 'clamp(360px, 50vw, 620px)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={feature.url}
                alt={feature.caption || ''}
                className="w-full h-full object-cover block"
                style={{ filter: 'saturate(0.9) contrast(1.05)' }}
              />
              <div
                className="absolute left-6 md:left-10 bottom-6 md:bottom-10 text-left"
                style={{ color: 'var(--e-cream)' }}
              >
                <div
                  className="e-mono mb-2"
                  style={{ color: 'var(--e-ochre)' }}
                >
                  PLATE 01 / {padTwo(total)}
                </div>
                {feature.caption && (
                  <div
                    className="e-headline"
                    style={{ fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)' }}
                  >
                    {feature.caption.toUpperCase()}
                  </div>
                )}
              </div>
            </button>
          )}

          {/* Desktop grid */}
          {rest.length > 0 && (
            <div
              className="hidden md:grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(12, 1fr)',
                gridAutoRows: '300px',
              }}
            >
              {rest.map((g, i) => {
                const s = DESKTOP_SPANS[i] || { col: 4, row: 1 }
                return (
                  <figure
                    key={g.id}
                    className="m-0 relative overflow-hidden"
                    style={{
                      gridColumn: `span ${s.col}`,
                      gridRow: `span ${s.row}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenPhoto(g)}
                      className="block w-full h-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.url}
                        alt={g.caption || ''}
                        className="w-full h-full object-cover block"
                        style={{ filter: 'saturate(0.9) contrast(1.05)' }}
                      />
                    </button>
                    <figcaption
                      className="e-mono absolute left-4 bottom-4"
                      style={{
                        color: 'var(--e-cream)',
                        background: 'rgba(10,8,6,0.8)',
                        padding: '6px 10px',
                        fontSize: 9,
                      }}
                    >
                      PL.{padTwo(i + 2)}
                      {g.caption ? ` · ${g.caption.toUpperCase()}` : ''}
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          )}

          {/* Mobile stacked */}
          <div className="md:hidden space-y-3 mt-3">
            {rest.map((g, i) => (
              <figure
                key={g.id}
                className="m-0 relative overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onOpenPhoto(g)}
                  className="block w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.url}
                    alt={g.caption || ''}
                    className="w-full block object-cover"
                    style={{
                      height: 240,
                      filter: 'saturate(0.9) contrast(1.05)',
                    }}
                  />
                </button>
                <figcaption
                  className="e-mono absolute left-3 bottom-3"
                  style={{
                    color: 'var(--e-cream)',
                    background: 'rgba(10,8,6,0.8)',
                    padding: '5px 9px',
                    fontSize: 9,
                  }}
                >
                  PL.{padTwo(i + 2)}
                </figcaption>
              </figure>
            ))}
          </div>

          {owner && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading > 0}
              className="mt-8 e-btn-ghost inline-flex items-center gap-2 disabled:opacity-60"
            >
              <ImagePlus className="w-4 h-4" />
              {uploading > 0 ? 'UPLOADING…' : 'ADD MORE PLATES'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
