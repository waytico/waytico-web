"use client"

import { useState } from "react"
import { Bot, ChevronDown } from "lucide-react"

interface GearSectionProps {
  gear: {
    fishing: string[]
    clothing: string[]
    documents: string[]
    essentials: string[]
  }
  onAskBiteScout: (context: string) => void
}

interface CategoryProps {
  title: string
  items: string[]
  defaultOpen?: boolean
}

function GearCategory({ title, items, defaultOpen = false }: CategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-navy/10 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-navy/[0.02]"
        aria-expanded={isOpen}
      >
        <span className="flex-1 text-sm font-semibold text-navy">{title}</span>
        <span className="text-xs text-navy/40 mr-2">{items.length}</span>
        <ChevronDown className={`h-4 w-4 text-navy/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="border-t border-navy/10 px-4 pb-4 pt-3">
          <ul className="space-y-2.5">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px] font-light text-navy/65">
                <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-seafoam" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function GearSection({ gear, onAskBiteScout }: GearSectionProps) {
  return (
    <section className="bg-sand-light">
      <div className="px-6 py-14 md:px-10 md:py-20 max-w-[720px] mx-auto">
        {/* Section Header */}
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-coral mb-3 text-center">
          Preparation
        </p>
        <h2 className="font-serif text-[28px] font-semibold leading-[1.23] text-navy text-center md:text-[42px] mb-2">
          Gear & Packing
        </h2>
        <p className="mb-8 text-[14px] text-navy/50 text-center">
          AI-curated packing list based on your target species and destination.
        </p>

        {/* Categories Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <GearCategory
            title="Fishing Gear"
            items={gear.fishing}
            defaultOpen
          />
          <GearCategory
            title="Clothing"
            items={gear.clothing}
          />
          <GearCategory
            title="Documents"
            items={gear.documents}
          />
          <GearCategory
            title="Essentials"
            items={gear.essentials}
          />
        </div>

        {/* Ask BiteScout */}
        <button
          onClick={() => onAskBiteScout("What else should I pack for a Blue Marlin fishing trip in Cabo San Lucas? Any specific gear recommendations?")}
          className="mt-8 flex items-center justify-center gap-2.5 text-[14px] font-medium text-[#ff8562] transition-all hover:opacity-70"
        >
          <Bot className="h-4 w-4" />
          Ask BiteScout what to pack
        </button>
      </div>
    </section>
  )
}
