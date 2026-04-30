import type { Metadata } from 'next'
import TripPageClientV2 from './trip-page-client-v2'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const SHOWCASE_SLUG = 'paris-weekend-getaway'

type Props = { params: { slug: string } }

async function getProject(slug: string) {
  try {
    // No ISR cache — Stripe activation + AI pipeline mutate the project
    // and router.refresh() must see fresh state immediately. Trip pages
    // are user-specific anyway so CDN caching isn't useful here.
    const res = await fetch(`${API_URL}/api/public/projects/${slug}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Metadata: until the v2 fork takes over /t/[slug], every v2 route is
 * marked noindex/nofollow. We don't want search engines indexing both
 * /t/[slug] and /v2/t/[slug] for the same trip — production SEO stays
 * on the legacy route during the migration.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProject(params.slug)
  const robots = {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  }
  if (!data) return { title: 'Trip — Waytico (v2)', robots }
  const p = data.project
  return {
    title: `${p.title} — Waytico (v2)`,
    description: p.description?.slice(0, 160) || `${p.title} — trip proposal`,
    robots,
  }
}

export default async function TripPageV2({ params }: Props) {
  const data = await getProject(params.slug)
  return <TripPageClientV2 slug={params.slug} initialData={data} />
}
