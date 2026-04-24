'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'
import { padTwo } from '@/lib/trip-format'

type JournalTermsProps = {
  terms: string | null | undefined
  owner: boolean
  onSave: (value: string) => Promise<boolean>
  slug: string
  businessName?: string | null
}

function parseTerms(val: string | null | undefined): string[] {
  if (!val) return []
  const lines = val
    .split(/\n+/)
    .map((l) => l.replace(/^[-•◆◇·]\s*/, '').replace(/^\(?\d+\)?[.)]\s*/, '').trim())
    .filter(Boolean)
  return lines
}

function currentYear(): number {
  return new Date().getFullYear()
}

/**
 * Journal — Terms (Colophon).
 *
 * Two-column split on desktop: left rail with "Colophon" eyebrow and title,
 * right column with numbered terms. Mobile collapses to an accordion-style
 * toggle matching canvas JMTerms.
 *
 * Footer line carries the slug (in place of canvas "8ddswr" placeholder)
 * and the current year + business name (if any).
 */
export function JournalTerms({
  terms,
  owner,
  onSave,
  slug,
  businessName,
}: JournalTermsProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!terms && !owner) return null

  const parsed = parseTerms(terms)
  const footerLeft = businessName
    ? `Waytico · ${businessName} · ${currentYear()}`
    : `Waytico · ${currentYear()}`

  return (
    <section
      className="j-section px-6 md:px-[72px] py-16 md:py-[100px]"
      style={{ background: 'var(--j-ink)', color: 'var(--j-paper)' }}
    >
      {/* Desktop: two-column split */}
      <div className="hidden md:grid md:grid-cols-[320px_1fr] gap-[120px]">
        <div>
          <div className="j-mono mb-4" style={{ color: '#E8B893' }}>
            Colophon
          </div>
          <h3
            className="j-serif"
            style={{
              fontSize: 42,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Terms & <em>conditions.</em>
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
              renderDisplay={() => (
                <ol className="list-none p-0 m-0">
                  {parsed.map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-6 py-5"
                      style={{
                        borderTop:
                          i === 0 ? '0' : '1px solid rgba(250,246,236,0.15)',
                      }}
                    >
                      <span
                        className="j-mono flex-shrink-0"
                        style={{ color: '#E8B893', width: 32 }}
                      >
                        {padTwo(i + 1)}
                      </span>
                      <span
                        className="j-serif"
                        style={{
                          fontSize: 17,
                          lineHeight: 1.55,
                          fontWeight: 300,
                          opacity: 0.85,
                        }}
                      >
                        {t}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            />
          ) : (
            <ol className="list-none p-0 m-0">
              {parsed.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-6 py-5"
                  style={{
                    borderTop:
                      i === 0 ? '0' : '1px solid rgba(250,246,236,0.15)',
                  }}
                >
                  <span
                    className="j-mono flex-shrink-0"
                    style={{ color: '#E8B893', width: 32 }}
                  >
                    {padTwo(i + 1)}
                  </span>
                  <span
                    className="j-serif"
                    style={{
                      fontSize: 17,
                      lineHeight: 1.55,
                      fontWeight: 300,
                      opacity: 0.85,
                    }}
                  >
                    {t}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Mobile: collapsed accordion */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="w-full bg-transparent border-0 text-left flex justify-between items-center cursor-pointer"
          style={{ color: 'var(--j-paper)' }}
        >
          <div>
            <div className="j-mono mb-2" style={{ color: '#E8B893' }}>
              Colophon
            </div>
            <h3
              className="j-serif"
              style={{ fontSize: 32, margin: 0, letterSpacing: '-0.01em' }}
            >
              Terms & <em>conditions.</em>
            </h3>
          </div>
          <ChevronDown
            className={`w-6 h-6 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
            style={{ color: '#E8B893' }}
          />
        </button>
        {mobileOpen && (
          <ol className="list-none p-0 mt-7 m-0">
            {parsed.map((t, i) => (
              <li
                key={i}
                className="flex gap-3.5 py-4"
                style={{
                  borderTop:
                    i === 0 ? '0' : '1px solid rgba(250,246,236,0.15)',
                }}
              >
                <span
                  className="j-mono flex-shrink-0"
                  style={{ color: '#E8B893', width: 24 }}
                >
                  {padTwo(i + 1)}
                </span>
                <span
                  className="j-serif"
                  style={{
                    fontSize: 15,
                    lineHeight: 1.5,
                    fontWeight: 300,
                    opacity: 0.85,
                  }}
                >
                  {t}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Footer colophon line */}
      <div
        className="mt-12 md:mt-20 pt-6 md:pt-10 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center"
        style={{ borderTop: '1px solid rgba(250,246,236,0.15)' }}
      >
        <div
          className="j-serif j-italic"
          style={{ fontSize: 16, opacity: 0.6 }}
        >
          {footerLeft}
        </div>
        <div className="j-mono" style={{ opacity: 0.5 }}>
          Proposal · {slug}
        </div>
      </div>
    </section>
  )
}
