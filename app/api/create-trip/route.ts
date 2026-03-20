import { auth, currentUser } from "@clerk/nextjs/server";

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_CHAT;

interface UserPlanInfo {
  plan: string;
  isPaidActive: boolean;
  maxActiveTrips: number;
}

async function getUserPlanInfo(clerkUserId: string): Promise<UserPlanInfo> {
  const defaultResult: UserPlanInfo = { plan: "free", isPaidActive: false, maxActiveTrips: 0 };
  try {
    // 1. Get user record
    const escapedId = clerkUserId.replace(/"/g, '\\"');
    const userUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={clerk_id}="${escapedId}"&maxRecords=1`;
    const userResp = await fetch(userUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: "no-store",
    });
    const userData = await userResp.json();
    const userFields = userData.records?.[0]?.fields;

    if (!userFields?.subscription_plan || !userFields?.subscription_status) {
      return defaultResult;
    }

    const planName = userFields.subscription_plan;
    const isActive = userFields.subscription_status === "active";

    // 2. Get plan config
    const planUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Plans?filterByFormula=AND({Name}="${planName}",{Is_Active}=TRUE())&maxRecords=1`;
    const planResp = await fetch(planUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: "no-store",
    });
    const planData = await planResp.json();
    const planFields = planData.records?.[0]?.fields;

    const isPaid = ["basic", "pro"].includes(planName) && isActive;
    const maxActiveTrips = typeof planFields?.Max_Active_Trips === "number" ? planFields.Max_Active_Trips : 0;

    return { plan: planName, isPaidActive: isPaid, maxActiveTrips };
  } catch (e) {
    console.error("[CreateTrip] Failed to get user plan:", e);
    return defaultResult;
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const { scoutId, brief, tripDetails, rawItinerary } = body;
  
  if (!scoutId && !brief && !tripDetails && !rawItinerary) {
    return Response.json({ error: "scoutId, brief, tripDetails, or rawItinerary is required" }, { status: 400 });
  }

  // Get organizer email and name from Clerk
  const user = await currentUser();
  const organizerEmail = user?.emailAddresses?.[0]?.emailAddress || null;
  const organizerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

  // Get plan info including trip limit
  const { isPaidActive, maxActiveTrips } = await getUserPlanInfo(userId);
  const tripStatus = isPaidActive ? "active" : "frozen";

  try {
    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/generate-and-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
      },
      body: JSON.stringify({ 
        clerkUserId: userId, 
        scoutId,
        brief,
        tripDetails,
        rawItinerary,
        organizerEmail,
        organizerName,
        status: tripStatus,
        maxActiveTrips,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json(
        { error: err.error || "Failed to create trip", message: err.message, currentCount: err.currentCount, maxActiveTrips: err.maxActiveTrips },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Pipeline mode returns { slug, projectId, tripUrl, streaming: true }
    if (data.streaming) {
      return Response.json({
        slug: data.slug,
        projectId: data.projectId,
        tripUrl: data.tripUrl || `/trip/${data.slug}`,
        streaming: true,
      });
    }

    // Legacy mode returns { project: { slug } }
    return Response.json({
      slug: data.project?.slug || data.slug,
      tripUrl: `/trip/${data.project?.slug || data.slug}`,
    });
  } catch (e: any) {
    console.error("[CreateTrip] Error:", e?.message);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}