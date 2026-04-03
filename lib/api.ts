const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

export async function sendChatMessage(message: string, sessionId?: string, userId?: string) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : { 'x-user-id': '00000000-0000-0000-0000-000000000001' }),
    },
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
