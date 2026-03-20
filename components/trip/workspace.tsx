"use client"

import { useState } from "react"
import {
  ChevronDown,
  Plane,
  Building,
  Car,
  Ship,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Lock,
  Copy,
  Check,
  UserCircle,
  Crown,
  CalendarDays,
} from "lucide-react"
import type { ReactNode } from "react"

/* ======== Logistics ======== */

interface LogisticsItem {
  icon: ReactNode
  title: string
  status: "booked" | "pending" | "needed"
  details: string
  extra?: string
}

const statusBadge = {
  booked: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Booked", className: "bg-seafoam/20 text-seafoam" },
  pending: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: "Pending", className: "bg-coral/20 text-coral" },
  needed: { icon: <XCircle className="h-3.5 w-3.5" />, label: "Needed", className: "bg-red-500/20 text-red-400" },
}

function LogisticsPanel({ items }: { items: LogisticsItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const badge = statusBadge[item.status]
        const isOpen = openIndex === i
        return (
          <div key={i} className="rounded-xl border border-offwhite/10 bg-offwhite/5 overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-offwhite/5"
              aria-expanded={isOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-offwhite/10 text-offwhite/60">
                {item.icon}
              </span>
              <span className="flex-1 text-sm font-semibold text-offwhite">{item.title}</span>
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}>
                {badge.icon}
                {badge.label}
              </span>
              <ChevronDown className={`h-4 w-4 text-offwhite/30 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="border-t border-offwhite/10 px-4 pb-4 pt-3">
                <p className="text-sm text-offwhite/70">{item.details}</p>
                {item.extra && <p className="mt-1.5 text-xs text-offwhite/40">{item.extra}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function LogisticsSection({
  logistics,
}: {
  logistics: {
    flights: { status: string; details: string; return: string }
    accommodation: { status: string; details: string; checkIn: string; checkOut: string }
    transport: { status: string; details: string }
    charter: { status: string; details: string; deposit: string }
  }
}) {
  const items: LogisticsItem[] = [
    {
      icon: <Plane className="h-4 w-4" />,
      title: "Flights",
      status: logistics.flights.status as "booked" | "pending" | "needed",
      details: logistics.flights.details,
      extra: `Return: ${logistics.flights.return}`,
    },
    {
      icon: <Building className="h-4 w-4" />,
      title: "Accommodation",
      status: logistics.accommodation.status as "booked" | "pending" | "needed",
      details: logistics.accommodation.details,
      extra: `Check-in: ${logistics.accommodation.checkIn} | Check-out: ${logistics.accommodation.checkOut}`,
    },
    {
      icon: <Car className="h-4 w-4" />,
      title: "Ground Transport",
      status: logistics.transport.status as "booked" | "pending" | "needed",
      details: logistics.transport.details,
    },
    {
      icon: <Ship className="h-4 w-4" />,
      title: "Boat Charter",
      status: logistics.charter.status as "booked" | "pending" | "needed",
      details: logistics.charter.details,
      extra: logistics.charter.deposit,
    },
  ]

  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-offwhite/40">
        <Plane className="h-4 w-4" />
        Logistics
      </h3>
      <LogisticsPanel items={items} />
    </div>
  )
}

/* ======== Budget ======== */

interface BudgetRow {
  category: string
  estimated: number
  actual: number | null
}

export function BudgetSection({
  budget,
  isOwner = true,
}: {
  budget: BudgetRow[]
  isOwner?: boolean
}) {
  const [shared, setShared] = useState(false)

  const totalEstimated = budget.reduce((a, b) => a + b.estimated, 0)
  const totalActual = budget.reduce((a, b) => a + (b.actual ?? 0), 0)

  if (!isOwner && !shared) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-offwhite/5 border border-offwhite/10 p-4 text-sm text-offwhite/40">
        <Lock className="h-4 w-4" />
        Budget is private
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-offwhite/40">
          Budget
        </h3>
        {isOwner && (
          <button
            onClick={() => setShared(!shared)}
            className="text-xs font-medium text-seafoam hover:text-seafoam-light transition-colors"
          >
            {shared ? "Hide from participants" : "Share with participants"}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-offwhite/10 bg-offwhite/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-offwhite/10">
              <th className="p-3 text-left text-[10px] font-bold uppercase tracking-widest text-offwhite/30">Category</th>
              <th className="p-3 text-right text-[10px] font-bold uppercase tracking-widest text-offwhite/30">Estimated</th>
              <th className="p-3 text-right text-[10px] font-bold uppercase tracking-widest text-offwhite/30">Actual</th>
            </tr>
          </thead>
          <tbody>
            {budget.map((row) => (
              <tr key={row.category} className="border-b border-offwhite/5 last:border-0">
                <td className="p-3 text-offwhite/80">{row.category}</td>
                <td className="p-3 text-right text-offwhite/80">${row.estimated.toLocaleString()}</td>
                <td className="p-3 text-right text-offwhite/40">
                  {row.actual !== null ? `$${row.actual.toLocaleString()}` : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-offwhite/5">
              <td className="p-3 font-bold text-offwhite">Total</td>
              <td className="p-3 text-right font-bold text-offwhite">${totalEstimated.toLocaleString()}</td>
              <td className="p-3 text-right font-bold text-offwhite/50">${totalActual.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-xs text-offwhite/30 text-right">
        ~${Math.round(totalEstimated / 4).toLocaleString()} per person (4 anglers)
      </p>
    </div>
  )
}

/* ======== Notes ======== */

interface Note {
  date: string
  text: string
}

export function NotesSection({
  notes,
  isOwner = true,
}: {
  notes: Note[]
  isOwner?: boolean
}) {
  const [shared, setShared] = useState(false)

  if (!isOwner && !shared) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-offwhite/5 border border-offwhite/10 p-4 text-sm text-offwhite/40">
        <Lock className="h-4 w-4" />
        Notes are private
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-offwhite/40">
          <CalendarDays className="h-4 w-4" />
          Notes & Decisions
        </h3>
        {isOwner && (
          <button
            onClick={() => setShared(!shared)}
            className="text-xs font-medium text-seafoam hover:text-seafoam-light transition-colors"
          >
            {shared ? "Hide from participants" : "Share with participants"}
          </button>
        )}
      </div>
      <div className="space-y-2">
        {notes.map((note, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-offwhite/10 bg-offwhite/5 p-4">
            <span className="shrink-0 text-xs font-bold text-coral whitespace-nowrap">{note.date}</span>
            <p className="text-sm text-offwhite/60">{note.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ======== Participants ======== */

import { InviteModal } from "@/components/trip/invite-modal"
import type { TripParticipant } from "@/lib/trip-types"

interface Participant {
  name: string
  role: "owner" | "participant"
  avatar: string
  status?: string
}

interface ParticipantsSectionProps {
  participants: Participant[]
  userRole: "owner" | "participant" | "guest"
  projectId?: string
}

const statusColors: Record<string, string> = {
  confirmed: "bg-seafoam/20 text-seafoam",
  invited: "bg-coral/20 text-coral",
  declined: "bg-offwhite/10 text-offwhite/30",
}

export function ParticipantsSection({ participants, userRole, projectId }: ParticipantsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [localParticipants, setLocalParticipants] = useState(participants)

  const handleParticipantAdded = (p: TripParticipant) => {
    setLocalParticipants((prev) => [
      ...prev,
      {
        name: p.name,
        role: p.role === "organizer" ? "owner" as const : "participant" as const,
        avatar: p.name[0]?.toUpperCase() || "?",
        status: p.status,
      },
    ])
  }

  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-offwhite/40">
        <UserCircle className="h-4 w-4" />
        Participants
      </h3>
      <div className="space-y-2">
        {localParticipants.map((p, i) => (
          <div key={`${p.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-offwhite/10 bg-offwhite/5 p-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${p.role === "owner" ? "bg-coral text-offwhite" : "bg-sand/80 text-navy"}`}>
              {p.avatar}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-offwhite">{p.name}</p>
              <p className="flex items-center gap-1 text-xs text-offwhite/40">
                {p.role === "owner" && <Crown className="h-3 w-3 text-coral" />}
                {p.role === "owner" ? "Trip Owner" : "Participant"}
              </p>
            </div>
            {p.status && (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusColors[p.status] || "bg-offwhite/10 text-offwhite/30"}`}>
                {p.status}
              </span>
            )}
          </div>
        ))}
      </div>

      {userRole === "owner" && projectId && (
        <>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-offwhite/15 bg-offwhite/5 py-3.5 text-sm font-medium text-offwhite/40 transition-all hover:border-seafoam/40 hover:text-seafoam"
          >
            <UserCircle className="h-4 w-4" />
            Invite Friend
          </button>
          <InviteModal
            projectId={projectId}
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onParticipantAdded={handleParticipantAdded}
          />
        </>
      )}
    </div>
  )
}
