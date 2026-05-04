'use client'

/**
 * TripChatWidget — collapsible AI assistant widget for trip-page owners.
 *
 * Shipped state (collapsed): pill button bottom-right with a sparkles icon
 * and "Edit with AI" label. Click → opens a panel with full conversation
 * thread, suggestion chips for first-time use, and the same edit-chat
 * backend the previous TripCommandBar talked to.
 *
 * Two channels for the agent's reply, depending on whether the panel is
 * open at send time:
 *   - panel open  → message lands in the thread, no toast
 *   - panel closed → toast (kept from the old bar UX) + unread badge on
 *     the FAB so the operator can see something happened
 *
 * Persistence:
 *   - open/closed state — sessionStorage, per project (so it doesn't
 *     follow the operator across other trips)
 *   - sessionId + thread messages — localStorage, with a lastActivity
 *     timestamp; on hydrate we drop the local history if it's older
 *     than 24h (matches the backend's editor-session TTL — beyond that
 *     the sessionId is no longer valid on the server side)
 *
 * Layout:
 *   - desktop ≥1024px: floating panel 380×600 anchored bottom-right
 *   - mobile <1024px: full-screen sheet (100dvh) with body scroll lock
 *
 * The component theme-inverts itself automatically through the existing
 * --bar-* tokens defined per theme in styles/themes.css.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, Plus, X, Loader2, Sparkles } from 'lucide-react'
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

/** Locally-stored thread + sessionId is dropped after this gap of inactivity.
 *  Matches the backend's `cleanupEditorSessions` TTL; a stale sessionId on
 *  the server would silently start a new conversation and the operator
 *  would see their thread context vanish on the next message. */
const LOCAL_HISTORY_TTL_MS = 24 * 60 * 60 * 1000

/** Hard cap on locally-stored messages. The backend keeps everything that
 *  matters; this just bounds localStorage growth on long sessions. */
const MAX_LOCAL_MESSAGES = 50

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

type ThreadMessage =
  | { role: 'user'; text: string; ts: number; file?: { name: string; type: string } }
  | { role: 'agent'; text: string; ts: number; isError?: boolean }

interface PersistedThread {
  sessionId?: string
  messages: ThreadMessage[]
  lastActivity: number
}

interface TripChatWidgetProps {
  projectId: string
  getToken: () => Promise<string | null>
  onTripUpdated?: () => void
  /** Trip status — file upload (the `+` button) only renders on
   *  'active' / 'completed'; on the quote phase there's nothing
   *  to parse, so the widget stays text-only. */
  status?: string | null
  /** Active trip-page theme. Drives --bar-* tokens via a wrapping
   *  data-theme attribute so the widget inverts cleanly on any theme. */
  theme?: string | null
  /** Trip language (ISO 639-1). Used to populate the "Translate to {…}"
   *  quick prompt; falls back to hiding that prompt entirely if the trip
   *  is already English. */
  language?: string | null
  /**
   * Showcase / demo mode. When true, the widget talks to the public
   * `/api/public/showcase/chat` endpoint (no auth, rate-limited,
   * non-persisting natural-language replies) instead of the auth'd
   * /edit-chat. File uploads are disabled in showcase.
   */
  isShowcase?: boolean
  /**
   * Trip context string passed to the showcase endpoint so the AI
   * can reference specific days. Only read when `isShowcase` is true.
   */
  tripContext?: string
  /**
   * Showcase only — receives the structured actions the AI returned.
   * trip-page-client implements the actual local-state mutation.
   */
  onShowcaseActions?: (actions: any[]) => void
}

function getFileIcon(type: string): string {
  if (type === 'application/pdf') return '📄'
  if (type.startsWith('image/')) return '🖼'
  if (type.includes('wordprocessingml')) return '📝'
  if (type.includes('spreadsheetml')) return '📊'
  return '📎'
}

// ── Persistence helpers ──────────────────────────────────────────────
// Storage is per project: two operators on different trips can have
// independent open/closed and thread state in the same browser.

function openStorageKey(projectId: string) {
  return `waytico:chat-open:${projectId}`
}
function threadStorageKey(projectId: string) {
  return `waytico:chat-thread:${projectId}`
}

function loadPersistedThread(projectId: string): PersistedThread | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(threadStorageKey(projectId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedThread
    if (!parsed.lastActivity || !Array.isArray(parsed.messages)) return null
    if (Date.now() - parsed.lastActivity > LOCAL_HISTORY_TTL_MS) {
      // Stale — backend session is gone too. Start clean.
      window.localStorage.removeItem(threadStorageKey(projectId))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function savePersistedThread(projectId: string, thread: PersistedThread): void {
  if (typeof window === 'undefined') return
  try {
    // Cap stored messages — backend keeps the canonical history.
    const messages = thread.messages.slice(-MAX_LOCAL_MESSAGES)
    window.localStorage.setItem(
      threadStorageKey(projectId),
      JSON.stringify({ ...thread, messages }),
    )
  } catch {
    // Ignore quota errors — thread will simply not persist this turn.
  }
}

// ── Quick prompts ────────────────────────────────────────────────────
// Static MVP set. The "Translate" prompt is suppressed when the trip is
// already in English (or language is unknown) — translating to your own
// language is a confusing chip.

function buildQuickPrompts(language: string | null | undefined): string[] {
  const prompts = ['Polish day descriptions', 'Add a rest day']
  const lang = (language || '').toLowerCase()
  if (lang && lang !== 'en') {
    prompts.push(`Translate to ${lang.toUpperCase()}`)
  }
  prompts.push('Suggest improvements')
  return prompts
}

// ── Component ────────────────────────────────────────────────────────

export function TripChatWidget({
  projectId,
  getToken,
  onTripUpdated,
  status,
  theme,
  language,
  isShowcase,
  tripContext,
  onShowcaseActions,
}: TripChatWidgetProps) {
  const allowFileUpload = !isShowcase && (status === 'active' || status === 'completed')

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [unread, setUnread] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)

  // Open/closed lives in sessionStorage (per tab, per project) — closing
  // the tab resets to collapsed, which is the safer default.
  // Hydrate once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(openStorageKey(projectId))
      if (raw === '1') setOpen(true)
    } catch {}
  }, [projectId])

  // Hydrate persisted thread on mount.
  useEffect(() => {
    const loaded = loadPersistedThread(projectId)
    if (loaded) {
      setMessages(loaded.messages)
      if (loaded.sessionId) setSessionId(loaded.sessionId)
    }
  }, [projectId])

  // Persist open/closed.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(openStorageKey(projectId), open ? '1' : '0')
    } catch {}
  }, [projectId, open])

  // Persist thread.
  useEffect(() => {
    if (messages.length === 0 && !sessionId) return
    savePersistedThread(projectId, {
      sessionId,
      messages,
      lastActivity: Date.now(),
    })
  }, [projectId, sessionId, messages])

  // Esc closes the panel; mobile body-scroll lock while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)

    const isMobile =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
    let prevOverflow = ''
    if (isMobile) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', onKey)
      if (isMobile) document.body.style.overflow = prevOverflow
    }
  }, [open])

  // Clear unread when opening.
  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  // Auto-grow textarea (8-line cap).
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  // Auto-scroll thread to the bottom on new messages.
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }, [messages, isSending, open])

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

  // ── Send handler ──────────────────────────────────────────────────
  // `overrideText` lets quick-prompt chips bypass the input field and
  // dispatch their canned message immediately — no need to populate the
  // textarea and re-trigger send.
  const send = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim()
      if ((!text && !selectedFile) || isSending) return

      const currentFile = selectedFile
      const currentText = text || 'Process this document'
      const wasOpen = open

      // Append user message to thread immediately for responsiveness.
      const userMsg: ThreadMessage = {
        role: 'user',
        text: currentText,
        ts: Date.now(),
        ...(currentFile ? { file: { name: currentFile.name, type: currentFile.type } } : {}),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsSending(true)

      try {
        // ── Showcase / demo branch ────────────────────────────────
        if (isShowcase) {
          const res = await fetch(`${API_URL}/api/public/showcase/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: currentText, tripContext: tripContext || '' }),
          })
          if (!res.ok) {
            const errText =
              res.status === 429
                ? 'Demo limit reached for this hour. Sign up free to keep editing.'
                : 'AI temporarily unavailable. Try again in a moment.'
            setMessages((prev) => [
              ...prev,
              { role: 'agent', text: errText, ts: Date.now(), isError: true },
            ])
            if (!wasOpen) {
              toast.error(errText)
              setUnread((n) => n + 1)
            }
            return
          }
          const body = await res.json()
          if (overrideText === undefined) setInput('')
          const actions = Array.isArray(body.actions) ? body.actions : []
          if (actions.length > 0 && onShowcaseActions) {
            onShowcaseActions(actions)
          }
          const reply = body.reply || 'Done.'
          setMessages((prev) => [...prev, { role: 'agent', text: reply, ts: Date.now() }])
          if (!wasOpen) {
            toast.success(reply, { duration: 6000 })
            setUnread((n) => n + 1)
          }
          return
        }

        const token = await getToken()
        if (!token) {
          toast.error('Please sign in again')
          // Roll back the optimistic user message — auth issue, command
          // didn't actually go anywhere.
          setMessages((prev) => prev.slice(0, -1))
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

        if (overrideText === undefined) setInput('')
        setSelectedFile(null)

        const reply = data.reply || 'Done.'
        const hasChanges = data.changes && data.changes.length > 0

        setMessages((prev) => [...prev, { role: 'agent', text: reply, ts: Date.now() }])

        if (hasChanges && onTripUpdated) onTripUpdated()
        if (!wasOpen) {
          // Toast still fires when the panel is closed so the operator
          // notices something happened. The toast type matches the old
          // bar's behaviour: success on tool-calls, neutral otherwise.
          if (hasChanges) toast.success(reply, { duration: 5000 })
          else toast(reply, { duration: 5000 })
          setUnread((n) => n + 1)
        }
      } catch (err: any) {
        const msg = `Could not reach the server (${err?.message || 'unknown'}). Please try again.`
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: msg, ts: Date.now(), isError: true },
        ])
        if (!wasOpen) {
          toast.error(msg)
          setUnread((n) => n + 1)
        }
      } finally {
        setIsSending(false)
        setTimeout(() => textareaRef.current?.focus(), 0)
      }
    },
    [
      input,
      selectedFile,
      isSending,
      open,
      sessionId,
      projectId,
      getToken,
      onTripUpdated,
      isShowcase,
      tripContext,
      onShowcaseActions,
    ],
  )

  const quickPrompts = useMemo(() => buildQuickPrompts(language), [language])
  const showQuickPrompts = open && messages.length === 0 && !isSending

  // ── Render ────────────────────────────────────────────────────────

  if (!open) {
    return (
      <button
        type="button"
        data-theme={theme || 'editorial'}
        className="tp-chat-fab"
        onClick={() => setOpen(true)}
        aria-label="Open trip assistant"
      >
        <Sparkles className="tp-chat-fab__icon" aria-hidden="true" />
        <span className="tp-chat-fab__label">Edit with AI</span>
        {unread > 0 && (
          <span className="tp-chat-fab__badge" aria-label={`${unread} new replies`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      data-theme={theme || 'editorial'}
      className="tp-chat-panel"
      role="dialog"
      aria-label="Trip assistant"
      aria-modal="true"
    >
      <div className="tp-chat-panel__header">
        <div className="tp-chat-panel__header-title">
          <Sparkles className="tp-chat-panel__header-icon" aria-hidden="true" />
          <span>Trip assistant</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="tp-chat-panel__close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={messagesScrollRef} className="tp-chat-panel__messages">
        {messages.length === 0 && (
          <div className="tp-chat-empty">
            <p className="tp-chat-empty__title">What would you like to change?</p>
            <p className="tp-chat-empty__hint">
              Ask in plain language — the assistant edits the trip page directly.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={`${m.ts}-${i}`}
            className={`tp-chat-msg tp-chat-msg--${m.role}${m.role === 'agent' && m.isError ? ' tp-chat-msg--error' : ''}`}
          >
            <div className="tp-chat-msg__bubble">
              {m.text}
              {m.role === 'user' && m.file && (
                <span className="tp-chat-msg__attachment">
                  <span aria-hidden="true">{getFileIcon(m.file.type)}</span>
                  <span className="truncate">{m.file.name}</span>
                </span>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="tp-chat-msg tp-chat-msg--agent">
            <div className="tp-chat-msg__bubble tp-chat-typing" aria-label="Assistant is typing">
              <span /> <span /> <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {showQuickPrompts && (
        <div className="tp-chat-quick-prompts" role="group" aria-label="Suggested actions">
          {quickPrompts.map((p) => (
            <button
              key={p}
              type="button"
              className="tp-chat-chip"
              onClick={() => send(p)}
              disabled={isSending}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {selectedFile && (
        <div className="tp-chat-selected-file">
          <span className="tp-chat-file-pill">
            <span aria-hidden="true">{getFileIcon(selectedFile.type)}</span>
            <span className="max-w-[220px] truncate">{selectedFile.name}</span>
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

      <div className="tp-chat-panel__input-row">
        {allowFileUpload && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="tp-chat-attach"
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
          rows={1}
          placeholder={
            isSending
              ? 'Working on it…'
              : 'Ask anything — e.g. "add a rest day after day 3"'
          }
          disabled={isSending}
          className="tp-chat-input"
        />
        <button
          type="button"
          onClick={() => send()}
          disabled={(!input.trim() && !selectedFile) || isSending}
          className="tp-chat-send"
          aria-label="Send command"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="tp-chat-panel__footer">
        <a
          href="/help/ai-assistant"
          target="_blank"
          rel="noopener noreferrer"
          className="tp-chat-help-link"
        >
          What can the assistant do? <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  )
}
