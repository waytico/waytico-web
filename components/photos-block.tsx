'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import PhotoTile from './photo-tile'
import type { MediaRecord } from '@/lib/upload-photo'
import { ALLOWED_MIME, MAX_FILE_SIZE } from '@/lib/upload-photo'

type Props = {
  /** null = общий блок фото тура. Иначе = id дня. */
  dayId: string | null
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpen: (media: MediaRecord) => void
  emptyHint?: string
  /**
   * If provided, called instead of the normal upload path on every click
   * of the Add button or drop into the zone — *before* the file picker
   * opens or any drop is processed. Used for the anon-creator state:
   * we want the operator to see the "Sign up to edit" feedback the
   * moment they try, not after they pick a file.
   *
   * Returning anything is ignored — the intercept fully takes over the
   * action.
   */
  interceptUpload?: () => void
}

export default function PhotosBlock({
  dayId,
  media,
  owner,
  uploading,
  onUpload,
  onDelete,
  onOpen,
  emptyHint,
  interceptUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const triggerPicker = () => {
    if (interceptUpload) {
      interceptUpload()
      return
    }
    inputRef.current?.click()
  }

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

  // Нативный file-drop с диска. preventDefault в dragover обязателен
  // во всех случаях — иначе браузер отменит drop. Файлы проверяем в onDrop.
  // Если задан interceptUpload — drag-and-drop тоже короткозамыкается:
  // overlay не подсвечивается, drop отдаёт upstream-нудж вместо upload-а.
  const dropHandlers = owner
    ? {
        onDragEnter: (e: React.DragEvent) => {
          e.preventDefault()
          if (interceptUpload) return
          if (e.dataTransfer?.types?.includes('Files')) setIsDragOver(true)
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          if (interceptUpload) return
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        },
        onDragLeave: (e: React.DragEvent) => {
          if (e.currentTarget === e.target) setIsDragOver(false)
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          setIsDragOver(false)
          if (interceptUpload) {
            interceptUpload()
            return
          }
          const files = e.dataTransfer?.files
          if (files && files.length > 0) handleFiles(files)
        },
      }
    : {}

  const hasPhotos = media.length > 0 || uploading > 0
  // Не-owner без фото — блок не рендерим совсем
  if (!owner && !hasPhotos) return null

  return (
    <div
      {...dropHandlers}
      className={`relative rounded-lg transition-shadow ${
        isDragOver ? 'ring-2 ring-accent ring-offset-2' : ''
      }`}
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
          {Array.from({ length: uploading }).map((_, i) => (
            <div
              key={`up-${i}`}
              className="flex aspect-square items-center justify-center rounded-lg bg-secondary"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ))}
          {owner && (
            <button
              type="button"
              onClick={triggerPicker}
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
            onClick={triggerPicker}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs">{emptyHint || 'Add photos'}</span>
          </button>
        )
      )}
    </div>
  )
}
