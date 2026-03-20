"use client"

/**
 * Skeleton loaders for each pipeline block type.
 * Shown while blocks are being generated, replaced by BlockReveal on readiness.
 */

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-navy/10 ${className}`} />
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[60vh] min-h-[400px] bg-gradient-to-br from-navy/80 to-navy/60 flex items-end">
      <div className="w-full px-6 pb-10 md:px-10">
        <Pulse className="h-10 w-2/3 mb-4" />
        <Pulse className="h-6 w-1/3 mb-3" />
        <Pulse className="h-5 w-1/4" />
      </div>
    </div>
  )
}

export function QuickFactsSkeleton() {
  return (
    <div className="bg-offwhite px-6 py-8 md:px-10">
      <div className="max-w-3xl mx-auto grid grid-cols-3 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <Pulse className="h-4 w-16 mx-auto" />
            <Pulse className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function OverviewSkeleton() {
  return (
    <div className="bg-offwhite px-6 py-14 md:px-10 md:py-20">
      <div className="max-w-3xl mx-auto space-y-3">
        <Pulse className="h-4 w-20" />
        <Pulse className="h-8 w-1/2 mb-6" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-3/4" />
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export function DaysSkeleton() {
  return (
    <div className="bg-offwhite px-6 py-14 md:px-10 md:py-20">
      <div className="max-w-3xl mx-auto space-y-6">
        {[1, 2, 3].map((d) => (
          <div key={d} className="rounded-xl border border-navy/10 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Pulse className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Pulse className="h-5 w-1/3" />
                <Pulse className="h-3 w-1/4" />
              </div>
            </div>
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GearSkeleton() {
  return (
    <div className="bg-offwhite px-6 py-14 md:px-10 md:py-20">
      <div className="max-w-3xl mx-auto">
        <Pulse className="h-4 w-16 mb-3" />
        <Pulse className="h-8 w-40 mb-8" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 p-4 rounded-xl border border-navy/10">
              <Pulse className="h-5 w-20" />
              <Pulse className="h-3 w-full" />
              <Pulse className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SeasonSkeleton() {
  return (
    <div className="bg-sand-light px-6 py-14 md:px-10 md:py-20">
      <div className="max-w-3xl mx-auto">
        <Pulse className="h-4 w-20 mb-3" />
        <Pulse className="h-8 w-48 mb-8" />
        <Pulse className="h-48 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function BudgetSkeleton() {
  return (
    <div className="bg-navy px-6 py-14 md:px-10 md:py-20">
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-16 rounded bg-offwhite/10" />
          <div className="h-32 w-full rounded-xl bg-offwhite/5" />
        </div>
      </div>
    </div>
  )
}

/** Top-level "generating" banner for the trip page */
export function GeneratingBanner({ failedMessage }: { failedMessage?: string | null }) {
  if (failedMessage) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <p className="text-sm text-red-700">
            Trip generation failed. {failedMessage}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-seafoam/10 to-blue-50 border-b border-seafoam/20 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-seafoam animate-pulse" />
        <p className="text-sm text-navy/70">
          Your trip is being generated — sections will appear as they&apos;re ready...
        </p>
      </div>
    </div>
  )
}