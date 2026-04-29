'use client'

/**
 * TripCommandBar — persistent bottom bar for trip-page owners.
 *
 * Always visible at the bottom of /t/[slug] for the trip owner. The user types
 * a single command (e.g. "add a task: book transfer", "change day 2 title to X"),
 * hits send, the agent applies changes via in-process tool calls on the backend,
 * and the page re-fetches to reflect them. There is no chat history in the UI —
 * feedback is delivered via a sonner toast containing the agent's reply.
 *
 * Session context (multi-turn follow-ups like "also add a task") is kept in
 * local state via sessionId; the backend retains history for 1h. UI stays
 * stateless-looking.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface TripChange {
  type: string
  entityId?: string
  data?: any
}

interface EditChatResponse {
  reply: string
  sessionId: string
  changes: TripChange[]
}

interface TripCommandBarProps {
  projectId: string
  getToken: () => Promise<string | null>
  onTripUpdated?: () => void
  /** Trip status — file upload (the `+` button) only renders on
   *  'active' / 'completed'; on the quote phase there's nothing
   *  to parse, so the bar stays text-only. */
  status?: string | null
  /** Active trip-page theme. Drives --bar-* tokens via a wrapping
   *  data-theme attribute so the bar inverts cleanly on any theme
   *  (dark bar on light pages, light bar on dark). */
  theme?: string | null
}

function getFileIcon(type: string): string {
  if (type === 'application/pdf') return '📄'
  if (type.startsWith('image/')) return '🖼'
  if (type.includes('wordprocessingml')) return '📝'
  if (type.includes('spreadsheetml')) return '📊'
  return '📎'
}

export function TripCommandBar({
  projectId,
  getToken,
  onTripUpdated,
  status,
  theme,
}: TripCommandBarProps) {
  // File upload is only useful once the trip is active — that's when
  // bookings, tickets and other documents start flowing in. On a quote
  // there's nothing to parse, so we keep the bar text-only.
  const allowFileUpload = status === 'active' || status === 'completed'
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string | undefined>()
  /** True when the page footer enters the viewport — we fade the
   *  command bar out so it doesn't sit on top of the footer's links.
   *  trip-page-client renders an element with id="site-footer" at the
   *  end of the page; if it's not present (e.g. on a stripped-down
   *  preview), the observer just never fires and the bar stays. */
  const [footerVisible, setFooterVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById('site-footer')
    if (!target || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        // Trigger as soon as any sliver of the footer reaches the
        // viewport — at that point the bar would start overlapping links.
        setFooterVisible(e.isIntersecting && e.intersectionRatio > 0)
      },
      { threshold: [0, 0.01, 0.1] },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return
    if (!ALLOWED_MIMES.includes(file.type)) {
      toast.error('Unsupported file type. Use PDF, JPEG, PNG, DOCX or XLSX.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large (max 10 MB)')
      return
    }
    setSelectedFile(file)
  }, [])

  // Textarea auto-grow
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    // 240px ≈ 8 lines at the current 15px / leading-snug font. Vadim
    // explicitly asked for ~2× the previous height (was 120px). Hard
    // cap so a runaway paste doesn't push the bar over the page.
    const maxHeight = 240
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }, [input])

  const send = useCallback(async () => {
    const text = input.trim()
    if ((!text && !selectedFile) || isSending) return

    const currentFile = selectedFile
    const currentText = text || 'Process this document'

    setIsSending(true)

    try {
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }

      let res: Response
      if (currentFile) {
        const formData = new FormData()
        formData.append('message', currentText)
        formData.append('file', currentFile)
        if (sessionId) formData.append('sessionId', sessionId)

        res = await fetch(`${API_URL}/api/projects/${projectId}/edit-chat`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
      } else {
        res = await fetch(`${API_URL}/api/projects/${projectId}/edit-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: currentText, sessionId }),
        })
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`)
      }

      const data: EditChatResponse = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)

      // Clear input on success
      setInput('')
      setSelectedFile(null)

      // Show agent's reply as a toast
      const reply = data.reply || 'Done.'
      const hasChanges = data.changes && data.changes.length > 0
      if (hasChanges) {
        toast.success(reply, { duration: 5000 })
        if (onTripUpdated) onTripUpdated()
      } else {
        // No tool-calls were made — show reply as a neutral info toast
        toast(reply, { duration: 5000 })
      }
    } catch (err: any) {
      toast.error(
        `Could not reach the server (${err?.message || 'unknown'}). Please try again.`,
      )
    } finally {
      setIsSending(false)
      // Keep focus for fast follow-up commands
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }, [input, selectedFile, isSending, sessionId, projectId, getToken, onTripUpdated])

  return (
    <div
      data-theme={theme || 'editorial'}
      className={`pointer-events-none fixed inset-x-0 z-30 px-4 transition-opacity duration-200 ease-out pb-[calc(env(safe-area-inset-bottom)+16px)] ${
        footerVisible ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ bottom: 0 }}
      aria-hidden={footerVisible ? 'true' : undefined}
    >
      <div
        className={`mx-auto max-w-3xl ${
          footerVisible ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2">
            <span className="tp-cmdbar-file-pill">
              <span>{getFileIcon(selectedFile.type)}</span>
              <span className="max-w-[240px] truncate">{selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                aria-label="Remove file"
                disabled={isSending}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        <div className="tp-cmdbar">
          {allowFileUpload && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="tp-cmdbar-attach"
                title="Attach file"
                aria-label="Attach file"
                disabled={isSending}
              >
                <Plus className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                  e.target.value = ''
                }}
              />
            </>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            placeholder={
              isSending
                ? 'Working on it…'
                : 'Try: "add a rest day between 3 and 4" or "polish the description for [hotel name] / day 2"'
            }
            disabled={isSending}
            className="tp-cmdbar-input"
          />
          <button
            type="button"
            onClick={send}
            disabled={(!input.trim() && !selectedFile) || isSending}
            className="tp-cmdbar-send"
            aria-label="Send command"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-1.5 px-1 text-right">
          <a
            href="/help/ai-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-foreground/40 hover:text-foreground/70 transition-colors inline-flex items-center gap-1"
          >
            <span>What can the assistant do?</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}
