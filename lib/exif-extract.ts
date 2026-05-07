'use client'

/**
 * Photo Bank — browser-side EXIF parse stub (TZ Photo Bank Stage 4 §7.3).
 *
 * Paid-only path — caller is `usePhotoBankUpload`. The browser EXIF
 * pipeline lands when the billing flow is enabled and the `exifr`
 * package is added to the web bundle (currently a backend-only
 * dependency on waytico-backend). Until then this stub returns a
 * no-op shape so the component graph compiles without dragging in a
 * 200 KB EXIF parser into the free user's bundle.
 *
 * The server-side register endpoint already does its own canonical
 * EXIF + Nominatim reverse-geocode pass via `exifr` on Node, so this
 * client-side read is purely a UX nicety (preserving timestamps when
 * the canvas resize strips metadata).
 */

export interface BrowserExif {
  takenAt: string | null
  lat: number | null
  lng: number | null
}

export async function readExif(_file: File): Promise<BrowserExif> {
  return { takenAt: null, lat: null, lng: null }
}
