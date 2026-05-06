// Sentry — browser/client runtime. Loaded automatically by @sentry/nextjs.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    // Errors only — tracing off to stay on the free tier.
    tracesSampleRate: 0,
    // Session replay also off for now (paid feature past free quota).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
