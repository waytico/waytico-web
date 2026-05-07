'use client'

/**
 * Photo Bank — browser-side EXIF parse before resize (TZ Photo Bank Stage 4 §7.3).
 *
 * Lazy-loads `exifr` so we don't pay the parse cost for free users.
 * Paid-only flow: caller is `use-photo-upload`, which sends the parsed
 * `{takenAt, lat, lng}` alongside the register payload (server then
 * does its own canonical EXIF + Nominatim reverse-geocode pass; the
 * client read is purely a UX nicety to keep timestamps right when the
 * canvas resize strips EXIF metadata).
 */

export interface BrowserExif {
  takenAt: string | null
  lat: number | null
  lng: number | null
}

export async function readExif(file: File): Promise<BrowserExif> {
  try {
    const exifr = (await import('exifr')).default || (await import('exifr'))
    const data = await (exifr as any).parse(file, {
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'latitude', 'longitude'],
    })
    if (!data) return { takenAt: null, lat: null, lng: null }
    const takenAtRaw: any = data.DateTimeOriginal
    const takenAt =
      takenAtRaw instanceof Date && !isNaN(takenAtRaw.getTime())
        ? takenAtRaw.toISOString()
        : null
    const lat = typeof data.latitude === 'number' ? data.latitude : null
    const lng = typeof data.longitude === 'number' ? data.longitude : null
    return { takenAt, lat, lng }
  } catch {
    return { takenAt: null, lat: null, lng: null }
  }
}
