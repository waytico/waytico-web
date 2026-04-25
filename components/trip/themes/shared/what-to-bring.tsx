'use client'

import { EditableField } from '@/components/editable/editable-field'

// What-to-bring entries are denormalised in JSONB. Items can be strings
// or {name|item: string} objects depending on which agent generated them
// — both shapes are tolerated.
type WhatToBringItem = string | { name?: string; item?: string }

export type WhatToBringCategory = {
  category: string
  items: WhatToBringItem[]
}

type Props = {
  whatToBring: WhatToBringCategory[] | null | undefined
  owner: boolean
  onSave: (next: Array<{ category: string; items: string[] }>) => Promise<boolean>
}

function flatten(items: WhatToBringItem[] | undefined): string[] {
  return (items || [])
    .map((x) => (typeof x === 'string' ? x : x?.name || x?.item || ''))
    .filter(Boolean)
}

function rebuild(
  current: WhatToBringCategory[],
  index: number,
  patch: Partial<{ category: string; items: string[] }>,
): Array<{ category: string; items: string[] }> {
  return current.map((c, i) =>
    i === index
      ? {
          category: patch.category ?? c.category,
          items: patch.items ?? flatten(c.items),
        }
      : { category: c.category, items: flatten(c.items) },
  )
}

/**
 * Shared "What to Bring" block, used on the active-status preamble.
 *
 * Two-column grid of category cards (e.g. Clothing, Documents, Health).
 * Both the category title and the items list are inline-editable for
 * owners. Items are stored as one-string-per-line; bullets/dashes are
 * stripped on save.
 *
 * Hidden entirely when `whatToBring` is empty for non-owners; owners
 * still see the block (with an empty grid) so they can ask the AI
 * editor to populate it.
 *
 * Theme-agnostic: uses `theme.fg / theme.fg-soft / theme.accent` Tailwind
 * tokens that map to the active theme's CSS variables.
 */
export function WhatToBringBlock({ whatToBring, owner, onSave }: Props) {
  const cats = whatToBring ?? []
  if (cats.length === 0 && !owner) return null

  return (
    <section>
      <h2 className="text-2xl font-serif font-bold mb-6 text-theme-fg">
        What to Bring
      </h2>
      <div className="grid md:grid-cols-2 gap-6">
        {cats.map((cat, i) => {
          const itemStrings = flatten(cat.items)
          const joined = itemStrings.join('\n')
          return (
            <div key={i} className="space-y-2">
              <h3 className="font-semibold text-sm text-theme-fg">
                <EditableField
                  as="text"
                  editable={owner}
                  value={cat.category}
                  required
                  className="w-full"
                  onSave={(v) => onSave(rebuild(cats, i, { category: v }))}
                />
              </h3>
              <EditableField
                as="multiline"
                editable={owner}
                value={joined}
                placeholder="Click to add items — one per line"
                rows={Math.max(3, itemStrings.length)}
                className="w-full"
                onSave={(v) => {
                  const newItems = v
                    .split('\n')
                    .map((s) => s.replace(/^[-•·]\s*/, '').trim())
                    .filter(Boolean)
                  return onSave(rebuild(cats, i, { items: newItems }))
                }}
                renderDisplay={() => (
                  <ul className="space-y-1">
                    {itemStrings.map((item, j) => (
                      <li
                        key={j}
                        className="text-sm text-theme-fg-soft flex items-start gap-2"
                      >
                        <span className="text-theme-accent mt-0.5">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
