'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

type BaseProps = {
  editable: boolean
  className?: string
  /** Placeholder shown when value is empty.
   *  In editable mode: shown as "click to edit" hint.
   *  In read-only mode: if no value, component renders nothing. */
  placeholder?: string
  /** Optional custom rendering when NOT editing (e.g. bullet list for multiline).
   *  Only used if the field has a non-empty value. */
  renderDisplay?: (value: string) => ReactNode
}

type TextProps = BaseProps & {
  as: 'text'
  value: string | null | undefined
  onSave: (v: string) => Promise<boolean>
  required?: boolean
  maxLength?: number
}

type MultilineProps = BaseProps & {
  as: 'multiline'
  value: string | null | undefined
  onSave: (v: string) => Promise<boolean>
  rows?: number
}

type NumberProps = BaseProps & {
  as: 'number'
  value: number | string | null | undefined
  onSave: (v: number | null) => Promise<boolean>
  min?: number
  max?: number
  step?: number
  /** Optional prefix inside display when value exists, e.g. "€" */
  prefix?: string
  /** Optional suffix inside display when value exists, e.g. "days", "people" */
  suffix?: string
}

type DateProps = BaseProps & {
  as: 'date'
  value: string | null | undefined  // ISO date or date-time string
  onSave: (v: string | null) => Promise<boolean>
  /** Custom display formatter for read mode (e.g. "Sep 14, 2026") */
  formatDisplay?: (iso: string) => string
}

type Props = TextProps | MultilineProps | NumberProps | DateProps

function toIsoDate(v: string | null | undefined): string {
  if (!v) return ''
  // already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  // Postgres TIMESTAMPTZ comes back as "2026-06-08T00:00:00.000Z" — slice the
  // first 10 chars and validate. Never round-trip through `new Date(v)` here:
  // the Z suffix would force UTC parsing, then rendering in a negative-offset
  // local zone (e.g. Vancouver -7/-8) flips the date back by one day.
  const head = typeof v === 'string' ? v.slice(0, 10) : ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head
  return ''
}

/** Format YYYY-MM-DD as "Jun 8, 2026" without going through Date() — pure
 *  string manipulation so timezone offsets can never shift the day. */
function fmtIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(mo, 10) - 1]} ${parseInt(d, 10)}, ${y}`
}

export function EditableField(props: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  const rawValue = props.value ?? null
  const displayStr =
    props.as === 'number' && rawValue != null && rawValue !== ''
      ? String(rawValue)
      : props.as === 'date'
      ? toIsoDate(rawValue as string | null)
      : (rawValue as string | null) ?? ''

  useEffect(() => {
    if (!editing) setDraft(displayStr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayStr, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if ('select' in inputRef.current && props.as !== 'multiline') {
        ;(inputRef.current as HTMLInputElement).select?.()
      }
    }
  }, [editing, props.as])

  // ─── Read-only branch (client view) ───
  if (!props.editable) {
    const hasValue = displayStr.length > 0
    if (!hasValue) return null
    if (props.as === 'multiline') {
      if (props.renderDisplay) return <>{props.renderDisplay(displayStr)}</>
      return <div className={props.className} style={{ whiteSpace: 'pre-line' }}>{displayStr}</div>
    }
    if (props.as === 'date') {
      const fmt = props.formatDisplay
        ? props.formatDisplay(displayStr)
        : fmtIsoDate(displayStr)
      return <span className={props.className}>{fmt}</span>
    }
    if (props.as === 'number') {
      const num = Number(displayStr)
      const formatted = Number.isFinite(num) ? num.toLocaleString() : displayStr
      return (
        <span className={props.className}>
          {props.prefix ?? ''}
          {formatted}
          {props.suffix ? ` ${props.suffix}` : ''}
        </span>
      )
    }
    return <span className={props.className}>{displayStr}</span>
  }

  // ─── Editable (owner) branch ───
  const save = async () => {
    const original = displayStr
    const trimmed = props.as === 'multiline' ? draft : draft.trim()

    if (trimmed === original) {
      setEditing(false)
      return
    }

    if (props.as === 'text' && props.required && !trimmed) {
      toast.error('This field cannot be empty')
      setDraft(original)
      setEditing(false)
      return
    }

    let payload: any = trimmed
    if (props.as === 'number') {
      if (trimmed === '') {
        payload = null
      } else {
        const n = Number(trimmed)
        if (!Number.isFinite(n)) {
          toast.error('Invalid number')
          setDraft(original)
          setEditing(false)
          return
        }
        payload = n
      }
    }
    if (props.as === 'date' && trimmed === '') payload = null

    let ok = false
    if (props.as === 'number') {
      ok = await props.onSave(payload as number | null)
    } else if (props.as === 'date') {
      ok = await props.onSave(payload as string | null)
    } else {
      ok = await props.onSave(payload as string)
    }
    if (ok) {
      setEditing(false)
    } else {
      // onSave failed — revert, exit edit mode. toast is shown by caller.
      setDraft(original)
      setEditing(false)
    }
  }

  const cancel = () => {
    setDraft(displayStr)
    setEditing(false)
  }

  // Display (not editing)
  if (!editing) {
    const hasValue = displayStr.length > 0
    const interactive = 'cursor-text rounded-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/40'

    if (hasValue) {
      // Custom display for multiline if provided
      if (props.as === 'multiline' && props.renderDisplay) {
        return (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setEditing(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
            className={`${interactive} ${props.className ?? ''}`}
          >
            {props.renderDisplay(displayStr)}
          </div>
        )
      }
      if (props.as === 'multiline') {
        return (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setEditing(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
            className={`${interactive} ${props.className ?? ''}`}
            style={{ whiteSpace: 'pre-line' }}
          >
            {displayStr}
          </div>
        )
      }
      if (props.as === 'date') {
        const fmt = props.formatDisplay
          ? props.formatDisplay(displayStr)
          : fmtIsoDate(displayStr)
        return (
          <span
            role="button"
            tabIndex={0}
            onClick={() => setEditing(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
            className={`${interactive} ${props.className ?? ''}`}
          >
            {fmt}
          </span>
        )
      }
      if (props.as === 'number') {
        const num = Number(displayStr)
        const formatted = Number.isFinite(num) ? num.toLocaleString() : displayStr
        return (
          <span
            role="button"
            tabIndex={0}
            onClick={() => setEditing(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
            className={`${interactive} ${props.className ?? ''}`}
          >
            {props.prefix ?? ''}
            {formatted}
            {props.suffix ? ` ${props.suffix}` : ''}
          </span>
        )
      }
      return (
        <span
          role="button"
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
          className={`${interactive} ${props.className ?? ''}`}
        >
          {displayStr}
        </span>
      )
    }

    // Empty + owner: show subtle placeholder
    const placeholderText = props.placeholder ?? 'Click to edit'
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
        className={`${interactive} ${props.className ?? ''} text-muted-foreground/70 italic`}
      >
        {placeholderText}
      </span>
    )
  }

  // Editing mode.
  // `italic` is intentional — across the product, anything the operator is
  // currently typing into is rendered italic. The visual cue makes it
  // unmistakable that this text is a personal draft they own (vs. a placeholder,
  // a system message, or already-saved committed text).
  const inputBase =
    'bg-transparent border-none outline-none focus:ring-2 focus:ring-accent/40 rounded-sm w-full italic'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
    if (e.key === 'Enter' && props.as !== 'multiline') {
      e.preventDefault()
      save()
    }
  }

  if (props.as === 'multiline') {
    return (
      <textarea
        ref={(el) => {
          inputRef.current = el
          // Auto-grow on mount: set initial height to match content
          // (covers browsers without field-sizing support).
          if (el) {
            el.style.height = 'auto'
            el.style.height = `${el.scrollHeight}px`
          }
        }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onInput={(e) => {
          // JS fallback for browsers without `field-sizing: content`.
          // Modern browsers using field-sizing ignore these writes since
          // the computed height tracks content automatically.
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = `${el.scrollHeight}px`
        }}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={`${inputBase} ${props.className ?? ''}`}
        style={{
          // `field-sizing: content` makes the textarea auto-size to its
          // content natively (Chromium 123+, Safari 17+, Firefox 134+).
          // Older engines fall back to the onInput handler above.
          fieldSizing: 'content',
          overflow: 'hidden',
          resize: 'none',
        } as React.CSSProperties}
      />
    )
  }

  if (props.as === 'date') {
    return (
      <input
        ref={(el) => { inputRef.current = el }}
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={`${inputBase} ${props.className ?? ''}`}
      />
    )
  }

  if (props.as === 'number') {
    return (
      <input
        ref={(el) => { inputRef.current = el }}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={`${inputBase} ${props.className ?? ''}`}
      />
    )
  }

  return (
    <input
      ref={(el) => { inputRef.current = el }}
      type="text"
      maxLength={props.maxLength}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={handleKeyDown}
      className={`${inputBase} ${props.className ?? ''}`}
    />
  )
}

