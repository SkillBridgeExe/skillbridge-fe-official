// RUNTIME config template — rendered to /config.js at container start by
// nginx/40-render-runtime-config.sh (envsubst). The ${...} placeholders are
// replaced with the FE Cloud Run service's environment variables on each boot,
// so ONE built image works across dev / staging / prod without rebuilding.
//
// PUBLIC values ONLY. This file is served to every browser — never put secrets
// (API keys, client SECRET, DB/JWT secrets) here. Those live on the BACKEND.
window.__APP_CONFIG__ = {
  API_URL: "${API_URL}",
  GOOGLE_CLIENT_ID: "${GOOGLE_CLIENT_ID}",
  APP_VERSION: "${APP_VERSION}",
  GIT_SHA: "${GIT_SHA}",
  BUILD_TIME: "${BUILD_TIME}"
};
