"use client"

import { useState } from "react"
import { X, Copy, Check, UserPlus, Loader2 } from "lucide-react"
import type { TripParticipant } from "@/lib/trip-types"

interface InviteModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onParticipantAdded: (p: TripParticipant) => void
}

export function InviteModal({
  projectId,
  isOpen,
  onClose,
  onParticipantAdded,
}: InviteModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/invite-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: name.trim(),
          email: email.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create invite")
        setLoading(false)
        return
      }

      const participant = await res.json()
      const link = `https://bitescout.com/trip/invite/${participant.invite_token}`
      setInviteLink(link)

      onParticipantAdded({
        id: participant.id,
        name: participant.name,
        role: participant.role,
        status: participant.status,
      })
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setName("")
    setEmail("")
    setError("")
    setInviteLink("")
    setCopied(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-navy-light border border-offwhite/10 p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-offwhite/30 hover:text-offwhite/60 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seafoam/20">
            <UserPlus className="h-5 w-5 text-seafoam" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-offwhite" style={{ fontFamily: "var(--font-jost, 'Jost', sans-serif)" }}>
              Invite a Friend
            </h2>
            <p className="text-xs text-offwhite/40">Add them to this trip</p>
          </div>
        </div>

        {!inviteLink ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-offwhite/50 mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Friend's name"
                  className="w-full rounded-xl border border-offwhite/10 bg-offwhite/5 px-4 py-3 text-sm text-offwhite placeholder:text-offwhite/20 focus:border-seafoam/40 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-offwhite/50 mb-1.5">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@email.com"
                  className="w-full rounded-xl border border-offwhite/10 bg-offwhite/5 px-4 py-3 text-sm text-offwhite placeholder:text-offwhite/20 focus:border-seafoam/40 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-coral">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-offwhite transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--coral, #E8634A)" }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Add &amp; Get Link
                </>
              )}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-offwhite/60">
              Share this link with <span className="font-semibold text-offwhite">{name}</span>:
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-offwhite/10 bg-offwhite/5 p-3">
              <span className="flex-1 truncate text-xs text-seafoam">
                {inviteLink}
              </span>
              <button
                onClick={handleCopy}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-seafoam/20 px-3 py-1.5 text-xs font-medium text-seafoam hover:bg-seafoam/30 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-xl border border-offwhite/10 py-3 text-sm font-medium text-offwhite/50 hover:text-offwhite/80 hover:border-offwhite/20 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
