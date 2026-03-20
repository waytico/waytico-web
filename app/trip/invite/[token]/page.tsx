import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";

const TRIP_MANAGER_URL =
  process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";

interface InviteData {
  participant: { name: string; status: string; role: string };
  project: {
    slug: string;
    title: string;
    region: string | null;
    dates_start: string | null;
    dates_end: string | null;
  };
}

async function getInvite(token: string): Promise<InviteData | null> {
  try {
    const res = await fetch(
      `${TRIP_MANAGER_URL}/api/public/trip/invite/${token}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function acceptInvite(
  token: string,
  userId: string
): Promise<{ slug: string } | null> {
  try {
    const res = await fetch(`${TRIP_MANAGER_URL}/api/trips/accept-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.TRIP_MANAGER_API_SECRET || "",
      },
      body: JSON.stringify({ clerkUserId: userId, inviteToken: token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { slug: data.project?.slug };
  } catch {
    return null;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.split("T")[0] + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function InvitePage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = await props.params;
  const token = params.token;

  const invite = await getInvite(token);

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy">
        <div className="bg-sand rounded-2xl p-10 max-w-md w-full mx-4 text-center shadow-xl">
          <h1
            className="text-3xl font-bold text-navy mb-3"
            style={{ fontFamily: "var(--font-jost, 'Jost', sans-serif)" }}
          >
            Invite Not Found
          </h1>
          <p
            className="text-navy/60 mb-6"
            style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}
          >
            This invite link is invalid or has expired.
          </p>
          <a
            href="https://bitescout.com"
            className="text-seafoam hover:text-seafoam-light font-medium"
          >
            Go to BiteScout
          </a>
        </div>
      </div>
    );
  }

  // If user is logged in, auto-accept and redirect
  const { userId } = await auth();

  if (userId) {
    const result = await acceptInvite(token, userId);
    if (result?.slug) {
      redirect(`/trip/${result.slug}`);
    }
    // If accept failed but invite exists, redirect to trip page anyway
    redirect(`/trip/${invite.project.slug}`);
  }

  // Not logged in — show invite card
  const { participant, project } = invite;
  const dateRange =
    project.dates_start && project.dates_end
      ? `${formatDate(project.dates_start)} – ${formatDate(project.dates_end)}`
      : "Dates TBD";

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy p-4">
      <div className="bg-sand rounded-2xl p-10 max-w-md w-full shadow-xl text-center">
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-seafoam/20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-seafoam"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p
            className="text-navy/60 text-sm uppercase tracking-wide mb-2"
            style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}
          >
            You&apos;re invited to join
          </p>
          <h1
            className="text-3xl font-bold text-navy mb-2"
            style={{ fontFamily: "var(--font-jost, 'Jost', sans-serif)" }}
          >
            {project.title}
          </h1>
          {project.region && (
            <p
              className="text-navy/70 text-lg"
              style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}
            >
              {project.region}
            </p>
          )}
        </div>

        <div className="bg-navy/5 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-navy/50">Dates</span>
            <span className="text-navy font-medium">{dateRange}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy/50">Invited as</span>
            <span className="text-navy font-medium capitalize">
              {participant.name}
            </span>
          </div>
        </div>

        <SignInButton
          mode="redirect"
          forceRedirectUrl={`/trip/invite/${token}`}
        >
          <button
            className="w-full py-3 px-6 rounded-xl text-white font-semibold text-lg transition-colors"
            style={{
              backgroundColor: "var(--coral, #E8634A)",
              fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "var(--coral-light, #F0907D)")
            }
            onMouseOut={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor =
                "var(--coral, #E8634A)")
            }
          >
            Sign in to Join
          </button>
        </SignInButton>

        <p
          className="text-navy/40 text-xs mt-4"
          style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}
        >
          Sign in or create an account to join this trip
        </p>
      </div>
    </div>
  );
}
