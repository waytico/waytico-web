'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Plus, X, FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type Message = { role: 'user' | 'assistant'; text: string }
type Phase = 'idle' | 'sending' | 'chatting' | 'generating'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const PLACEHOLDER_EXAMPLE = `Tuscany wine tour, Sep 14–20. Couple, relaxed pace.

Sep 14 — Arrive FLR, transfer to Greve in Chianti, Villa Bordoni.
Sep 15 — Castello di Ama tasting with Marco.
…
Sep 19 — Montalcino, Biondi-Santi cellar visit.
Sep 20 — Transfer to FLR, flight out.

Guide Marco Rossi. €3,200 pp, flights not included.`

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
  if (mime === 'application/pdf') return <FileText className="w-4 h-4" />
  if (mime.includes('spreadsheet')) return <FileSpreadsheet className="w-4 h-4" />
  if (mime.includes('word')) return <FileText className="w-4 h-4" />
  return <FileIcon className="w-4 h-4" />
}

function truncateName(name: string, max = 32) {
  if (name.length <= max) return name
  const ext = name.includes('.') ? '.' + name.split('.').pop() : ''
  const base = ext ? name.slice(0, name.length - ext.length) : name
  return base.slice(0, max - ext.length - 1) + '…' + ext
}

export default function ChatFlow() {
  const router = useRouter()
  const { getToken, isLoaded } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [slug, setSlug] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll by projectId after generation starts
  useEffect(() => {
    if (phase !== 'generating' || !projectId) return
    let active = true
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch(`${API_URL}/api/public/projects/${projectId}`)
          if (res.ok) {
            const data = await res.json()
            const status = data.project?.status
            if (status === 'quoted' || status === 'active' || status === 'completed') {
              const realSlug = data.project?.slug || slug
              try {
                sessionStorage.setItem('waytico:just-created', projectId)
              } catch {}
              router.push(`/t/${realSlug}`)
              return
            }
          }
        } catch {}
        await new Promise(r => setTimeout(r, 3000))
      }
    }
    poll()
    return () => { active = false }
  }, [phase, projectId, slug, router])

  const validateAndSetFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max 10MB.`)
      return false
    }
    if (!ALLOWED_MIMES.includes(file.type)) {
      alert(`Unsupported file type. Allowed: PDF, JPEG, PNG, DOCX, XLSX.`)
      return false
    }
    setSelectedFile(file)
    return true
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
    // reset so same file can be reselected after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const send = async () => {
    const text = input.trim()
    if ((!text && !selectedFile) || phase === 'sending') return

    const messageToSend = text || (selectedFile ? 'Process this document' : '')
    const fileToSend = selectedFile

    const displayText = selectedFile
      ? `${messageToSend}\n📎 ${selectedFile.name}`
      : messageToSend

    setMessages(prev => [...prev, { role: 'user', text: displayText }])
    setInput('')
    setSelectedFile(null)
    setPhase('sending')

    try {
      let token: string | null = null
      if (isLoaded) {
        try { token = await getToken() } catch {}
      }

      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      let res: Response
      if (fileToSend) {
        const formData = new FormData()
        formData.append('message', messageToSend)
        formData.append('file', fileToSend)
        if (sessionId) formData.append('sessionId', sessionId)
        // Do NOT set Content-Type — browser adds multipart boundary
        res = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers,
          body: formData,
        })
      } else {
        headers['Content-Type'] = 'application/json'
        res = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: messageToSend, ...(sessionId && { sessionId }) }),
        })
      }

      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()

      setSessionId(data.sessionId)
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])

      if (data.briefConfirmed && data.projectSlug) {
        setSlug(data.projectSlug)
        setProjectId(data.projectId || null)
        setPhase('generating')
      } else {
        setPhase('chatting')
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Please try again.' }])
      setPhase('chatting')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (phase === 'generating') {
    return (
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-foreground/70">Creating your trip page…</p>
          <p className="text-sm text-muted-foreground">This usually takes 30–60 seconds</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {messages.length > 0 && (
        <div className="w-full max-h-[40vh] overflow-y-auto space-y-3 text-left">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-accent-foreground rounded-br-md'
                  : 'bg-secondary text-secondary-foreground rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {phase === 'sending' && (
            <div className="flex justify-start">
              <div className="bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl rounded-bl-md">
                <span className="inline-flex gap-1 items-center">
                  {selectedFile ? (
                    <span className="text-xs text-muted-foreground mr-1">Parsing document…</span>
                  ) : null}
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div
        className="relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-accent bg-accent/10 flex items-center justify-center pointer-events-none">
            <p className="text-accent font-medium">Drop file here</p>
          </div>
        )}

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={messages.length === 0
            ? PLACEHOLDER_EXAMPLE
            : 'Add details or type "confirm" to generate…'
          }
          className="min-h-[300px] p-5 pb-24 text-base rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
          rows={3}
          disabled={phase === 'sending'}
        />

        {/* File chip */}
        {selectedFile && (
          <div className="absolute bottom-14 left-5 right-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs max-w-full">
              {fileIcon(selectedFile.type)}
              <span className="truncate max-w-[200px]">{truncateName(selectedFile.name)}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="hover:text-foreground transition-colors"
                aria-label="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={phase === 'sending' || !!selectedFile}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Attach file"
              title="Attach a file (PDF, JPEG, PNG, DOCX, XLSX — max 10MB)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              {messages.length === 0 ? (
                <>
                  <span className="hidden sm:inline">Itinerary on file? Attach it</span>
                  <span className="sm:hidden">Attach itinerary</span>
                </>
              ) : (
                <span className="hidden sm:inline">Shift+Enter for new line</span>
              )}
            </span>
          </div>
          <Button
            onClick={send}
            disabled={(!input.trim() && !selectedFile) || phase === 'sending'}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 py-2 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {messages.length === 0 ? 'Create quote →' : 'Send →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
