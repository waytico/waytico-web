import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import TripPageClient from './trip-page-client'
import { getStrings, resolveLanguage } from '@/lib/i18n/strings'
import { fmtDateRange } from '@/lib/trip-format'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytico.com'

const SHOWCASE_SLUG = 'paris-weekend-getaway'

type Props = {
  params: { slug: string }
  searchParams?: { [key: string]: string | string[] | undefined }
}

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

/** Replace the `{label}` placeholder in a template. Single-pass; if the
 *  template has multiple occurrences (it doesn't today) the first is the
 *  one that matters for OG truncation anyway. */
function interpolate(template: string, label: string): string {
  return template.replace('{label}', label)
}

/** Build the secondary description line shown under the OG title in
 *  WhatsApp / Telegram previews. Format:
 *    "{trip title} · {country} · {N days} · {date range}"
 *  Any segment that's null/empty is dropped; if everything is empty
 *  the trip description (asterisks stripped) becomes the fallback. */
function buildPreviewDescription(p: {
  title?: string | null
  description?: string | null
  country?: string | null
  duration_days?: number | null
  dates_start?: string | null
  dates_end?: string | null
  language?: string | null
}): string {
  const s = getStrings(p.language)
  const parts: string[] = []
  if (p.title && p.title.trim()) parts.push(p.title.trim())
  if (p.country) parts.push(p.country)
  if (p.duration_days && p.duration_days > 0) {
    // Russian needs proper plural form; English uses one/many.
    const lang = resolveLanguage(p.language)
    if (lang === 'ru') {
      // 1 день / 2-4 дня / 5+ дней (Russian Slavic plural rules).
      const n = p.duration_days
      const mod10 = n % 10
      const mod100 = n % 100
      const word =
        mod10 === 1 && mod100 !== 11
          ? s.daysOne
          : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
            ? s.daysFew
            : s.daysMany
      parts.push(`${n} ${word}`)
    } else {
      parts.push(`${p.duration_days} ${p.duration_days === 1 ? s.daysOne : s.daysMany}`)
    }
  }
  const range = fmtDateRange(p.dates_start, p.dates_end, p.language)
  if (range) parts.push(range)
  if (parts.length > 0) return parts.join(' · ')
  // Final fallback — strip markdown emphasis so previews don't leak `*`.
  const stripped = (p.description || '').replace(/[*_`]/g, '').trim()
  return stripped.length > 0 ? stripped.slice(0, 160) : ''
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
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
  const owner = data.owner
  const strings = getStrings(p.language)

  // Operator-facing handle: contact_label > brand_name > defaultAgent.
  // brand_name on owner = business_name || name (set in trips.service
  // .getOwnerBrand), so this naturally picks up whatever the operator
  // chose to display. Anonymous trips have owner=null → fallback.
  const label: string =
    (owner?.contact_label && String(owner.contact_label).trim()) ||
    (owner?.brand_name && String(owner.brand_name).trim()) ||
    strings.linkPreview.defaultAgent

  // Mode is driven by the share channel — ShareMenu appends `?s=new` or
  // `?s=update&v=…` so the same canonical /t/{slug} URL carries either
  // framing into the OG fetcher. WhatsApp caches per full URL, so update
  // sends include a `v` timestamp to force a fresh metadata fetch.
  const sParam = Array.isArray(searchParams?.s) ? searchParams!.s[0] : searchParams?.s
  const isUpdate = sParam === 'update'
  const ogTitle = isUpdate
    ? interpolate(strings.linkPreview.tripUpdated, label)
    : interpolate(strings.linkPreview.newTrip, label)

  // Description line beneath the OG title.
  const ogDescription = buildPreviewDescription(p)

  // Canonical URL — drop the `?s=…&v=…` query so search engines /
  // social platforms that respect og:url consolidate to one resource.
  const canonicalUrl = `${APP_URL}/t/${params.slug}`

  // og:image must be HTTPS (WhatsApp won't follow HTTP). S3 cover URLs
  // are already https. No image → omit images[] and the platform falls
  // back to text-only preview rather than a broken placeholder.
  const images = p.cover_image_url
    ? [
        {
          url: p.cover_image_url as string,
          alt: p.title || 'Trip',
        },
      ]
    : undefined

  // Document <title> keeps the old shape "{title} — Waytico" for the
  // browser tab. The OG title is what WhatsApp shows bold at the top.
  return {
    title: `${p.title || 'Trip'} — Waytico`,
    description: ogDescription || `${p.title || 'Trip'} — trip proposal`,
    robots,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Waytico',
      locale: strings.bcp47Locale,
      images,
    },
    twitter: {
      card: 'summary',
      title: ogTitle,
      description: ogDescription,
      images: p.cover_image_url ? [p.cover_image_url as string] : undefined,
    },
  }
}

export default async function TripPage({ params }: Props) {
  const data = await getProject(params.slug)
  if (!data) notFound()
  return <TripPageClient slug={params.slug} initialData={data} />
}
