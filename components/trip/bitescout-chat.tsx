"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Send, Bot, Fish, Plus } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface BiteScoutChatProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  initialMessage?: string
  onTripUpdated?: () => void
}

export function BiteScoutChat({
  isOpen,
  onClose,
  projectId,
  initialMessage,
  onTripUpdated,
}: BiteScoutChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasHandledInitial = useRef(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)

  const ALLOWED_MIMES = [
    'application/pdf', 'image/jpeg', 'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
  const MAX_FILE_SIZE = 10 * 1024 * 1024

  function handleFileSelect(file: File | null) {
    if (!file) return
    if (!ALLOWED_MIMES.includes(file.type)) {
      alert('Unsupported file type. Use PDF, JPEG, DOCX or XLSX')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large (max 10MB)')
      return
    }
    setSelectedFile(file)
  }

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

      const userMsg: Message = { role: "user", content: text || "Process this document" }
      setMessages((prev) => [...prev, userMsg])
      setIsTyping(true)
      if (selectedFile) setIsParsing(true)

      const currentFile = selectedFile
      setSelectedFile(null)

      try {
        let res: globalThis.Response

        if (currentFile) {
          const formData = new FormData()
          formData.append("message", text || "Process this document")
          formData.append("file", currentFile)
          if (sessionId) formData.append("sessionId", sessionId)
          formData.append("projectId", projectId)

          res = await fetch("/api/trip-edit-chat", {
            method: "POST",
            body: formData,
          })
        } else {
          res = await fetch("/api/trip-edit-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text,
              sessionId,
              projectId,
            }),
          })
        }

        const data = await res.json()

        if (data.sessionId) setSessionId(data.sessionId)

        const reply = data.reply || "Sorry, something went wrong."
        setMessages((prev) => [...prev, { role: "assistant", content: reply }])

        if (data.changes && data.changes.length > 0 && onTripUpdated) {
          onTripUpdated()
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't connect. Please try again.",
          },
        ])
      } finally {
        setIsTyping(false)
        setIsParsing(false)
      }
    },
    [isTyping, sessionId, projectId, onTripUpdated, selectedFile]
  )

  useEffect(() => {
    if (isOpen && initialMessage && !hasHandledInitial.current) {
      hasHandledInitial.current = true
      sendMessage(initialMessage)
    }
  }, [isOpen, initialMessage, sendMessage])

  useEffect(() => {
    if (isOpen && !initialMessage && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm your trip editor. Tell me what you'd like to change \u2014 dates, activities, tasks, locations, or anything else about your trip.",
        },
      ])
    }
  }, [isOpen, initialMessage, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      hasHandledInitial.current = false
    }
  }, [isOpen])

  const handleSend = () => {
    if (!input.trim() && !selectedFile) return
    const text = input
    setInput("")
    sendMessage(text)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-x-0 bottom-0 z-50 flex h-[75vh] max-h-[600px] flex-col rounded-t-2xl bg-card shadow-2xl md:inset-x-auto md:right-4 md:bottom-4 md:left-auto md:h-[70vh] md:w-[420px] md:rounded-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-seafoam text-offwhite">
            <Fish className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Trip Editor</p>
            <p className="text-xs text-muted-foreground">Edit your trip via chat</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFileSelect(file)
          }}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-seafoam/10 border-2 border-dashed border-seafoam rounded-xl">
              <p className="text-seafoam font-medium">Drop file here</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-navy text-offwhite rounded-br-md"
                    : "bg-sand-light text-foreground rounded-bl-md"
                }`}
              >
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(
                      /\*\*(.*?)\*\*/g,
                      "<strong>$1</strong>"
                    ),
                  }}
                />
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              {isParsing ? (
                <div className="rounded-2xl rounded-bl-md bg-sand-light px-4 py-2.5 text-sm">
                  🔄 Parsing document...
                </div>
              ) : (
                <div className="rounded-2xl rounded-bl-md bg-sand-light px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          {/* File preview chip */}
          {selectedFile && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-seafoam/10 border border-seafoam/30 px-3 py-1.5 text-xs text-foreground">
                <span>{getFileIcon(selectedFile.type)}</span>
                <span className="max-w-[200px] truncate">{selectedFile.name}</span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-seafoam hover:border-seafoam transition-colors"
              title="Attach file"
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
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me what to change..."
              className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-seafoam focus:outline-none focus:ring-1 focus:ring-seafoam"
            />
            <button
              type="submit"
              disabled={(!input.trim() && !selectedFile) || isTyping}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-seafoam text-offwhite transition-opacity disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            AI-powered trip editor. Changes are applied immediately.
          </p>
        </div>
      </div>
    </>
  )
}

/* ───── Sticky Bottom Bar ───── */

export function StickyBottomBar({
  onShare,
  onOpenChat,
}: {
  onShare: () => void
  onOpenChat: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Share Trip
        </button>
        <button
          onClick={onOpenChat}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-seafoam py-2.5 text-sm font-semibold text-offwhite transition-colors hover:bg-seafoam-light"
        >
          <Bot className="h-4 w-4" />
          Edit Trip
        </button>
      </div>
    </div>
  )
}
