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
}: TripCommandBarProps) {
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string | undefined>()

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
    const maxHeight = 120
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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-3xl px-4 py-3 md:px-6">
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/30 px-3 py-1.5 text-xs text-foreground">
              <span>{getFileIcon(selectedFile.type)}</span>
              <span className="max-w-[240px] truncate">{selectedFile.name}</span>
              <button
                onClick={() => setSelectedFile(null)}
                className="ml-1 text-muted-foreground hover:text-foreground"
                aria-label="Remove file"
                disabled={isSending}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
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
                : 'Tell me what to change (e.g. "add a task: book transfer")'
            }
            disabled={isSending}
            className="flex-1 resize-none bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] disabled:opacity-60"
            style={{ maxHeight: 120 }}
          />
          <button
            type="button"
            onClick={send}
            disabled={(!input.trim() && !selectedFile) || isSending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:opacity-40"
            aria-label="Send command"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
