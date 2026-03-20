import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || ""
const TRIP_MANAGER_SECRET = process.env.TRIP_MANAGER_API_SECRET || ""

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/update-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": TRIP_MANAGER_SECRET,
      },
      body: JSON.stringify({
        ...body,
        clerkUserId: userId,
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    console.error("[update-chat] Error:", e.message)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
