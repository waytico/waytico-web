'use client'

/**
 * Photo Bank — dashboard page (TZ §7).
 *
 * Tier-aware:
 *   - Free  → upgrade banner + read-only global preview + filters.
 *   - Paid  → full management UI (quota bar, upload modal, paid grid,
 *             detail modal). Stub-grade — components import cleanly,
 *             render without crashing, but end-to-end upload/edit run
 *             ships with the billing flow per Execution policy.
 *
 * Free users never call the paid endpoints — `useUserPlan` resolves
 * `plan='free'` for everyone today (default in users.plan), so the
 * paid branch only becomes reachable when the operator's row flips
 * to `plan='paid'`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

import { PhotoBankUpgradeBanner } from '@/components/photo-bank/upgrade-banner'
import { PhotoFilters } from '@/components/photo-bank/photo-filters'
import { GlobalPhotoCard } from '@/components/photo-bank/global-photo-card'
import { PhotoBankGrid } from '@/components/photo-bank/photo-bank-grid'
import { QuotaBar } from '@/components/photo-bank/quota-bar'
import { PhotoCard } from '@/components/photo-bank/photo-card'
import { PhotoDetailModal } from '@/components/photo-bank/photo-detail-modal'
import { PhotoUploadModal } from '@/components/photo-bank/photo-upload-modal'
import {
  listGlobalPhotos,
  listUserPhotos,
  getQuota,
  type GlobalPhotoItem,
  type UserPhotoItem,
  type AuthedFetch,
} from '@/lib/photo-bank-api'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface PhotoBankPageClientProps {
  /** Plan resolved on the parent page from /api/users/me. Free is the
   *  default; paid flips when the future Stripe upgrade flow lands. */
  plan: 'free' | 'paid'
  /** When the operator hasn't yet attested copyright; controls whether
   *  the upload modal opens straight to the picker or to the
   *  attestation step. Paid-only — undefined for free. */
  needsAttestation?: boolean
}

export default function PhotoBankPageClient(props: PhotoBankPageClientProps) {
  const { plan, needsAttestation = true } = props
  const isPaid = plan === 'paid'
  const { getToken } = useAuth()

  // Single auth wrapper used by every API call. apiFetch in lib/api
  // drops the Bearer in for /api/* — but the Photo Bank endpoints sit
  // on a different host (NEXT_PUBLIC_API_URL → onrender.com), so we
  // attach the token explicitly.
  const authedFetch: AuthedFetch = useCallback(
    async (path, init) => {
      const token = await getToken().catch(() => null)
      const headers = new Headers(init?.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(path, { ...init, headers })
    },
    [getToken],
  )

  // Filters — shared shape between free и paid UIs.
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [region, setRegion] = useState('')

  // ── Free: global preview ─────────────────────────────────────────
  const [globalPhotos, setGlobalPhotos] = useState<GlobalPhotoItem[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    if (isPaid) return
    setGlobalLoading(true)
    setGlobalError(null)
    listGlobalPhotos(authedFetch, { search, category, region, limit: 24 })
      .then((r) => setGlobalPhotos(r.photos))
      .catch((e: Error) => setGlobalError(e.message))
      .finally(() => setGlobalLoading(false))
  }, [isPaid, authedFetch, search, category, region])

  // ── Paid: user-bank list + quota ─────────────────────────────────
  const [userPhotos, setUserPhotos] = useState<UserPhotoItem[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ used: number; limit: number; count: number } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detailPhoto, setDetailPhoto] = useState<UserPhotoItem | null>(null)

  useEffect(() => {
    if (!isPaid) return
    setUserLoading(true)
    setUserError(null)
    Promise.all([
      listUserPhotos(authedFetch, { search, category, region, limit: 50 }),
      getQuota(authedFetch),
    ])
      .then(([list, q]) => {
        setUserPhotos(list.photos)
        setQuota({ used: q.usedBytes, limit: q.limitBytes, count: q.photoCount })
      })
      .catch((e: Error) => setUserError(e.message))
      .finally(() => setUserLoading(false))
  }, [isPaid, authedFetch, search, category, region])

  const filtersBlock = (
    <PhotoFilters
      search={search}
      onSearchChange={setSearch}
      category={category}
      onCategoryChange={setCategory}
      region={region}
      onRegionChange={setRegion}
    />
  )

  // ─────────────────────────────────────────────────────────────────
  // Free render
  // ─────────────────────────────────────────────────────────────────
  if (!isPaid) {
    return (
      <div>
        <PhotoBankUpgradeBanner />
        {filtersBlock}
        {globalLoading && (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2">Loading global preview…</span>
          </div>
        )}
        {globalError && (
          <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">
            {globalError}
          </div>
        )}
        {!globalLoading && !globalError && (
          <PhotoBankGrid>
            {globalPhotos.map((p) => (
              <GlobalPhotoCard key={p.id} photo={p} />
            ))}
          </PhotoBankGrid>
        )}
        {!globalLoading && !globalError && globalPhotos.length === 0 && (
          <div className="py-8 text-center text-sm text-zinc-500">
            No photos match your filters yet. Try a broader search.
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // Paid render — stub-grade per TZ Stage 4 (TZ Execution policy)
  // ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {quota && (
        <QuotaBar
          usedBytes={quota.used}
          limitBytes={quota.limit}
          photoCount={quota.count}
        />
      )}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Your Photo Bank</h2>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
        >
          Upload
        </button>
      </div>
      {filtersBlock}
      {userLoading && (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2">Loading your photos…</span>
        </div>
      )}
      {userError && (
        <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          {userError}
        </div>
      )}
      {!userLoading && !userError && (
        <PhotoBankGrid>
          {userPhotos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              onEdit={(ph) => setDetailPhoto(ph)}
            />
          ))}
        </PhotoBankGrid>
      )}
      <PhotoUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        needsAttestation={needsAttestation}
        authedFetch={authedFetch}
      />
      <PhotoDetailModal
        photo={detailPhoto}
        onClose={() => setDetailPhoto(null)}
      />
    </div>
  )
}
