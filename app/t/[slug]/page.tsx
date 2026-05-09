import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TripPageClient from './trip-page-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytico.com'

const SHOWCASE_SLUG = 'paris-weekend-getaway'

// Standard "large preview" dimensions — what WhatsApp / iMessage / Slack /
// LinkedIn use as a trigger for the big-card layout. Declared regardless of
// the actual hero photo aspect ratio: clients use these for layout decisions
// and render the actual image inside whatever box they pick.
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

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

// Magazine hero titles carry an embedded "\n" (Head\nTail contract). Link
// preview cards across WhatsApp/Telegram/iMessage render that as two lines,
// which makes the title look broken inside compact previews. Collapse all
// whitespace runs into single spaces for OG / twitter / browser-tab title.
function normaliseTitle(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

// Minimal pluralisation for the languages our pipeline emits today.
// Anything else falls back to English.
function formatDays(n: number | null | undefined, lang: string): string {
  if (!n || n < 1) return ''
  if (lang === 'ru') {
    const last = n % 10
    const lastTwo = n % 100
    if (lastTwo >= 11 && lastTwo <= 14) return `${n} дней`
    if (last === 1) return `${n} день`
    if (last >= 2 && last <= 4) return `${n} дня`
    return `${n} дней`
  }
  if (lang === 'es') return `${n} ${n === 1 ? 'día' : 'días'}`
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

function formatDateRange(start?: string | null, end?: string | null, lang = 'en'): string {
  if (!start) return ''
  const intlLang = lang === 'ru' ? 'ru-RU' : lang === 'es' ? 'es-ES' : 'en-US'
  try {
    const fmt = new Intl.DateTimeFormat(intlLang, { month: 'short', day: 'numeric' })
    const s = new Date(start)
    if (Number.isNaN(s.getTime())) return ''
    if (!end) return fmt.format(s)
    const e = new Date(end)
    if (Number.isNaN(e.getTime())) return fmt.format(s)
    return `${fmt.format(s)} – ${fmt.format(e)}`
  } catch {
    return ''
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
  const lang: string = p.language || 'en'
  const cleanTitle = normaliseTitle(p.title || '')

  // Link-preview description: "{country} — {N days}, {dates}". Skip parts
  // that are missing. Never fall back to p.description (overview prose) and
  // never repeat the title — link cards in WhatsApp/Telegram/iMessage etc.
  // already render the title above.
  const head = [p.country, formatDays(p.duration_days, lang)].filter(Boolean).join(' — ')
  const tail = formatDateRange(p.dates_start, p.dates_end, lang)
  const ogDescription = [head, tail].filter(Boolean).join(', ') || undefined

  const image: string | undefined = p.cover_image_url || undefined
  const url = `${APP_URL}/t/${params.slug}`

  return {
    // Browser tab keeps the brand suffix; OG/twitter strip it per requirements
    // (clients should see the trip name only, not "— Waytico").
    title: `${cleanTitle} — Waytico`,
    description: ogDescription,
    robots,
    openGraph: {
      title: cleanTitle,
      description: ogDescription,
      url,
      type: 'website',
      // siteName intentionally omitted — preview cards must not show "Waytico".
      images: image
        ? [{ url: image, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT }]
        : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: cleanTitle,
      description: ogDescription,
      images: image ? [image] : undefined,
    },
  }
}

export default async function TripPage({ params }: Props) {
  const data = await getProject(params.slug)
  if (!data) notFound()
  return <TripPageClient slug={params.slug} initialData={data} />
}
