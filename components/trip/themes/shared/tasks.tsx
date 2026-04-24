'use client'

import { Eye, EyeOff } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'

// Deliberately loose typing — trip-page-client.tsx treats tasks as `any[]`.
// We preserve that contract rather than inventing a stricter shape here.
type TaskLike = {
  id: string
  title: string
  description?: string | null
  deadline?: string | null
  visible_to_client?: boolean
  sort_order?: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

type TasksBlockProps = {
  /** Raw task list (all of them). Client-visibility filtering happens here. */
  tasks: TaskLike[]
  owner: boolean
  onSaveTask: (taskId: string, patch: Record<string, unknown>) => Promise<boolean>
  onToggleVisibility: (taskId: string, nextVisible: boolean) => void
}

/**
 * Block — "Before you go" tasks (active-status only).
 *
 * Extracted 1:1 from trip-page-client.tsx lines 1113–1203. Sort order, date
 * formatter and visibility rules are identical.
 *
 * Colour policy:
 *  - Card shells, text, dates → `--theme-*` (content).
 *  - Eye-toggle (owner only) → `--owner-chrome-*` (must be legible on any
 *    theme, including dark Expedition).
 *  - The status check itself lives with the caller — this block just
 *    renders whatever it receives.
 */
export function TasksBlock({
  tasks,
  owner,
  onSaveTask,
  onToggleVisibility,
}: TasksBlockProps) {
  const all = Array.isArray(tasks) ? tasks : []
  const visibleForClient = all.filter((t) => t.visible_to_client !== false)
  const renderList = owner ? all : visibleForClient
  if (renderList.length === 0) return null

  const sorted = [...renderList].sort((a, b) => {
    const ad = a.deadline || '9999-12-31'
    const bd = b.deadline || '9999-12-31'
    if (ad !== bd) return ad.localeCompare(bd)
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  return (
    <section>
      <h2 className="text-2xl font-serif font-bold mb-6 text-theme-fg">Before you go</h2>
      <div className="space-y-3">
        {sorted.map((t) => {
          const hidden = t.visible_to_client === false
          return (
            <div
              key={t.id}
              className={`border rounded-lg p-4 transition-opacity ${
                hidden
                  ? 'border-dashed border-theme-rule bg-theme-paper opacity-60'
                  : 'border-theme-rule'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium flex-1 text-theme-fg">
                  <EditableField
                    as="text"
                    editable={owner}
                    value={t.title}
                    required
                    className="w-full"
                    onSave={(v) => onSaveTask(t.id, { title: v })}
                  />
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(t.deadline || owner) && (
                    <span className="text-xs text-theme-fg-mute whitespace-nowrap inline-flex items-center gap-1">
                      <span>by</span>
                      <EditableField
                        as="date"
                        editable={owner}
                        value={t.deadline}
                        placeholder="Set date"
                        formatDisplay={(iso) =>
                          new Date(iso).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        }
                        onSave={(v) => onSaveTask(t.id, { deadline: v })}
                      />
                    </span>
                  )}
                  {owner && (
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(t.id, hidden)}
                      className="p-1 rounded bg-chrome-bg text-chrome-fg-soft hover:text-chrome-fg hover:bg-chrome-border border border-chrome-border transition-colors"
                      title={hidden ? 'Show to client' : 'Hide from client'}
                      aria-label={hidden ? 'Show to client' : 'Hide from client'}
                    >
                      {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              {(t.description || owner) && (
                <div className="text-sm text-theme-fg-soft mt-1">
                  <EditableField
                    as="multiline"
                    editable={owner}
                    value={t.description}
                    placeholder="Click to add details"
                    rows={2}
                    className="w-full"
                    onSave={(v) => onSaveTask(t.id, { description: v })}
                  />
                </div>
              )}
              {owner && hidden && (
                <p className="text-xs text-theme-fg-mute mt-2 italic">Hidden from client</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
