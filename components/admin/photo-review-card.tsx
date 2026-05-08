'use client'

/**
 * Admin photo review card — TZ Photo Bank Stage 10 Block D.
 *
 * Single row in the review grid. Two big buttons (Keep / Delete) +
 * inline metadata expander (city/country/region edit) + license badge.
 * Keyboard handler is owned by the parent hook (use-admin-photo-review)
 * — this component only emits onApprove / onDelete / onSave.
 */

import { useState } from 'react'
import { Pencil, Check, Trash2, X } from 'lucide-react'
import { AttributionPopover } from '@/components/trip/attribution-popover'

export interface ReviewPhoto {
  id: string
  cdn_url: string
  ai_description: string | null
  ai_categories: string[]
  ai_tags: string[]
  ai_landmarks: string[]
  city: string | null
  country: string | null
  region: string | null
  license: string
  attribution_html: string | null
  reviewed_at: string | null
}

export interface PhotoReviewCardProps {
  photo: ReviewPhoto
  focused?: boolean
  busy?: boolean
  onApprove: (id: string) => void
  onDelete: (id: string) => void
  onSave: (
    id: string,
    patch: { city?: string | null; country?: string | null; region?: string | null },
  ) => void
}

export function PhotoReviewCard(props: PhotoReviewCardProps) {
  const { photo, focused, busy, onApprove, onDelete, onSave } = props
  const [editing, setEditing] = useState(false)
  const [city, setCity] = useState(photo.city ?? '')
  const [country, setCountry] = useState(photo.country ?? '')
  const [region, setRegion] = useState(photo.region ?? '')

  return (
    <div
      className={
        'flex flex-col gap-2 rounded border bg-white p-2 transition-shadow ' +
        (focused ? 'border-zinc-900 shadow-md' : 'border-zinc-200')
      }
      data-photo-id={photo.id}
    >
      <div className="relative aspect-square overflow-hidden rounded bg-zinc-100">
        <img
          src={photo.cdn_url}
          alt={photo.ai_description || ''}
          loading="lazy"
          className="h-full w-full object-cover"
          draggable={false}
        />
        <span className="absolute left-1 top-1 rounded bg-zinc-900/75 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white">
          {photo.license}
        </span>
        {photo.city && (
          <span className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-zinc-700">
            {photo.city}
          </span>
        )}
        <span className="absolute bottom-1 right-1">
          <AttributionPopover html={photo.attribution_html} />
        </span>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-zinc-600">
        {photo.ai_categories.slice(0, 2).map((c) => (
          <span key={c} className="rounded bg-zinc-100 px-1.5 py-0.5">{c.replace(/_/g, ' ')}</span>
        ))}
        {photo.ai_categories.length > 2 && (
          <span className="text-zinc-400">+{photo.ai_categories.length - 2}</span>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="ml-auto rounded p-1 text-zinc-500 hover:bg-zinc-100"
          aria-label="Edit metadata"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="space-y-1 text-xs">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="block w-full rounded border border-zinc-300 px-2 py-1"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="block w-full rounded border border-zinc-300 px-2 py-1"
          />
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Region"
            className="block w-full rounded border border-zinc-300 px-2 py-1"
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setCity(photo.city ?? '')
                setCountry(photo.country ?? '')
                setRegion(photo.region ?? '')
              }}
              className="rounded border border-zinc-300 px-2 py-0.5"
            >
              <X className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(photo.id, {
                  city: city || null,
                  country: country || null,
                  region: region || null,
                })
                setEditing(false)
              }}
              className="rounded bg-zinc-900 px-2 py-0.5 text-white"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => onApprove(photo.id)}
          className="rounded bg-emerald-600 px-2 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Keep
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(photo.id)}
          className="flex items-center justify-center gap-1 rounded bg-red-600 px-2 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  )
}
