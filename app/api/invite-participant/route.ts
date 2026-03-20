import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const TRIP_MANAGER_URL =
  process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";
const TRIP_MANAGER_API_SECRET = process.env.TRIP_MANAGER_API_SECRET;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, name, email } = await req.json();

  const res = await fetch(
    `${TRIP_MANAGER_URL}/api/trips/participants/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": TRIP_MANAGER_API_SECRET || "",
      },
      body: JSON.stringify({ clerkUserId: userId, projectId, name, email }),
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
