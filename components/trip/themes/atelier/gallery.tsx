'use client'

import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaRecord } from '@/lib/upload-photo'
import { padTwo } from '@/lib/trip-format'

type AtelierGalleryProps = {
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onOpenPhoto: (m: MediaRecord) => void
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

const DESKTOP_SPANS: Array<{ col: number; row: number }> = [
  { col: 8, row: 3 },
  { col: 4, row: 2 },
  { col: 4, row: 2 },
  { col: 4, row: 2 },
  { col: 4, row: 2 },
  { col: 6, row: 2 },
  { col: 6, row: 2 },
  { col: 8, row: 2 },
]

/**
 * Atelier — Gallery ("05 / Portfolio").
 *
 * 12-col grid with rounded corners on every tile and a white pill caption
 * pinned bottom-left. First 8 tiles use canvas spans; overflow tiles fall
 * back to balanced col-4 row-2.
 *
 * Mobile: stacked single column with first photo taller. Empty state for
 * owners; hidden for clients when no photos.
 */
export function AtelierGallery({
  media,
  owner,
  uploading,
  onUpload,
  onOpenPhoto,
}: AtelierGalleryProps) {
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

  return (
    <section
      id="photos"
      className="px-4 md:px-14 py-16 md:py-24"
      {...dropHandlers}
    >
      <div className="a-eyebrow mb-5">05 / Portfolio</div>
      <h2
        className="a-display mb-12"
        style={{
          fontSize: 'clamp(2.75rem, 7vw, 6rem)',
          lineHeight: 0.92,
          margin: '0 0 56px',
          letterSpacing: '-0.03em',
        }}
      >
        A few{' '}
        <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
          moments
        </span>
        .
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
          className="w-full py-20 flex flex-col items-center gap-3 transition-colors rounded-2xl"
          style={{
            background: dragOver ? 'var(--a-paper-2)' : 'transparent',
            border: '2px dashed var(--a-rule)',
            color: 'var(--a-mute)',
          }}
        >
          <ImagePlus className="w-8 h-8" />
          <span className="a-mono">
            {uploading > 0 ? 'Uploading…' : 'Add photos to the portfolio'}
          </span>
        </button>
      ) : (
        <>
          {/* Desktop asymmetric grid */}
          <div
            className="hidden md:grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(12, 1fr)',
              gridAutoRows: '160px',
            }}
          >
            {photos.map((g, i) => {
              const s = DESKTOP_SPANS[i] || { col: 4, row: 2 }
              return (
                <figure
                  key={g.id}
                  className="m-0 relative overflow-hidden"
                  style={{
                    gridColumn: `span ${s.col}`,
                    gridRow: `span ${s.row}`,
                    borderRadius: 12,
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
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <span
                    className="a-badge absolute left-4 bottom-4"
                    style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--a-ink)' }}
                  >
                    {padTwo(i + 1)}
                    {g.caption ? ` · ${g.caption.split(',')[0]}` : ''}
                  </span>
                </figure>
              )
            })}
          </div>

          {/* Mobile stacked */}
          <div className="md:hidden space-y-4">
            {photos.map((g, i) => (
              <figure
                key={g.id}
                className="m-0 relative overflow-hidden"
                style={{ borderRadius: 12 }}
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
                    style={{ height: i === 0 ? 360 : 240 }}
                  />
                </button>
                <span
                  className="a-badge absolute left-3 bottom-3"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    color: 'var(--a-ink)',
                  }}
                >
                  {padTwo(i + 1)}
                </span>
              </figure>
            ))}
          </div>

          {owner && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading > 0}
              className="mt-7 a-mono inline-flex items-center gap-2 hover:underline disabled:opacity-60"
              style={{ color: 'var(--a-coral)' }}
            >
              <ImagePlus className="w-4 h-4" />
              {uploading > 0 ? 'Uploading…' : 'Add more photos'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
