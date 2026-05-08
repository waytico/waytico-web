'use client'

export type WorkspaceView = 'trips' | 'clients' | 'photos'

type Props = {
  view: WorkspaceView
  onChange: (next: WorkspaceView) => void
  tripsCount: number
  /** null until the clients endpoint is wired (Stage 3). Renders as "—". */
  clientsCount: number | null
  /** Stage 11 Block B — Photos tab is paid-only. Free operators don't
   *  manage their own bank from /dashboard (the picker on a trip page
   *  covers their real workflow), so the tab is hidden entirely
   *  rather than rendered as a noisy global-bank preview. */
  showPhotosTab: boolean
}

const BASE_TABS = [
  { key: 'trips' as const, label: 'Trips' },
  { key: 'clients' as const, label: 'Clients' },
]
const PHOTOS_TAB = { key: 'photos' as const, label: 'Photos' }

/**
 * WorkspaceTabs — top-level workspace switcher between Trips,
 * Clients, and (paid only) Photos views on /dashboard. Counts
 * surface to the right of each label; Clients count renders "—"
 * until the endpoint ships in Stage 3.
 *
 * Visual: 2px underline on the active tab, baseline border across the
 * row. Sits below SettingsStrip and above the active panel.
 */
export default function WorkspaceTabs({
  view,
  onChange,
  tripsCount,
  clientsCount,
  showPhotosTab,
}: Props) {
  const tabs: ReadonlyArray<{ key: WorkspaceView; label: string }> = showPhotosTab
    ? [...BASE_TABS, PHOTOS_TAB]
    : BASE_TABS
  return (
    <div
      className="border-b border-border/40 mb-4 flex items-center gap-1"
      role="tablist"
      aria-label="Workspace view"
    >
      {tabs.map((t) => {
        const active = view === t.key
        const count =
          t.key === 'trips' ? tripsCount : t.key === 'clients' ? clientsCount : null
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`relative flex items-center gap-2 px-3.5 py-3 text-[15px] transition-colors ${
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/85'
            }`}
          >
            <span>{t.label}</span>
            <span className="text-[13px] text-muted-foreground/80">
              {count == null ? '—' : count}
            </span>
            {active && (
              <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
