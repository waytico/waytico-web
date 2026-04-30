/**
 * Magazine — Included / Not Included section.
 *
 * Source: magazine-trip.jsx lines 285–337. Two side-by-side columns,
 * each with eyebrow heading, hairline above, and item rows separated by
 * hairlines. Items render as 13px Inter on 12px vertical padding.
 *
 * Adaptations:
 *   - Items split out of the two text blobs (data.project.included,
 *     not_included) on newlines.
 *   - Per MAGAZINE-SPEC §J.3 we drop the source's italic-em "What is and
 *     *isn't included.*" headline; the section label is just the
 *     standard UI.sectionLabels.included.
 *
 * Empty state: if both lists are empty, section is hidden. If one of
 * them is empty, only the populated column renders (the row collapses
 * to a single column).
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import type { CSSProperties, ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import { body, CREAM, eyebrow, Hairline } from './styles'

function splitItems(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean)
}

function Column({ heading, items, style }: { heading: string; items: string[]; style?: CSSProperties }) {
  return (
    <div style={{ flex: 1, minWidth: 0, ...style }}>
      <div style={{ ...eyebrow, fontSize: 10, marginBottom: 14 }}>{heading}</div>
      <Hairline />
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((t, i) => (
          <li key={i}>
            <div style={{ ...body, fontSize: 13, padding: '12px 0', lineHeight: 1.45 }}>
              {t}
            </div>
            <Hairline />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Included({ data }: ThemePropsV2) {
  const inc = splitItems(data.project.included)
  const not = splitItems(data.project.not_included)
  if (inc.length === 0 && not.length === 0) return null

  const cols: ReactNode[] = []
  if (inc.length > 0) {
    cols.push(<Column key="inc" heading={UI.included.toUpperCase()} items={inc} />)
  }
  if (not.length > 0) {
    cols.push(<Column key="not" heading={UI.notIncluded.toUpperCase()} items={not} />)
  }

  return (
    <section style={{ background: CREAM, padding: '48px 24px 56px' }}>
      <Hairline style={{ marginBottom: 40 }} />
      <div style={{ ...eyebrow, marginBottom: 32 }}>
        {UI.sectionLabels.included.toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
        {cols}
      </div>
    </section>
  )
}
