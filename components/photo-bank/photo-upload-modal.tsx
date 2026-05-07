'use client'

/**
 * Photo Bank — upload modal stub (TZ §7.3, paid-only).
 *
 * Composed of the attestation step (first-time only) + a drag-and-drop
 * queue that flows through `usePhotoBankUpload`. End-to-end upload
 * runs through `usePhotoBankUpload` → resize → presign → S3 PUT →
 * register, but the queue execution loop ships when the billing flow
 * lands. Stage 4 keeps the surface area for paid users while gating
 * everything behind `plan === 'paid'` at the page level.
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { PhotoAttestationStep } from './photo-attestation-step'
import { usePhotoBankUpload } from '@/hooks/use-photo-upload'
import type { AuthedFetch } from '@/lib/photo-bank-api'

export interface PhotoUploadModalProps {
  open: boolean
  onClose: () => void
  needsAttestation: boolean
  authedFetch: AuthedFetch
}

export function PhotoUploadModal(props: PhotoUploadModalProps) {
  const { open, onClose, needsAttestation, authedFetch } = props
  const [attested, setAttested] = useState(!needsAttestation)
  const { queue, enqueue } = usePhotoBankUpload()

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="mt-12 w-full max-w-xl rounded bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Upload to Photo Bank</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!attested ? (
          <PhotoAttestationStep
            authedFetch={authedFetch}
            photoCount={1}
            onAttested={() => setAttested(true)}
            onCancel={onClose}
          />
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files) enqueue(Array.from(e.target.files))
                e.target.value = ''
              }}
              className="block w-full text-sm"
            />
            {queue.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Drop or pick photos to start. The queue resizes them to 1600px
                JPEG q85 client-side and then PUT'ts to S3 directly.
              </p>
            ) : (
              <ul className="space-y-1 text-xs">
                {queue.map((q, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="truncate">{q.file.name}</span>
                    <span className="text-zinc-500">{q.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-amber-600">
              End-to-end upload runs when billing is enabled. (Stage 4 paid stub.)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
