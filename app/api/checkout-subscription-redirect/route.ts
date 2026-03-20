import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const formData = await req.formData();
  const priceId = formData.get("priceId") as string;
  if (!priceId) {
    return Response.json({ error: "priceId required" }, { status: 400 });
  }

  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://bitescout.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { type: "subscription", clerkUserId: userId },
      client_reference_id: userId,
      success_url: `${origin}/upgrade?subscription=success`,
      cancel_url: `${origin}/upgrade?subscription=cancelled`,
    });

    if (session.url) redirect(session.url);
    return Response.json({ error: "Failed to create checkout" }, { status: 500 });
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    console.error("[CheckoutSubscriptionRedirect] Error:", e?.message);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
