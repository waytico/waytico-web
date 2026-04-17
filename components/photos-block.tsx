'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import PhotoTile from './photo-tile'
import type { MediaRecord } from '@/lib/upload-photo'
import { ALLOWED_MIME, MAX_FILE_SIZE } from '@/lib/upload-photo'

type Props = {
  /** null = unassigned gallery (drop here to detach). Otherwise = the day id. */
  dayId: string | null
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onDrop: (mediaId: string, dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpen: (media: MediaRecord) => void
  /** Custom wrapper className (e.g., layout grid size). */
  className?: string
  emptyHint?: string
}

export default function PhotosBlock({
  dayId,
  media,
  owner,
  uploading,
  onUpload,
  onDrop,
  onDelete,
  onOpen,
  className,
  emptyHint,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const list = Array.from(files).slice(0, 10)
    const invalid = list.filter((f) => !ALLOWED_MIME.includes(f.type) || f.size > MAX_FILE_SIZE)
    if (invalid.length) {
      toast.error(`${invalid.length} file(s) skipped — use JPEG/PNG/WebP, max 15MB`)
    }
    const valid = list.filter((f) => ALLOWED_MIME.includes(f.type) && f.size <= MAX_FILE_SIZE)
    if (valid.length) onUpload(valid, dayId)
  }

  // Drop targets accept media drags (reorder) + native file drops (upload from disk)
  const dropHandlers = owner
    ? {
        onDragEnter: (e: React.DragEvent) => {
          e.preventDefault()
          setIsDragOver(true)
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        },
        onDragLeave: (e: React.DragEvent) => {
          // Only clear when leaving the container, not when crossing children
          if (e.currentTarget === e.target) setIsDragOver(false)
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          setIsDragOver(false)
          // Photo reorder?
          const mediaId = e.dataTransfer.getData('text/media-id')
          if (mediaId) {
            onDrop(mediaId, dayId)
            return
          }
          // Native file drop?
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files)
          }
        },
      }
    : {}

  const hasPhotos = media.length > 0 || uploading > 0
  const showSection = owner || hasPhotos
  if (!showSection) return null

  return (
    <div
      {...dropHandlers}
      className={`relative rounded-lg transition-colors ${
        isDragOver ? 'ring-2 ring-accent ring-offset-2' : ''
      } ${className || ''}`}
    >
      {owner && (
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      )}

      {hasPhotos ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {media.map((m) => (
            <PhotoTile
              key={m.id}
              media={m}
              owner={owner}
              onOpen={() => onOpen(m)}
              onDelete={() => onDelete(m.id)}
            />
          ))}
          {/* Upload placeholders */}
          {Array.from({ length: uploading }).map((_, i) => (
            <div
              key={`up-${i}`}
              className="flex aspect-square items-center justify-center rounded-lg bg-secondary"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ))}
          {/* Upload tile — always last (owner only) */}
          {owner && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              aria-label="Upload photos"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px] uppercase tracking-wider">Add</span>
            </button>
          )}
        </div>
      ) : (
        owner && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs">
              {emptyHint || 'Upload photos or drag here'}
            </span>
          </button>
        )
      )}
    </div>
  )
}
