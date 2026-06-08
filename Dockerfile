# ─────────────────────────────────────────────────────────────────────────────
# Production image for the SkillBridge FE (Vite SPA), targeting Cloud Run.
# Multi-stage: build the static bundle with Node, then serve it with nginx.
# No dev server, no Vite host checks — fast, small, production-grade.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build the static site ───────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install deps from the lockfile first (reproducible + cached layer).
COPY package.json package-lock.json ./
RUN npm ci

# Build the SPA → /app/dist/spa  (matches build.outDir in vite.config.ts).
COPY . .
RUN npm run build

# ── Stage 2: serve the build with nginx ──────────────────────────────────────
FROM nginx:1.27-alpine

# Cloud Run routes traffic to the port in $PORT (default 8080); nginx must listen
# on it. NGINX_ENVSUBST_FILTER=PORT makes the base image substitute ONLY ${PORT}
# in the template, leaving nginx's own $uri / $host variables untouched.
ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER=PORT

# Rendered to /etc/nginx/conf.d/default.conf at container start by the base image.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# The compiled static site.
COPY --from=build /app/dist/spa /usr/share/nginx/html

# Runtime config: the base image runs every /docker-entrypoint.d/*.sh before nginx
# starts. 40-render-runtime-config.sh envsubst's config.template.js → config.js
# using the Cloud Run service env (PUBLIC vars only). One image, many environments.
COPY nginx/config.template.js /usr/share/nginx/config.template.js
COPY nginx/40-render-runtime-config.sh /docker-entrypoint.d/40-render-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-runtime-config.sh

EXPOSE 8080
# The base nginx entrypoint runs envsubst on templates, then `nginx -g 'daemon off;'`.
