const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

/**
 * Fetch wrapper that adds Clerk JWT when available.
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
  }>
}

export async function claimProject(projectId: string, token: string) {
  const res = await apiFetch(`/api/projects/${projectId}/claim`, {
    method: 'POST',
    token,
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
