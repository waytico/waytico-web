'use client'

import { useRef, useState } from 'react'
import { Eye, EyeOff, FileText, Trash2, Upload } from 'lucide-react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { Hairline } from './styles'

type Task = {
  id: string
  title: string | null
  description: string | null
  deadline: string | null
  sort_order?: number | null
  visible_to_client?: boolean
}

type DocMedia = {
  id: string
  type?: string
  url: string
  caption?: string | null
  file_name?: string | null
  visible_to_client?: boolean
}

/**
 * ActiveSections — Tasks (Before you go) + Documents lists.
 *
 * Rendered only when project.status === 'active' (mag-index gates).
 * Owner mode adds inline EditableField + per-row eye-toggle + delete +
 * the document upload zone. Showcase mode short-circuits via the
 * helpers in ctx.active (already gated by isShowcase upstream).
 */
export function ActiveSections({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const active = ctx?.active

  const allTasks = ((data.tasks ?? []) as unknown as Task[])
  const visibleTasks = allTasks.filter((t) => t.visible_to_client !== false)
  const renderTaskList = editable ? allTasks : visibleTasks

  const allDocs = (data.media ?? []).filter(
    (m) => (m as DocMedia).type === 'document',
  ) as unknown as DocMedia[]
  const visibleDocs = allDocs.filter((m) => m.visible_to_client !== false)
  const renderDocs = editable ? allDocs : visibleDocs

  return (
    <>
      {renderTaskList.length > 0 && (
        <section className="mag-section mag-section--py">
          <div className="mag-shell">
            <Hairline className="mag-active__hairline" />
            <div className="mag-eyebrow mag-active__heading">BEFORE YOU GO</div>
            <div className="mag-active__tasks">
              {[...renderTaskList]
                .sort((a, b) => {
                  const ad = a.deadline || '9999-12-31'
                  const bd = b.deadline || '9999-12-31'
                  if (ad !== bd) return ad.localeCompare(bd)
                  return (a.sort_order ?? 0) - (b.sort_order ?? 0)
                })
                .map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    editable={editable}
                    onSavePatch={(patch) =>
                      active?.saveTaskPatch(t.id, patch) ?? Promise.resolve(false)
                    }
                    onToggleVisibility={(next) =>
                      active?.toggleTaskVisibility(t.id, next)
                    }
                  />
                ))}
            </div>
          </div>
        </section>
      )}

      {(renderDocs.length > 0 || editable) && (
        <DocumentsSection
          docs={renderDocs}
          editable={editable}
          uploadingDoc={!!active?.uploadingDoc}
          onUpload={(files) => active?.handleDocumentUpload(files)}
          onToggleVisibility={(id, next) =>
            active?.toggleMediaVisibility(id, next)
          }
          onDelete={(id) => active?.deleteDocument(id)}
        />
      )}
    </>
  )
}

function TaskCard({
  task,
  editable,
  onSavePatch,
  onToggleVisibility,
}: {
  task: Task
  editable: boolean
  onSavePatch: (patch: Record<string, unknown>) => Promise<boolean>
  onToggleVisibility: (next: boolean) => void
}) {
  const hidden = task.visible_to_client === false
  return (
    <div
      className={
        'mag-active__task' +
        (hidden ? ' mag-active__task--hidden' : '')
      }
    >
      <div className="mag-active__task-head">
        <h3 className="mag-active__task-title">
          {editable ? (
            <EditableField
              as="text"
              value={task.title}
              editable
              onSave={(v) => onSavePatch({ title: v })}
              renderDisplay={(v) => <span>{v || 'Untitled'}</span>}
            />
          ) : (
            task.title || 'Untitled'
          )}
        </h3>
        <div className="mag-active__task-meta">
          {task.deadline && (
            <span className="mag-active__task-deadline">
              by{' '}
              {new Date(task.deadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
          {editable && (
            <button
              type="button"
              onClick={() => onToggleVisibility(hidden)}
              className="mag-active__task-eye"
              aria-label={hidden ? 'Show to client' : 'Hide from client'}
            >
              {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      </div>
      {(task.description || editable) && (
        <div className="mag-active__task-desc">
          {editable ? (
            <EditableField
              as="multiline"
              value={task.description}
              editable
              rows={2}
              placeholder="Click to add details"
              onSave={(v) => onSavePatch({ description: v })}
            />
          ) : (
            task.description
          )}
        </div>
      )}
    </div>
  )
}

function DocumentsSection({
  docs,
  editable,
  uploadingDoc,
  onUpload,
  onToggleVisibility,
  onDelete,
}: {
  docs: DocMedia[]
  editable: boolean
  uploadingDoc: boolean
  onUpload: (files: File[]) => void
  onToggleVisibility: (id: string, next: boolean) => void
  onDelete: (id: string) => void
}) {
  const docInputRef = useRef<HTMLInputElement>(null)
  const [docDragOver, setDocDragOver] = useState(false)

  return (
    <section className="mag-section mag-section--py">
      <div className="mag-shell">
        <Hairline className="mag-active__hairline" />
        <div className="mag-active__docs-head">
          <div className="mag-eyebrow mag-active__heading">DOCUMENTS</div>
          {editable && (
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={uploadingDoc}
              className="mag-active__docs-add"
            >
              <Upload size={14} />
              {uploadingDoc ? 'Uploading…' : 'Add document'}
            </button>
          )}
        </div>

        {editable && (
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,image/jpeg,image/png"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              e.target.value = ''
              if (files.length > 0) onUpload(files)
            }}
          />
        )}

        {editable && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDocDragOver(true)
            }}
            onDragLeave={() => setDocDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDocDragOver(false)
              const files = Array.from(e.dataTransfer.files || [])
              if (files.length > 0) onUpload(files)
            }}
            className={
              'mag-active__docs-drop' +
              (docDragOver ? ' mag-active__docs-drop--over' : '')
            }
            onClick={() => docInputRef.current?.click()}
          >
            {uploadingDoc ? (
              <span>Uploading & parsing…</span>
            ) : (
              <>
                <FileText size={18} className="mag-active__docs-drop-icon" />
                <div>Drop a booking, voucher or ticket here</div>
                <div className="mag-active__docs-drop-sub">
                  PDF · DOCX · XLSX · JPEG · PNG — auto-applied to itinerary
                </div>
              </>
            )}
          </div>
        )}

        {docs.length > 0 ? (
          <div className="mag-active__docs-list">
            {docs.map((m) => {
              const hidden = m.visible_to_client === false
              return (
                <div
                  key={m.id}
                  className={
                    'mag-active__doc-row' +
                    (hidden ? ' mag-active__doc-row--hidden' : '')
                  }
                >
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mag-active__doc-link"
                  >
                    <FileText size={14} className="mag-active__doc-icon" />
                    <span className="mag-active__doc-name">
                      {m.caption || m.file_name || 'Document'}
                    </span>
                  </a>
                  <div className="mag-active__doc-actions">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mag-active__doc-download"
                    >
                      Download ↗
                    </a>
                    {editable && (
                      <>
                        <button
                          type="button"
                          onClick={() => onToggleVisibility(m.id, hidden)}
                          className="mag-active__doc-eye"
                          aria-label={hidden ? 'Show to client' : 'Hide from client'}
                        >
                          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(m.id)}
                          className="mag-active__doc-delete"
                          aria-label="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          editable && (
            <p className="mag-active__docs-empty">No documents yet.</p>
          )
        )}
      </div>
    </section>
  )
}
