'use client'

/**
 * Photo Bank — Collector view.
 *
 * Composes the three operational sub-panels of the global photo bank
 * pipeline. Order is intentional, top to bottom:
 *
 *   1. SettingsPanel (Collector control) — full-width. The collector
 *      worker's own status pill + Pause/Resume sit at the top of this
 *      panel, alongside the priority-collection and goal controls. The
 *      pill is NOT also rendered in WorkersPanel — to avoid two places
 *      with Resume buttons for the same worker.
 *   2. WorkersPanel — half-width grid for the two AI workers
 *      (Pass-2 cleanup + Pass-1 classify). The collector is excluded
 *      from this row.
 *   3. TargetsPanel — the per-country locations list with inline-edit
 *      Goal and the Top-up entry point. Stays at the bottom because
 *      it's the deepest configuration surface.
 *
 * Each panel keeps its own data fetching and refresh cadence — this
 * component is a thin compositional wrapper, not a state hub.
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
      <SettingsPanel authedFetch={authedFetch} />
      <WorkersPanel authedFetch={authedFetch} />
      <TargetsPanel authedFetch={authedFetch} />
    </div>
  )
}
