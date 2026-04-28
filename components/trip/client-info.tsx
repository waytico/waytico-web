'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, User, Mail, Phone } from 'lucide-react'
import type { Mutations } from './trip-types'

type Props = {
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
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
  clientName,
  clientEmail,
  clientPhone,
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
            For your eyes only · Client info
          </h2>
        </div>
        <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 mb-4">
          Not visible to the client. Used for trip reminders and your own records.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
  onSave,
}: {
  Icon: React.ComponentType<any>
  label: string
  value: string | null
  placeholder: string
  type: 'text' | 'email' | 'tel'
  onSave: (v: string | null) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className="text-amber-800/70 dark:text-amber-200/70" aria-hidden="true" />
        <label className="text-[10px] uppercase tracking-wider text-amber-900/70 dark:text-amber-200/70 font-medium">
          {label}
        </label>
      </div>
      {editing ? (
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
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-left text-sm hover:bg-amber-100/40 dark:hover:bg-amber-900/30 rounded px-2 py-1 -mx-2 transition-colors border border-transparent hover:border-amber-300/70 truncate ml-[20px] ${
            !value ? 'text-amber-900/40 dark:text-amber-200/40 italic' : 'text-foreground'
          }`}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  )
}
