#!/bin/sh
# Auto-run by the nginx base image (/docker-entrypoint.d/*.sh) BEFORE nginx starts.
# Injects PUBLIC runtime config from the Cloud Run service env into the JS file the
# SPA loads first (config.js). Only the listed vars are substituted, so nginx's own
# $-variables elsewhere are never touched. Unset vars render as "" → app falls back
# to its build-time default.
set -e

template="/usr/share/nginx/config.template.js"
output="/usr/share/nginx/html/config.js"

echo "40-render-runtime-config: rendering ${output} from Cloud Run env"
envsubst '${API_URL} ${GOOGLE_CLIENT_ID}' < "${template}" > "${output}"
