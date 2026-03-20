import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_CHAT;

async function getUserPlan(clerkUserId: string): Promise<string> {
  try {
    const escapedId = clerkUserId.replace(/"/g, '\\"');
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={clerk_id}="${escapedId}"&maxRecords=1`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      cache: "no-store",
    });
    const data = await resp.json();
    if (data.records?.[0]?.fields?.subscription_plan) {
      return data.records[0].fields.subscription_plan;
    }
  } catch {}
  return "free";
}

async function getBasicPrices(): Promise<{ quarterlyId: string; yearlyId: string }> {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Plans?filterByFormula={Name}='basic'&maxRecords=1`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 300 },
    });
    const data = await resp.json();
    if (data.records?.[0]?.fields) {
      const f = data.records[0].fields;
      return {
        quarterlyId: f.Stripe_Price_ID_Quarterly || "",
        yearlyId: f.Stripe_Price_ID_Yearly || "",
      };
    }
  } catch {}
  return { quarterlyId: "", yearlyId: "" };
}

async function getPricesFromSettings(): Promise<{ quarterly: number; yearly: number }> {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Chat_Settings?filterByFormula=OR({key}='BASIC_PRICE_QUARTERLY_CENTS',{key}='BASIC_PRICE_YEARLY_CENTS')`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 300 },
    });
    const data = await resp.json();
    let q = 2900, y = 9900;
    for (const r of data.records || []) {
      if (r.fields.key === "BASIC_PRICE_QUARTERLY_CENTS") q = parseInt(r.fields.value, 10);
      if (r.fields.key === "BASIC_PRICE_YEARLY_CENTS") y = parseInt(r.fields.value, 10);
    }
    return { quarterly: q / 100, yearly: y / 100 };
  } catch {}
  return { quarterly: 29, yearly: 99 };
}

export default async function UpgradePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [currentPlan, prices, priceAmounts] = await Promise.all([
    getUserPlan(userId),
    getBasicPrices(),
    getPricesFromSettings(),
  ]);

  const isBasic = currentPlan === "basic";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upgrade Your Plan</h1>
        <p className="text-gray-600 mb-8">
          Current plan: <span className="font-semibold capitalize">{currentPlan}</span>
        </p>

        {isBasic ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-800 font-medium">
              You&apos;re already on the Basic plan. Enjoy your benefits!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quarterly */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Quarterly</h2>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${priceAmounts.quarterly}<span className="text-base font-normal text-gray-500">/quarter</span>
              </p>
              <ul className="text-sm text-gray-600 space-y-2 my-4">
                <li>✓ 50 messages/day</li>
                <li>✓ Persistent scouts</li>
                <li>✓ Full trip planning</li>
                <li>✓ AI trip editor — edit your trip via chat</li>
                <li>✓ Shareable trip page</li>
              </ul>
              <UpgradeButton priceId={prices.quarterlyId} label={`Subscribe — $${priceAmounts.quarterly}/quarter`} />
            </div>

            {/* Yearly */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 relative">
              <span className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Best Value
              </span>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Yearly</h2>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${priceAmounts.yearly}<span className="text-base font-normal text-gray-500">/year</span>
              </p>
              <ul className="text-sm text-gray-600 space-y-2 my-4">
                <li>✓ Everything in Quarterly</li>
                <li>✓ Save vs quarterly</li>
              </ul>
              <UpgradeButton priceId={prices.yearlyId} label={`Subscribe — $${priceAmounts.yearly}/year`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradeButton({ priceId, label }: { priceId: string; label: string }) {
  return (
    <form action="/api/checkout-subscription-redirect" method="POST">
      <input type="hidden" name="priceId" value={priceId} />
      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl"
      >
        {label}
      </button>
    </form>
  );
}
