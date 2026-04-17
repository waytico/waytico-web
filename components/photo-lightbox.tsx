'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Crop as CropIcon, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@clerk/nextjs'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { replacePhoto, type MediaRecord } from '@/lib/upload-photo'

type Props = {
  media: MediaRecord | null
  owner: boolean
  projectId: string | null
  onClose: () => void
  onReplaced: (updated: MediaRecord) => void
}

type Mode = 'view' | 'edit'

export default function PhotoLightbox({
  media,
  owner,
  projectId,
  onClose,
  onReplaced,
}: Props) {
  const { getToken } = useAuth()
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [mode, setMode] = useState<Mode>('view')
  const [crop, setCrop] = useState<Crop>()
  const [saving, setSaving] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Reset when opening a different photo
  useEffect(() => {
    setMode('view')
    setCrop(undefined)
    setSaving(false)
  }, [media?.id])

  // Load image as blob URL when entering edit mode — avoids tainted-canvas / cache quirks
  useEffect(() => {
    if (mode !== 'edit' || !media) return
    let revoke: string | null = null
    let cancelled = false
    setLoadingEdit(true)
    ;(async () => {
      try {
        const res = await fetch(media.url, { mode: 'cors', cache: 'reload' })
        if (!res.ok) throw new Error(`Fetch failed ${res.status}`)
        const b = await res.blob()
        if (cancelled) return
        const u = URL.createObjectURL(b)
        revoke = u
        setBlobUrl(u)
      } catch (e: any) {
        if (!cancelled) {
          toast.error('Could not load image for editing')
          setMode('view')
        }
      } finally {
        if (!cancelled) setLoadingEdit(false)
      }
    })()
    return () => {
      cancelled = true
      if (revoke) URL.revokeObjectURL(revoke)
      setBlobUrl(null)
    }
  }, [mode, media?.url, media])

  // Esc: cancel crop or close
  useEffect(() => {
    if (!media) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (mode === 'edit') setMode('view')
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [media, mode, onClose])

  if (!media) return null

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    const initial = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, w / h, w, h),
      w,
      h,
    )
    setCrop(initial)
  }

  const applyCrop = async () => {
    if (!media || !imgRef.current || !crop || !projectId) return
    if (crop.width === 0 || crop.height === 0) {
      toast.error('Select an area to crop')
      return
    }
    setSaving(true)
    try {
      const img = imgRef.current
      const unit = crop.unit || 'px'
      const pxCrop =
        unit === '%'
          ? {
              x: (crop.x / 100) * img.naturalWidth,
              y: (crop.y / 100) * img.naturalHeight,
              width: (crop.width / 100) * img.naturalWidth,
              height: (crop.height / 100) * img.naturalHeight,
            }
          : {
              x: (crop.x * img.naturalWidth) / img.width,
              y: (crop.y * img.naturalHeight) / img.height,
              width: (crop.width * img.naturalWidth) / img.width,
              height: (crop.height * img.naturalHeight) / img.height,
            }

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(pxCrop.width)
      canvas.height = Math.round(pxCrop.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas unavailable')
      ctx.drawImage(
        img,
        pxCrop.x,
        pxCrop.y,
        pxCrop.width,
        pxCrop.height,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      const srcMime = media.mime_type || 'image/jpeg'
      const outMime = srcMime === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = outMime === 'image/jpeg' ? 0.9 : undefined
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          outMime,
          quality,
        ),
      )

      const token = await getToken()
      if (!token) throw new Error('Sign in again')

      const baseName = (media.file_name || 'photo').replace(/\.[^.]+$/, '')
      const ext = outMime === 'image/png' ? 'png' : 'jpg'
      const newName = `${baseName}-cropped.${ext}`

      const updated = await replacePhoto(projectId, media.id, blob, newName, token, {
        width: canvas.width,
        height: canvas.height,
      })
      onReplaced(updated)
      toast.success('Photo updated')
      setMode('view')
    } catch (e: any) {
      toast.error(e?.message || 'Could not save crop')
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (saving) return
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={close}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between gap-2 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {owner && mode === 'view' && (
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              <CropIcon className="h-4 w-4" />
              Crop
            </button>
          )}
          {owner && mode === 'edit' && (
            <>
              <button
                type="button"
                disabled={saving || loadingEdit || !blobUrl}
                onClick={applyCrop}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setMode('view')}
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-60"
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          disabled={saving}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-60"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[85vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
        {mode === 'edit' ? (
          loadingEdit || !blobUrl ? (
            <div className="flex flex-col items-center gap-3 text-white/80">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading image…</span>
            </div>
          ) : (
            <ReactCrop
              crop={crop}
              onChange={(_, pct) => setCrop(pct)}
              keepSelection
              className="max-h-[85vh]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={blobUrl}
                alt={media.caption || media.file_name || 'Trip photo'}
                onLoad={onImageLoad}
                className="max-h-[85vh] max-w-full object-contain"
                draggable={false}
              />
            </ReactCrop>
          )
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={media.url}
            alt={media.caption || media.file_name || 'Trip photo'}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}
      </div>
    </div>
  )
}
