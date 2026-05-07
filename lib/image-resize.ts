'use client'

/**
 * Photo Bank — browser-side resize before S3 PUT (TZ Photo Bank Stage 4 §7.3).
 *
 * Canvas-based: target 1600px on the long edge, JPEG quality 0.85.
 * Falls back to the original blob if the resize pipeline fails (server
 * still enforces the 10 MB cap on the register endpoint, so a too-big
 * source just bounces with a 400 — not a security path).
 *
 * Paid-only — used by `use-photo-upload`. Stub-level here: no
 * end-to-end run from the free-tier UI.
 */

const TARGET_LONG_EDGE = 1600
const TARGET_QUALITY = 0.85

export interface ResizeResult {
  blob: Blob
  width: number
  height: number
  resized: boolean
}

export async function resizeForUpload(file: File): Promise<ResizeResult> {
  try {
    const bmp = await createImageBitmap(file)
    const longEdge = Math.max(bmp.width, bmp.height)
    if (longEdge <= TARGET_LONG_EDGE) {
      return { blob: file, width: bmp.width, height: bmp.height, resized: false }
    }
    const scale = TARGET_LONG_EDGE / longEdge
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d unavailable')
    ctx.drawImage(bmp, 0, 0, w, h)
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', TARGET_QUALITY),
    )
    if (!blob) throw new Error('toBlob returned null')
    return { blob, width: w, height: h, resized: true }
  } catch {
    // Fall back to original — server-side validation is the canonical guard.
    return { blob: file, width: 0, height: 0, resized: false }
  }
}
