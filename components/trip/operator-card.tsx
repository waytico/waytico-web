"use client"

import { useState } from "react"
import { Star, Phone, Mail, Globe, Send, CheckCircle2 } from "lucide-react"
import { VendorInquiryModal } from "./vendor-inquiry-modal"

interface OperatorCardProps {
  operator: {
    name: string
    vendorRecordId?: string | null
    location: string
    rating: number | null
    reviews: number | null
    facts: string[]
    bookingStatus: "pending" | "confirmed" | "not_yet"
    phone?: string
    email?: string
    website?: string
  }
  projectId?: string
  inquiryStatus?: string | null
  replyClassification?: string | null
  replySummary?: string | null
  isRegistered?: boolean
  isOwner?: boolean
  onInquirySent?: () => void
}

const bookingStatusConfig = {
  confirmed: { color: "bg-seafoam", label: "Confirmed" },
  pending: { color: "bg-coral", label: "Pending" },
  not_yet: { color: "bg-offwhite/30", label: "Not booked" },
}

export function OperatorCard({
  operator,
  projectId,
  inquiryStatus,
  replyClassification,
  replySummary,
  isRegistered = false,
  isOwner = false,
  onInquirySent,
}: OperatorCardProps) {
  const booking = bookingStatusConfig[operator.bookingStatus]
  const [modalOpen, setModalOpen] = useState(false)
  const [localInquiryStatus, setLocalInquiryStatus] = useState(inquiryStatus)

  const canContact = isOwner && operator.vendorRecordId && projectId && !localInquiryStatus
  const canViewReply = isOwner && localInquiryStatus === "replied"

  const handleInquirySent = () => {
    setLocalInquiryStatus("sent")
    onInquirySent?.()
  }

  return (
    <section className="bg-offwhite py-14 md:py-20">
      <div className="px-6 md:px-10 max-w-[720px] mx-auto">
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-coral mb-6 md:mb-8">
          Your Operator
        </p>

        <div className="rounded-2xl border border-navy/10 bg-white p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-serif text-xl font-semibold text-navy md:text-2xl">
                  {operator.name}
                </h3>
                <p className="text-sm text-navy/50">{operator.location}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isOwner && (
                <div className="flex items-center gap-2" title={`Booking: ${booking.label}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${booking.color}`} />
                  <span className="text-xs font-medium text-navy/50">{booking.label}</span>
                </div>
              )}
              {localInquiryStatus && (() => {
                const badgeConfig = localInquiryStatus === "replied"
                  ? replyClassification === "confirmed"
                    ? { color: "text-seafoam", label: "Confirmed ✓" }
                    : replyClassification === "declined"
                    ? { color: "text-coral", label: "Unavailable" }
                    : replyClassification === "need_info"
                    ? { color: "text-yellow-400", label: "Needs Info" }
                    : replyClassification === "pricing"
                    ? { color: "text-sky-400", label: "Quote Received" }
                    : { color: "text-seafoam", label: "Replied" }
                  : { color: "text-seafoam", label: "Inquiry Sent" }
                return (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${badgeConfig.color}`} />
                    <span className={`text-xs font-medium ${badgeConfig.color}`}>
                      {badgeConfig.label}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Rating */}
          {operator.rating !== null && (
            <div className="mt-5 flex items-center gap-2.5">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.floor(operator.rating!) ? "fill-coral text-coral" : "fill-navy/10 text-offwhite/10"}`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-navy">{operator.rating}</span>
              {operator.reviews !== null && (
                <span className="text-sm text-navy/40">({operator.reviews} reviews)</span>
              )}
            </div>
          )}

          {/* Facts */}
          {operator.facts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {operator.facts.map((fact) => (
                <span key={fact} className="rounded-full border border-navy/10 bg-navy/5 px-3 py-1.5 text-xs font-medium text-navy/60">
                  {fact}
                </span>
              ))}
            </div>
          )}

          {/* Contact info */}
          {isRegistered && (operator.phone || operator.email || operator.website) && (
            <div className="mt-6 flex flex-wrap gap-4 border-t border-navy/10 pt-5">
              {operator.phone && (
                <a href={`tel:${operator.phone}`} className="flex items-center gap-2 text-sm text-seafoam hover:text-seafoam-light transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  {operator.phone}
                </a>
              )}
              {operator.email && (
                <a href={`mailto:${operator.email}`} className="flex items-center gap-2 text-sm text-seafoam hover:text-seafoam-light transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              )}
              {operator.website && (
                <a href={`https://${operator.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-seafoam hover:text-seafoam-light transition-colors">
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              )}
            </div>
          )}

          {/* Contact Operator CTA — disabled pending vendor communication relaunch */}
          {false && canContact && (
            <div className="mt-6 border-t border-navy/10 pt-5">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-seafoam px-5 py-2.5 text-sm font-bold text-navy hover:bg-seafoam-light transition-colors"
              >
                <Send className="h-4 w-4" />
                Contact Operator
              </button>
              <p className="mt-2 text-xs text-navy/30">
                We&apos;ll send a professional inquiry on your behalf
              </p>
            </div>
          )}

          {/* View Reply CTA */}
          {canViewReply && (
            <div className="mt-6 border-t border-navy/10 pt-5">
              {replySummary && (
                <p className="text-sm text-navy/60 mb-3">{replySummary}</p>
              )}
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-seafoam hover:text-seafoam-light transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                View Full Reply
              </button>
            </div>
          )}
        </div>
      </div>

      {projectId && operator.vendorRecordId && (
        <VendorInquiryModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          projectId={projectId}
          vendorRecordId={operator.vendorRecordId}
          vendorName={operator.name}
          onSent={handleInquirySent}
          replyClassification={replyClassification}
          replySummary={replySummary}
          inquiryStatus={localInquiryStatus}
        />
      )}
    </section>
  )
}
