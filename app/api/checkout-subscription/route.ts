import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const { priceId } = await req.json();
    if (!priceId) {
      return Response.json({ error: "priceId required" }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://bitescout.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { type: "subscription", clerkUserId: userId },
      client_reference_id: userId,
      success_url: `${origin}/settings?subscription=success`,
      cancel_url: `${origin}/settings?subscription=cancelled`,
    });

    return Response.json({ checkoutUrl: session.url });
  } catch (e: any) {
    console.error("[CheckoutSubscription] Error:", e?.message);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
