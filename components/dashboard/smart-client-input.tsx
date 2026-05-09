'use client'

import { useEffect, useRef, useState } from 'react'

export type SmartDetection =
  | { kind: 'phone';     value: string }
  | { kind: 'email';     value: string }
  | { kind: 'telegram';  value: string }
  | { kind: 'instagram'; value: string }
  | { kind: 'name';      value: string }

type Props = {
  value: string
  onChange: (v: string) => void
  /** Fires on debounced detection (200ms). Caller decides what to do
   *  with the kind — surface a chip, upsert, etc. */
  onDetect?: (d: SmartDetection) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
  /** Ref forwarded to the underlying <input> so callers can focus it. */
  inputRef?: React.RefObject<HTMLInputElement>
}

/** Detect the most likely identity-field shape from raw text. The
 *  rules mirror clients.service.search (server-side) but are looser
 *  here — the UI picker uses this to display a "detected as X" hint;
 *  the source of truth for dedup remains the backend. */
export function detectIdentity(raw: string): SmartDetection {
  const q = raw.trim()
  if (!q) return { kind: 'name', value: '' }

  // @handle — telegram for now (instagram surfaces from "More fields")
  if (q.startsWith('@') && !q.includes('.')) {
    return { kind: 'telegram', value: q.replace(/^@+/, '') }
  }

  // phone shape: only digits + standard phone characters, ≥7 digits
  if (/^[\d+\-() ]+$/.test(q)) {
    const digits = q.replace(/\D+/g, '')
    if (digits.length >= 7) return { kind: 'phone', value: q }
  }

  // simple email shape
  if (q.includes('@')) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRe.test(q)) return { kind: 'email', value: q.toLowerCase() }
  }

  return { kind: 'name', value: q }
}

/**
 * SmartClientInput — single text input that auto-detects what the
 * operator typed (phone / email / telegram / name) and emits the
 * detection on a 200ms debounce. The caller decides how to surface
 * it (chip below the field, picker dropdown, modal-save shape).
 *
 * Reused by NewClientModal, EditClientModal, and SmartClientPicker
 * (which adds a results dropdown around it).
 */
export default function SmartClientInput({
  value,
  onChange,
  onDetect,
  placeholder = 'Phone, email, telegram, WhatsApp, Instagram…',
  autoFocus,
  className,
  inputRef,
}: Props) {
  const [detection, setDetection] = useState<SmartDetection | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const d = detectIdentity(value)
      setDetection(d.value ? d : null)
      if (onDetect) onDetect(d)
    }, 200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const detectionLabel = detection
    ? detection.kind === 'name'
      ? 'Detected as name'
      : `Detected as ${detection.kind}`
    : ''

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          className ??
          'w-full px-3 h-10 text-sm text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent'
        }
      />
      {detectionLabel && (
        <span className="inline-flex items-center text-[11px] uppercase tracking-wider text-muted-foreground">
          {detectionLabel}
        </span>
      )}
    </div>
  )
}
