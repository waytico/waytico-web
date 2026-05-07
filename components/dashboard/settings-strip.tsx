'use client'

import { X } from 'lucide-react'
import BrandCard from '@/components/brand-card'
import PreferencesCard from '@/components/preferences-card'

export type StripExpanded = 'profile' | 'preferences' | null

type Props = {
  expanded: StripExpanded
  onToggle: (next: StripExpanded) => void
}

const PILLS: ReadonlyArray<{ key: 'profile' | 'preferences'; label: string }> = [
  { key: 'profile', label: 'Profile' },
  { key: 'preferences', label: 'Preferences' },
]

/**
 * SettingsStrip — collapsed pill row that expands inline into a panel
 * hosting either BrandCard or PreferencesCard. One pill active at a
 * time; clicking the active pill (or the close-X) collapses the panel.
 *
 * Visual language follows the dashboard's secondary-tinted strip with a
 * primary-tinted expanded surface. BrandCard and PreferencesCard are
 * left untouched — they already render their own white card wrappers,
 * so we just slot them in with a small top margin.
 */
export default function SettingsStrip({ expanded, onToggle }: Props) {
  return (
    <section aria-label="Operator settings" className="mb-4">
      <div
        className="flex items-center gap-2 rounded-md bg-secondary/60 px-2 py-1.5 min-h-[36px]"
        role="tablist"
        aria-label="Settings sections"
      >
        {PILLS.map((p) => {
          const active = expanded === p.key
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onToggle(active ? null : p.key)}
              className={`inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium uppercase tracking-wider rounded-md transition-colors ${
                active
                  ? 'bg-foreground text-background'
                  : 'text-foreground/65 hover:text-foreground hover:bg-secondary'
              }`}
            >
              {p.label}
              {active && <X className="w-3 h-3 opacity-80" />}
            </button>
          )
        })}
        {expanded && (
          <button
            type="button"
            onClick={() => onToggle(null)}
            aria-label="Close settings panel"
            className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {expanded === 'profile' && (
        <div className="mt-3">
          <BrandCard />
        </div>
      )}
      {expanded === 'preferences' && (
        <div className="mt-3">
          <PreferencesCard />
        </div>
      )}
    </section>
  )
}
