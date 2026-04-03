'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type Message = { role: 'user' | 'assistant'; text: string }
type Phase = 'idle' | 'sending' | 'chatting' | 'generating'

export default function ChatFlow() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [slug, setSlug] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll public endpoint after generation starts
  useEffect(() => {
    if (phase !== 'generating' || !slug) return
    let active = true
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch(`${API_URL}/api/public/projects/${slug}`)
          if (res.ok) {
            router.push(`/t/${slug}`)
            return
          }
        } catch {}
        await new Promise(r => setTimeout(r, 3000))
      }
    }
    poll()
    return () => { active = false }
  }, [phase, slug, router, API_URL])

  const send = async () => {
    const text = input.trim()
    if (!text || phase === 'sending') return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setPhase('sending')

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
        body: JSON.stringify({ message: text, ...(sessionId && { sessionId }) }),
      })

      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()

      setSessionId(data.sessionId)
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])

      if (data.briefConfirmed && data.projectSlug) {
        setSlug(data.projectSlug)
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
      {/* Messages */}
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
                <span className="inline-flex gap-1">
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

      {/* Input */}
      <div className="relative">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={messages.length === 0
            ? 'Elbrus trekking, 7 days, starting June 14th. Group of 8, intermediate level. Includes transfer from Mineralnye Vody, meals, gear…'
            : 'Add details or type "confirm" to generate…'
          }
          className="min-h-[140px] p-5 pb-16 text-base rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
          rows={3}
          disabled={phase === 'sending'}
        />
        <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {messages.length === 0 ? 'Write naturally — AI will figure it out' : 'Shift+Enter for new line'}
          </span>
          <Button
            onClick={send}
            disabled={!input.trim() || phase === 'sending'}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 py-2 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {messages.length === 0 ? 'Create page →' : 'Send →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
