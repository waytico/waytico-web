'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Bot, Pencil, Plus } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface Message {
  role: 'user' | 'assistant'
  content: string
}

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

interface TripEditorChatProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  getToken: () => Promise<string | null>
  onTripUpdated?: () => void
}

export function TripEditorChat({
  isOpen,
  onClose,
  projectId,
  getToken,
  onTripUpdated,
}: TripEditorChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return
    if (!ALLOWED_MIMES.includes(file.type)) {
      alert('Unsupported file type. Use PDF, JPEG, PNG, DOCX or XLSX.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large (max 10 MB)')
      return
    }
    setSelectedFile(file)
  }, [])

  function getFileIcon(type: string): string {
    if (type === 'application/pdf') return '📄'
    if (type.startsWith('image/')) return '🖼'
    if (type.includes('wordprocessingml')) return '📝'
    if (type.includes('spreadsheetml')) return '📊'
    return '📎'
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if ((!text.trim() && !selectedFile) || isTyping) return

      const userMsg: Message = {
        role: 'user',
        content: text || 'Process this document',
      }
      setMessages((prev) => [...prev, userMsg])
      setIsTyping(true)
      if (selectedFile) setIsParsing(true)

      const currentFile = selectedFile
      setSelectedFile(null)

      try {
        const token = await getToken()
        if (!token) throw new Error('Not signed in')

        let res: Response
        if (currentFile) {
          const formData = new FormData()
          formData.append('message', text || 'Process this document')
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
            body: JSON.stringify({ message: text, sessionId }),
          })
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`)
        }

        const data: EditChatResponse = await res.json()
        if (data.sessionId) setSessionId(data.sessionId)

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply || 'Done.' },
        ])

        if (data.changes && data.changes.length > 0 && onTripUpdated) {
          onTripUpdated()
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Sorry, I couldn't reach the server (${err?.message || 'unknown'}). Please try again.`,
          },
        ])
      } finally {
        setIsTyping(false)
        setIsParsing(false)
      }
    },
    [isTyping, sessionId, projectId, onTripUpdated, selectedFile, getToken],
  )

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content:
            "Hi! I'm your trip editor. Tell me what you'd like to change — itinerary, prices, included services, tasks, locations, or anything else.",
        },
      ])
    }
  }, [isOpen, messages.length])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Textarea auto-grow
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 200 // ~8 lines
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px'
  }, [input])

  const handleSend = () => {
    if (!input.trim() && !selectedFile) return
    const text = input
    setInput('')
    sendMessage(text)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        // Only reset when leaving the whole overlay
        if (e.currentTarget === e.target) setIsDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFileSelect(file)
      }}
    >
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Pencil className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground">Trip Editor</p>
            <p className="text-xs text-muted-foreground">Edit your trip via chat</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8 space-y-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-accent-foreground rounded-br-md'
                    : 'bg-secondary text-foreground rounded-bl-md'
                }`}
              >
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong>$1</strong>',
                    ),
                  }}
                />
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              {isParsing ? (
                <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-[15px]">
                  🔄 Parsing document…
                </div>
              ) : (
                <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-3 md:px-6 md:py-4">
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/30 px-3 py-1.5 text-xs text-foreground">
                <span>{getFileIcon(selectedFile.type)}</span>
                <span className="max-w-[240px] truncate">{selectedFile.name}</span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label="Remove file"
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
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors"
              title="Attach file"
              aria-label="Attach file"
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
                  handleSend()
                }
              }}
              rows={1}
              placeholder="Tell me what to change..."
              className="flex-1 resize-none bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px]"
              style={{ maxHeight: 200 }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={(!input.trim() && !selectedFile) || isTyping}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            AI-powered trip editor. Changes are applied immediately.
          </p>
        </div>
      </div>

      {/* Drop overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-accent/10 border-4 border-dashed border-accent">
          <p className="text-accent font-semibold text-lg">Drop file to attach</p>
        </div>
      )}
    </div>
  )
}

/* ─── Sticky Bottom Bar (mobile) ─── */

export function StickyBottomBar({
  onShare,
  onOpenChat,
}: {
  onShare: () => void
  onOpenChat: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          Share Trip
        </button>
        <button
          onClick={onOpenChat}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Bot className="h-4 w-4" />
          Edit Trip
        </button>
      </div>
    </div>
  )
}
