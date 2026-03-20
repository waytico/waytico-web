import { auth } from "@clerk/nextjs/server";

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";
const API_SECRET = process.env.TRIP_MANAGER_API_SECRET || "";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Proxy SSE from trip-manager with auth
  const url = `${TRIP_MANAGER_URL}/api/trips/stream/${projectId}?userId=${encodeURIComponent(userId)}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        "x-api-secret": API_SECRET,
        Accept: "text/event-stream",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "Upstream error" }), { status: upstream.status });
    }

    // Stream the response through
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to connect to stream" }), { status: 502 });
  }
}