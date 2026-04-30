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

// Time-based fake progress steps. Total ~40s, calibrated to median pipeline
// timing (Hero ~4s, Days ~17s, Overview/Locations/Validate ~12s combined).
// If backend finishes earlier we fast-forward through remaining steps and
// redirect; if it takes longer we stick on the last step with "Almost there…"
const GEN_STEPS: { label: string; duration: number }[] = [
  { label: 'Reading your brief',                 duration: 4000 },
  { label: 'Mapping out the route',              duration: 6000 },
  { label: 'Crafting day-by-day itinerary',      duration: 15000 },
  { label: 'Picking highlights and locations',   duration: 9000 },
  { label: 'Polishing the proposal',             duration: 6000 },
]

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Two starting placeholders — chat-flow shows one based on auth state.
//   - SIGNEDOUT: real placeholder is just the prompt "Describe your trip.
//     For example:" — non-italic. The actual example body (3 days in
//     Paris, day 1, day 2…) is rendered separately as an absolutely-
//     positioned italic overlay so it visually mirrors what the operator
//     would type in (everything operator-typed is italic across the app)
//     and we can apply a gradient fade past the second tour line. The
//     overlay is hidden as soon as the user types or focuses-and-types.
//   - SIGNEDIN: short prompt — operators already know the product, no
//     example needed.
const PLACEHOLDER_SIGNEDOUT = `Describe your trip. For example:`
const PLACEHOLDER_SIGNEDIN = `Describe a trip you want to send to a client.`

// Example body shown only as a visual overlay (signed-out, untouched
// state). Italic — same treatment as the operator's actual input.
const PLACEHOLDER_EXAMPLE_BODY = [
  '3 days in Paris for a couple, late June. Hôtel des Deux Pavillons in the Marais.',
  'Day 1 Marais and Seine,',
  'Day 2 Louvre and Saint-Germain with a Sainte-Chapelle concert,',
  'Day 3 Montmartre and a farewell brunch.',
  '€1,800 total, private transfers included.',
]

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
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [slug, setSlug] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Fake-progress state for the generating phase
  const [stepIndex, setStepIndex] = useState(0)
  const [stuck, setStuck] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const readySlugRef = useRef<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Scroll only the inner messages container so the page (header + textarea)
    // stays put. scrollIntoView was affecting page scroll and pushing the
    // latest message off-screen on small viewports.
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
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
              readySlugRef.current = data.project?.slug || slug
              setFinishing(true)
              return
            }
          }
        } catch {}
        await new Promise(r => setTimeout(r, 3000))
      }
    }
    poll()
    return () => { active = false }
  }, [phase, projectId, slug])

  // Slow step advance during generation (idle until backend reports ready,
  // then the fast-forward effect below takes over by setting `finishing`)
  useEffect(() => {
    if (phase !== 'generating' || finishing) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = (idx: number) => {
      if (cancelled) return
      setStepIndex(idx)
      if (idx >= GEN_STEPS.length - 1) {
        // Last step is reached — once its duration is up, mark stuck.
        timer = setTimeout(() => { if (!cancelled) setStuck(true) }, GEN_STEPS[idx].duration)
        return
      }
      timer = setTimeout(() => tick(idx + 1), GEN_STEPS[idx].duration)
    }
    tick(0)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [phase, finishing])

  // Fast-forward through remaining steps, then redirect.
  useEffect(() => {
    if (!finishing) return
    let cancelled = false

    const finish = async () => {
      // Take whatever step we're on and march to the end with short ticks.
      let i = stepIndex
      while (i <= GEN_STEPS.length) {
        if (cancelled) return
        setStepIndex(i)
        await new Promise(r => setTimeout(r, i === GEN_STEPS.length ? 450 : 220))
        i += 1
      }
      if (cancelled) return
      try {
        if (!isSignedIn && projectId) {
          sessionStorage.setItem(`waytico:anon-owns-${projectId}`, '1')
        }
      } catch {}
      router.push(`/t/${readySlugRef.current || slug}`)
    }
    finish()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishing])

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
    // Submit only on Ctrl+Enter (Win/Linux) or Cmd+Enter (Mac).
    // Plain Enter falls through to default textarea behaviour (new line)
    // so users can't accidentally fire off an incomplete description.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      send()
    }
  }

  if (phase === 'generating') {
    const total = GEN_STEPS.length
    const progressPct = stepIndex >= total
      ? 100
      : stuck
        ? 90
        : Math.round(((stepIndex + 0.6) / total) * 100)

    return (
      <div className="w-full max-w-xl mx-auto py-10">
        {/* slim progress bar */}
        <div className="w-full h-[3px] bg-secondary rounded-full overflow-hidden mb-10">
          <div
            className="h-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* step list */}
        <ul className="space-y-4">
          {GEN_STEPS.map((step, i) => {
            const isDone = i < stepIndex
            const isActive = i === stepIndex && stepIndex < total
            const isPending = i > stepIndex

            return (
              <li key={i} className="flex items-center gap-3">
                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {isDone && (
                    <svg viewBox="0 0 20 20" className="w-5 h-5 text-accent" aria-hidden>
                      <path
                        d="M5 10.5l3.5 3.5L15 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {isActive && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                    </span>
                  )}
                  {isPending && (
                    <span className="block w-2 h-2 rounded-full bg-muted-foreground/25" />
                  )}
                </span>
                <span
                  className={
                    isDone
                      ? 'text-base text-muted-foreground'
                      : isActive
                        ? 'text-base text-foreground font-medium'
                        : 'text-base text-muted-foreground/60'
                  }
                >
                  {step.label}
                </span>
              </li>
            )
          })}
        </ul>

        <p className="text-sm text-muted-foreground text-center mt-10">
          {stuck && stepIndex < total
            ? 'Almost there…'
            : 'This usually takes 30–60 seconds'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {messages.length > 0 && (
        <div ref={messagesContainerRef} className="w-full max-h-[40vh] overflow-y-auto space-y-3 text-left">
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
        </div>
      )}

      {/* The textarea block is hidden while we're waiting for the briefing
          agent's first reply (phase==='sending' AND there's already a user
          message above). At that moment we don't yet know whether the
          request will be confirmed (→ generate) or needs follow-up (→
          chatting). Showing the textarea with a "Add details…" placeholder
          before the agent has even spoken would suggest follow-up is
          required, when it usually isn't. After the agent answers:
            - briefConfirmed=true → component re-renders into the
              generating-spinner screen entirely.
            - briefConfirmed=false → phase flips to 'chatting' and this
              block re-appears for the user to type their reply. */}
      {!(phase === 'sending' && messages.length > 0) && (
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
            ? (isSignedIn ? PLACEHOLDER_SIGNEDIN : PLACEHOLDER_SIGNEDOUT)
            : 'Add details or type "confirm" to generate…'
          }
          className="min-h-[420px] md:min-h-[300px] p-5 pb-28 text-base rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground placeholder:not-italic italic resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
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

        {/* Example overlay — visible only on the home for signed-out
            visitors before they start typing. Sits above the textarea
            (pointer-events: none so clicks still focus the textarea
            below) and renders the actual tour example italic, mimicking
            what an operator would type. The first two tour lines stay
            fully visible; everything from the 4th visible line down
            (Day 2 in the example) fades to the card background so the
            block doesn't dominate the page. */}
        {messages.length === 0 && !input && !selectedFile && !isSignedIn && (
          <div
            aria-hidden="true"
            className="absolute left-5 right-5 pointer-events-none italic text-base text-muted-foreground leading-[1.5] text-left"
            style={{
              // Top offset = textarea padding (20px) + first prompt line
              // height (~24px) + small breathing room. The first prompt
              // line "Describe your trip. For example:" lives in the
              // textarea's placeholder attribute above this overlay.
              top: '52px',
              // Mask: keep the first two example lines (3 days … / Day 1)
              // fully visible, fade out everything from Day 2 onward.
              // Each visual line ≈ 24px (text-base 16px × 1.5 line-height).
              maskImage:
                'linear-gradient(to bottom, black 0, black 48px, transparent 96px)',
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0, black 48px, transparent 96px)',
            }}
          >
            {PLACEHOLDER_EXAMPLE_BODY.map((line, i) => (
              <p key={i} className="m-0 text-left">{line}</p>
            ))}
          </div>
        )}

        {/* Bottom controls — gradient backdrop prevents textarea content from
             visually overflowing onto the Attach button / CTA when user types
             long inputs. */}
        <div className="absolute bottom-0 left-0 right-0 pt-12 pb-4 px-5 flex items-center justify-between rounded-b-2xl bg-gradient-to-t from-card via-card to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
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
                <span className="hidden sm:inline">Ctrl+Enter to send</span>
              )}
            </span>
          </div>
          <Button
            onClick={send}
            disabled={(!input.trim() && !selectedFile) || phase === 'sending'}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 py-2 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 pointer-events-auto"
          >
            {messages.length === 0 ? 'Create quote →' : 'Send →'}
          </Button>
        </div>
      </div>
      )}
    </div>
  )
}


