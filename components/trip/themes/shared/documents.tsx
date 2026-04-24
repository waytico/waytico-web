'use client'

import { useRef, useState } from 'react'
import { Eye, EyeOff, FileText, Trash2, Upload } from 'lucide-react'

// Same loose-typing approach as tasks — trip-page-client treats media as any[].
type MediaLike = {
  id: string
  type?: string | null
  url: string
  caption?: string | null
  file_name?: string | null
  visible_to_client?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

type DocumentsBlockProps = {
  /** Full media list — block filters to documents internally. */
  media: MediaLike[]
  owner: boolean
  uploading: boolean
  onUpload: (files: File[]) => void | Promise<void>
  onToggleVisibility: (mediaId: string, nextVisible: boolean) => void
  onDelete: (mediaId: string) => void
}

/**
 * Block — Documents (active-status only).
 *
 * Extracted 1:1 from trip-page-client.tsx lines 1205–1348. Filtering,
 * drop-zone accept list, empty-state behaviour — all identical.
 *
 * Colour policy:
 *  - Document rows, links, file names → `--theme-*` (content).
 *  - Upload trigger, drop-zone, eye/delete buttons → `--owner-chrome-*`.
 *  - Destructive stays as global (red regardless of theme).
 */
export function DocumentsBlock({
  media,
  owner,
  uploading,
  onUpload,
  onToggleVisibility,
  onDelete,
}: DocumentsBlockProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const all = (Array.isArray(media) ? media : []).filter((m) => m.type === 'document')
  const visibleDocs = all.filter((m) => m.visible_to_client !== false)
  const renderDocs = owner ? all : visibleDocs

  // Client: hide whole section if nothing to show.
  // Owner: always show (so they can drop new docs).
  if (!owner && renderDocs.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif font-bold text-theme-fg">Documents</h2>
        {owner && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-medium text-chrome-accent hover:underline disabled:opacity-50 flex items-center gap-1"
          >
            <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Add document'}
          </button>
        )}
      </div>

      {owner && (
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            e.target.value = ''
            if (files.length > 0) void onUpload(files)
          }}
        />
      )}

      {owner && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const files = Array.from(e.dataTransfer.files || [])
            if (files.length > 0) void onUpload(files)
          }}
          onClick={() => inputRef.current?.click()}
          className={`mb-4 border-2 border-dashed rounded-lg p-6 text-center text-sm transition-colors cursor-pointer ${
            dragOver
              ? 'border-chrome-accent bg-chrome-bg text-chrome-accent'
              : 'border-chrome-border text-chrome-fg-soft hover:border-chrome-fg-soft bg-chrome-bg'
          }`}
        >
          {uploading ? (
            <span>Uploading &amp; parsing…</span>
          ) : (
            <>
              <FileText className="w-5 h-5 mx-auto mb-1 opacity-60" />
              <div>Drop a booking, voucher or ticket here</div>
              <div className="text-xs mt-0.5 opacity-75">
                PDF · DOCX · XLSX · JPEG · PNG — auto-applied to itinerary
              </div>
            </>
          )}
        </div>
      )}

      {renderDocs.length > 0 ? (
        <div className="grid gap-2">
          {renderDocs.map((m) => {
            const hidden = m.visible_to_client === false
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                  hidden
                    ? 'border-dashed border-theme-rule bg-theme-paper opacity-60'
                    : 'border-theme-rule hover:bg-theme-paper'
                }`}
              >
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <FileText className="w-4 h-4 text-theme-fg-mute flex-shrink-0" />
                  <span className="text-sm truncate text-theme-fg-soft">
                    {m.caption || m.file_name || 'Document'}
                  </span>
                </a>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-theme-accent hover:underline px-2"
                  >
                    Download ↗
                  </a>
                  {owner && (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggleVisibility(m.id, hidden)}
                        className="p-1 rounded bg-chrome-bg text-chrome-fg-soft hover:text-chrome-fg hover:bg-chrome-border border border-chrome-border transition-colors"
                        title={hidden ? 'Show to client' : 'Hide from client'}
                        aria-label={hidden ? 'Show to client' : 'Hide from client'}
                      >
                        {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(m.id)}
                        className="p-1 rounded bg-chrome-bg text-chrome-fg-soft hover:text-destructive hover:bg-destructive/10 border border-chrome-border transition-colors"
                        title="Delete document"
                        aria-label="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        owner && (
          <p className="text-sm text-theme-fg-mute text-center py-2">No documents yet.</p>
        )
      )}
    </section>
  )
}
