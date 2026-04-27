'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import BrandCard from '@/components/brand-card'
import ChatFlow from '@/components/chat-flow'
import Header from '@/components/header'
import TripRow from '@/components/trip-row'
import type { Project } from '@/components/project-card'
import { GROUP_TITLES, groupTrips, type GroupKey } from '@/lib/trip-grouping'
import { apiFetch } from '@/lib/api'

const VISIBLE_GROUPS: GroupKey[] = ['attention', 'awaiting', 'progress', 'completed']

function SkeletonRow() {
  return <div className="animate-pulse bg-secondary/50 rounded-md h-14 mb-2" />
}

function GroupSection({
  title,
  count,
  children,
  emptyHint,
}: {
  title: string
  count: number
  children: React.ReactNode
  emptyHint?: string
}) {
  if (count === 0 && !emptyHint) return null
  return (
    <section className="mb-7">
      <div className="flex items-baseline gap-2 px-4 mb-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-foreground/40 font-sans">{count}</span>
      </div>
      {count === 0 ? (
        <div className="px-4 py-3 border-t border-border/50">
          <p className="text-xs text-foreground/50 italic">{emptyHint}</p>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

const EMPTY_HINTS: Partial<Record<GroupKey, string>> = {
  progress: 'No active trips. Activate a quote to start preparing for the trip.',
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/projects', { token, cache: 'no-store' })
        if (!res.ok) {
          if (active) setProjects([])
          return
        }
        const data = await res.json()
        const list: Project[] = data.projects ?? data ?? []
        if (active) setProjects(list)
      } catch {
        if (active) setProjects([])
      }
    })()
    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, getToken])

  function handleUpdate(updated: Project) {
    setProjects((prev) => (prev ? prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) : prev))
  }

  function handleDelete(id: string) {
    setProjects((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
  }

  // Filter by search query first, then group
  const filteredProjects = useMemo(() => {
    if (!projects) return null
    if (!search.trim()) return projects
    const q = search.toLowerCase().trim()
    return projects.filter((p) => {
      const hay = [p.title, p.region, p.country, p.client_name, p.client_email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [projects, search])

  const grouped = useMemo(() => (filteredProjects ? groupTrips(filteredProjects) : null), [filteredProjects])

  const totalActive = grouped
    ? grouped.attention.length + grouped.awaiting.length + grouped.progress.length + grouped.completed.length
    : 0
  const archivedCount = grouped ? grouped.archive.length : 0
  const hasAnyTrip = projects !== null && projects.length > 0

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-73px)] bg-background text-foreground">
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Brand strip — always at top */}
          {isLoaded && projects !== null && <BrandCard />}

          {/* Search */}
          {hasAnyTrip && (
            <div className="flex items-center gap-3 mb-6 px-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                <input
                  type="search"
                  placeholder="Search trips, clients…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 h-9 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}

          {/* Loading state */}
          {(!isLoaded || projects === null) && (
            <div className="space-y-2 px-4">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* Empty state — first-time user */}
          {isLoaded && projects !== null && projects.length === 0 && (
            <div className="mt-8 px-4">
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 text-center">
                Create your first quote
              </h2>
              <ChatFlow />
            </div>
          )}

          {/* Sections */}
          {isLoaded && grouped && hasAnyTrip && (
            <>
              {totalActive === 0 && search.trim() === '' && (
                <p className="text-sm text-foreground/60 px-4 mb-4">
                  No active trips. Browse the archive below or start a new one.
                </p>
              )}
              {totalActive === 0 && search.trim() !== '' && (
                <p className="text-sm text-foreground/60 px-4 mb-4">
                  No matches for “{search}”.
                </p>
              )}

              {VISIBLE_GROUPS.map((key) => {
                const items = grouped[key]
                const hint = EMPTY_HINTS[key]
                if (items.length === 0 && !hint) return null
                return (
                  <GroupSection
                    key={key}
                    title={GROUP_TITLES[key]}
                    count={items.length}
                    emptyHint={hint}
                  >
                    {items.map((p) => (
                      <TripRow
                        key={p.id}
                        project={p}
                        showAttention={key === 'attention'}
                        dimmed={key === 'completed'}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </GroupSection>
                )
              })}

              {/* Archive — collapsible at the bottom */}
              {archivedCount > 0 && (
                <section className="mt-4">
                  <button
                    type="button"
                    onClick={() => setArchiveOpen((v) => !v)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-foreground/60 hover:text-foreground w-full transition-colors border-t border-border/50"
                    aria-expanded={archiveOpen}
                  >
                    {archiveOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">Archive</span>
                    <span className="text-xs text-foreground/40 font-sans">{archivedCount}</span>
                  </button>
                  {archiveOpen && (
                    <div>
                      {grouped.archive.map((p) => (
                        <TripRow
                          key={p.id}
                          project={p}
                          dimmed
                          onUpdate={handleUpdate}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}

