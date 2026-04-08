#!/bin/bash
# -------------------------------------------------------
# Health Monitoring Script — Requests v1.0
# CURA Medical Specialists Imaging Request System
#
# Checks:
#   1. Application health endpoint (/api/health)
#   2. Disk usage (alert at 80%)
#   3. Memory usage (alert at 85%)
#   4. SSL certificate expiry (alert at 14 days)
#   5. Redis connectivity
#   6. PostgreSQL connectivity
#   7. BullMQ queue health (/api/health/queue)
#
# Designed to run every 60 seconds via cron.
#
# Usage:
#   bash deploy/health-monitor.sh
# -------------------------------------------------------

set -uo pipefail

# -------------------------------------------------------
# Configuration — customize these for your deployment
# -------------------------------------------------------
APP_URL="https://requests.curaspecialists.com.au"
HEALTH_ENDPOINT="${APP_URL}/api/health"
DOMAIN="requests.curaspecialists.com.au"
DISK_THRESHOLD=80
MEMORY_THRESHOLD=85
CERT_WARN_DAYS=14
QUEUE_HEALTH_ENDPOINT="${APP_URL}/api/health/queue"
LOG_FILE="/var/log/requests/health-monitor.log"
ALERT_LOG="/var/log/requests/alerts.log"

# CUSTOMIZE: Webhook URL for Slack/Teams/Discord notifications (leave empty to disable)
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# CUSTOMIZE: PostgreSQL connection details (from .env)
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="requests"
PG_DB="requests"

# CUSTOMIZE: Redis connection details
REDIS_HOST="localhost"
REDIS_PORT="6379"

# -------------------------------------------------------
# Alert function — logs, emails, and/or posts to webhook
# -------------------------------------------------------
send_alert() {
    local severity="$1"  # CRITICAL, WARNING
    local subject="$2"
    local message="$3"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')

    # Always log to main log file
    echo "[${timestamp}] [${severity}] ${subject}: ${message}" >> "${LOG_FILE}"

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
# Check 1: Application health endpoint
# -------------------------------------------------------
check_app_health() {
    local http_code
    http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${HEALTH_ENDPOINT}" 2>/dev/null)

    if [[ "${http_code}" != "200" ]]; then
        send_alert "CRITICAL" "App Health Check Failed" \
            "GET ${HEALTH_ENDPOINT} returned HTTP ${http_code}"
        return 1
    fi
    return 0
}

# -------------------------------------------------------
# Check 2: Disk usage
# -------------------------------------------------------
check_disk_usage() {
    local usage
    # Get usage percentage for the root partition
    usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

    if [[ "${usage}" -ge "${DISK_THRESHOLD}" ]]; then
        send_alert "WARNING" "Disk Usage High" \
            "Root partition at ${usage}% (threshold: ${DISK_THRESHOLD}%)"
        return 1
    fi
    return 0
}

# -------------------------------------------------------
# Check 3: SSL certificate expiry
# -------------------------------------------------------
check_cert_expiry() {
    local expiry_date expiry_epoch now_epoch days_remaining

    expiry_date=$(echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null \
        | cut -d= -f2)

    if [[ -z "${expiry_date}" ]]; then
        send_alert "WARNING" "Certificate Check Failed" \
            "Could not retrieve certificate for ${DOMAIN}"
        return 1
    fi

    expiry_epoch=$(date -d "${expiry_date}" +%s 2>/dev/null)
    now_epoch=$(date +%s)
    days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [[ "${days_remaining}" -le "${CERT_WARN_DAYS}" ]]; then
        send_alert "WARNING" "Certificate Expiring Soon" \
            "${DOMAIN} certificate expires in ${days_remaining} days (${expiry_date})"
        return 1
    fi
    return 0
}

# -------------------------------------------------------
# Check 4: Redis connectivity
# -------------------------------------------------------
check_redis() {
    local result
    result=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping 2>/dev/null)

    if [[ "${result}" != "PONG" ]]; then
        send_alert "CRITICAL" "Redis Unreachable" \
            "redis-cli ping to ${REDIS_HOST}:${REDIS_PORT} failed"
        return 1
    fi
    return 0
}

# -------------------------------------------------------
# Check 5: PostgreSQL connectivity
# -------------------------------------------------------
check_postgresql() {
    if ! pg_isready -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DB}" -q 2>/dev/null; then
        send_alert "CRITICAL" "PostgreSQL Unreachable" \
            "pg_isready failed for ${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}"
        return 1
    fi
    return 0
}

# -------------------------------------------------------
# Check 6: Memory usage
# -------------------------------------------------------
check_memory() {
    local total used percent

    # Parse memory from free -m (second line: Mem:)
    read -r total used <<< "$(free -m | awk '/^Mem:/ {print $2, $3}')"

    if [[ -z "${total}" ]] || [[ "${total}" -eq 0 ]]; then
        send_alert "WARNING" "Memory Check Failed" \
            "Could not read memory usage from free -m"
        return 1
    fi

    percent=$(( (used * 100) / total ))

    if [[ "${percent}" -ge "${MEMORY_THRESHOLD}" ]]; then
        send_alert "WARNING" "Memory Usage High" \
            "Memory at ${percent}% (${used}MB / ${total}MB, threshold: ${MEMORY_THRESHOLD}%)"
        return 1
    fi
    return 0
}

# -------------------------------------------------------
# Check 7: BullMQ queue health
# -------------------------------------------------------
check_queue_health() {
    local response http_code body

    # Build auth header if HEALTH_CHECK_TOKEN is set
    local auth_args=()
    if [[ -n "${HEALTH_CHECK_TOKEN:-}" ]]; then
        auth_args=(-H "Authorization: Bearer ${HEALTH_CHECK_TOKEN}")
    fi

    http_code=$(curl -s -o /tmp/queue_health.json -w '%{http_code}' \
        --max-time 10 \
        "${auth_args[@]}" \
        "${QUEUE_HEALTH_ENDPOINT}" 2>/dev/null)

    if [[ "${http_code}" != "200" ]]; then
        send_alert "WARNING" "Queue Health Check Failed" \
            "GET ${QUEUE_HEALTH_ENDPOINT} returned HTTP ${http_code}"
        return 1
    fi

    # Check if queue status is degraded or error
    local queue_status
    queue_status=$(cat /tmp/queue_health.json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")

    if [[ "${queue_status}" == "error" ]]; then
        send_alert "CRITICAL" "Queue Health Error" \
            "BullMQ queue health endpoint reports status: ${queue_status}"
        return 1
    elif [[ "${queue_status}" == "degraded" ]]; then
        send_alert "WARNING" "Queue Health Degraded" \
            "BullMQ queue has failed jobs — check /api/health/queue for details"
        return 1
    fi

    rm -f /tmp/queue_health.json
    return 0
}

# -------------------------------------------------------
# Check 8: PM2 process status
# If a process has stopped (e.g. max_restarts exceeded),
# alert and attempt to restart it.
# -------------------------------------------------------
check_pm2_processes() {
    local any_failed=0

    for proc in requests-app requests-worker; do
        local status
        status=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
procs = json.load(sys.stdin)
for p in procs:
    if p['name'] == '${proc}':
        print(p['pm2_env']['status'])
        break
" 2>/dev/null || echo "unknown")

        if [[ "${status}" != "online" ]]; then
            send_alert "CRITICAL" "PM2 Process Down" \
                "${proc} status is '${status}' — attempting recovery"
            if [[ "${proc}" == "requests-app" ]]; then
                # Full redeploy to avoid stale build chunks
                bash /var/www/requests/deploy/deploy.sh >> "${LOG_FILE}" 2>&1 || true
            else
                pm2 restart "${proc}" --update-env >> "${LOG_FILE}" 2>&1 || true
            fi
            any_failed=1
        fi
    done

    return "${any_failed}"
}

# -------------------------------------------------------
# Main execution
# -------------------------------------------------------
main() {
    local failures=0

    check_app_health    || ((failures++))
    check_disk_usage    || ((failures++))
    check_memory        || ((failures++))
    check_cert_expiry   || ((failures++))
    check_redis         || ((failures++))
    check_postgresql    || ((failures++))
    check_queue_health  || ((failures++))
    check_pm2_processes || ((failures++))

    if [[ "${failures}" -eq 0 ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] All health checks passed" >> "${LOG_FILE}"
    fi

    return "${failures}"
}

main
