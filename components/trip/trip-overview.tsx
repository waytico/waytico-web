"use client"

import { Bot } from "lucide-react"

interface TripOverviewProps {
  description: string
  onAskBiteScout: (context: string) => void
}

export function TripOverview({ description, onAskBiteScout }: TripOverviewProps) {
  // Split description into paragraphs
  const paragraphs = description.split('\n\n').filter(Boolean)

  return (
    <section className="bg-sand-light">
      <div className="px-6 py-14 md:px-10 md:py-20 max-w-[720px] mx-auto text-center">
        {/* Section label */}
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-coral mb-6 md:mb-8">
          The Expedition
        </p>

        {/* Paragraphs — Jost 28/20, weight 300, lh 1.55 */}
        {paragraphs[0] && (
          <p className="font-serif text-[20px] font-light leading-[1.55] text-navy/80 md:text-[28px]">
            {paragraphs[0]}
          </p>
        )}

        {/* Remaining paragraphs */}
        {paragraphs.slice(1).map((p, i) => (
          <p key={i} className="mt-6 font-serif text-[20px] font-light leading-[1.55] text-navy/65 md:text-[28px]">
            {p}
          </p>
        ))}

        {/* Ask BiteScout */}
        <button
          onClick={() => onAskBiteScout("Tell me more about this fishing destination. What makes it a great spot?")}
          className="mt-10 flex items-center justify-center gap-2.5 text-[14px] font-medium text-[#ff8562] transition-all hover:opacity-70"
        >
          <Bot className="h-4 w-4" />
          Ask BiteScout about this destination
        </button>
      </div>
    </section>
  )
}
