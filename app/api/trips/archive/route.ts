import { auth } from "@clerk/nextjs/server";

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { slug } = body;

  if (!slug) {
    return Response.json({ error: "slug required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
      },
      body: JSON.stringify({ clerkUserId: userId, slug }),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(data, { status: res.status });
    }

    return Response.json(data);
  } catch (e: any) {
    console.error("[TripsArchive] Error:", e?.message);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
