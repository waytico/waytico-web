'use client'

/**
 * Photo Bank — first-time copyright attestation step (TZ §7.3, paid-only).
 *
 * Stub: shown inside PhotoUploadModal when `users.photo_bank_attested_at`
 * is null. End-to-end attestation POST is wired through `postAttestation`
 * (paid endpoint). Not run in Stage 4 — free users never reach this step.
 */

import { useEffect, useState } from 'react'
import {
  getAttestationText,
  postAttestation,
  type AuthedFetch,
} from '@/lib/photo-bank-api'

export interface PhotoAttestationStepProps {
  authedFetch: AuthedFetch
  photoCount: number
  onAttested: () => void
  onCancel: () => void
}

export function PhotoAttestationStep(props: PhotoAttestationStepProps) {
  const { authedFetch, photoCount, onAttested, onCancel } = props
  const [text, setText] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAttestationText(authedFetch)
      .then((r) => setText(r.text))
      .catch((e: Error) => setError(e.message))
  }, [authedFetch])

  const handleConfirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await postAttestation(authedFetch, photoCount)
      onAttested()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to record attestation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-medium">Before you upload</h3>
      <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-3 text-xs leading-relaxed">
        {text ?? 'Loading…'}
      </pre>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>I understand and agree</span>
      </label>
      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!agreed || submitting || !text}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
