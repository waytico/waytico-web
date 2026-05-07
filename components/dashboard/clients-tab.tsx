'use client'

import type { Project } from '@/components/project-card'

type Props = {
  // Reserved for Stage 3 — clients-tab will derive aggregates (trips
  // per client, last activity) from this list. Unused until then.
  projects: Project[] | null
}

/**
 * ClientsTab — placeholder card surfaced when the workspace switches
 * to ?view=clients. Full implementation lands in TZ Stage 3.
 *
 * Accepts `projects` already so Stage 3 can wire derivation without
 * a second prop refactor on the parent page.
 */
export default function ClientsTab(_: Props) {
  return (
    <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
      <p>Clients view shipping in next deploy.</p>
    </div>
  )
}
