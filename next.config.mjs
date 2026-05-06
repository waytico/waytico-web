import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

// Sentry build-time wrapper. With SENTRY_AUTH_TOKEN env set, source maps
// upload to Sentry so stack traces show original file names and line
// numbers instead of minified bundle locations.
export default withSentryConfig(nextConfig, {
  org: "waytico",
  project: "waytico-web",
  silent: true,
  // Auth token is read from SENTRY_AUTH_TOKEN env automatically.
  // Without the token (e.g. local dev) source-map upload is skipped so
  // the build doesn't fail.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
