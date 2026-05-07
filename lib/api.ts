const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const IMPERSONATION_STORAGE_KEY = 'waytico:impersonation-token'

/**
 * Read the active impersonation token from sessionStorage. Returns null
 * server-side or when no admin is currently impersonating. Cleared on
 * tab close or via `clearImpersonation()`.
 */
export function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setImpersonationToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, token)
  } catch {
    // sessionStorage can throw in private mode; impersonation just won't
    // persist across reloads in that case.
  }
}

export function clearImpersonation(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Fetch wrapper that adds Clerk JWT when available.
 *
 * If a current impersonation token exists in sessionStorage, attaches it
 * via x-impersonation-token. The backend resolves it BEFORE Clerk JWT,
 * so all requests act as the impersonated user. Both headers are sent;
 * Clerk JWT stays around so we can fall back to admin identity by simply
 * clearing the impersonation token.
 */
export async function apiFetch(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const { token, ...fetchOptions } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const impToken = getImpersonationToken()
  if (impToken) {
    headers['x-impersonation-token'] = impToken
  }

  return fetch(`${API_URL}${path}`, { ...fetchOptions, headers })
}

export async function sendChatMessage(
  message: string,
  sessionId?: string,
  token?: string | null,
) {
  const res = await apiFetch('/api/chat', {
    method: 'POST',
    token,
    body: JSON.stringify({ message, ...(sessionId && { sessionId }) }),
  })
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`)
  return res.json() as Promise<{
    reply: string
    sessionId: string
    briefConfirmed: boolean
    projectSlug?: string
    projectId?: string
    /** Per-trip secret returned to anonymous creators (audit C-1).
     *  Stored in localStorage on the trip page; required for claim. */
    claimToken?: string | null
  }>
}

/**
 * Claim an anonymous trip after sign-up. The body's `claim_token` is
 * the secret originally returned to the creator at quote-generation
 * time. Pass null only for legacy trips (claim_token wasn't issued at
 * creation time) — backend's ALLOW_LEGACY_CLAIM flag decides whether
 * the legacy path is still open.
 */
export async function claimProject(
  projectId: string,
  token: string,
  claimToken: string | null,
) {
  const res = await apiFetch(`/api/projects/${projectId}/claim`, {
    method: 'POST',
    token,
    body: JSON.stringify(claimToken ? { claim_token: claimToken } : {}),
  })
  return { ok: res.ok, status: res.status, data: await res.json() }
}

export async function fetchPublicProject(slug: string) {
  const res = await fetch(`${API_URL}/api/public/projects/${slug}`, {
    next: { revalidate: 30 },
  })
  if (!res.ok) return null
  return res.json() as Promise<{
    project: Record<string, any>
    tasks: any[]
    locations: any[]
    media: any[]
  }>
}
