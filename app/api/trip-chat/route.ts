import { auth } from "@clerk/nextjs/server";

const AI_SERVICE_URL = process.env.TRIP_MANAGER_URL
  ? process.env.TRIP_MANAGER_URL.replace("rng-trip-manager", "rng-ai-service")
  : "https://rng-ai-service.onrender.com";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // File upload path: proxy FormData
      const formData = await req.formData();
      formData.set("clerkUserId", userId);

      const res = await fetch(`https://rng-ai-service.onrender.com/api/trip-chat`, {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type — browser/fetch adds boundary automatically
      });

      const data = await res.json();
      return Response.json(data);
    } else {
      // Legacy JSON path
      const body = await req.json();

      const res = await fetch(`https://rng-ai-service.onrender.com/api/trip-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, clerkUserId: userId }),
      });

      const data = await res.json();
      return Response.json(data);
    }
  } catch (e: any) {
    console.error("[TripChat Proxy] Error:", e?.message);
    return Response.json(
      { error: "Internal server error", reply: "Sorry, something went wrong.", briefConfirmed: false },
      { status: 500 }
    );
  }
}
