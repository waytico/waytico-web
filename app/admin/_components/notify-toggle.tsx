'use client'

/**
 * Admin Telegram notification toggle.
 *
 * A single labelled checkbox that flips one of the two opt-in switches
 * controlling whether the admin Telegram bot pages the operator:
 *   - field="newUser"  → NOTIFY_TG_NEW_USER  (shown on /admin/users)
 *   - field="newDraft" → NOTIFY_TG_NEW_DRAFT (shown on /admin/projects)
 *
 * Both toggles are read together from GET /api/admin/notify-settings
 * and written with PATCH /api/admin/notify-settings (partial body —
 * only the changed field). The component owns its own fetch lifecycle
 * so each admin page just drops it into the header with no extra wiring.
 *
 * Optimistic update with rollback on failure; the checkbox is disabled
 * while the initial GET or a PATCH is in flight.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface NotifySettings {
  newUser: boolean
  newDraft: boolean
}

interface NotifyToggleProps {
  /** Which of the two toggles this checkbox controls. */
  field: keyof NotifySettings
  /** Visible label next to the checkbox. */
  label: string
}

export function NotifyToggle({ field, label }: NotifyToggleProps) {
  const { getToken } = useAuth()
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // Initial read — force=true on the backend so we always see the live
  // DB value, not a stale cache entry.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken().catch(() => null)
        const res = await fetch(`${API_URL}/api/admin/notify-settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = (await res.json()) as { settings: NotifySettings }
        if (!cancelled) setChecked(Boolean(j.settings[field]))
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken, field])

  const onToggle = useCallback(
    async (next: boolean) => {
      // Optimistic — flip immediately, roll back if the PATCH fails.
      const prev = checked
      setChecked(next)
      setSaving(true)
      try {
        const token = await getToken().catch(() => null)
        const res = await fetch(`${API_URL}/api/admin/notify-settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ [field]: next }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = (await res.json()) as { settings: NotifySettings }
        setChecked(Boolean(j.settings[field]))
      } catch {
        setChecked(prev)
        toast.error('Could not update notification setting')
      } finally {
        setSaving(false)
      }
    },
    [checked, getToken, field],
  )

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-600">
      <input
        type="checkbox"
        checked={checked}
        disabled={loading || saving || error}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-zinc-300"
      />
      <span>{label}</span>
      {(loading || saving) && (
        <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
      )}
      {error && <span className="text-amber-600">(unavailable)</span>}
    </label>
  )
}
