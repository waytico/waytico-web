'use client'

/**
 * Photo Bank — Collector view.
 *
 * One tab that bundles the two operational concerns of the global
 * photo bank pipeline:
 *
 *   - Workers (top) — live status of the collector + ai_worker
 *     processes with pause/resume and "Reclassify all" action.
 *   - Targets (bottom) — the per-country plan: which cities and
 *     landmarks to fetch, weights, progress, and the "Generate
 *     targets" generator entry point.
 *   - Settings (between) — the collector pacing knobs (tick interval,
 *     targets per cycle, oversample, per-kind minimums, default plan).
 *
 * The inner panels render unchanged — this component is a thin
 * compositional wrapper so each section keeps its own data fetching
 * and refresh cadence.
 */

import type { AuthedFetch } from '@/hooks/use-admin-photo-review'
import { TargetsPanel } from './targets-panel'
import { WorkersPanel } from './workers-panel'
import { SettingsPanel } from './settings-panel'

interface Props {
  authedFetch: AuthedFetch
}

export function CollectorPanel({ authedFetch }: Props) {
  return (
    <div className="space-y-8">
      <WorkersPanel authedFetch={authedFetch} />
      <SettingsPanel authedFetch={authedFetch} />
      <TargetsPanel authedFetch={authedFetch} />
    </div>
  )
}
