'use client'

/**
 * Photo Bank picker modal — paid-tier inline picker for the trip page
 * (TZ Photo Bank Stage 6 §9.3).
 *
 * Used in two surfaces today:
 *   1. HeroDropZone overlay → "Choose from Photo Bank" action.
 *   2. MagazineDayPhoto overlay → "Choose from Photo Bank" pill.
 *
 * Compact grid; lists the operator's bank via `GET /api/photo-bank` and
 * calls `onPick(photo)` when one is clicked. Caller persists the
 * selection by:
 *   - Hero: PATCH /api/projects/:id with cover_image_url, OR upload
 *     pipeline that creates a placement='hero' trip_media row.
 *   - Day: POST /api/projects/:id/media with type=photo, day_id, url.
 *
 * **Paid-only** — gated by the caller (we don't render this modal for
 * free users). The component itself doesn't enforce the gate; the
 * `requirePaid` middleware on the backend endpoint does. If a free
 * user somehow opens it the list call returns 403 and we surface the
 * "Upgrade required" banner.
 */

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

export interface PhotoBankItem {
  id: string
  cdn_url: string
  manual_caption: string | null
  ai_description: string | null
  ai_tags: string[]
  pin_region: string | null
  pin_landmark: string | null
}

export interface PhotoBankPickerModalProps {
  open: boolean
  onClose: () => void
  onPick: (photo: PhotoBankItem) => void
  /** Optional fetch wrapper that the caller can pass (e.g. with a Clerk
   *  Authorization header). When omitted we fall back to a bare `fetch`,
   *  which works for the dev-fallback x-user-id flow but not in
   *  production paid sessions. */
  authedFetch?: (path: string) => Promise<Response>
}

export function PhotoBankPickerModal(props: PhotoBankPickerModalProps) {
  const { open, onClose, onPick, authedFetch } = props
  const [photos, setPhotos] = useState<PhotoBankItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    const url = `${API_URL}/api/photo-bank?limit=60`
    const doFetch = authedFetch ?? ((p: string) => fetch(p))
    doFetch(url)
      .then(async (r) => {
        if (r.status === 403) {
          throw new Error('Upgrade required to use Photo Bank')
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((j: any) => setPhotos(Array.isArray(j.photos) ? j.photos : []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [open, authedFetch])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="mt-12 max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Choose from Photo Bank</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        {loading && (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2">Loading…</span>
          </div>
        )}
        {error && (
          <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}
        {!loading && !error && photos.length === 0 && (
          <div className="py-8 text-center text-sm text-zinc-500">
            Your Photo Bank is empty. Upload photos from /dashboard?tab=photos.
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onPick(p)
                onClose()
              }}
              className="group relative aspect-square overflow-hidden rounded border border-zinc-200 hover:border-zinc-400"
            >
              <img
                src={p.cdn_url}
                alt={p.manual_caption || p.ai_description || ''}
                className="h-full w-full object-cover transition group-hover:scale-105"
                draggable={false}
              />
              {(p.pin_region || p.pin_landmark) && (
                <span className="absolute left-1 top-1 rounded bg-blue-600/90 px-1 text-[10px] uppercase text-white">
                  Pinned
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
