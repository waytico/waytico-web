'use client'

import { EditableField } from '@/components/editable/editable-field'
import { padTwo } from '@/lib/trip-format'

type JournalIncludedProps = {
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
    .map((line) => line.replace(/^[-•◆◇·]\s*/, '').trim())
    .filter(Boolean)
}

/**
 * Journal — Included / Not included (Chapter III · "The fine print").
 *
 * Two-column editorial list with numbered rules. Each side has an editable
 * multiline field under the hood; display parses newline-delimited items.
 */
export function JournalIncluded({
  included,
  notIncluded,
  owner,
  onSaveIncluded,
  onSaveNotIncluded,
}: JournalIncludedProps) {
  if (!included && !notIncluded && !owner) return null

  return (
    <section
      id="included"
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px]"
    >
      <div className="j-eyebrow">Chapter III</div>
      <h2
        className="j-serif mb-16 md:mb-20"
        style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          lineHeight: 0.95,
          margin: '20px 0 60px',
          letterSpacing: '-0.02em',
        }}
      >
        The <em>fine print.</em>
      </h2>
      <div className="grid md:grid-cols-2 gap-12 md:gap-[100px]">
        <div>
          <div
            className="j-mono mb-8"
            style={{ color: 'var(--j-terra)' }}
          >
            ◆ &nbsp; What&apos;s included
          </div>
          <EditableField
            as="multiline"
            editable={owner}
            value={included}
            placeholder="Click to add — one item per line"
            rows={6}
            className="w-full"
            onSave={onSaveIncluded}
            renderDisplay={(val) => (
              <ul className="list-none p-0 m-0">
                {parseList(val).map((item, i) => (
                  <li
                    key={i}
                    className="py-5 flex gap-5 md:gap-6 border-t"
                    style={{ borderColor: 'var(--j-rule)' }}
                  >
                    <span
                      className="j-serif j-italic flex-shrink-0"
                      style={{
                        color: 'var(--j-terra)',
                        fontSize: 18,
                        width: 32,
                      }}
                    >
                      {padTwo(i + 1)}
                    </span>
                    <span
                      className="j-serif"
                      style={{
                        fontSize: 'clamp(1rem, 1.4vw, 1.1875rem)',
                        lineHeight: 1.5,
                        fontWeight: 300,
                      }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
                <li
                  className="h-px"
                  style={{ borderTop: '1px solid var(--j-rule)' }}
                />
              </ul>
            )}
          />
        </div>
        <div>
          <div
            className="j-mono mb-8"
            style={{ color: 'var(--j-ink-mute)' }}
          >
            ◇ &nbsp; Not included
          </div>
          <EditableField
            as="multiline"
            editable={owner}
            value={notIncluded}
            placeholder="Click to add — one item per line"
            rows={6}
            className="w-full"
            onSave={onSaveNotIncluded}
            renderDisplay={(val) => (
              <ul className="list-none p-0 m-0">
                {parseList(val).map((item, i) => (
                  <li
                    key={i}
                    className="py-5 flex gap-5 md:gap-6 border-t"
                    style={{ borderColor: 'var(--j-rule)' }}
                  >
                    <span
                      className="j-serif j-italic flex-shrink-0"
                      style={{
                        color: 'var(--j-ink-mute)',
                        fontSize: 18,
                        width: 32,
                      }}
                    >
                      {padTwo(i + 1)}
                    </span>
                    <span
                      className="j-serif"
                      style={{
                        fontSize: 'clamp(1rem, 1.4vw, 1.1875rem)',
                        lineHeight: 1.5,
                        fontWeight: 300,
                        color: 'var(--j-ink-soft)',
                      }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
                <li
                  className="h-px"
                  style={{ borderTop: '1px solid var(--j-rule)' }}
                />
              </ul>
            )}
          />
        </div>
      </div>
    </section>
  )
}
