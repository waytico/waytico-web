'use client'

import { useRouter } from 'next/navigation'
import type { Project, ProjectStatus } from '@/components/project-card'

const STATUS_CHIP: Record<ProjectStatus, string> = {
  draft: 'bg-muted/60 text-foreground/70',
  quoted: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-sky-100 text-sky-800',
  archived: 'bg-muted/60 text-foreground/55',
}

function fmtDateShort(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(+d)) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatRange(start: string | null | undefined, end: string | null | undefined): string {
  const a = fmtDateShort(start)
  const b = fmtDateShort(end)
  if (a && b) return `${a} → ${b}`
  return a || b || ''
}

type Props = {
  trips: Project[]
}

/**
 * Inline expansion under a ClientRow. Shows the client's trips as
 * compact one-line chips that route to /t/[slug]; or an empty-state
 * with "+ New trip for this client" CTA. The CTA simply routes to
 * '/' for now — pre-fill is tracked as a future task in the TZ.
 */
export default function ClientRowExpanded({ trips }: Props) {
  const router = useRouter()

  if (trips.length === 0) {
    return (
      <div className="bg-secondary/40 px-16 py-3">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>No trips yet</span>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xs text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
          >
            + New trip for this client
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary/40 px-16 py-2 space-y-1">
      {trips.map((t) => {
        const region = [t.region, t.country].filter(Boolean).join(', ')
        const range = formatRange(t.dates_start, t.dates_end)
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => router.push(`/t/${t.slug}`)}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left hover:bg-secondary transition-colors"
          >
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${STATUS_CHIP[t.status as ProjectStatus] ?? 'bg-muted/60 text-foreground/55'}`}
            >
              {t.status}
            </span>
            <span className="flex-1 min-w-0 truncate text-sm text-foreground/85">
              {t.title}
              {region && <span className="text-muted-foreground"> · {region}</span>}
            </span>
            {range && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{range}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
