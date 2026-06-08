// Dev-only placeholder so `window.__APP_CONFIG__` exists and there's no 404 in
// `npm run dev` (the production image OVERWRITES this at container start via
// envsubst — see nginx/config.template.js). Empty values → the app falls back to
// build-time .env (VITE_*) then to the hardcoded default in src/lib/runtime-config.ts.
window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};
