'use client'

/**
 * Admin photo bank — single Library view + adjacent operational tabs.
 *
 * The old split (Review queue / Browse library) collapsed into one
 * Library tab — the same filter strip handles country / city / search
 * / reviewed-state, and every card has Keep / Delete / inline edit.
 *
 * Adjacent tabs: Collector (workers status + targets plan in one
 * place), Model test (utility). Each tab is URL-controlled via
 * ?view= so a bookmark lands on the right view. Legacy bookmarks to
 * the old separate Targets / Workers views fold into Collector.
 */

import { useCallback, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import type { AuthedFetch } from '@/hooks/use-admin-photo-review'
import { LibraryPanel } from './_components/library-panel'
import { CollectorPanel } from './_components/collector-panel'
import { ModelTestPanel } from './_components/model-test-panel'

type View = 'library' | 'collector' | 'model-test'

export default function AdminPhotoBankPage() {
  const { getToken } = useAuth()

  const authedFetch: AuthedFetch = useCallback(
    async (path, init) => {
      const token = await getToken().catch(() => null)
      const headers = new Headers(init?.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(path, { ...init, headers })
    },
    [getToken],
  )

  const searchParams = useSearchParams()
  const router = useRouter()

  // Deeplink from /admin/photo-bank/crawl — "Show photos from this crawl".
  const idsCsv = searchParams.get('ids') ?? ''
  const ids = useMemo(
    () =>
      idsCsv
        ? idsCsv
            .split(',')
            .map((s) => s.trim())
            .filter((s) => /^[0-9a-fA-F-]{36}$/.test(s))
        : [],
    [idsCsv],
  )
  const idsActive = ids.length > 0

  // Optional explicit reviewed= override in the URL (legacy bookmarks).
  const reviewedQuery = searchParams.get('reviewed') as
    | 'true'
    | 'false'
    | 'all'
    | null

  // ── View tab state ──────────────────────────────────────────────
  // Legacy URLs:
  //   ?view=review / ?view=browse → Library (the older split)
  //   ?view=targets / ?view=workers → Collector (the current merge)
  const viewQuery = searchParams.get('view')
  const view: View =
    viewQuery === 'collector' ||
    viewQuery === 'targets' ||
    viewQuery === 'workers'
      ? 'collector'
      : viewQuery === 'model-test'
        ? 'model-test'
        : 'library'

  const setView = (next: View) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (next === 'library') sp.delete('view')
    else sp.set('view', next)
    const qs = sp.toString()
    router.push(qs ? `/admin/photo-bank?${qs}` : '/admin/photo-bank')
  }

  const clearIdsFilter = () => router.push('/admin/photo-bank')

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-zinc-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView('library')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'library'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => setView('collector')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'collector'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Collector
          </button>
          <button
            type="button"
            onClick={() => setView('model-test')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'model-test'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Model test
          </button>
        </div>
      </div>

      {view === 'library' && (
        <>
          {idsActive && (
            <div className="mb-3 flex items-center justify-between rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span>
                Showing <strong>{ids.length}</strong> photo
                {ids.length === 1 ? '' : 's'} from one crawl run.
              </span>
              <button
                type="button"
                onClick={clearIdsFilter}
                className="inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-2 py-0.5 text-xs hover:bg-amber-100"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          )}
          <LibraryPanel
            authedFetch={authedFetch}
            ids={idsActive ? ids : undefined}
            initialReviewed={reviewedQuery ?? undefined}
          />
        </>
      )}

      {view === 'collector' && <CollectorPanel authedFetch={authedFetch} />}
      {view === 'model-test' && <ModelTestPanel authedFetch={authedFetch} />}
    </div>
  )
}
