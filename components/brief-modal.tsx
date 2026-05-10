'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/nextjs'
import { X } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type BriefMessage = {
  content: string
  createdAt: string
}

type BriefResponse = {
  available: boolean
  messages: BriefMessage[]
}

type Props = {
  open: boolean
  projectId: string
  onClose: () => void
}

function fmtTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Read-only viewer for the original briefing-agent transcript that
 * produced this trip. Surfaced from the dashboard trip-row "View brief"
 * action so the operator can re-read what they actually wrote and spot
 * mismatches with the generated plan ("I said 3 days, plan has 5").
 *
 * Only user-role messages are shown — the assistant's replies are not
 * useful for this purpose and would just bury the operator's input.
 *
 * For anonymous trips the underlying chat_session has a 3-day TTL on the
 * backend; once cleaned up the endpoint returns available=false and we
 * render the "no longer available" empty state.
 */
export function BriefModal({ open, projectId, onClose }: Props) {
  const { getToken } = useAuth()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<BriefResponse | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  // Fetch fresh on each open. Brief is small (one transcript, text only),
  // so caching across opens isn't worth the staleness risk if the operator
  // ever re-runs generation from the same session.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/projects/${projectId}/brief`, { token })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = (await res.json()) as BriefResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load brief')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, projectId, getToken])

  if (!open || !mounted) return null

  const messages = data?.messages ?? []
  const available = data?.available ?? false
  const firstAt = messages[0]?.createdAt

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="relative w-full max-w-xl max-h-[80vh] flex flex-col rounded-2xl bg-background border border-border shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 text-foreground/70 hover:text-foreground hover:bg-secondary rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 pt-6 pb-3 border-b border-border">
          <h2 className="text-xl font-serif font-semibold">Original brief</h2>
          <p className="text-xs text-foreground/60 mt-1">
            What you wrote when you started this trip.
            {firstAt && <> · {fmtTimestamp(firstAt)}</>}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <p className="text-sm text-foreground/60 italic">Loading…</p>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive">
              Couldn&apos;t load the brief. Please try again.
            </p>
          )}

          {!loading && !error && data && !available && (
            <p className="text-sm text-foreground/60 leading-relaxed">
              The original brief is no longer available. Briefs created without
              an account are kept for 3 days.
            </p>
          )}

          {!loading && !error && available && messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i}>
                  {messages.length > 1 && (
                    <p className="text-[11px] uppercase tracking-wider text-foreground/40 mb-1">
                      {fmtTimestamp(m.createdAt)}
                    </p>
                  )}
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
