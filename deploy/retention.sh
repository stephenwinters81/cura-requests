#!/bin/bash
# -------------------------------------------------------
# Data Retention Script — Requests v1.0
# CURA Medical Specialists Imaging Request System
#
# Implements two-tier data retention per Australian Privacy Act:
#   - Active retention: 90 days in PostgreSQL
#   - Archive retention: 7 years in GPG-encrypted storage
#   - Audit logs: archive but NEVER purge
#
# Process:
#   1. Find ImagingRequests older than ACTIVE_RETENTION_DAYS
#   2. Export to GPG-encrypted archive
#   3. Ship archive to geo-redundant storage
#   4. Purge from active DB only after confirmed archival
#   5. Same lifecycle for PDFs
#   6. Archive audit logs (never purge)
#
# Usage:
#   sudo bash deploy/retention.sh
#
# Cron (weekly, Sunday 3am):
#   0 3 * * 0 /var/www/requests/deploy/retention.sh
# -------------------------------------------------------

set -uo pipefail

# -------------------------------------------------------
# Configuration
# -------------------------------------------------------
ACTIVE_RETENTION_DAYS=90
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
ARCHIVE_DIR="/var/backups/requests/archives"
TEMP_DIR="/tmp/requests-retention-${TIMESTAMP}"
LOG_FILE="/var/log/requests/retention.log"

# PostgreSQL connection
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="requests"
PG_DB="requests"

# GPG recipient for encryption
GPG_RECIPIENT="backup@curaspecialists.com.au"

# PDF storage
PDF_DIR="/var/www/requests/data/pdfs"

# CUSTOMIZE: Remote archive destination (leave REMOTE_BACKUP_HOST empty to skip)
REMOTE_BACKUP_HOST="${REMOTE_BACKUP_HOST:-}"
REMOTE_BACKUP_PATH="${REMOTE_BACKUP_PATH:-/backups/requests/archives}"
REMOTE_BACKUP_USER="${REMOTE_BACKUP_USER:-backup}"
REMOTE_ARCHIVE_DEST=""
if [[ -n "${REMOTE_BACKUP_HOST}" ]]; then
    REMOTE_ARCHIVE_DEST="${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}"
fi

# Alert configuration
ALERT_LOG="/var/log/requests/alerts.log"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

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
    log "ERROR: Retention script FAILED at line $1"
    send_alert "CRITICAL" "Retention Failed" "Retention script failed at line $1"
    # Clean up temp files on failure
    rm -rf "${TEMP_DIR}"
    exit 1
}
trap 'on_error ${LINENO}' ERR

# -------------------------------------------------------
# Main retention process
# -------------------------------------------------------
log "=== Starting data retention cycle (${TIMESTAMP}) ==="
log "Active retention period: ${ACTIVE_RETENTION_DAYS} days"

# Create temp and archive directories
mkdir -p "${ARCHIVE_DIR}" "${TEMP_DIR}"

# Calculate cutoff date
CUTOFF_DATE=$(date -d "-${ACTIVE_RETENTION_DAYS} days" '+%Y-%m-%d')
log "Cutoff date: ${CUTOFF_DATE} (records created before this will be archived)"

# -------------------------------------------------------
# Step 1: Export expired ImagingRequests to archive
# -------------------------------------------------------
log "[1/6] Exporting expired ImagingRequests..."

EXPORT_FILE="${TEMP_DIR}/requests_archive_${TIMESTAMP}.sql"

# Export records older than retention period
# Using COPY for efficient data export with all related tables
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" \
    -c "\\COPY (
        SELECT * FROM \"ImagingRequest\"
        WHERE \"createdAt\" < '${CUTOFF_DATE}'
        AND \"status\" IN ('DELIVERED', 'FAILED', 'CANCELLED')
    ) TO '${EXPORT_FILE}' WITH CSV HEADER" 2>/dev/null

# Also export related delivery jobs
DELIVERY_EXPORT="${TEMP_DIR}/delivery_jobs_archive_${TIMESTAMP}.sql"
psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" \
    -c "\\COPY (
        SELECT dj.* FROM \"DeliveryJob\" dj
        JOIN \"ImagingRequest\" ir ON dj.\"requestId\" = ir.\"id\"
        WHERE ir.\"createdAt\" < '${CUTOFF_DATE}'
        AND ir.\"status\" IN ('DELIVERED', 'FAILED', 'CANCELLED')
    ) TO '${DELIVERY_EXPORT}' WITH CSV HEADER" 2>/dev/null

RECORD_COUNT=$(wc -l < "${EXPORT_FILE}" 2>/dev/null || echo "0")
RECORD_COUNT=$((RECORD_COUNT - 1))  # Subtract header row
log "Exported ${RECORD_COUNT} expired request records."

# -------------------------------------------------------
# Step 2: GPG encrypt the archive
# -------------------------------------------------------
log "[2/6] Encrypting archive..."

ENCRYPTED_ARCHIVE="${ARCHIVE_DIR}/requests_archive_${TIMESTAMP}.tar.gpg"

tar cf - -C "${TEMP_DIR}" . \
    | gpg --batch --yes --trust-model always \
        --recipient "${GPG_RECIPIENT}" \
        --output "${ENCRYPTED_ARCHIVE}" \
        --encrypt

log "Encrypted archive: $(du -sh "${ENCRYPTED_ARCHIVE}" | cut -f1)"

# -------------------------------------------------------
# Step 3: Ship archive to geo-redundant storage
# -------------------------------------------------------
log "[3/6] Shipping archive to geo-redundant storage..."

REMOTE_VERIFIED=false

if [[ -n "${REMOTE_BACKUP_HOST}" ]]; then
    # Ensure remote directory exists
    ssh "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p ${REMOTE_BACKUP_PATH}" 2>/dev/null || true

    # Ship encrypted archive
    rsync -az --timeout=300 "${ENCRYPTED_ARCHIVE}" "${REMOTE_ARCHIVE_DEST}/"
    log "Shipped archive to ${REMOTE_ARCHIVE_DEST}/"

    # Verify remote copy exists before purging (CRITICAL safety check)
    local remote_check
    remote_check=$(ssh "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" \
        "test -f ${REMOTE_BACKUP_PATH}/$(basename "${ENCRYPTED_ARCHIVE}") && echo 'OK'" 2>/dev/null)

    if [[ "${remote_check}" == "OK" ]]; then
        REMOTE_VERIFIED=true
        log "Remote archive verification: OK"
    else
        send_alert "CRITICAL" "Archive Verification Failed" \
            "Remote archive not found at ${REMOTE_ARCHIVE_DEST}/$(basename "${ENCRYPTED_ARCHIVE}"). Purge aborted."
        log "ERROR: Remote archive verification failed. Aborting purge."
    fi
else
    log "Remote shipping skipped — REMOTE_BACKUP_HOST not configured"
    # Allow purge when remote is not configured (local-only mode)
    REMOTE_VERIFIED=true
fi

# -------------------------------------------------------
# Step 4: Purge from active database (only if archived)
# -------------------------------------------------------
if [[ "${REMOTE_VERIFIED}" == "true" ]] && [[ "${RECORD_COUNT}" -gt 0 ]]; then
    log "[4/6] Purging archived records from active database..."

    # Delete in order respecting foreign keys
    DELETED=$(psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" -t -c "
        WITH expired AS (
            SELECT id FROM \"ImagingRequest\"
            WHERE \"createdAt\" < '${CUTOFF_DATE}'
            AND \"status\" IN ('DELIVERED', 'FAILED', 'CANCELLED')
        ),
        deleted_jobs AS (
            DELETE FROM \"DeliveryJob\"
            WHERE \"requestId\" IN (SELECT id FROM expired)
            RETURNING id
        ),
        deleted_requests AS (
            DELETE FROM \"ImagingRequest\"
            WHERE id IN (SELECT id FROM expired)
            RETURNING id
        )
        SELECT COUNT(*) FROM deleted_requests;
    " 2>/dev/null | tr -d ' ')

    log "Purged ${DELETED} records from active database."
else
    log "[4/6] Skipping purge — remote verification not confirmed or no records to purge."
fi

# -------------------------------------------------------
# Step 5: Archive expired PDFs
# -------------------------------------------------------
log "[5/6] Archiving expired PDFs..."

if [[ -d "${PDF_DIR}" ]]; then
    # Find PDFs associated with archived requests (by modification time)
    PDF_COUNT=$(find "${PDF_DIR}" -type f -name "*.pdf" -mtime "+${ACTIVE_RETENTION_DAYS}" 2>/dev/null | wc -l)

    if [[ "${PDF_COUNT}" -gt 0 ]]; then
        PDF_ARCHIVE="${ARCHIVE_DIR}/pdfs_archive_${TIMESTAMP}.tar.gpg"

        find "${PDF_DIR}" -type f -name "*.pdf" -mtime "+${ACTIVE_RETENTION_DAYS}" -print0 \
            | tar cf - --null -T - \
            | gpg --batch --yes --trust-model always \
                --recipient "${GPG_RECIPIENT}" \
                --output "${PDF_ARCHIVE}" \
                --encrypt

        log "Archived ${PDF_COUNT} PDFs: $(du -sh "${PDF_ARCHIVE}" | cut -f1)"

        # Ship PDF archive to remote storage
        if [[ -n "${REMOTE_BACKUP_HOST}" ]]; then
            ssh "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p ${REMOTE_BACKUP_PATH}/pdfs" 2>/dev/null || true
            rsync -az --timeout=300 "${PDF_ARCHIVE}" "${REMOTE_ARCHIVE_DEST}/pdfs/"
            log "Shipped PDF archive to ${REMOTE_ARCHIVE_DEST}/pdfs/"
        fi

        # Remove archived PDFs from active storage
        find "${PDF_DIR}" -type f -name "*.pdf" -mtime "+${ACTIVE_RETENTION_DAYS}" -delete
        log "Removed ${PDF_COUNT} expired PDFs from active storage."
    else
        log "No expired PDFs to archive."
    fi
else
    log "PDF directory not found: ${PDF_DIR}"
fi

# -------------------------------------------------------
# Step 6: Archive audit logs (NEVER purge)
# -------------------------------------------------------
log "[6/6] Archiving audit logs..."

AUDIT_EXPORT="${TEMP_DIR}/audit_logs_${TIMESTAMP}.sql"

psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" \
    -c "\\COPY (
        SELECT * FROM \"AuditLog\"
        WHERE \"createdAt\" < '${CUTOFF_DATE}'
    ) TO '${AUDIT_EXPORT}' WITH CSV HEADER" 2>/dev/null

AUDIT_COUNT=$(wc -l < "${AUDIT_EXPORT}" 2>/dev/null || echo "0")
AUDIT_COUNT=$((AUDIT_COUNT - 1))

if [[ "${AUDIT_COUNT}" -gt 0 ]]; then
    AUDIT_ARCHIVE="${ARCHIVE_DIR}/audit_logs_archive_${TIMESTAMP}.csv.gpg"

    gpg --batch --yes --trust-model always \
        --recipient "${GPG_RECIPIENT}" \
        --output "${AUDIT_ARCHIVE}" \
        --encrypt "${AUDIT_EXPORT}"

    log "Archived ${AUDIT_COUNT} audit log entries (NOT purged from DB)."

    # Ship audit archive to remote storage
    if [[ -n "${REMOTE_BACKUP_HOST}" ]]; then
        ssh "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}" "mkdir -p ${REMOTE_BACKUP_PATH}/audit" 2>/dev/null || true
        rsync -az --timeout=300 "${AUDIT_ARCHIVE}" "${REMOTE_ARCHIVE_DEST}/audit/"
        log "Shipped audit archive to ${REMOTE_ARCHIVE_DEST}/audit/"
    fi
else
    log "No audit logs older than cutoff to archive."
fi

# -------------------------------------------------------
# Cleanup
# -------------------------------------------------------
rm -rf "${TEMP_DIR}"

log "=== Retention cycle complete (${TIMESTAMP}) ==="
log "Archives stored in: ${ARCHIVE_DIR}"

exit 0
