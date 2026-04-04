#!/bin/bash
# -------------------------------------------------------
# Backup Script — Requests v1.0
# CURA Medical Specialists Imaging Request System
#
# Performs:
#   1. PostgreSQL dump with timestamp
#   2. GPG encryption of the dump
#   3. Copy encrypted PDFs archive
#   4. Ship to off-box geo-redundant storage
#   5. Retain local backups for 7 days
#   6. Log success/failure
#
# RTO: 4 hours | RPO: 24 hours (per IMPLEMENTATION.md 3.5)
#
# Usage:
#   sudo bash deploy/backup.sh
#
# Cron (daily at 2am):
#   0 2 * * * /var/www/requests/deploy/backup.sh
# -------------------------------------------------------

set -uo pipefail

# -------------------------------------------------------
# Configuration — customize for your deployment
# -------------------------------------------------------
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="/var/backups/requests"
LOCAL_RETENTION_DAYS=7
LOG_FILE="/var/log/requests/backup.log"
ALERT_LOG="/var/log/requests/alerts.log"

# CUSTOMIZE: Webhook URL for Slack/Teams/Discord notifications (leave empty to disable)
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# CUSTOMIZE: Remote backup destination (leave empty to skip remote shipping)
REMOTE_BACKUP_HOST="${REMOTE_BACKUP_HOST:-}"
REMOTE_BACKUP_PATH="${REMOTE_BACKUP_PATH:-/backups/requests}"
REMOTE_BACKUP_USER="${REMOTE_BACKUP_USER:-backup}"

# PostgreSQL connection (uses .pgpass or PGPASSWORD env var)
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="requests"
PG_DB="requests"

# GPG recipient for encryption
# CUSTOMIZE: use the GPG key ID or email of your backup encryption key
GPG_RECIPIENT="backup@curaspecialists.com.au"

# PDF storage location
PDF_SOURCE_DIR="/var/www/requests/data/pdfs"

# Remote destination (constructed from env vars if REMOTE_BACKUP_HOST is set)
REMOTE_DEST=""
if [[ -n "${REMOTE_BACKUP_HOST}" ]]; then
    REMOTE_DEST="${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}"
fi

# -------------------------------------------------------
# Alert function — logs, emails, and/or posts to webhook
# -------------------------------------------------------
send_alert() {
    local severity="$1"  # CRITICAL, WARNING
    local subject="$2"
    local message="$3"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')

    # Always log to dedicated alert log
    mkdir -p "$(dirname "${ALERT_LOG}")"
    echo "[${timestamp}] [${severity}] ${subject}: ${message}" >> "${ALERT_LOG}"

    # Send email via system mail command (if available and configured)
    if [[ -n "${ALERT_EMAIL}" ]] && command -v mail &>/dev/null; then
        echo "[${severity}] ${subject}: ${message}" \
            | mail -s "[${severity}] Requests v1.0: ${subject}" "${ALERT_EMAIL}" 2>/dev/null || true
    fi

    # Post to webhook (Slack/Teams/Discord) if configured
    if [[ -n "${ALERT_WEBHOOK_URL}" ]]; then
        local payload
        payload=$(printf '{"text": "[%s] Requests v1.0: %s — %s"}' \
            "${severity}" "${subject}" "${message}")
        curl -s -m 10 -X POST "${ALERT_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "${payload}" >/dev/null 2>&1 || true
    fi

    echo "[${severity}] ${subject}: ${message}"
}

# -------------------------------------------------------
# Logging helper
# -------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] $1" | tee -a "${LOG_FILE}"
}

# -------------------------------------------------------
# Error handler
# -------------------------------------------------------
on_error() {
    log "ERROR: Backup FAILED at line $1"
    send_alert "CRITICAL" "Backup Failed" "Backup script failed at line $1"
    exit 1
}
trap 'on_error ${LINENO}' ERR

# -------------------------------------------------------
# Main backup process
# -------------------------------------------------------
log "=== Starting backup (${TIMESTAMP}) ==="

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Step 1: PostgreSQL dump
DB_DUMP="${BACKUP_DIR}/requests_db_${TIMESTAMP}.sql"
DB_DUMP_ENCRYPTED="${DB_DUMP}.gpg"

log "[1/5] Dumping PostgreSQL database..."
pg_dump -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" \
    --format=custom \
    --file="${DB_DUMP}"
log "Database dump complete: $(du -sh "${DB_DUMP}" | cut -f1)"

# Step 2: GPG encrypt the dump
log "[2/5] Encrypting database dump with GPG..."
gpg --batch --yes --trust-model always \
    --recipient "${GPG_RECIPIENT}" \
    --output "${DB_DUMP_ENCRYPTED}" \
    --encrypt "${DB_DUMP}"

# Remove unencrypted dump immediately (PHI protection)
rm -f "${DB_DUMP}"
log "Encrypted dump: $(du -sh "${DB_DUMP_ENCRYPTED}" | cut -f1)"

# Step 3: Archive encrypted PDFs
PDF_ARCHIVE="${BACKUP_DIR}/requests_pdfs_${TIMESTAMP}.tar.gpg"

if [[ -d "${PDF_SOURCE_DIR}" ]] && [[ -n "$(ls -A "${PDF_SOURCE_DIR}" 2>/dev/null)" ]]; then
    log "[3/5] Archiving and encrypting PDFs..."
    tar cf - -C "$(dirname "${PDF_SOURCE_DIR}")" "$(basename "${PDF_SOURCE_DIR}")" \
        | gpg --batch --yes --trust-model always \
            --recipient "${GPG_RECIPIENT}" \
            --output "${PDF_ARCHIVE}" \
            --encrypt
    log "PDF archive: $(du -sh "${PDF_ARCHIVE}" | cut -f1)"
else
    log "[3/5] No PDFs to archive (directory empty or missing)."
fi

# Step 4: Ship to off-box geo-redundant storage
log "[4/5] Shipping backups to off-box storage..."

if [[ -n "${REMOTE_BACKUP_HOST}" ]]; then
    # Ensure remote directory exists
    ssh "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p ${REMOTE_BACKUP_PATH}" 2>/dev/null || true

    # Ship database dump
    rsync -az --timeout=300 "${DB_DUMP_ENCRYPTED}" "${REMOTE_DEST}/"
    log "Shipped DB dump to ${REMOTE_DEST}/"

    # Ship PDF archive if it exists
    if [[ -f "${PDF_ARCHIVE}" ]]; then
        rsync -az --timeout=300 "${PDF_ARCHIVE}" "${REMOTE_DEST}/"
        log "Shipped PDF archive to ${REMOTE_DEST}/"
    fi

    # Verify remote files exist after transfer
    local remote_db_check
    remote_db_check=$(ssh "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" \
        "test -f ${REMOTE_BACKUP_PATH}/$(basename "${DB_DUMP_ENCRYPTED}") && echo 'OK'" 2>/dev/null)

    if [[ "${remote_db_check}" != "OK" ]]; then
        send_alert "CRITICAL" "Backup Verification Failed" \
            "Remote DB backup file not found at ${REMOTE_DEST}/$(basename "${DB_DUMP_ENCRYPTED}")"
    else
        log "Remote backup verification: OK"
    fi

    if [[ -f "${PDF_ARCHIVE}" ]]; then
        local remote_pdf_check
        remote_pdf_check=$(ssh "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" \
            "test -f ${REMOTE_BACKUP_PATH}/$(basename "${PDF_ARCHIVE}") && echo 'OK'" 2>/dev/null)

        if [[ "${remote_pdf_check}" != "OK" ]]; then
            send_alert "WARNING" "PDF Backup Verification Failed" \
                "Remote PDF archive not found at ${REMOTE_DEST}/$(basename "${PDF_ARCHIVE}")"
        else
            log "Remote PDF backup verification: OK"
        fi
    fi
else
    log "Remote shipping skipped — REMOTE_BACKUP_HOST not configured"
fi

# Step 5: Prune local backups older than retention period
log "[5/5] Pruning local backups older than ${LOCAL_RETENTION_DAYS} days..."
PRUNED_COUNT=$(find "${BACKUP_DIR}" -type f -name "requests_*" -mtime "+${LOCAL_RETENTION_DAYS}" | wc -l)
find "${BACKUP_DIR}" -type f -name "requests_*" -mtime "+${LOCAL_RETENTION_DAYS}" -delete
log "Pruned ${PRUNED_COUNT} old backup files."

# Summary
log "=== Backup complete (${TIMESTAMP}) ==="
log "Local backups in: ${BACKUP_DIR}"
ls -lh "${BACKUP_DIR}"/requests_*_${TIMESTAMP}* 2>/dev/null | while read -r line; do
    log "  ${line}"
done

exit 0
