'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'
import { padTwo } from '@/lib/trip-format'

type ExpeditionTermsProps = {
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
    .map((l) =>
      l.replace(/^[-•◆◇·]\s*/, '').replace(/^\(?\d+\)?[.)]\s*/, '').trim(),
    )
    .filter(Boolean)
}

function currentYear(): number {
  return new Date().getFullYear()
}

/**
 * Expedition — Terms ("§ 10 — ARTICLES").
 *
 * Desktop: 1/3 + 2/3 grid. Left has eyebrow + stacked "TERMS / & ARTICLES."
 * with the second word in ochre. Right is an ol with "ART.NN" mono labels.
 *
 * Mobile: collapsible accordion (matches Atelier mobile pattern).
 *
 * Footer colophon: "WAYTICO/{businessName}" left + proposal slug · year
 * mono right. Both on a thin-rule strip.
 */
export function ExpeditionTerms({
  terms,
  owner,
  onSave,
  slug,
  businessName,
}: ExpeditionTermsProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!terms && !owner) return null

  const parsed = parseTerms(terms)
  const colophonName = businessName
    ? `WAYTICO/${businessName.toUpperCase()}`
    : 'WAYTICO/EXPEDITIONS'

  const renderList = (items: string[]) => (
    <ol className="list-none p-0 m-0">
      {items.map((t, i) => (
        <li
          key={i}
          className="grid gap-6 py-5"
          style={{
            gridTemplateColumns: '60px 1fr',
            borderTop: '1px solid var(--e-rule-2)',
          }}
        >
          <span className="e-mono" style={{ color: 'var(--e-ochre)' }}>
            ART.{padTwo(i + 1)}
          </span>
          <span
            className="e-body"
            style={{
              fontSize: 16,
              lineHeight: 1.55,
              color: 'var(--e-cream-mute)',
            }}
          >
            {t}
          </span>
        </li>
      ))}
    </ol>
  )

  return (
    <section
      className="px-4 md:px-14 py-16 md:py-24"
      style={{
        background: 'var(--e-bg-deep)',
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-[1fr_2fr] gap-24">
        <div>
          <div className="e-mono mb-5" style={{ color: 'var(--e-ochre)' }}>
            § 10 — ARTICLES
          </div>
          <h3
            className="e-display"
            style={{
              fontSize: 56,
              lineHeight: 0.9,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            TERMS
            <br />&{' '}
            <span style={{ color: 'var(--e-ochre)' }}>ARTICLES.</span>
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
          className="w-full bg-transparent border-0 text-left flex justify-between items-center"
          style={{ color: 'var(--e-cream)' }}
        >
          <div>
            <div
              className="e-mono mb-2"
              style={{ color: 'var(--e-ochre)' }}
            >
              § 10 — ARTICLES
            </div>
            <h3
              className="e-display"
              style={{ fontSize: 32, margin: 0, letterSpacing: '-0.02em' }}
            >
              TERMS &{' '}
              <span style={{ color: 'var(--e-ochre)' }}>ARTICLES.</span>
            </h3>
          </div>
          {mobileOpen ? (
            <Minus className="w-7 h-7" style={{ color: 'var(--e-ochre)' }} />
          ) : (
            <Plus className="w-7 h-7" style={{ color: 'var(--e-ochre)' }} />
          )}
        </button>
        {mobileOpen && (
          <div className="mt-6">
            <ol className="list-none p-0 m-0">
              {parsed.map((t, i) => (
                <li
                  key={i}
                  className="py-4"
                  style={{ borderTop: '1px solid var(--e-rule-2)' }}
                >
                  <div
                    className="e-mono mb-2"
                    style={{ color: 'var(--e-ochre)' }}
                  >
                    ART.{padTwo(i + 1)}
                  </div>
                  <div
                    className="e-body"
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: 'var(--e-cream-mute)',
                    }}
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
        className="mt-12 md:mt-14 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
        style={{ borderTop: '1px solid var(--e-rule-2)' }}
      >
        <div className="e-display" style={{ fontSize: 18 }}>
          {colophonName.split('/')[0]}
          <span style={{ color: 'var(--e-ochre)' }}>/</span>
          {colophonName.split('/').slice(1).join('/')}
        </div>
        <div className="e-mono" style={{ color: 'var(--e-ink-dim)' }}>
          PROPOSAL · {slug.toUpperCase()} · {currentYear()}
        </div>
      </div>
    </section>
  )
}
