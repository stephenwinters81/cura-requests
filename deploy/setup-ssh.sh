#!/bin/bash
# -------------------------------------------------------
# SSH Hardening Script — Requests v1.0
# CURA Medical Specialists Imaging Request System
#
# INFRA-002: SSH key-only access, disable root login
#
# Configures:
#   - PasswordAuthentication no
#   - PermitRootLogin no
#   - MaxAuthTries 3
#   - Backs up existing sshd_config before changes
#
# WARNING: Ensure you have SSH key-based access configured
#          BEFORE running this script, or you will be locked out.
#
# Usage:
#   sudo bash deploy/setup-ssh.sh
# -------------------------------------------------------

set -euo pipefail

SSHD_CONFIG="/etc/ssh/sshd_config"
BACKUP_FILE="${SSHD_CONFIG}.bak.$(date '+%Y%m%d_%H%M%S')"

echo "=== Requests v1.0 — SSH Hardening ==="
echo ""
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo "!! WARNING: This script disables password authentication."
echo "!! Ensure you have SSH key access configured and tested  "
echo "!! in a SEPARATE terminal session BEFORE proceeding.     "
echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
echo ""
read -p "Have you confirmed SSH key access works? (yes/no): " confirm

if [[ "${confirm}" != "yes" ]]; then
    echo "Aborted. Set up SSH key access first:"
    echo "  1. Generate key: ssh-keygen -t ed25519"
    echo "  2. Copy to server: ssh-copy-id user@server"
    echo "  3. Test in new terminal: ssh user@server"
    echo "  4. Re-run this script"
    exit 1
fi

# -------------------------------------------------------
# Step 1: Backup current sshd_config
# -------------------------------------------------------
echo "[1/4] Backing up ${SSHD_CONFIG} to ${BACKUP_FILE}..."
cp "${SSHD_CONFIG}" "${BACKUP_FILE}"
echo "Backup created: ${BACKUP_FILE}"

# -------------------------------------------------------
# Step 2: Apply hardening settings
# -------------------------------------------------------
echo "[2/4] Applying SSH hardening settings..."

# Helper: set or add a config directive
set_sshd_option() {
    local key="$1"
    local value="$2"

    if grep -qE "^\s*#?\s*${key}\b" "${SSHD_CONFIG}"; then
        # Replace existing line (commented or not)
        sed -i "s/^\s*#*\s*${key}\b.*/${key} ${value}/" "${SSHD_CONFIG}"
    else
        # Append if not present
        echo "${key} ${value}" >> "${SSHD_CONFIG}"
    fi
    echo "  Set: ${key} ${value}"
}

set_sshd_option "PasswordAuthentication" "no"
set_sshd_option "PermitRootLogin" "no"
set_sshd_option "MaxAuthTries" "3"
set_sshd_option "PubkeyAuthentication" "yes"
set_sshd_option "ChallengeResponseAuthentication" "no"
set_sshd_option "UsePAM" "yes"

# -------------------------------------------------------
# Step 3: Validate configuration
# -------------------------------------------------------
echo "[3/4] Validating sshd configuration..."
if sshd -t 2>/dev/null; then
    echo "Configuration is valid."
else
    echo "ERROR: sshd configuration is invalid. Restoring backup..."
    cp "${BACKUP_FILE}" "${SSHD_CONFIG}"
    echo "Backup restored. Please check your configuration manually."
    exit 1
fi

# -------------------------------------------------------
# Step 4: Restart sshd
# -------------------------------------------------------
echo "[4/4] Restarting sshd..."
systemctl restart sshd

echo ""
echo "=== SSH hardening complete ==="
echo ""
echo "Settings applied:"
echo "  - PasswordAuthentication no"
echo "  - PermitRootLogin no"
echo "  - MaxAuthTries 3"
echo "  - PubkeyAuthentication yes"
echo ""
echo "Backup saved to: ${BACKUP_FILE}"
echo ""
echo "IMPORTANT: Keep your current terminal open and test SSH"
echo "           access in a NEW terminal before closing this session."
