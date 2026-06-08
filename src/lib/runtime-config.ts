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
