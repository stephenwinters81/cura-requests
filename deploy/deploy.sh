#!/bin/bash
# -------------------------------------------------------
# Deploy Script — Requests v1.0
# Builds the app and restarts PM2 processes.
#
# Usage:
#   bash deploy/deploy.sh
#
# Also runs automatically via .git/hooks/post-merge
# after every `git pull`.
# -------------------------------------------------------

set -euo pipefail

APP_DIR="/var/www/requests"
LOG_FILE="/var/log/requests/deploy.log"

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')
    echo "[${timestamp}] $1" | tee -a "${LOG_FILE}"
}

cd "${APP_DIR}"

log "Deploy started"

# Install any new/updated dependencies
log "Installing dependencies..."
npm ci --production=false >> "${LOG_FILE}" 2>&1

# Push any schema changes
log "Syncing database schema..."
npx prisma generate >> "${LOG_FILE}" 2>&1
npx prisma db push --skip-generate >> "${LOG_FILE}" 2>&1

# Build the Next.js app
log "Building application..."
if npm run build >> "${LOG_FILE}" 2>&1; then
    log "Build succeeded"
else
    log "ERROR: Build failed — aborting deploy (current version still running)"
    exit 1
fi

# Restart both processes
log "Restarting PM2 processes..."
pm2 restart requests-app --update-env >> "${LOG_FILE}" 2>&1
pm2 restart requests-worker --update-env >> "${LOG_FILE}" 2>&1

# Wait briefly and verify the app is responding
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:3000/api/health 2>/dev/null || echo "000")

if [[ "${HTTP_CODE}" == "200" ]]; then
    log "Deploy completed successfully — health check passed"
else
    log "WARNING: Deploy completed but health check returned HTTP ${HTTP_CODE}"
fi
