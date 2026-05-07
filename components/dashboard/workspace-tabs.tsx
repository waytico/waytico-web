'use client'

export type WorkspaceView = 'trips' | 'clients' | 'photos'

type Props = {
  view: WorkspaceView
  onChange: (next: WorkspaceView) => void
  tripsCount: number
  /** null until the clients endpoint is wired (Stage 3). Renders as "—". */
  clientsCount: number | null
}

const TABS: ReadonlyArray<{ key: WorkspaceView; label: string }> = [
  { key: 'trips', label: 'Trips' },
  { key: 'clients', label: 'Clients' },
  { key: 'photos', label: 'Photos' },
]

/**
 * WorkspaceTabs — top-level workspace switcher between Trips and
 * Clients views on /dashboard. Counts surface to the right of each
 * label; Clients count renders "—" until the endpoint ships in
 * Stage 3.
 *
 * Visual: 2px underline on the active tab, baseline border across the
 * row. Sits below SettingsStrip and above the active panel.
 */
export default function WorkspaceTabs({ view, onChange, tripsCount, clientsCount }: Props) {
  return (
    <div
      className="border-b border-border/40 mb-4 flex items-center gap-1"
      role="tablist"
      aria-label="Workspace view"
    >
      {TABS.map((t) => {
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

