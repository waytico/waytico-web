import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TRIP_MANAGER_URL = process.env.TRIP_MANAGER_URL || "https://rng-trip-manager.onrender.com";
const TRIP_MANAGER_API_SECRET = process.env.TRIP_MANAGER_API_SECRET || "";

const stripe = new Stripe(STRIPE_SECRET_KEY || "");

async function callTripManager(path: string, body: Record<string, any>) {
  const response = await fetch(`${TRIP_MANAGER_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-secret": TRIP_MANAGER_API_SECRET,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`trip-manager ${path} ${response.status}: ${error}`);
  }

  return response.json();
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const clerkUserId =
    session.client_reference_id || session.metadata?.clerkUserId;
  if (!clerkUserId) return;

  // Update user subscription via trip-manager
  await callTripManager("/api/users/subscribe", {
    clerk_id: clerkUserId,
    stripe_customer_id: session.customer,
    plan: "basic",
  });

  // Unfreeze any frozen trips for this user
  try {
    await callTripManager("/api/trips/unfreeze-all", {
      clerkUserId,
    });
    console.log(`[Stripe Webhook] Unfreeze-all called for user ${clerkUserId}`);
  } catch (e) {
    console.error("[Stripe Webhook] Failed to unfreeze trips:", e);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await callTripManager("/api/users/update-subscription", {
    stripe_customer_id: customerId,
    subscription_status: subscription.status,
  });

  console.log(
    `[Stripe Webhook] Subscription updated: customer=${customerId} status=${subscription.status}`
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await callTripManager("/api/users/update-subscription", {
    stripe_customer_id: customerId,
    subscription_status: "canceled",
    subscription_plan: "free",
  });

  console.log(
    `[Stripe Webhook] Subscription deleted: customer=${customerId} → free plan`
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    console.error("[Stripe Webhook] Missing signature or webhook secret");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(
      "[Stripe Webhook] Signature verification failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(
    `[Stripe Webhook] Verified event: ${event.type}, id: ${event.id}`
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSubscriptionCheckout(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "[Stripe Webhook] Handler error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
