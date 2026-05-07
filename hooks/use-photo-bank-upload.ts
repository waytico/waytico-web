'use client'

/**
 * use-photo-bank-upload — Photo Bank upload queue hook (TZ Photo Bank Stage 4 §7.3).
 *
 * NOTE: distinct from `hooks/use-photo-upload.ts`, which handles per-trip
 * media on the trip-page. This Photo Bank hook lives here so the two
 * names never collide on the import path. Stub-level — paid path
 * code-only; queue/resize/EXIF wiring is in place for the future
 * billing flow but not run end-to-end in Stage 4.
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
    for (const it of items) {
      try {
        const [resize, exif] = await Promise.all([
          resizeForUpload(it.file),
          readExif(it.file),
        ])
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
