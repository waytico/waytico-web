'use client'

/**
 * use-photo-upload — Photo Bank upload queue hook (TZ Photo Bank Stage 4 §7.3).
 *
 * NOTE: this file is the new dashboard-level upload hook for the Photo
 * Bank. It is DIFFERENT from `hooks/use-photo-upload.ts`-named hook
 * referenced by trip-page-client (which lives at `@/hooks/use-photo-upload`
 * and handles per-trip media). To avoid a name collision the Photo
 * Bank hook is exported from this file under a fully-qualified name —
 * we DON'T overwrite the trip-page hook.
 *
 * Stub-level. Paid path code-only; queue/resize/EXIF wiring lives here
 * for future end-to-end run when billing is enabled.
 */

import { useCallback, useState } from 'react'
import { resizeForUpload } from '@/lib/image-resize'
import { readExif } from '@/lib/exif-extract'

export interface PhotoBankUploadItem {
  file: File
  resized?: Blob
  width?: number
  height?: number
  takenAt?: string | null
  status: 'queued' | 'resizing' | 'uploading' | 'registering' | 'done' | 'error'
  progress: number
  error?: string
}

export function usePhotoBankUpload() {
  const [queue, setQueue] = useState<PhotoBankUploadItem[]>([])

  const enqueue = useCallback(async (files: File[]) => {
    const items: PhotoBankUploadItem[] = files.map((f) => ({
      file: f,
      status: 'queued',
      progress: 0,
    }))
    setQueue((q) => [...q, ...items])
    // Resize + EXIF in parallel to give the user immediate feedback.
    for (const it of items) {
      try {
        const [resize, exif] = await Promise.all([
          resizeForUpload(it.file),
          readExif(it.file),
        ])
        // Mutate the queue entry in place; setQueue re-renders the
        // progress card. Lazy-evaluated; full upload pipeline ships
        // when billing flow lands.
        setQueue((q) =>
          q.map((qi) =>
            qi.file === it.file
              ? {
                  ...qi,
                  resized: resize.blob,
                  width: resize.width || undefined,
                  height: resize.height || undefined,
                  takenAt: exif.takenAt,
                  status: 'queued',
                }
              : qi,
          ),
        )
      } catch (err: any) {
        setQueue((q) =>
          q.map((qi) =>
            qi.file === it.file
              ? { ...qi, status: 'error', error: err?.message ?? 'pipeline error' }
              : qi,
          ),
        )
      }
    }
  }, [])

  return { queue, enqueue }
}
