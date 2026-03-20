import { auth } from "@clerk/nextjs/server";

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { taskId } = body;

  if (!taskId) {
    return Response.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/tasks/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
      },
      body: JSON.stringify({ taskId, clerkUserId: userId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        { error: err.error || "Failed to complete task" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    console.error("[TaskComplete] Error:", e?.message);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
