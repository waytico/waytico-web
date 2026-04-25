'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'
import { padTwo } from '@/lib/trip-format'

type AtelierTermsProps = {
  terms: string | null | undefined
  owner: boolean
  onSave: (value: string) => Promise<boolean>
  slug: string
  businessName?: string | null
}

function parseTerms(val: string | null | undefined): string[] {
  if (!val) return []
  return val
    .split(/\n+/)
    .map((l) => l.replace(/^[-•◆◇·]\s*/, '').replace(/^\(?\d+\)?[.)]\s*/, '').trim())
    .filter(Boolean)
}

function currentYear(): number {
  return new Date().getFullYear()
}

/**
 * Atelier — Terms ("10 / Fine print").
 *
 * Desktop: two-column with eyebrow + title left, numbered ol right.
 * Mobile: collapsible accordion with +/− toggle; closed by default.
 *
 * Footer line carries the slug and business name + current year.
 */
export function AtelierTerms({
  terms,
  owner,
  onSave,
  slug,
  businessName,
}: AtelierTermsProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!terms && !owner) return null

  const parsed = parseTerms(terms)
  const footerLeft = (
    <span className="a-display" style={{ fontSize: 16 }}>
      Waytico{' '}
      {businessName ? (
        <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
          · {businessName}
        </span>
      ) : null}
    </span>
  )

  const renderList = (items: string[]) => (
    <ol className="list-none p-0 m-0">
      {items.map((t, i) => (
        <li
          key={i}
          className="grid gap-5 py-4"
          style={{
            gridTemplateColumns: '56px 1fr',
            borderTop: '1px solid var(--a-rule)',
          }}
        >
          <span className="a-mono" style={{ color: 'var(--a-coral)' }}>
            {padTwo(i + 1)}
          </span>
          <span
            className="a-sans"
            style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--a-ink-2)' }}
          >
            {t}
          </span>
        </li>
      ))}
    </ol>
  )

  return (
    <section className="px-4 md:px-14 py-12 md:py-20">
      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-[320px_1fr] gap-20">
        <div>
          <div className="a-eyebrow mb-4">10 / Fine print</div>
          <h3
            className="a-display"
            style={{
              fontSize: 48,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Terms &{' '}
            <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
              conditions
            </span>
            .
          </h3>
        </div>
        <div>
          {owner ? (
            <EditableField
              as="multiline"
              editable
              value={terms}
              placeholder="Click to add terms — one item per line"
              rows={6}
              className="w-full"
              onSave={onSave}
              renderDisplay={() => renderList(parsed)}
            />
          ) : (
            renderList(parsed)
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="w-full bg-transparent border-0 text-left flex justify-between items-center cursor-pointer"
        >
          <div>
            <div className="a-eyebrow mb-2">10 / Fine print</div>
            <h3
              className="a-display"
              style={{ fontSize: 32, margin: 0, letterSpacing: '-0.02em' }}
            >
              Terms &{' '}
              <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
                conditions
              </span>
              .
            </h3>
          </div>
          {mobileOpen ? (
            <Minus className="w-7 h-7" style={{ color: 'var(--a-coral)' }} />
          ) : (
            <Plus className="w-7 h-7" style={{ color: 'var(--a-coral)' }} />
          )}
        </button>
        {mobileOpen && (
          <div className="mt-6">
            <ol className="list-none p-0 m-0">
              {parsed.map((t, i) => (
                <li
                  key={i}
                  className="py-4"
                  style={{ borderTop: '1px solid var(--a-rule)' }}
                >
                  <div
                    className="a-mono mb-1"
                    style={{ color: 'var(--a-coral)' }}
                  >
                    {padTwo(i + 1)}
                  </div>
                  <div
                    className="a-sans"
                    style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--a-ink-2)' }}
                  >
                    {t}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Footer colophon */}
      <div
        className="mt-12 md:mt-14 pt-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-2"
        style={{ borderTop: '1px solid var(--a-rule)' }}
      >
        {footerLeft}
        <div className="a-mono" style={{ color: 'var(--a-mute)' }}>
          Proposal · {slug} · {currentYear()}
        </div>
      </div>
    </section>
  )
}
