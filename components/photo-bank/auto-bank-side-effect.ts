'use client'

/**
 * Photo Bank — drag-to-trip auto-bank side-effect.
 *
 * Called after a successful `POST /api/projects/:id/media` (the regular
 * trip-page upload flow) when the operator is paid. Mirrors the freshly
 * uploaded media into the operator's photo bank via
 * `POST /api/photo-bank/import-from-trip`. Server-side this is an S3
 * CopyObject (no bytes through us) plus an INSERT into `photo_bank`.
 *
 * **Paid-only** — caller gates by `userPlan === 'paid'`; for free users
 * this hook is a no-op. Failures are silent: this is a side-effect, not
 * critical for the trip itself, and the import endpoint is idempotent
 * via `(user_id, phash)` dedup.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

export interface AutoBankInput {
  tripMediaId: string
  /** Caller-supplied auth header builder. Photo Bank endpoints sit
   *  behind `requirePaid`, which reads the Clerk Bearer token via
   *  `verifyToken`; the regular site `apiFetch` already attaches it.
   *  We accept any function that returns a Promise<Response> so the
   *  call site can plug in either `apiFetch` or a Clerk-aware
   *  wrapper. */
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>
}

export async function autoBankAfterMediaCreate(
  input: AutoBankInput,
): Promise<void> {
  const url = `${API_URL}/api/photo-bank/import-from-trip`
  try {
    const res = await input.authedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripMediaId: input.tripMediaId }),
    })
    if (!res.ok) {
      // 403 = free tier (caller should have gated). 400 = trip media
      // url is not on the Waytico bucket. Both are silent — this is a
      // best-effort side-effect.
      return
    }
  } catch {
    // network blip — skip silently.
  }
}
