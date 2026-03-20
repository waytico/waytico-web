import { auth } from "@clerk/nextjs/server";

const AI_SERVICE_URL = "https://rng-ai-service.onrender.com";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.set("clerkUserId", userId);

      const res = await fetch(`${AI_SERVICE_URL}/api/trip-edit-chat`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      return Response.json(data, { status: res.status });
    } else {
      const body = await req.json();
      const res = await fetch(`${AI_SERVICE_URL}/api/trip-edit-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, clerkUserId: userId }),
      });
      const data = await res.json();
      return Response.json(data, { status: res.status });
    }
  } catch (e: any) {
    console.error("[TripEditChat Proxy] Error:", e?.message);
    return Response.json(
      { error: "Internal server error", reply: "Sorry, something went wrong.", changes: [] },
      { status: 500 }
    );
  }
}
