import { auth } from "@clerk/nextjs/server";

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ projects: [] });
  }

  try {
    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/list?clerkUserId=${userId}`, {
      method: "GET",
      headers: {
        "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
      },
    });

    if (!res.ok) {
      return Response.json({ projects: [] });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    console.error("[TripsList] Error:", e?.message);
    return Response.json({ projects: [] });
  }
}
