'use client'

import { EditableField } from '@/components/editable/editable-field'

type AtelierIncludedProps = {
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
 * Atelier — Included / Not included ("03 / Essentials").
 *
 * Two coloured cards side-by-side: included on a teal block with coral check
 * marks, not-included on a paper card with outlined border and dashes.
 *
 * Counts are shown as oversized display numbers in the top-right of each
 * card (per canvas).
 */
export function AtelierIncluded({
  included,
  notIncluded,
  owner,
  onSaveIncluded,
  onSaveNotIncluded,
}: AtelierIncludedProps) {
  if (!included && !notIncluded && !owner) return null

  const inc = parseList(included)
  const out = parseList(notIncluded)

  return (
    <section id="included" className="px-4 md:px-14 py-16 md:py-24">
      <div className="a-eyebrow mb-5">03 / Essentials</div>
      <h2
        className="a-display"
        style={{
          fontSize: 'clamp(2.75rem, 7vw, 6rem)',
          lineHeight: 0.92,
          margin: '0 0 60px',
          letterSpacing: '-0.03em',
        }}
      >
        What&apos;s{' '}
        <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
          in
        </span>
        ,
        <br />
        what&apos;s{' '}
        <span className="a-italic" style={{ color: 'var(--a-mute)' }}>
          out
        </span>
        .
      </h2>

      <div className="grid md:grid-cols-2 gap-6 md:gap-12">
        {/* Included */}
        <div
          className="p-8 md:p-12"
          style={{ background: 'var(--a-teal)', color: 'white', borderRadius: 16 }}
        >
          <div className="flex justify-between items-center mb-7">
            <span className="a-badge a-badge-coral">Included</span>
            <div className="a-display" style={{ fontSize: 48, color: 'var(--a-sage)' }}>
              {inc.length || (owner ? '0' : '')}
            </div>
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
              renderDisplay={() => <IncludedList items={inc} />}
            />
          ) : (
            <IncludedList items={inc} />
          )}
        </div>

        {/* Not included */}
        <div
          className="p-8 md:p-12"
          style={{ borderRadius: 16, border: '1px solid var(--a-rule)' }}
        >
          <div className="flex justify-between items-center mb-7">
            <span className="a-badge">Not included</span>
            <div className="a-display" style={{ fontSize: 48, color: 'var(--a-mute)' }}>
              {out.length || (owner ? '0' : '')}
            </div>
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
              renderDisplay={() => <NotIncludedList items={out} />}
            />
          ) : (
            <NotIncludedList items={out} />
          )}
        </div>
      </div>
    </section>
  )
}

function IncludedList({ items }: { items: string[] }) {
  return (
    <ul className="list-none p-0 m-0">
      {items.map((x, i) => (
        <li
          key={i}
          className="py-4 flex gap-4"
          style={{
            borderTop:
              i === 0 ? 'none' : '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <span style={{ color: 'var(--a-coral)', fontSize: 20, lineHeight: 1.5 }}>
            ✓
          </span>
          <span className="a-sans" style={{ fontSize: 16, lineHeight: 1.5 }}>
            {x}
          </span>
        </li>
      ))}
    </ul>
  )
}

function NotIncludedList({ items }: { items: string[] }) {
  return (
    <ul className="list-none p-0 m-0">
      {items.map((x, i) => (
        <li
          key={i}
          className="py-4 flex gap-4"
          style={{
            borderTop: i === 0 ? 'none' : '1px solid var(--a-rule)',
          }}
        >
          <span style={{ color: 'var(--a-mute)', fontSize: 18 }}>—</span>
          <span
            className="a-sans"
            style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--a-ink-2)' }}
          >
            {x}
          </span>
        </li>
      ))}
    </ul>
  )
}
