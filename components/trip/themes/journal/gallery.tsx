'use client'

import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaRecord } from '@/lib/upload-photo'
import { padTwo } from '@/lib/trip-format'

type JournalGalleryProps = {
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onOpenPhoto: (m: MediaRecord) => void
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

// Canvas magazine-spread spans for the first 8 tiles. Any additional photos
// fall back to a balanced default.
const DESKTOP_SPANS: Array<{ col: number; row: number }> = [
  { col: 7, row: 3 },
  { col: 5, row: 2 },
  { col: 5, row: 2 },
  { col: 4, row: 2 },
  { col: 4, row: 2 },
  { col: 4, row: 2 },
  { col: 6, row: 2 },
  { col: 6, row: 2 },
]

/**
 * Journal — Gallery (Chapter V · "A portfolio").
 *
 * Shows ALL trip photos except hero (matches TZ-5 Q2 answer: dupe with
 * per-day thumbnails is intentional). On desktop uses a 12-col asymmetric
 * grid with the canvas spans; mobile falls back to a single column with
 * alternating heights. Empty state visible only to owner.
 */
export function JournalGallery({
  media,
  owner,
  uploading,
  onUpload,
  onOpenPhoto,
}: JournalGalleryProps) {
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
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px]"
      {...dropHandlers}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 mb-12 md:mb-16">
        <div>
          <div className="j-eyebrow">Chapter V</div>
          <h2
            className="j-serif"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              lineHeight: 0.95,
              margin: '20px 0 0',
              letterSpacing: '-0.02em',
            }}
          >
            <em>A portfolio.</em>
          </h2>
        </div>
        <div
          className="j-serif j-italic"
          style={{ color: 'var(--j-ink-mute)', fontSize: 18 }}
        >
          {photos.length} photograph{photos.length === 1 ? '' : 's'}
        </div>
      </div>

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
        /* Empty state — owner only */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-20 border-2 border-dashed flex flex-col items-center gap-3 transition-colors"
          style={{
            borderColor: dragOver ? 'var(--j-terra)' : 'var(--j-rule)',
            background: dragOver ? 'var(--j-paper)' : 'transparent',
            color: 'var(--j-ink-mute)',
          }}
          disabled={uploading > 0}
        >
          <ImagePlus className="w-8 h-8" />
          <span className="j-mono">
            {uploading > 0 ? 'Uploading…' : 'Add photos to the gallery'}
          </span>
        </button>
      ) : (
        <>
          {/* Desktop: asymmetric 12-col grid */}
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
                  className="j-gallery-item m-0 relative"
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
                    <img src={g.url} alt={g.caption || ''} />
                  </button>
                  <figcaption
                    className="j-mono absolute left-4 bottom-4 text-white px-2.5 py-1.5"
                    style={{
                      background: 'rgba(28,24,19,0.7)',
                      fontSize: 10,
                    }}
                  >
                    {padTwo(i + 1)}
                    {g.caption ? ` · ${g.caption}` : ''}
                  </figcaption>
                </figure>
              )
            })}
          </div>

          {/* Mobile: stacked, first is tall */}
          <div className="md:hidden space-y-5">
            {photos.map((g, i) => (
              <figure
                key={g.id}
                className="j-gallery-item m-0 relative"
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
                    style={{
                      height: i === 0 ? 420 : 260,
                      objectFit: 'cover',
                      width: '100%',
                      display: 'block',
                    }}
                  />
                </button>
                <figcaption
                  className="j-mono mt-2"
                  style={{ fontSize: 9, color: 'var(--j-ink-mute)' }}
                >
                  Fig. {padTwo(i + 1)}
                  {g.caption ? ` — ${g.caption}` : ''}
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Owner: add more photos button */}
          {owner && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading > 0}
              className="mt-8 j-mono inline-flex items-center gap-1.5 hover:underline disabled:opacity-60"
              style={{ color: 'var(--j-ink-mute)' }}
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {uploading > 0 ? 'Uploading…' : 'Add more photos'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
