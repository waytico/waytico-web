'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import ChatFlow from '@/components/chat-flow'
import { apiFetch } from '@/lib/api'

export type Project = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'quoted' | 'active' | 'completed' | 'archived'
  region: string | null
  country: string | null
  updated_at: string
  created_at: string
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-[#E8DFD5] rounded-lg h-20"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="w-full max-w-2xl mx-auto text-center space-y-6">
      <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        Create your first trip
      </h2>
      <ChatFlow />
    </div>
  )
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[] | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/projects', { token })
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

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background text-foreground">
      <main className="max-w-4xl mx-auto px-4 py-10">
        {(!isLoaded || projects === null) && <SkeletonList />}
        {isLoaded && projects !== null && projects.length === 0 && <EmptyState />}
        {isLoaded && projects !== null && projects.length > 0 && (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li
                key={p.id}
                className="border border-border rounded-lg p-4 bg-card"
              >
                <div className="font-serif text-xl">{p.title}</div>
                <div className="text-sm text-foreground/60">
                  {[p.region, p.country].filter(Boolean).join(', ')} · {p.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
