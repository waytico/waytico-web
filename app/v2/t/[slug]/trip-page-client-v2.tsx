/**
 * Trip page v2 — client component (stage 1).
 *
 * Stage 1 scope:
 *   - SSR-fetched payload mounted into local state
 *   - Mode resolution (public / owner / anon / showcase)
 *   - Owner detection via the existing useTripData hook (probes
 *     /api/projects/:id/full when signed in)
 *   - Anon-creator detection via sessionStorage flag
 *   - Showcase detection via slug
 *   - Skeleton theme rendered through TripHostV2
 *   - Header / ShowcaseBanner shown for owner / showcase respectively
 *
 * Stage 3 adds the rest of the chrome (TripActionBar, ClientInfo,
 * TripCommandBar, TripFooter, ArchiveDialog, AnonUpsellModal, modals,
 * ScrollToTop) plus mutations and photo upload. The chrome-v2 copies
 * already exist in the repo and tsc-validate alongside this file —
 * they will be wired in once the Magazine theme has owner-mode
 * placeholders to drive.
 */
'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/chrome-v2/header'
import { ShowcaseBanner } from '@/components/chrome-v2/showcase-pills'
import { TripHostV2 } from '@/components/trip-host-v2'
import { useTripData } from '@/hooks/use-trip-data'
import type { MediaRecord } from '@/hooks/use-photo-upload'
import type { TripDataV2, TripMode } from '@/types/theme-v2'

const SHOWCASE_SLUG = 'paris-weekend-getaway'

type Props = {
  slug: string
  initialData: TripDataV2 | null
}

export default function TripPageClientV2({ slug, initialData }: Props) {
  // Top-level payload state — owned here, mutated by useTripData.
  const [data, setData] = useState<TripDataV2 | null>(initialData)
  const [tasks, setTasks] = useState<unknown[]>(initialData?.tasks ?? [])
  const [media, setMedia] = useState<MediaRecord[]>(
    (initialData?.media ?? []) as MediaRecord[]
  )
  const [isOwner, setIsOwner] = useState(false)
  const [isAnonCreator, setIsAnonCreator] = useState(false)
  // ownerRefreshKey is bumped after the claim flow attaches user_id; on
  // stage 1 we never bump it, but useTripData expects the prop.
  const [ownerRefreshKey] = useState(0)

  const isShowcase = data?.project?.slug === SHOWCASE_SLUG

  // Anon-creator detection. The home-page chat-flow stores
  // `waytico:anon-owns-{projectId}=1` in sessionStorage when a signed-out
  // visitor creates a quote; on this page we honour it so the visitor
  // sees owner-style placeholders even without auth.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pid = data?.project?.id
    if (!pid) return
    const anonOwns = sessionStorage.getItem(`waytico:anon-owns-${pid}`)
    if (anonOwns === '1') {
      setIsAnonCreator(true)
      setIsOwner(true)
    }
  }, [data?.project?.id])

  // Showcase forces isOwner=true so the demo trip can render the editable
  // surfaces. useTripMutations / usePhotoUpload short-circuit those edits
  // into local state via the isShowcase flag (wired in stage 3).
  useEffect(() => {
    if (isShowcase) setIsOwner(true)
  }, [isShowcase])

  // Owner-detect through GET /api/projects/:id/full. The hook also
  // handles polling for status='generating' and refresh-on-edit, both
  // wired up to the same setData/setTasks/setMedia setters above.
  useTripData({
    slug,
    initialData: data as never,
    setData: setData as never,
    setTasks: setTasks as never,
    setMedia,
    isOwner,
    setIsOwner,
    projectId: data?.project?.id,
    ownerRefreshKey,
  })

  // Reference local state we don't yet read from the chrome — silences
  // unused-variable warnings while keeping the wiring ready for stage 3.
  void tasks
  void media

  if (!data) {
    return (
      <main
        style={{
          padding: '64px 24px',
          fontFamily: 'ui-monospace, monospace',
          textAlign: 'center',
          color: '#6B5F58',
        }}
      >
        Trip not found.
      </main>
    )
  }

  const mode: TripMode = isShowcase
    ? 'showcase'
    : isAnonCreator
      ? 'anon'
      : isOwner
        ? 'owner'
        : 'public'

  return (
    <>
      {/* Stage 1 chrome — Header for owners, ShowcaseBanner for the demo.
          Full chrome (TripActionBar, ClientInfo, TripCommandBar, modals,
          TripFooter, ScrollToTop) is wired into chrome-v2 copies and
          tsc-validates here, but is rendered starting in stage 3 once
          owner-mode mutations have something to drive. */}
      {mode === 'owner' && <Header />}
      {mode === 'showcase' && <ShowcaseBanner />}

      <TripHostV2 data={data} mode={mode} />
    </>
  )
}
