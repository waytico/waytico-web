'use client'

import { EditableField } from '@/components/editable/editable-field'
import { padTwo } from '@/lib/trip-format'

type ExpeditionIncludedProps = {
  included: string | null | undefined
  notIncluded: string | null | undefined
  owner: boolean
  onSaveIncluded: (value: string) => Promise<boolean>
  onSaveNotIncluded: (value: string) => Promise<boolean>
}

function parseList(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split('\n')
    .map((line) => line.replace(/^[-•◆◇·✓—]\s*/, '').trim())
    .filter(Boolean)
}

/**
 * Expedition — Included / Not included ("§ 03 — KIT LIST").
 *
 * Two outlined panels side-by-side. Included card has a panel-grey
 * background; excluded card uses the page background. Counts are shown as
 * oversized display numbers in each card header.
 */
export function ExpeditionIncluded({
  included,
  notIncluded,
  owner,
  onSaveIncluded,
  onSaveNotIncluded,
}: ExpeditionIncludedProps) {
  if (!included && !notIncluded && !owner) return null

  const inc = parseList(included)
  const out = parseList(notIncluded)

  return (
    <section
      id="included"
      className="px-4 md:px-14 py-20 md:py-32"
      style={{
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      <div className="e-mono mb-6" style={{ color: 'var(--e-ochre)' }}>
        § 03 — KIT LIST
      </div>
      <h2
        className="e-display"
        style={{
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          lineHeight: 0.88,
          margin: '0 0 60px',
          letterSpacing: '-0.03em',
        }}
      >
        WHAT&apos;S IN.
        <br />
        <span
          className="e-day-outline"
          style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
        >
          WHAT&apos;S OUT.
        </span>
      </h2>

      <div className="grid md:grid-cols-2 gap-8 md:gap-20">
        {/* Included */}
        <div
          className="p-7 md:p-12"
          style={{
            background: 'var(--e-panel)',
            border: '1px solid var(--e-rule-2)',
          }}
        >
          <div className="flex justify-between items-center mb-9">
            <span className="e-mono" style={{ color: 'var(--e-ochre)' }}>
              ◆ INCLUDED
            </span>
            <span
              className="e-display"
              style={{ fontSize: 36, color: 'var(--e-ochre)' }}
            >
              {padTwo(inc.length || (owner ? 0 : inc.length))}
            </span>
          </div>
          {owner ? (
            <EditableField
              as="multiline"
              editable
              value={included}
              placeholder="Click to add — one item per line"
              rows={6}
              className="w-full"
              onSave={onSaveIncluded}
              renderDisplay={() => <List items={inc} accent="var(--e-ochre)" />}
            />
          ) : (
            <List items={inc} accent="var(--e-ochre)" />
          )}
        </div>

        {/* Not included */}
        <div
          className="p-7 md:p-12"
          style={{ border: '1px solid var(--e-rule-2)' }}
        >
          <div className="flex justify-between items-center mb-9">
            <span
              className="e-mono"
              style={{ color: 'var(--e-cream-mute)' }}
            >
              ◇ NOT INCLUDED
            </span>
            <span
              className="e-display"
              style={{ fontSize: 36, color: 'var(--e-ink-dim)' }}
            >
              {padTwo(out.length || (owner ? 0 : out.length))}
            </span>
          </div>
          {owner ? (
            <EditableField
              as="multiline"
              editable
              value={notIncluded}
              placeholder="Click to add — one item per line"
              rows={6}
              className="w-full"
              onSave={onSaveNotIncluded}
              renderDisplay={() => (
                <List items={out} accent="var(--e-ink-dim)" muted />
              )}
            />
          ) : (
            <List items={out} accent="var(--e-ink-dim)" muted />
          )}
        </div>
      </div>
    </section>
  )
}

function List({
  items,
  accent,
  muted = false,
}: {
  items: string[]
  accent: string
  muted?: boolean
}) {
  return (
    <ul className="list-none p-0 m-0">
      {items.map((x, i) => (
        <li
          key={i}
          className="py-4 flex gap-5"
          style={{ borderTop: '1px solid var(--e-rule)' }}
        >
          <span
            className="e-mono flex-shrink-0"
            style={{ color: accent, width: 28 }}
          >
            {padTwo(i + 1)}
          </span>
          <span
            className="e-body"
            style={{
              fontSize: 16,
              lineHeight: 1.5,
              color: muted ? 'var(--e-cream-mute)' : 'var(--e-cream)',
            }}
          >
            {x}
          </span>
        </li>
      ))}
    </ul>
  )
}
