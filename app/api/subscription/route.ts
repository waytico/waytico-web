import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_CHAT

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 })
    }

    // Найти пользователя в Airtable
    const searchResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={clerk_id}="${userId}"`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    )

    const searchData = await searchResponse.json()
    
    if (searchData.records && searchData.records.length > 0) {
      const user = searchData.records[0].fields
      return NextResponse.json({
        subscription_status: user.subscription_status || 'free',
        subscription_plan: user.subscription_plan || 'free',
      })
    }

    return NextResponse.json({
      subscription_status: 'free',
      subscription_plan: 'free',
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
