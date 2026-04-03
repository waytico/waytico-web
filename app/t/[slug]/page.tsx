import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import TripPageClient from './trip-page-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

type Props = { params: Promise<{ slug: string }> }

async function getProject(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/public/projects/${slug}`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getProject(slug)
  if (!data) return { title: 'Trip — Waytico' }
  const p = data.project
  return {
    title: `${p.title} — Waytico`,
    description: p.description?.slice(0, 160) || `${p.title} — trip proposal`,
    openGraph: {
      title: p.title,
      description: p.description?.slice(0, 160),
    },
  }
}

export default async function TripPage({ params }: Props) {
  const { slug } = await params
  const data = await getProject(slug)

  if (!data) {
    // Could be still generating — show client-side polling
    return <TripPageClient slug={slug} initialData={null} />
  }

  return <TripPageClient slug={slug} initialData={data} />
}
