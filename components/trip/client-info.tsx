'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Lock,
  User,
  Mail,
  Phone,
  Tag,
  Hash,
  Sparkles,
  StickyNote,
  Compass,
} from 'lucide-react'
import type { Mutations } from './trip-types'

type Props = {
  clientNickname: string | null
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  bookingRef: string | null
  internalNotes: string | null
  specialRequests: string | null
  source: string | null
  saveProjectPatch: Mutations['saveProjectPatch']
}

/**
 * Owner-only service block at the bottom of /t/[slug]. Outside ThemeRoot
 * — uses shadcn semantic tokens (bg-secondary / border / etc.) rather
 * than theme variables, so it reads as the operator's private
 * workspace, distinct from the themed proposal content above.
 *
 * Currently holds the client's contact info for email reminders. The
 * block is designed to grow: add booking refs, internal notes, etc.
 * here as more service-only fields appear.
 *
 * Why a "service" block instead of just three fields in the Contacts
 * section: the operator's "Contacts" group is the OPERATOR's contacts
 * (what the client uses to reach the agent). Client info is the
 * inverse — what the agent uses to reach the client. Mixing them in
 * one section confuses the resolution logic and the visual reading.
 */
export function ClientInfo({
  clientNickname,
  clientName,
  clientEmail,
  clientPhone,
  bookingRef,
  internalNotes,
  specialRequests,
  source,
  saveProjectPatch,
}: Props) {
  return (
    <section
      aria-label="Internal client info"
      className="w-full border-y border-amber-200/60 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900/40"
    >
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={14} className="text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <h2 className="text-xs uppercase tracking-wider font-semibold text-amber-900 dark:text-amber-200">
            For your eyes only · Service info
          </h2>
        </div>
        <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 mb-4">
          Not visible to the client. Used for your own records, reminders, and tracking.
        </p>

        {/* Nickname — full-width, drives dashboard heading. */}
        <div className="mb-4">
          <ClientField
            Icon={Tag}
            label="Nickname"
            value={clientNickname}
            placeholder='e.g. "Amina" or "Anna 2 pax"'
            type="text"
            hint="Shown as the primary heading on your dashboard for this trip."
            onSave={(v) => saveProjectPatch({ clientNickname: v })}
          />
        </div>

        {/* Client contact — 3 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <ClientField
            Icon={User}
            label="Name"
            value={clientName}
            placeholder="Add client name"
            type="text"
            onSave={(v) => saveProjectPatch({ clientName: v })}
          />
          <ClientField
            Icon={Mail}
            label="Email"
            value={clientEmail}
            placeholder="Add client email"
            type="email"
            onSave={(v) => saveProjectPatch({ clientEmail: v })}
          />
          <ClientField
            Icon={Phone}
            label="Phone"
            value={clientPhone}
            placeholder="Add client phone"
            type="tel"
            onSave={(v) => saveProjectPatch({ clientPhone: v })}
          />
        </div>

        {/* Booking + source — 2 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <ClientField
            Icon={Hash}
            label="Booking ref"
            value={bookingRef}
            placeholder="Booking, contract, or invoice number"
            type="text"
            onSave={(v) => saveProjectPatch({ bookingRef: v })}
          />
          <ClientField
            Icon={Compass}
            label="Source"
            value={source}
            placeholder="Where did this lead come from?"
            type="text"
            onSave={(v) => saveProjectPatch({ source: v })}
          />
        </div>

        {/* Multiline blocks — full width, taller editor */}
        <div className="mb-3">
          <ClientField
            Icon={Sparkles}
            label="Special requests"
            value={specialRequests}
            placeholder="Diet, mobility, allergies, preferences from the client"
            type="text"
            multiline
            onSave={(v) => saveProjectPatch({ specialRequests: v })}
          />
        </div>
        <div>
          <ClientField
            Icon={StickyNote}
            label="Internal notes"
            value={internalNotes}
            placeholder="Your private notes about this trip"
            type="text"
            multiline
            onSave={(v) => saveProjectPatch({ internalNotes: v })}
          />
        </div>
      </div>
    </section>
  )
}

function ClientField({
  Icon,
  label,
  value,
  placeholder,
  type,
  hint,
  multiline,
  onSave,
}: {
  Icon: React.ComponentType<any>
  label: string
  value: string | null
  placeholder: string
  type: 'text' | 'email' | 'tel'
  hint?: string
  multiline?: boolean
  onSave: (v: string | null) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    if (multiline) {
      textareaRef.current?.focus()
      textareaRef.current?.select?.()
    } else {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, multiline])

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [value, editing])

  async function commit() {
    if (saving) return
    const trimmed = draft.trim()
    const next = trimmed.length > 0 ? trimmed : null
    if ((next || '') === (value || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(next)
    setSaving(false)
    if (ok) setEditing(false)
    else setDraft(value || '')
  }

  // First line only for multiline collapsed view so a long block of
  // notes doesn't push the next field out of view; full text appears
  // as soon as the operator clicks to edit.
  const displayValue = value
    ? multiline
      ? value.split('\n')[0]
      : value
    : null

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className="text-amber-800/70 dark:text-amber-200/70" aria-hidden="true" />
        <label className="text-[10px] uppercase tracking-wider text-amber-900/70 dark:text-amber-200/70 font-medium">
          {label}
        </label>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(value || '')
                setEditing(false)
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                commit()
              }
            }}
            disabled={saving}
            rows={3}
            placeholder={placeholder}
            className="bg-background border border-amber-300/70 rounded px-2 py-1.5 text-sm outline-none focus:border-amber-500 ml-[20px] resize-y"
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(value || '')
                setEditing(false)
              }
            }}
            disabled={saving}
            placeholder={placeholder}
            className="bg-background border border-amber-300/70 rounded px-2 py-1 text-sm outline-none focus:border-amber-500 ml-[20px]"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-left text-sm hover:bg-amber-100/40 dark:hover:bg-amber-900/30 rounded px-2 py-1 -mx-2 transition-colors border border-transparent hover:border-amber-300/70 truncate ml-[20px] ${
            !value ? 'text-amber-900/40 dark:text-amber-200/40 italic' : 'text-foreground'
          }`}
        >
          {displayValue || placeholder}
        </button>
      )}
      {hint && (
        <p className="text-[10px] text-amber-800/60 dark:text-amber-200/50 ml-[20px] mt-0.5">
          {hint}
        </p>
      )}
    </div>
  )
}
