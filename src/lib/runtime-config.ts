/**
 * Public front-end config, resolved in this order:
 *   1. RUNTIME  — window.__APP_CONFIG__ injected by envsubst at container start
 *                 (set on the FE Cloud Run service → no rebuild needed). See
 *                 nginx/config.template.js + nginx/40-render-runtime-config.sh.
 *   2. BUILD    — import.meta.env.VITE_* baked at `npm run build` (.env / Cloud Build).
 *   3. DEFAULT  — a safe public fallback so the app always works.
 *
 * ⚠️ PUBLIC values ONLY — everything here ships to the browser. Secrets live on
 * the backend (skillbridge-be) env, never the front-end.
 */
interface AppConfig {
  API_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  PAYOS_RETURN_URL?: string;
  POSTHOG_PROJECT_TOKEN?: string;
  POSTHOG_HOST?: string;
  ENABLE_DIAGNOSIS_ADDONS?: string | boolean;
  ENABLE_GITHUB_EVIDENCE?: string | boolean;
  ENABLE_STORY_CAREER_TARGET?: string | boolean;
  APP_VERSION?: string;
  GIT_SHA?: string;
  BUILD_TIME?: string;
}

const runtime: AppConfig =
  (typeof window !== "undefined" &&
    (window as unknown as { __APP_CONFIG__?: AppConfig }).__APP_CONFIG__) ||
  {};

/** Google OAuth web client id (public). Default = client in lithe-camp-490011-d4. */
export const GOOGLE_CLIENT_ID: string =
  runtime.GOOGLE_CLIENT_ID ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "973344038436-p701b3b89iiium7eitf1mik4n6t5novi.apps.googleusercontent.com";

/** API base URL. Empty string = same-origin `/api` (nginx prod / Vite dev proxy). */
export const API_URL: string =
  runtime.API_URL || import.meta.env.VITE_API_URL || "";

/** Exact payOS return URL used by the backend when creating embedded checkout links. */
export const PAYOS_RETURN_URL: string =
  runtime.PAYOS_RETURN_URL || import.meta.env.VITE_PAYOS_RETURN_URL || "";

/** PostHog public project token and ingest host. Tokens here are public, not secrets. */
export const POSTHOG_PROJECT_TOKEN: string =
  runtime.POSTHOG_PROJECT_TOKEN ?? import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "";

export const POSTHOG_HOST: string =
  runtime.POSTHOG_HOST ?? import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? "";

function isEnabled(value: string | boolean | undefined): boolean {
  return value === true || value === "true" || value === "1";
}

/**
 * Optional W11/W12/W13 diagnosis APIs are behind flags because older BE builds
 * return 404 for these routes. Enable when the matching backend endpoints are live.
 */
export const ENABLE_DIAGNOSIS_ADDONS = isEnabled(
  runtime.ENABLE_DIAGNOSIS_ADDONS || import.meta.env.VITE_ENABLE_DIAGNOSIS_ADDONS,
);

export const ENABLE_GITHUB_EVIDENCE = isEnabled(
  runtime.ENABLE_GITHUB_EVIDENCE || import.meta.env.VITE_ENABLE_GITHUB_EVIDENCE,
);

/**
 * Story → Career Target (cold-start role inference, slice 1c). OFF by default until the
 * `POST /api/cvs/:id/builder/story` endpoint (1b, Khoa's lane) is live — older BE returns 404.
 */
export const ENABLE_STORY_CAREER_TARGET = isEnabled(
  runtime.ENABLE_STORY_CAREER_TARGET || import.meta.env.VITE_ENABLE_STORY_CAREER_TARGET,
);
