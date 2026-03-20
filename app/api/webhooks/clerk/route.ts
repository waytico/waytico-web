import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || 'https://rng-trip-manager.onrender.com'
const TRIP_MANAGER_API_SECRET = process.env.TRIP_MANAGER_API_SECRET || ''

async function createUserViaTripManager(userData: {
  clerk_id: string
  email: string
  name: string
  platform: string
}) {
  const response = await fetch(`${TRIP_MANAGER_URL}/api/users/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': TRIP_MANAGER_API_SECRET,
    },
    body: JSON.stringify(userData),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`trip-manager /api/users/create ${response.status}: ${error}`)
  }

  return response.json()
}

async function updateUserLoginViaTripManager(clerk_id: string) {
  const response = await fetch(`${TRIP_MANAGER_URL}/api/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': TRIP_MANAGER_API_SECRET,
    },
    body: JSON.stringify({ clerk_id }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`trip-manager /api/users/login ${response.status}: ${error}`)
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Получаем заголовки
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  // Получаем тело запроса
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Верифицируем webhook
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Обрабатываем события
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    
    const email = email_addresses?.[0]?.email_address || ''
    const name = [first_name, last_name].filter(Boolean).join(' ') || 'Unknown'

    try {
      await createUserViaTripManager({
        clerk_id: id,
        email: email,
        name: name,
        platform: 'web',
      })
      console.log(`User created via trip-manager: ${id}`)
    } catch (error) {
      console.error('Failed to create user via trip-manager:', error)
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 })
    }
  }

  if (eventType === 'session.created') {
    const { user_id } = evt.data
    
    try {
      await updateUserLoginViaTripManager(user_id)
      console.log(`User login updated via trip-manager: ${user_id}`)
    } catch (error) {
      console.error('Failed to update user login via trip-manager:', error)
    }
  }

  return NextResponse.json({ success: true })
}
