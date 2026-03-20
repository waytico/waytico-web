"use client"

interface QuickFactsProps {
  durationDays: number
  participantsCount: number
  targetSpecies: string[]
  experienceLevel: string | null
  tripType: string | null
  location: string | null
}

export function QuickFacts({ durationDays, participantsCount, targetSpecies, experienceLevel, tripType, location }: QuickFactsProps) {
  const facts: string[] = [
    durationDays > 0 ? `${durationDays} days` : "Dates TBD",
    `${participantsCount} anglers`,
  ]

  if (targetSpecies.length > 0) {
    facts.push(targetSpecies.join(", "))
  }

  if (experienceLevel) {
    facts.push(experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1))
  }

  if (tripType) {
    facts.push(tripType.charAt(0).toUpperCase() + tripType.slice(1))
  }

  if (location) {
    facts.push(location)
  }

  return (
    <section className="bg-sand-light">
      <div className="flex flex-wrap items-center justify-center gap-0 px-6 py-5 md:px-10">
        {facts.map((fact, i) => (
          <span key={fact} className="flex items-center">
            <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.15em] text-navy/70 py-1">
              {fact}
            </span>
            {i < facts.length - 1 && (
              <span className="mx-3 text-[8px] text-coral/60 md:mx-4">◆</span>
            )}
          </span>
        ))}
      </div>
    </section>
  )
}
