'use client'

import { THEMES, type ThemeId } from '@/lib/themes'

type Props = {
  value: ThemeId
  onChange: (next: ThemeId) => void
}

const ORDER: ThemeId[] = ['journal', 'atelier', 'expedition', 'custom']

/**
 * 4-position segmented control for switching the trip's design theme.
 *
 * Active option uses accent fill; inactive options are ghost. The
 * `custom` option is rendered for parity with the registry but stays
 * disabled (non-clickable, muted) until the custom-theme builder
 * ships in a future TZ — `THEMES.custom.selectable` is `false`.
 *
 * Stateless: the parent (StudioDrawer) holds the working value and
 * batches the save into the project PATCH alongside ratings/host/etc.
 */
export function ThemeSwitcher({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Design theme"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      >
        {ORDER.map((id) => {
          const meta = THEMES[id]
          const active = id === value
          const disabled = !meta.selectable
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => !disabled && onChange(id)}
              title={disabled ? `${meta.label} — coming soon` : meta.description}
              className={[
                'rounded-md px-3 py-2.5 text-sm font-semibold transition-colors text-center',
                active
                  ? 'bg-accent text-accent-foreground border border-accent'
                  : 'bg-background text-foreground/70 border border-border hover:text-foreground hover:border-foreground/40',
                disabled && 'opacity-40 cursor-not-allowed hover:text-foreground/70 hover:border-border',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {meta.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-foreground/60 leading-relaxed">
        {THEMES[value].description}
      </p>
    </div>
  )
}
