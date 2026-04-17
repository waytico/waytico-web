import { apiFetch } from './api'

export type MediaRecord = {
  id: string
  project_id: string
  type: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  placement: string | null
  sort_order: number | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  day_id: string | null
  width: number | null
  height: number | null
  created_at: string
}

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB

/**
 * 3-step upload: presign → PUT to S3 → register in DB.
 * Client-side validates first so we don't waste a presign roundtrip.
 */
export async function uploadPhoto(
  projectId: string,
  file: File,
  dayId: string | null,
  token: string,
): Promise<MediaRecord> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Unsupported format: ${file.type || 'unknown'}. Use JPEG, PNG, or WebP.`)
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 15MB.`)
  }

  // 1. Presign
  const presignRes = await apiFetch(`/api/projects/${projectId}/media/presign`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  })
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}))
    throw new Error(err.error || `Presign failed (${presignRes.status})`)
  }
  const { uploadUrl, cdnUrl } = (await presignRes.json()) as {
    uploadUrl: string
    cdnUrl: string
    key: string
  }

  // 2. PUT to S3 — no Authorization header (presigned URL is its own auth)
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!putRes.ok) {
    throw new Error(`Upload to S3 failed (${putRes.status})`)
  }

  // 3. Register in DB
  const regRes = await apiFetch(`/api/projects/${projectId}/media`, {
    method: 'POST',
    token,
    body: JSON.stringify({
      type: 'photo',
      url: cdnUrl,
      dayId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }),
  })
  if (!regRes.ok) {
    const err = await regRes.json().catch(() => ({}))
    throw new Error(err.error || `Register failed (${regRes.status})`)
  }
  const { media } = (await regRes.json()) as { media: MediaRecord }
  return media
}

/** Move a photo to a different day (or unassign by passing null). */
export async function setPhotoDay(
  mediaId: string,
  dayId: string | null,
  token: string,
): Promise<MediaRecord> {
  const res = await apiFetch(`/api/media/${mediaId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ dayId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Update failed (${res.status})`)
  }
  const { media } = (await res.json()) as { media: MediaRecord }
  return media
}

export async function deletePhoto(mediaId: string, token: string): Promise<void> {
  const res = await apiFetch(`/api/media/${mediaId}`, {
    method: 'DELETE',
    token,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Delete failed (${res.status})`)
  }
}

/** Fetch full media list for an owned project (includes unassigned photos). */
export async function fetchOwnerMedia(
  projectId: string,
  token: string,
): Promise<MediaRecord[]> {
  const res = await apiFetch(`/api/projects/${projectId}/media`, { token })
  if (!res.ok) return []
  const { media } = (await res.json()) as { media: MediaRecord[] }
  return media
}
