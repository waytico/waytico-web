"use client"

import { Share2, LogIn } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"

interface Participant {
  name: string
  role: "owner" | "participant"
  avatar: string
}

interface TripHeroProps {
  title: string
  subtitle: string
  dateRange: string
  status: "planning" | "confirmed" | "completed"
  participants: Participant[]
  coverImageUrl?: string | null
  isOwner?: boolean
  isFrozen?: boolean
  onShare?: () => void
  groupChatButton?: React.ReactNode
}

const statusConfig = {
  planning: { label: "Planning", className: "bg-coral/90 text-offwhite" },
  confirmed: { label: "Confirmed", className: "bg-seafoam/90 text-offwhite" },
  completed: { label: "Completed", className: "bg-sky-500/90 text-offwhite" },
}

export function TripHero({ title, subtitle, dateRange, status, participants, coverImageUrl, isOwner, isFrozen, onShare, groupChatButton }: TripHeroProps) {
  const statusStyle = statusConfig[status]

  return (
    <section className="relative h-[80vh] min-h-[550px] md:h-[85vh] overflow-hidden">
      {/* Hero Image or Gradient */}
      {coverImageUrl ? (
        <Image
          src={coverImageUrl}
          alt={`${title} - ${subtitle}`}
          fill
          className="object-cover scale-105"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-seafoam" />
      )}

      {/* Dramatic multi-layer gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/30 via-transparent to-navy/30" />

      {/* Top bar: branding + actions */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4">
        {/* Left: branding */}
        <Link href="/" className="text-[11px] font-medium uppercase tracking-[0.3em] text-offwhite/40 hover:text-offwhite/70 transition-colors">
          BiteScout
        </Link>

        {/* Right: share + auth */}
        <div className="flex items-center gap-3">
          {groupChatButton}
          {isOwner && !isFrozen && onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 rounded-full border border-offwhite/20 bg-offwhite/10 px-4 py-2.5 text-sm font-medium text-offwhite backdrop-blur-md transition-all hover:bg-offwhite/20 hover:border-offwhite/30"
              aria-label="Share trip"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share Trip</span>
            </button>
          )}

          <SignedOut>
            <SignInButton mode="modal">
              <button className="flex items-center gap-2 rounded-full border border-offwhite/20 bg-offwhite/10 px-4 py-2.5 text-sm font-medium text-offwhite backdrop-blur-md transition-all hover:bg-offwhite/20 hover:border-offwhite/30">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 border-2 border-offwhite/20",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>

      {/* Content - bottom-aligned, movie-poster style */}
      <div className="absolute inset-0 flex flex-col items-center justify-end p-6 pb-10 pt-16 md:p-12 md:pb-16 md:pt-20 text-center overflow-hidden">
        {/* Status + Date line */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] ${statusStyle.className}`}>
            {statusStyle.label}
          </span>
          <span className="text-xs font-medium tracking-widest text-offwhite/60 uppercase">
            {dateRange || "Dates TBD"}
          </span>
        </div>

        {/* Title - two lines, movie-poster scale */}
        <h1 className="font-serif text-[36px] font-semibold leading-[1.15] tracking-tight text-offwhite uppercase text-center sm:text-[48px] md:text-[60px] lg:text-[72px] break-words line-clamp-3 md:line-clamp-4 max-w-5xl">
          {title}
        </h1>
        <p className="mt-1 font-serif text-xl font-light italic tracking-wide text-sand/80 text-center sm:text-2xl md:text-4xl lg:text-[36px]">
          {subtitle}
        </p>

        {/* Thin accent line */}
        <div className="mt-6 h-px w-20 bg-coral md:w-32 mx-auto" />

        {/* Participants row */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {participants.slice(0, 6).map((p, i) => (
            <div
              key={p.name}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy/80 bg-sand text-xs font-bold text-navy md:h-11 md:w-11"
              style={{ marginLeft: i > 0 ? "-8px" : "0", zIndex: 10 - i }}
              title={p.name}
            >
              {p.avatar}
            </div>
          ))}
          {participants.length > 6 && (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy/80 bg-offwhite/15 text-xs font-bold text-offwhite backdrop-blur-sm md:h-11 md:w-11"
              style={{ marginLeft: "-8px" }}
            >
              +{participants.length - 6}
            </div>
          )}
          <span className="ml-3 text-sm font-medium text-offwhite/60">
            {participants.length} anglers
          </span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60">
        <span className="text-[9px] uppercase tracking-[0.2em] text-offwhite/50 font-medium">Scroll</span>
        <div className="h-6 w-px bg-gradient-to-b from-offwhite/40 to-transparent animate-pulse" />
      </div>
    </section>
  )
}
