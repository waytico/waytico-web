import { Metadata } from 'next'
import TripPageClient from './trip-page-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const SHOWCASE_SLUG = 'paris-weekend-getaway'

type Props = { params: { slug: string } }

async function getProject(slug: string) {
  try {
    // No ISR cache — Stripe activation + AI pipeline mutate the project, and
    // router.refresh() must see the fresh state immediately. Trip pages are
    // user-specific anyway, so CDN caching isn't useful here.
    const res = await fetch(`${API_URL}/api/public/projects/${slug}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProject(params.slug)
  // Showcase trip should never be indexed — it's an interactive demo, not
  // a real proposal, and we don't want it surfacing on Google as a real
  // listing for "3 days in Paris".
  const isShowcase = params.slug === SHOWCASE_SLUG
  const robots = isShowcase
    ? { index: false, follow: false, googleBot: { index: false, follow: false } }
    : undefined
  if (!data) return { title: 'Trip — Waytico', robots }
  const p = data.project
  return {
    title: `${p.title} — Waytico`,
    description: p.description?.slice(0, 160) || `${p.title} — trip proposal`,
    robots,
  }
}

export default async function TripPage({ params }: Props) {
  const data = await getProject(params.slug)
  return <TripPageClient slug={params.slug} initialData={data} />
}
