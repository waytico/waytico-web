"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bot, Archive } from "lucide-react"
import { TripHero } from "@/components/trip/trip-hero"
import { QuickFacts } from "@/components/trip/quick-facts"
import { TripOverview } from "@/components/trip/trip-overview"
import { PhotoBand } from "@/components/trip/photo-band"
import { OperatorCard } from "@/components/trip/operator-card"
import { DayPlan } from "@/components/trip/day-plan"
import { GearSection } from "@/components/trip/gear-section"
import { SeasonChart } from "@/components/trip/season-chart"
import { FishGallery } from "@/components/trip/fish-gallery"
import { FooterCTA } from "@/components/trip/footer-cta"
import {
  BudgetSection,
  ParticipantsSection,
} from "@/components/trip/workspace"
import { BiteScoutChat, StickyBottomBar } from "@/components/trip/bitescout-chat"
import type { UserRole, GenerationStatus, GenerationBlocks } from "@/lib/trip-types"
import type { DayPlanDay, DayPlanTask } from "@/lib/trip-helpers"
import { GroupChatButton } from "@/components/trip/group-chat-button"
import { BlockReveal } from "@/components/trip/block-reveal"
import {
  HeroSkeleton,
  OverviewSkeleton,
  DaysSkeleton,
  GearSkeleton,
  SeasonSkeleton,
  BudgetSkeleton,
  GeneratingBanner,
} from "@/components/trip/block-skeleton"
import { usePipelineStream } from "@/hooks/use-pipeline-stream"

interface TripClientShellProps {
  projectId: string
  isFrozen?: boolean
  // Hero
  title: string
  subtitle: string
  dateRange: string
  status: "planning" | "confirmed" | "completed"
  participants: { name: string; role: "owner" | "participant"; avatar: string }[]
  coverImageUrl?: string | null
  // Images
  images?: {
    cover?: { url: string; photographer: string; photographerUrl: string } | null
    bands?: ({ url: string; photographer: string; photographerUrl: string } | null)[]
    dayPhotos?: ({ url: string; photographer: string; photographerUrl: string; description?: string } | null)[]
    fishPhotos?: ({ url: string; photographer: string; photographerUrl: string; description?: string } | null)[]
    footer?: { url: string; photographer: string; photographerUrl: string } | null
    actionBand?: { url: string; photographer: string; photographerUrl: string } | null
    gearBand?: { url: string; photographer: string; photographerUrl: string } | null
    seasonBand?: { url: string; photographer: string; photographerUrl: string } | null
  } | null
  // Quick Facts
  durationDays: number
  participantsCount: number
  targetSpecies: string[]
  experienceLevel: string | null
  tripType: string | null
  location: string | null
  // Overview
  description: string | null
  // Operator
  operator: {
    name: string
    vendorRecordId?: string | null
    location: string
    rating: number | null
    reviews: number | null
    facts: string[]
    bookingStatus: "pending" | "confirmed" | "not_yet"
  } | null
  vendorInquiryStatus?: string | null
  vendorReplyClassification?: string | null
  vendorReplySummary?: string | null
  // Day Plan (enriched)
  days: DayPlanDay[]
  // Gear
  gear: { fishing: string[]; clothing: string[]; documents: string[]; essentials: string[] }
  // Season
  seasonData?: { month: string; [key: string]: string }[]
  seasonSpecies?: string[]
  tripMonth?: string
  // Budget
  budget: { category: string; estimated: number; actual: number | null }[] | null
  // Role
  userRole: UserRole
  slug: string
  rawStatus: string
  chatPlatform?: string | null
  chatLink?: string | null
  isPrivate?: boolean
  showParticipantsPublic?: boolean
  // Pipeline generation
  generationStatus?: GenerationStatus
  generationBlocks?: GenerationBlocks
}

export function TripClientShell(props: TripClientShellProps) {
  const router = useRouter()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState<string | undefined>()
  const [days, setDays] = useState<DayPlanDay[]>(props.days)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // ── Pipeline SSE streaming ──
  const isGenerating = props.generationStatus === "generating"
  const stream = usePipelineStream(props.projectId, isGenerating)

  // Merge server-known blocks with SSE-streamed blocks
  const serverBlocks = props.generationBlocks || {}
  const isBlockReady = (block: string): boolean => {
    // If not a pipeline trip, everything is ready
    if (!props.generationStatus) return true
    // If complete or failed, everything is ready (server has it all)
    if (props.generationStatus === "complete" || props.generationStatus === "failed") return true
    // Check SSE stream first, then server blocks
    return stream.readyBlocks.has(block as any) || !!(serverBlocks as any)[block]
  }

  // Sync days when server data refreshes (e.g. after router.refresh())
  useEffect(() => {
    setDays(props.days)
  }, [props.days])

  const openChat = useCallback((context?: string) => {
    setChatContext(context)
    setChatOpen(true)
  }, [])

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `${props.title} — ${props.subtitle}`,
        text: "Check out our upcoming fishing trip!",
        url: window.location.href,
      })
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleArchive = useCallback(async () => {
    setArchiving(true)
    try {
      const res = await fetch("/api/trips/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: props.slug }),
      })
      if (res.ok) {
        router.push("/")
      } else {
        setArchiving(false)
        setShowArchiveConfirm(false)
      }
    } catch {
      setArchiving(false)
      setShowArchiveConfirm(false)
    }
  }, [props.slug, router])

  const isOwner = props.userRole === "owner"
  const isParticipant = props.userRole === "participant"
  const isAuthenticated = props.userRole !== "guest"
  const hasGear = props.gear.fishing.length + props.gear.clothing.length + props.gear.documents.length + props.gear.essentials.length > 0

  // ── Task handlers with optimistic updates ──

  const handleTaskToggle = useCallback(async (taskId: string, currentStatus: string) => {
    const newDone = currentStatus !== "completed"
    const newStatus = newDone ? "done" : "blocked"
    const newOriginalStatus = newDone ? "completed" : "pending"

    // Optimistic update
    setDays(prev => prev.map(day => ({
      ...day,
      tasks: day.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus as DayPlanTask["status"], originalStatus: newOriginalStatus }
          : t
      ),
    })))

    try {
      const res = await fetch("/api/trips/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })
      if (!res.ok) throw new Error("Failed")
    } catch {
      // Revert on error
      setDays(prev => prev.map(day => ({
        ...day,
        tasks: day.tasks.map(t =>
          t.id === taskId
            ? { ...t, status: (currentStatus === "completed" ? "done" : "blocked") as DayPlanTask["status"], originalStatus: currentStatus }
            : t
        ),
      })))
    }
  }, [])

  const handleTaskDeadlineUpdate = useCallback(async (taskId: string, deadline: string | null) => {
    // Optimistic update
    setDays(prev => prev.map(day => ({
      ...day,
      tasks: day.tasks.map(t =>
        t.id === taskId ? { ...t, deadline } : t
      ),
    })))

    try {
      const res = await fetch("/api/trips/tasks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, deadline }),
      })
      if (!res.ok) throw new Error("Failed")
    } catch {
      // Silently fail — deadline already visually updated, will correct on reload
    }
  }, [])

  const handleTaskCreate = useCallback(async (dayNumber: number, title: string, deadline: string | null) => {
    // Optimistic — add temp task
    const tempId = `temp-${Date.now()}`
    const tempTask: DayPlanTask = {
      id: tempId,
      text: title,
      status: "blocked",
      originalStatus: "pending",
      deadline,
    }

    setDays(prev => prev.map(day =>
      day.day === dayNumber
        ? { ...day, tasks: [...day.tasks, tempTask] }
        : day
    ))

    try {
      const res = await fetch("/api/trips/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: props.projectId, title, deadline }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      // Replace temp with real task
      if (data.task) {
        setDays(prev => prev.map(day => ({
          ...day,
          tasks: day.tasks.map(t =>
            t.id === tempId
              ? { ...t, id: data.task.id }
              : t
          ),
        })))
      }
    } catch {
      // Remove temp task on error
      setDays(prev => prev.map(day => ({
        ...day,
        tasks: day.tasks.filter(t => t.id !== tempId),
      })))
    }
  }, [props.projectId])

  return (
    <main className="min-h-screen pb-20 md:pb-0 overflow-x-hidden">
      {/* FROZEN UPGRADE BANNER */}
      {props.isFrozen && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-blue-900 font-semibold text-sm">
                Upgrade to Basic to unlock your trip
              </p>
              <p className="text-blue-700 text-xs mt-0.5">
                Edit with AI chat, share with friends, manage tasks &amp; more
              </p>
            </div>
            <a href="/upgrade" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm">
              Upgrade
            </a>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION DIALOG */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100">
                <Archive className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Archive Trip</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to archive this trip? You can still view it from the My Trips menu, but it won&apos;t count toward your active trip limit.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                disabled={archiving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {archiving ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATING BANNER */}
      {isGenerating && !stream.isComplete && (
        <GeneratingBanner failedMessage={stream.isFailed ? stream.error : null} />
      )}
      {props.generationStatus === "failed" && !isGenerating && (
        <GeneratingBanner failedMessage="Some sections may be incomplete." />
      )}

      {/* HERO */}
      <BlockReveal ready={isBlockReady("hero")} skeleton={<HeroSkeleton />}>
      <TripHero
        title={props.title}
        subtitle={props.subtitle}
        dateRange={props.dateRange}
        status={props.status}
        participants={props.participants}
        coverImageUrl={props.coverImageUrl}
        isOwner={isOwner}
        isFrozen={props.isFrozen}
        onShare={handleShare}
        groupChatButton={
          !props.isFrozen ? (
            <GroupChatButton
              projectId={props.projectId}
              slug={props.slug}
              title={props.title}
              dateRange={props.dateRange}
              tripUrl={typeof window !== "undefined" ? window.location.href : `https://bitescout.com/trip/${props.slug}`}
              chatPlatform={props.chatPlatform}
              chatLink={props.chatLink}
              isOwner={isOwner}
            />
          ) : undefined
        }
      />
      </BlockReveal>

      {/* QUICK FACTS — shown with hero */}
      <BlockReveal ready={isBlockReady("hero")}>
      <QuickFacts
        durationDays={props.durationDays}
        participantsCount={props.participantsCount}
        targetSpecies={props.targetSpecies}
        experienceLevel={props.experienceLevel}
        tripType={props.tripType}
        location={props.location}
      />
      </BlockReveal>

      {/* OVERVIEW */}
      <BlockReveal ready={isBlockReady("overview")} skeleton={<OverviewSkeleton />}>
      {props.description && (
        <TripOverview description={props.description} onAskBiteScout={openChat} />
      )}
      </BlockReveal>

      {/* PHOTO BAND — Action (after Overview) */}
      <PhotoBand
        src={props.images?.actionBand?.url || props.images?.bands?.[0]?.url}
        alt={props.location || "Fishing destination"}
        overlayText="The Journey Ahead"
        overlaySubtext={props.location || "Your Fishing Expedition"}
        variant="dark"
      />

      {/* OPERATOR */}
      {props.operator && (
        <OperatorCard
          operator={props.operator}
          projectId={props.projectId}
          inquiryStatus={props.vendorInquiryStatus}
          replyClassification={props.vendorReplyClassification}
          replySummary={props.vendorReplySummary}
          isRegistered={isAuthenticated}
          isOwner={isOwner}
        />
      )}

      {/* DAY PLAN */}
      <BlockReveal ready={isBlockReady("days")} skeleton={<DaysSkeleton />}>
      {days.length > 0 && (
        <DayPlan
          days={days}
          dayPhotos={props.images?.dayPhotos?.map(p => p ? { url: p.url, description: p.description } : null)}
          isOwner={isOwner}
          isParticipant={isParticipant}
          projectId={props.projectId}
          onAskBiteScout={openChat}
          onTaskToggle={isOwner ? handleTaskToggle : undefined}
          onTaskDeadlineUpdate={isOwner ? handleTaskDeadlineUpdate : undefined}
          onTaskCreate={isOwner ? handleTaskCreate : undefined}
        />
      )}
      </BlockReveal>

      {/* FISH GALLERY */}
      {props.images?.fishPhotos && props.images.fishPhotos.length > 0 && (
        <FishGallery
          photos={props.images.fishPhotos.filter(Boolean).map(p => ({ url: p!.url, description: p!.description }))}
          species={props.targetSpecies}
        />
      )}

      {/* PHOTO BAND — Gear (boat/equipment) */}
      <PhotoBand
        src={props.images?.gearBand?.url || props.images?.bands?.[1]?.url}
        alt="Fishing gear and equipment"
        overlayText="Gear Up"
        overlaySubtext="Everything You Need"
        variant="teal"
      />

      {/* GEAR */}
      <BlockReveal ready={isBlockReady("gear")} skeleton={<GearSkeleton />}>
      {hasGear && (
        <GearSection gear={props.gear} onAskBiteScout={openChat} />
      )}
      </BlockReveal>

      {/* PHOTO BAND — Season */}
      <BlockReveal ready={isBlockReady("season")} skeleton={<SeasonSkeleton />}>
      {props.seasonData && (
        <PhotoBand
          src={props.images?.seasonBand?.url || props.images?.bands?.[2]?.url}
          alt="Fishing season"
          overlayText="Perfect Timing"
          overlaySubtext={`${props.tripMonth || ""} is peak season`}
          variant="warm"
        />
      )}

      {/* SEASON CHART */}
      {props.seasonData && props.seasonSpecies && (
        <SeasonChart
          data={props.seasonData}
          tripMonth={props.tripMonth}
          speciesNames={props.seasonSpecies}
        />
      )}
      </BlockReveal>

      {/* WORKSPACE (authenticated only) */}
      {isAuthenticated && (
        <section className="bg-navy">
          <div className="flex items-center gap-4 px-6 pt-14 pb-6 md:px-10 md:pt-20 max-w-3xl mx-auto">
            <div className="h-px flex-1 bg-offwhite/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-offwhite/30">
              Trip Workspace
            </span>
            <div className="h-px flex-1 bg-offwhite/10" />
          </div>
          <div className="px-6 pb-16 md:px-10 md:pb-20">
            <div className="max-w-3xl mx-auto space-y-8">
              {props.budget && (
                <BudgetSection budget={props.budget} isOwner={isOwner} />
              )}
              <ParticipantsSection
                participants={props.participants}
                userRole={props.userRole}
                projectId={props.projectId}
              />

              {/* Owner controls */}
              {isOwner && (
                <div className="space-y-4">
                  <div className="h-px bg-offwhite/10" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-offwhite/30">
                    Trip Settings
                  </p>

                  {/* Privacy toggle */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-offwhite/70">Private trip (only participants can view)</span>
                    <input
                      type="checkbox"
                      checked={props.isPrivate || false}
                      onChange={async (e) => {
                        try {
                          await fetch("/api/trips/privacy", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: props.projectId, isPrivate: e.target.checked }),
                          });
                          window.location.reload();
                        } catch {}
                      }}
                      className="h-5 w-9 appearance-none rounded-full bg-offwhite/20 relative cursor-pointer transition-colors checked:bg-seafoam after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-offwhite after:transition-transform checked:after:translate-x-4"
                    />
                  </label>

                  {/* Show participants to guests toggle */}
                  {!props.isPrivate && (
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-offwhite/70">Show participants to visitors</span>
                      <input
                        type="checkbox"
                        checked={props.showParticipantsPublic !== false}
                        onChange={async (e) => {
                          try {
                            await fetch("/api/trips/privacy", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: props.projectId, showParticipantsPublic: e.target.checked }),
                            });
                            window.location.reload();
                          } catch {}
                        }}
                        className="h-5 w-9 appearance-none rounded-full bg-offwhite/20 relative cursor-pointer transition-colors checked:bg-seafoam after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-offwhite after:transition-transform checked:after:translate-x-4"
                      />
                    </label>
                  )}

                  {/* Archive button */}
                  {props.rawStatus === "active" && (
                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      className="flex items-center gap-2 text-sm text-offwhite/40 hover:text-amber-400 transition-colors mt-2"
                    >
                      <Archive className="h-4 w-4" />
                      Archive Trip
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER CTA */}
      <FooterCTA
        src={props.images?.footer?.url}
        title={props.title}
      />

      {/* FLOATING DESKTOP BITESCOUT BUTTON */}
      {isOwner && !props.isFrozen && (
      <button
        onClick={() => openChat()}
        className="fixed right-5 bottom-5 z-30 hidden items-center gap-2.5 rounded-full bg-seafoam px-5 py-3.5 text-sm font-bold text-offwhite shadow-lg shadow-seafoam/20 transition-all hover:bg-seafoam-light hover:shadow-xl hover:shadow-seafoam/30 md:flex"
        aria-label="Open trip editor chat"
      >
        <Bot className="h-4 w-4" />
        Edit Trip
      </button>
      )}

      {/* STICKY MOBILE BAR */}
      {isOwner && !props.isFrozen && (
      <StickyBottomBar onShare={handleShare} onOpenChat={() => openChat()} />
      )}

      {/* CHAT PANEL */}
      {isOwner && !props.isFrozen && (
      <BiteScoutChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        projectId={props.projectId}
        initialMessage={chatContext}
        onTripUpdated={() => {
          router.refresh()
        }}
      />
      )}
    </main>
  )
}