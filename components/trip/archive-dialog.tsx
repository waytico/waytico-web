'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type Props = {
  open: boolean
  projectId: string
  projectTitle: string
  currentContact: {
    name?: string | null
    email?: string | null
    phone?: string | null
  }
  onClose: () => void
  onArchived: () => void
}

/**
 * Archive-with-client-contact dialog.
 *
 * On submit:
 *   1. PATCH /api/projects/:id with clientName/clientEmail/clientPhone
 *      (no-ops gracefully if fields are blank)
 *   2. PATCH /api/projects/:id/status with { status: 'archived' }
 *
 * Contacts persist with the project so the agent can look them up later
 * from their dashboard / CRM view.
 */
export function ArchiveDialog({
  open,
  projectId,
  projectTitle,
  currentContact,
  onClose,
  onArchived,
}: Props) {
  const { getToken } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName(currentContact.name ?? '')
      setEmail(currentContact.email ?? '')
      setPhone(currentContact.phone ?? '')
    }
  }, [open, currentContact.name, currentContact.email, currentContact.phone])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  if (!open) return null

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again')
        setBusy(false)
        return
      }

      // Step 1: save client contact (only if anything filled in)
      const contactChanged =
        name.trim() !== (currentContact.name ?? '') ||
        email.trim() !== (currentContact.email ?? '') ||
        phone.trim() !== (currentContact.phone ?? '')

      if (contactChanged) {
        const patch: Record<string, string> = {}
        if (name.trim()) patch.clientName = name.trim()
        if (email.trim()) patch.clientEmail = email.trim()
        if (phone.trim()) patch.clientPhone = phone.trim()
        const res = await apiFetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Could not save contact')
          setBusy(false)
          return
        }
      }

      // Step 2: archive
      const resStatus = await apiFetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: 'archived' }),
      })
      if (!resStatus.ok) {
        const err = await resStatus.json().catch(() => ({}))
        toast.error(err?.error || 'Could not archive')
        setBusy(false)
        return
      }

      toast.success(`${projectTitle} archived`)
      onArchived()
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-card rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h2 className="text-xl font-serif font-bold">Archive trip</h2>
          <p className="text-sm text-foreground/60 mt-1">
            Save the client's contact with this trip so you can find it later in your dashboard.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">
              Client name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">
              Client email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/70 mb-1">
              Client phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 0123"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-full text-sm text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-full text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {busy ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </div>
  )
}
