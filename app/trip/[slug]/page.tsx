import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { TripClientShell } from "@/components/trip/trip-client-shell";
import type { TripApiResponse, UserRole } from "@/lib/trip-types";
import {
  formatDateRange,
  getDurationDays,
  getTripMonth,
  splitTitle,
  mapTripStatus,
  mapParticipants,
  getLocationString,
  mapOperator,
  mapDayPlan,
  mapGear,
  mapBudget,
  mapSeasonChart,
} from "@/lib/trip-helpers";

const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";

async function getTripData(slug: string, userId?: string | null): Promise<TripApiResponse | null> {
  try {
    const url = new URL(`${TRIP_MANAGER_URL}/api/public/trip/${slug}`);
    if (userId) url.searchParams.set("userId", userId);
    const res = await fetch(url.toString(), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function checkOwnership(projectId: string, clerkUserId: string): Promise<boolean> {
  try {
    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
      },
      body: JSON.stringify({ clerkUserId, projectId }),
      cache: "no-store",
    });
    return res.ok; // 200 = owner, 403 = not owner
  } catch {
    return false;
  }
}

async function getTripParticipants(projectId: string, clerkUserId: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
      },
      body: JSON.stringify({ clerkUserId, projectId }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.participants || null;
  } catch {
    return null;
  }
}

async function getVendorInquiries(projectId: string, clerkUserId: string): Promise<any[]> {
  try {
    const res = await fetch(
      `${TRIP_MANAGER_URL}/api/trips/vendor/inquiries/${projectId}?clerkUserId=${encodeURIComponent(clerkUserId)}`,
      {
        headers: { "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "" },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.inquiries || [];
  } catch {
    return [];
  }
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const data = await getTripData(params.slug);
  if (!data) return { title: "Trip Not Found" };
  const { mainTitle, subtitle } = splitTitle(data.project.title);
  const location = getLocationString(data.project);
  return {
    title: `${mainTitle}${subtitle ? " — " + subtitle : ""} — BiteScout Trip`,
    description: data.project.description?.slice(0, 160) || `Fishing trip to ${location || "an amazing destination"}`,
  };
}

export default async function TripPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { userId } = await auth();
  const data = await getTripData(params.slug, userId);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite">
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-navy mb-3">Trip Not Found</h1>
          <p className="text-navy/60">This trip doesn&apos;t exist or has been cancelled.</p>
          <a href="https://bitescout.com" className="mt-6 inline-block text-seafoam hover:text-seafoam-light font-medium">
            ← Back to BiteScout
          </a>
        </div>
      </div>
    );
  }

  const { project, tasks, locations } = data;

  // ── Determine user role ──
  let userRole: UserRole = "guest";
  let participants: any[] | null = null;

  // Access control for frozen trips — owner only
  if (project.status === "frozen") {
    if (!userId) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-offwhite">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold text-navy mb-3">Trip Not Found</h1>
            <p className="text-navy/60">This trip doesn&apos;t exist or has been cancelled.</p>
            <a href="https://bitescout.com" className="mt-6 inline-block text-seafoam hover:text-seafoam-light font-medium">
              ← Back to BiteScout
            </a>
          </div>
        </div>
      );
    }
    const isOwner = await checkOwnership(project.id, userId);
    if (!isOwner) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-offwhite">
          <div className="text-center">
            <h1 className="font-serif text-4xl font-bold text-navy mb-3">Trip Not Found</h1>
            <p className="text-navy/60">This trip doesn&apos;t exist or has been cancelled.</p>
            <a href="https://bitescout.com" className="mt-6 inline-block text-seafoam hover:text-seafoam-light font-medium">
              ← Back to BiteScout
            </a>
          </div>
        </div>
      );
    }
    userRole = "owner";
    participants = await getTripParticipants(project.id, userId);
  }

  if (userId && userRole === "guest") {
    const isOwner = await checkOwnership(project.id, userId);
    if (isOwner) {
      userRole = "owner";
      participants = await getTripParticipants(project.id, userId);
    } else {
      // Check if this user is a confirmed participant
      try {
        const checkRes = await fetch(`${TRIP_MANAGER_URL}/api/trips/check-participant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
          },
          body: JSON.stringify({ clerkUserId: userId, slug: params.slug }),
          cache: "no-store",
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.isParticipant) {
            userRole = "participant";
          }
        }
      } catch {}
      participants = data.participants || null;
    }
  }

  // ── Transform data ──
  let mainTitle: string, subtitle: string | undefined;
  try {
    const split = splitTitle(project.title);
    mainTitle = split.mainTitle;
    subtitle = split.subtitle;
  } catch (e: any) {
    console.error("[TripPage] splitTitle error:", e?.message, "title:", project.title);
    mainTitle = project.title || "Trip";
    subtitle = undefined;
  }

  const location = getLocationString(project);

  let heroParticipants;
  try {
    heroParticipants = mapParticipants(
      participants || data.participants,
      project.participants_count
    );
  } catch (e: any) {
    console.error("[TripPage] mapParticipants error:", e?.message);
    heroParticipants = [];
  }

  let dayPlan, gear, budget, operator;
  try {
    dayPlan = mapDayPlan(project, tasks);
    const projectGear = project.gear as { fishing: string[]; clothing: string[]; documents: string[]; essentials: string[] } | null;
    gear = (projectGear && (projectGear.fishing?.length || projectGear.clothing?.length || projectGear.documents?.length || projectGear.essentials?.length))
      ? projectGear
      : mapGear(tasks);
    budget = mapBudget(project);
    operator = mapOperator(tasks, project);
  } catch (e: any) {
    console.error("[TripPage] transform error:", e?.message, JSON.stringify({
      itineraryLen: project.itinerary?.length,
      tasksLen: tasks?.length,
      datesStart: project.dates_start,
    }));
    dayPlan = [];
    gear = { fishing: [], clothing: [], documents: [], essentials: [] };
    budget = null;
    operator = null;
  }

  // Fetch vendor inquiries for owner
  let vendorInquiryStatus: string | null = null;
  let vendorReplyClassification: string | null = null;
  let vendorReplySummary: string | null = null;
  if (userRole === "owner" && userId && operator?.vendorRecordId) {
    const inquiries = await getVendorInquiries(project.id, userId);
    const match = inquiries.find((i: any) => i.vendor_record_id === operator.vendorRecordId);
    if (match) {
      vendorInquiryStatus = match.status;
      vendorReplyClassification = match.reply_classification || null;
      vendorReplySummary = match.reply_summary || null;
    }
  }

  return (
    <TripClientShell
      projectId={project.id}
      isFrozen={project.status === "frozen"}
      // Hero
      title={mainTitle}
      subtitle={subtitle || location || "Fishing Expedition"}
      dateRange={formatDateRange(project.dates_start, project.dates_end)}
      status={mapTripStatus(project.status)}
      participants={heroParticipants}
      coverImageUrl={project.cover_image_url || project.images?.cover?.url}
      // Images (Pexels)
      images={project.images}
      // Quick Facts
      durationDays={getDurationDays(project.dates_start, project.dates_end)}
      participantsCount={project.participants_count}
      targetSpecies={project.target_species || []}
      experienceLevel={project.experience_level}
      tripType={project.trip_type}
      location={location}
      // Overview
      description={project.description}
      // Operator
      operator={operator}
      vendorInquiryStatus={vendorInquiryStatus}
      vendorReplyClassification={vendorReplyClassification}
      vendorReplySummary={vendorReplySummary}
      // Day Plan
      days={dayPlan}
      // Gear
      gear={gear}
      // Season
      seasonData={mapSeasonChart(project.season, project.target_species || []) || undefined}
      seasonSpecies={project.target_species || undefined}
      tripMonth={getTripMonth(project.dates_start)}
      // Budget
      budget={budget}
      // Pipeline generation status
      generationStatus={project.generation_status || null}
      generationBlocks={project.generation_blocks || {}}
      // Role
      userRole={userRole}
      slug={params.slug}
      rawStatus={project.status}
      chatPlatform={project.chat_platform}
      chatLink={project.chat_link}
      isPrivate={project.is_private || false}
      showParticipantsPublic={project.show_participants_public !== false}
    />
  );
}