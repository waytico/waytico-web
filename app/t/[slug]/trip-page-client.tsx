'use client'

import { useState, useEffect } from 'react'

type Location = {
  id: string; name: string; type: string
  latitude: string; longitude: string
  day_number: number; notes: string | null
}

type Props = {
  slug: string
  initialData: { project: Record<string, any>; tasks: any[]; locations: Location[]; media: any[] } | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

export default function TripPageClient({ slug, initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [polling, setPolling] = useState(!initialData)

  useEffect(() => {
    if (!polling) return
    let active = true
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch(`${API_URL}/api/public/projects/${slug}`)
          if (res.ok) {
            const d = await res.json()
            setData(d)
            setPolling(false)
            return
          }
        } catch {}
        await new Promise(r => setTimeout(r, 3000))
      }
    }
    poll()
    // Stop polling after 2 minutes
    const timeout = setTimeout(() => { active = false; setPolling(false) }, 120_000)
    return () => { active = false; clearTimeout(timeout) }
  }, [polling, slug])

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        {polling ? (
          <>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-lg text-foreground/70">Building your trip page…</p>
            <p className="text-sm text-muted-foreground">This usually takes 30–60 seconds</p>
          </>
        ) : (
          <>
            <p className="text-lg text-foreground/70">Trip page not found</p>
            <a href="/" className="text-accent hover:underline">← Back to home</a>
          </>
        )}
      </div>
    )
  }

  const p = data.project
  const locations = data.locations || []
  const itinerary: any[] = p.itinerary || []

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-secondary py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          {p.activity_type && (
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-accent/10 text-accent rounded-full">
              {p.activity_type}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight">
            {p.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-foreground/60 text-sm">
            {p.region && <span>📍 {p.region}{p.country ? `, ${p.country}` : ''}</span>}
            {p.duration_days && <span>📅 {p.duration_days} days</span>}
            {p.group_size && <span>👥 {p.group_size} people</span>}
            {p.dates_start && (
              <span>🗓 {new Date(p.dates_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {p.dates_end && ` – ${new Date(p.dates_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            )}
          </div>
          {p.price_per_person && (
            <div className="pt-2">
              <span className="text-3xl font-serif font-bold text-accent">
                {p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : ''}{Number(p.price_per_person).toLocaleString()}
              </span>
              <span className="text-foreground/50 ml-1">per person</span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">
        {/* Overview */}
        {p.description && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Overview</h2>
            <div className="text-foreground/80 leading-relaxed whitespace-pre-line">
              {p.description}
            </div>
          </section>
        )}

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">Day-by-Day Itinerary</h2>
            <div className="space-y-6">
              {itinerary.map((day: any) => (
                <div key={day.dayNumber} className="border border-border rounded-xl p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                      {day.dayNumber}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{day.title}</h3>
                      {day.description && (
                        <p className="text-foreground/70 text-sm mt-1 leading-relaxed">{day.description}</p>
                      )}
                    </div>
                  </div>
                  {day.highlights?.length > 0 && (
                    <div className="pl-[52px] flex flex-wrap gap-2">
                      {day.highlights.map((h: string, i: number) => (
                        <span key={i} className="inline-block px-3 py-1 text-xs bg-secondary rounded-full text-foreground/70">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  {day.accommodation && (
                    <p className="pl-[52px] text-xs text-muted-foreground">🏨 {typeof day.accommodation === 'string' ? day.accommodation : day.accommodation.name}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Included / Not Included */}
        {(p.included || p.not_included) && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">What's Included</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {p.included && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-accent flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                    Included
                  </h3>
                  <ul className="space-y-2">
                    {p.included.split('\n').filter(Boolean).map((item: string, i: number) => (
                      <li key={i} className="text-sm text-foreground/70 pl-8">
                        {item.replace(/^[-•]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.not_included && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground/70 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-xs">✕</span>
                    Not Included
                  </h3>
                  <ul className="space-y-2">
                    {p.not_included.split('\n').filter(Boolean).map((item: string, i: number) => (
                      <li key={i} className="text-sm text-foreground/50 pl-8">
                        {item.replace(/^[-•]\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Locations */}
        {locations.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">Locations</h2>
            <div className="grid gap-3">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
                    {loc.day_number || '•'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">{loc.type}{loc.notes ? ` · ${loc.notes}` : ''}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline flex-shrink-0"
                  >
                    Map ↗
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pricing / Terms */}
        {p.terms && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Terms</h2>
            <p className="text-sm text-foreground/60 whitespace-pre-line">{p.terms}</p>
          </section>
        )}

        {/* What to Bring */}
        {p.what_to_bring?.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">What to Bring</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {p.what_to_bring.map((cat: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{cat.category}</h3>
                  <ul className="space-y-1">
                    {cat.items?.map((item: any, j: number) => (
                      <li key={j} className="text-sm text-foreground/70 flex items-start gap-2">
                        <span className="text-accent mt-0.5">·</span>
                        <span>{typeof item === 'string' ? item : item.name || item.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-border pt-8 pb-12 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <a href="/" className="text-accent hover:underline">Waytico</a>
          </p>
        </footer>
      </div>
    </div>
  )
}
