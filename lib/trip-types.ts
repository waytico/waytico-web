// API response types
export interface TripApiResponse {
  project: TripProject;
  tasks: TripTask[];
  locations: TripLocation[];
  participants?: TripParticipant[];
}

export interface TripImage {
  url: string;
  photographer: string;
  photographerUrl: string;
}

export interface TripImages {
  cover: TripImage | null;
  bands: (TripImage | null)[];
  dayPhotos?: (TripImage | null)[];
  fishPhotos?: (TripImage | null)[];  // portrait category photos (name kept for data compat)
  footer?: TripImage | null;
  actionBand?: TripImage | null;     // square category photo (name kept for data compat)
  gearBand?: TripImage | null;
  seasonBand?: TripImage | null;
}

export interface TripProject {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  dates_start: string | null;
  dates_end: string | null;
  target_species: string[] | null;
  trip_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  participants_count: number;
  experience_level: string | null;
  itinerary: ItineraryDay[] | null;
  images: TripImages | null;
  gear?: { fishing: string[]; clothing: string[]; documents: string[]; essentials: string[] } | null;
  // v2.0.0: Pipeline fields
  season?: SeasonData | null;
  budget_breakdown?: BudgetBreakdown | null;
  generation_status?: GenerationStatus;
  generation_blocks?: GenerationBlocks;
  // Legacy
  chat_platform?: string | null;
  chat_link?: string | null;
  is_private?: boolean;
  show_participants_public?: boolean;
  created_at: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
  type?: "offshore" | "rest" | "travel";
  highlights?: string[];
  activities?: string[];
  accommodation?: {
    name: string;
    photos?: string[];
  } | null;
}

export interface TripTask {
  id: string;
  type: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  sort_order: number;
  vendor_name: string | null;
  vendor_record_id: string | null;
}

export interface VendorInquiry {
  id: string;
  project_id: string;
  vendor_record_id: string;
  vendor_name: string | null;
  vendor_email: string;
  subject: string;
  message_text: string;
  status: string;
  sent_at: string;
  replied_at: string | null;
  reply_text: string | null;
  reply_from: string | null;
  reply_classification: string | null;
  reply_summary: string | null;
  created_at: string;
}

export interface TripLocation {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  day_number: number | null;
  notes: string | null;
}

export interface TripParticipant {
  id: string;
  name: string;
  role: string;
  status: string;
}

export type UserRole = "owner" | "participant" | "guest";

// v2.0.0: Pipeline types

export interface SeasonData {
  summary: string;
  airTemp: { min: number; max: number; unit: string };
  waterTemp: { min: number; max: number; unit: string };
  rainfall: string;
  bestMonths: string[];
  speciesByMonth: Record<string, {
    peak: string[];
    good: string[];
    low: string[];
  }>;
}

export interface BudgetCategory {
  category: string;
  estimated: number;
  notes: string;
}

export interface BudgetBreakdown {
  categories: BudgetCategory[];
  totalEstimate: number;
  currency: string;
  perPersonNote: string;
}

export type GenerationStatus = "generating" | "complete" | "failed" | null;

export interface GenerationBlocks {
  hero?: boolean;
  days?: boolean;
  overview?: boolean;
  tasks?: boolean;
  locations?: boolean;
  gear?: boolean;
  season?: boolean;
  budget?: boolean;
  images?: boolean;
  validate?: boolean;
}