'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/nextjs'
import { Lock, X } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { Client, Mutations } from './trip-types'
import SmartClientPicker from '@/components/dashboard/smart-client-picker'
import ClientCreateModal from '@/components/client/client-create-modal'
import ClientCard from '@/components/client/client-card'
import ClientCardModal from '@/components/client/client-card-modal'
import { OnboardingTip } from '@/components/onboarding-tip'

type Props = {
  projectId: string
  client: Client | null
  bookingRef: string | null
  internalNotes: string | null
  specialRequests: string | null
  saveProjectPatch: Mutations['saveProjectPatch']
  onClientChanged?: (client: Client | null) => void
  /**
   * When provided, renders a close (×) button in the top-right of the
   * block header. Used by themes that gate ClientInfo behind a toggle in
   * the action bar (Magazine).
   */
  onClose?: () => void
}

/**
 * Operator service block. Sits at the very top of the trip page,
 * directly under TripActionBar.
 *
 * Stage 2 of the client-as-linkage rework: this file is now a thin
 * router around the unified <ClientCard>. Three render paths:
 *
 *   - no client linked → accent-prompt with SmartClientPicker (+ auto-
 *     opening ClientCreateModal on No-matches, see Stage 1)
 *   - client linked, view mode → <ClientCard mode="view" host="trip"
 *     showTripFields> with Edit / Switch action cluster
 *   - client linked, edit mode → <ClientCardModal mode="edit"> mounted
 *     via portal
 *
 * For-this-trip fields (booking ref / special / internal notes) batch
 * through saveProjectPatch on the same Save click as the client batch
 * PATCH — single button now, no per-field blur-edit.
 */
export function ClientInfo({
  client,
  bookingRef,
  internalNotes,
  specialRequests,
  saveProjectPatch,
  onClientChanged,
  onClose,
}: Props) {
  const { getToken } = useAuth()
  const [localClient, setLocalClient] = useState<Client | null>(client)
  const [createOpen, setCreateOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<Partial<Client> | undefined>(undefined)
  const [editOpen, setEditOpen] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)

  useEffect(() => setLocalClient(client), [client])

  async function handleLink(picked: Client) {
    const ok = await saveProjectPatch({ clientId: picked.id })
    if (ok) {
      setLocalClient(picked)
      onClientChanged?.(picked)
      toast.success('Client linked')
    }
    return ok
  }

  async function handleUnlink() {
    if (!localClient) return
    const headline = localClient.nickname || localClient.name || 'this client'
    const confirmed = window.confirm(
      `Unlink ${headline} from this trip? Trip will keep its data, the client stays in your roster.`,
    )
    if (!confirmed) return
    const ok = await saveProjectPatch({ clientId: null })
    if (ok) {
      setLocalClient(null)
      onClientChanged?.(null)
      toast.success('Client unlinked')
    }
  }

  // DELETE the client itself (not just unlink). Trip survives because
  // FK on trip_projects.client_id is ON DELETE SET NULL — local trip
  // will lose its client_id which we mirror in state. Removes the
  // client from the agent's whole roster, not only this trip.
  async function handleDelete() {
    if (!localClient) return
    const headline = localClient.nickname || localClient.name || 'this client'
    const confirmed = window.confirm(
      `Delete ${headline} from your roster? This removes them from your client list completely. Their trips will lose ownership but stay intact.`,
    )
    if (!confirmed) return
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/clients/${localClient.id}`, {
        token,
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error('Could not delete')
        return
      }
      setLocalClient(null)
      setEditOpen(false)
      onClientChanged?.(null)
      toast.success('Client deleted')
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <section aria-label="Client info — operator only" className="w-full">
      {/* No client → compact card with accent header strip + search input
          (mirrors ThemeSwitcher dropdown / OnboardingTip pattern) */}
      {!localClient && (
        <div className="max-w-2xl mx-4 sm:mx-auto my-3 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="relative">
            <OnboardingTip>
              Assign a client so this trip doesn&apos;t get lost
            </OnboardingTip>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close client info"
                className="absolute top-1.5 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-accent-foreground/80 hover:text-accent-foreground hover:bg-accent-foreground/10 transition-colors"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="px-4 py-3" role="region" aria-label="Assign a client to this trip">
            <SmartClientPicker
              autoFocus={false}
              placeholder="Search client by name, phone, email…"
              onPick={(picked) => { void handleLink(picked) }}
              onCreateNew={(draft) => {
                setCreateDraft(draft)
                setCreateOpen(true)
              }}
              onCreateRequest={(draft) => {
                setCreateDraft(draft)
                setCreateOpen(true)
              }}
            />
          </div>
        </div>
      )}

      {/* Client linked → cream card */}
      {localClient && (
        <div className="max-w-2xl mx-4 sm:mx-auto my-3 bg-highlight border border-accent/20 rounded-xl shadow-lg">
          <div className="px-5 py-3">
            <div className="flex items-center justify-between mb-2 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lock size={13} className="text-foreground/60 shrink-0" aria-hidden="true" />
                <h2 className="text-xs uppercase tracking-[0.12em] font-semibold text-foreground/80 truncate">
                  Client
                </h2>
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close client info"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <ClientCard
              mode="view"
              host="trip"
              client={localClient}
              showTripFields
              tripFields={{ bookingRef, specialRequests, internalNotes }}
              onSaved={() => { /* handled in edit modal */ }}
              onRequestEdit={() => setEditOpen(true)}
              onRequestSwitch={() => setSwitchOpen(true)}
              onRequestUnlink={handleUnlink}
            />
          </div>
        </div>
      )}

      {/* Create modal — used by accent-prompt picker */}
      <ClientCreateModal
        open={createOpen}
        preDraft={createDraft}
        onClose={() => setCreateOpen(false)}
        onSaved={async (created) => {
          const ok = await saveProjectPatch({ clientId: created.id })
          if (ok) {
            setLocalClient(created)
            onClientChanged?.(created)
          }
        }}
      />

      {/* Edit modal — view-mode Edit click */}
      {localClient && (
        <ClientCardModal
          open={editOpen}
          mode="edit"
          host="trip"
          client={localClient}
          showTripFields
          tripFields={{ bookingRef, specialRequests, internalNotes }}
          onSaved={async (updated) => {
            setLocalClient(updated)
            onClientChanged?.(updated)
          }}
          onTripFieldsSave={async (patch) => {
            const ok = await saveProjectPatch(patch as Record<string, unknown>)
            return ok
          }}
          onRequestDelete={handleDelete}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Switch picker dialog — open on Switch click */}
      <SwitchClientDialog
        open={switchOpen}
        excludeIds={localClient ? [localClient.id] : []}
        onPick={async (picked) => {
          const ok = await handleLink(picked)
          if (ok) setSwitchOpen(false)
        }}
        onCreateRequest={(draft) => {
          setCreateDraft(draft)
          setSwitchOpen(false)
          setCreateOpen(true)
        }}
        onClose={() => setSwitchOpen(false)}
      />
    </section>
  )
}

// ─── Switch-client dialog ──────────────────────────────────────────
//
// Lightweight modal hosting a SmartClientPicker. Replaces the trip's
// linked client with another one from the operator's roster (or kicks
// off create-new through the same flow Stage 1 wired up). Mounted via
// portal so it escapes the trip-page sticky stacking context.

function SwitchClientDialog({
  open,
  excludeIds,
  onPick,
  onCreateRequest,
  onClose,
}: {
  open: boolean
  excludeIds: string[]
  onPick: (client: Client) => void | Promise<void>
  onCreateRequest: (draft: Partial<Client>) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Switch client"
        className="relative w-full max-w-md rounded-lg bg-card border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Switch client</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-foreground/55 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <SmartClientPicker
            autoFocus
            placeholder="Search client by name, phone, email…"
            excludeIds={excludeIds}
            onPick={onPick}
            onCreateRequest={onCreateRequest}
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

