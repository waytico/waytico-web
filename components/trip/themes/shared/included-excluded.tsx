'use client'

import { Check, X } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'

type IncludedExcludedBlockProps = {
  included: string | null | undefined
  notIncluded: string | null | undefined
  owner: boolean
  onSaveIncluded: (value: string) => Promise<boolean>
  onSaveNotIncluded: (value: string) => Promise<boolean>
}

/**
 * Block #4 — Included / Not Included.
 *
 * Extracted 1:1 from trip-page-client.tsx lines 982–1036.
 * Success/destructive semantic colours kept as global tokens (they have
 * consistent meaning regardless of theme). Ink/accent colours switch to
 * `--theme-*`.
 */
export function IncludedExcludedBlock({
  included,
  notIncluded,
  owner,
  onSaveIncluded,
  onSaveNotIncluded,
}: IncludedExcludedBlockProps) {
  if (!included && !notIncluded && !owner) return null

  return (
    <section>
      <h2 className="text-2xl font-serif font-bold mb-6 text-theme-fg">What&apos;s Included</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-theme-accent flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
            Included
          </h3>
          <EditableField
            as="multiline"
            editable={owner}
            value={included}
            placeholder="Click to add — one item per line"
            rows={5}
            className="w-full text-sm text-theme-fg-soft"
            onSave={onSaveIncluded}
            renderDisplay={(val) => (
              <ul className="space-y-2">
                {val
                  .split('\n')
                  .filter(Boolean)
                  .map((item: string, i: number) => (
                    <li key={i} className="text-sm text-theme-fg-soft pl-8">
                      {item.replace(/^[-•]\s*/, '')}
                    </li>
                  ))}
              </ul>
            )}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold text-theme-fg-soft flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </span>
            Not Included
          </h3>
          <EditableField
            as="multiline"
            editable={owner}
            value={notIncluded}
            placeholder="Click to add — one item per line"
            rows={5}
            className="w-full text-sm text-theme-fg-mute"
            onSave={onSaveNotIncluded}
            renderDisplay={(val) => (
              <ul className="space-y-2">
                {val
                  .split('\n')
                  .filter(Boolean)
                  .map((item: string, i: number) => (
                    <li key={i} className="text-sm text-theme-fg-mute pl-8">
                      {item.replace(/^[-•]\s*/, '')}
                    </li>
                  ))}
              </ul>
            )}
          />
        </div>
      </div>
    </section>
  )
}
