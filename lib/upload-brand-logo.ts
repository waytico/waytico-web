import { apiFetch } from '@/lib/api'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

type PresignResult = {
  uploadUrl: string
  cdnUrl: string
  key: string
}

export class BrandLogoUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrandLogoUploadError'
  }
}

/**
 * Upload a brand logo image to S3 via the presigned PUT flow.
 *
 * Steps:
 *   1. POST /api/users/me/brand-logo/presign → { uploadUrl, cdnUrl, key }
 *   2. PUT uploadUrl with the file bytes
 *   3. Return cdnUrl so the caller can PATCH /api/users/me with it
 *
 * The caller is responsible for the final PATCH — this function only
 * gets the file into S3 and tells you where it landed.
 */
export async function uploadBrandLogo(
  file: File,
  token: string,
): Promise<string> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new BrandLogoUploadError('Use a JPEG, PNG, or WebP image')
  }
  if (file.size > MAX_BYTES) {
    throw new BrandLogoUploadError('Logo must be 15MB or smaller')
  }

  const presignRes = await apiFetch('/api/users/me/brand-logo/presign', {
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
    throw new BrandLogoUploadError(err?.error || 'Could not start upload')
  }
  const { uploadUrl, cdnUrl } = (await presignRes.json()) as PresignResult

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!putRes.ok) {
    throw new BrandLogoUploadError(`Upload failed (${putRes.status})`)
  }

  return cdnUrl
}
