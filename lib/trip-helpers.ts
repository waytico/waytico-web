import type { TripApiResponse, TripProject, TripTask, TripParticipant, UserRole } from "./trip-types";

// ── Date helpers ──

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return "Dates TBD";
  const normalizedStart = start.split("T")[0];
  const normalizedEnd = end.split("T")[0];
  const s = new Date(normalizedStart + "T12:00:00");
  const e = new Date(normalizedEnd + "T12:00:00");
  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = s.getFullYear();
  if (sMonth === eMonth) return `${sMonth} ${sDay}–${eDay}, ${year}`;
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
}

export function getDurationDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export function getTripMonth(dateStr: string | null): string | undefined {
  if (!dateStr) return undefined;
  const normalized = dateStr.split("T")[0];
  return new Date(normalized + "T12:00:00").toLocaleDateString("en-US", { month: "short" });
}

// ── Title helpers ──

export function splitTitle(title: string): { mainTitle: string; subtitle: string } {
  const separators = [" — ", " – ", " - "];
  for (const sep of separators) {
    const idx = title.indexOf(sep);
    if (idx > 0) {
      return { mainTitle: title.slice(0, idx), subtitle: title.slice(idx + sep.length) };
    }
  }
  return { mainTitle: title, subtitle: "" };
}

// ── Status mapping ──

export function mapTripStatus(status: string): "planning" | "confirmed" | "completed" {
  switch (status) {
    case "active": return "planning";
    case "completed": return "completed";
    case "confirmed": return "confirmed";
    default: return "planning";
  }
}

// ── Participants ──

export function mapParticipants(
  participants: TripParticipant[] | undefined | null,
  participantsCount: number
): { name: string; role: "owner" | "participant"; avatar: string }[] {
  if (participants && participants.length > 0) {
    return participants.map((p) => ({
      name: p.name,
      role: p.role === "organizer" || p.role === "owner" ? "owner" as const : "participant" as const,
      avatar: p.name[0]?.toUpperCase() || "?",
    }));
  }
  const result: { name: string; role: "owner" | "participant"; avatar: string }[] = [
    { name: "Organizer", role: "owner", avatar: "O" },
  ];
  for (let i = 1; i < participantsCount; i++) {
    result.push({ name: `Angler ${i + 1}`, role: "participant", avatar: `${i + 1}` });
  }
  return result;
}

// ── Location string ──

export function getLocationString(project: TripProject): string | null {
  const parts = [project.region, project.country].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  // Deduplicate: if region already contains country, don't repeat
  if (parts.length === 2) {
    const regionLower = parts[0].toLowerCase();
    const countryLower = parts[1].toLowerCase();
    if (regionLower.includes(countryLower) || countryLower.includes(regionLower)) {
      // Use the longer one (more specific)
      return parts[0].length >= parts[1].length ? parts[0] : parts[1];
    }
  }
  // Deduplicate comma-separated parts
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of parts.join(", ").split(",").map(s => s.trim())) {
    const key = p.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }
  return unique.join(", ");
}

// ── Operator ──

export function mapOperator(tasks: TripTask[], project: TripProject) {
  const bookingTask = tasks.find((t) => t.type === "booking" && t.vendor_name);
  if (!bookingTask || !bookingTask.vendor_name) return null;
  return {
    name: bookingTask.vendor_name,
    vendorRecordId: bookingTask.vendor_record_id || null,
    location: project.region || "Unknown",
    rating: null as number | null,
    reviews: null as number | null,
    facts: [] as string[],
    bookingStatus: (bookingTask.status === "completed" ? "confirmed" : "pending") as "pending" | "confirmed" | "not_yet",
  };
}

// ── Day Plan ──

export interface DayPlanTask {
  id: string;
  text: string;
  status: "done" | "needs_decision" | "blocked";
  originalStatus: string;
  deadline: string | null;
}

export interface AccommodationInfo {
  name: string;
  url?: string;
  snippet?: string;
  rating?: number;
  phone?: string;
  address?: string;
  photos?: string[];
}

export interface DayPlanDay {
  day: number;
  date: string;
  weekday: string;
  title: string;
  type: "offshore" | "rest" | "travel";
  description: string;
  activities: string[];
  accommodation: string | AccommodationInfo | null;
  tasks: DayPlanTask[];
}

export function mapDayPlan(
  project: TripProject,
  tasks: TripTask[]
): DayPlanDay[] {
  if (!project.itinerary || project.itinerary.length === 0) return [];

  return project.itinerary.map((itDay) => {
    const dayNum = itDay.dayNumber ?? (itDay as any).day ?? 1;
    const dayDate = project.dates_start
      ? new Date(new Date(project.dates_start.split("T")[0] + "T12:00:00").getTime() + (dayNum - 1) * 86400000)
      : new Date();
    const dateStr = dayDate.toISOString().split("T")[0];
    const weekday = dayDate.toLocaleDateString("en-US", { weekday: "short" });

    const desc = itDay.description || "";
    const combined = (itDay.title + " " + desc).toLowerCase();
    let type: "offshore" | "rest" | "travel" = (itDay as any).type || "offshore";
    if (type === "offshore") {
      if (combined.includes("travel") || combined.includes("arrival") || combined.includes("departure") || combined.includes("transfer") || combined.includes("flight") || combined.includes("переезд") || combined.includes("перелёт") || combined.includes("перелет") || combined.includes("прилёт") || combined.includes("прилет") || combined.includes("вылет") || combined.includes("трансфер")) {
        type = "travel";
      } else if (combined.includes("rest") || combined.includes("free") || combined.includes("explore") || combined.includes("inshore") || combined.includes("экскурсия") || combined.includes("обзорн") || combined.includes("отдых") || combined.includes("прогулк")) {
        type = "rest";
      }
    }

    const dayTasks = tasks
      .filter((t) => {
        if (t.type === "gear") return false;
        const proximity = Math.abs(t.sort_order - dayNum);
        return proximity <= 1;
      })
      .slice(0, 4)
      .map((t) => ({
        id: t.id,
        text: t.title + (t.description ? ` — ${t.description}` : ""),
        status: mapTaskStatus(t.status),
        originalStatus: t.status,
        deadline: t.deadline,
      }));

    return {
      day: dayNum,
      date: dateStr,
      weekday,
      title: itDay.title,
      type,
      description: desc,
      activities: Array.isArray(itDay.activities) ? itDay.activities : (Array.isArray(itDay.highlights) ? itDay.highlights : []),
      accommodation: itDay.accommodation || null,
      tasks: dayTasks,
    };
  });
}

function mapTaskStatus(status: string): "done" | "needs_decision" | "blocked" {
  switch (status) {
    case "completed": return "done";
    case "waiting_response": return "needs_decision";
    case "pending": return "blocked";
    default: return "blocked";
  }
}

// ── Gear ──

export function mapGear(tasks: TripTask[]): {
  fishing: string[];
  clothing: string[];
  documents: string[];
  essentials: string[];
} {
  const gear = { fishing: [] as string[], clothing: [] as string[], documents: [] as string[], essentials: [] as string[] };
  const gearTasks = tasks.filter((t) => t.type === "gear");

  for (const t of gearTasks) {
    const desc = (t.title + " " + (t.description || "")).toLowerCase();
    if (desc.includes("rod") || desc.includes("reel") || desc.includes("lure") || desc.includes("hook") || desc.includes("tackle") || desc.includes("line") || desc.includes("leader") || desc.includes("fish")) {
      gear.fishing.push(t.title);
    } else if (desc.includes("shirt") || desc.includes("hat") || desc.includes("glass") || desc.includes("jacket") || desc.includes("short") || desc.includes("shoe") || desc.includes("cloth")) {
      gear.clothing.push(t.title);
    } else if (desc.includes("passport") || desc.includes("license") || desc.includes("insurance") || desc.includes("doc") || desc.includes("confirmation") || desc.includes("visa")) {
      gear.documents.push(t.title);
    } else {
      gear.essentials.push(t.title);
    }
  }

  return gear;
}

// ── Budget ──

export function mapBudget(project: TripProject): { category: string; estimated: number; actual: number | null }[] | null {
  // Prefer pipeline budget_breakdown if available
  if (project.budget_breakdown && project.budget_breakdown.categories?.length > 0) {
    return project.budget_breakdown.categories.map((c) => ({
      category: c.category,
      estimated: c.estimated,
      actual: null,
    }));
  }
  if (project.budget_min == null && project.budget_max == null) return null;
  const estimated = project.budget_max || project.budget_min || 0;
  return [{ category: "Trip Budget", estimated, actual: null }];
}

// ── Season (pipeline) ──

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Convert pipeline SeasonData into the { month, [species]: level }[] format
 * used by the existing SeasonChart component.
 */
export function mapSeasonChart(
  season: { speciesByMonth?: Record<string, { peak: string[]; good: string[]; low: string[] }> } | null | undefined,
  speciesList: string[]
): { month: string; [key: string]: string }[] | undefined {
  if (!season?.speciesByMonth || speciesList.length === 0) return undefined;

  return MONTHS_SHORT.map((month): { month: string; [key: string]: string } => {
    const entry: { month: string; [key: string]: string } = { month };
    const monthData = season.speciesByMonth![month];
    for (const sp of speciesList) {
      const key = sp.toLowerCase().replace(/\s+/g, "_");
      if (monthData?.peak?.some((s) => s.toLowerCase() === sp.toLowerCase())) {
        entry[key] = "peak";
      } else if (monthData?.good?.some((s) => s.toLowerCase() === sp.toLowerCase())) {
        entry[key] = "good";
      } else {
        entry[key] = "off";
      }
    }
    return entry;
  });
}