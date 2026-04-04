#!/bin/bash
# -------------------------------------------------------
# Unattended Security Upgrades Setup — Requests v1.0
# CURA Medical Specialists Imaging Request System
#
# INFRA-004: Automatic security patching
#
# Configures:
#   - unattended-upgrades package
#   - Security updates only (not all updates)
#   - Email notifications for applied updates
#   - Automatic reboot disabled (manual reboot preferred)
#
# Usage:
#   sudo bash deploy/setup-unattended-upgrades.sh
# -------------------------------------------------------

set -euo pipefail

# -------------------------------------------------------
# Configuration
# -------------------------------------------------------
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@curaspecialists.com.au}"

echo "=== Requests v1.0 — Unattended Security Upgrades Setup ==="
echo ""

# -------------------------------------------------------
# Step 1: Install unattended-upgrades
# -------------------------------------------------------
echo "[1/3] Installing unattended-upgrades..."
apt-get update -qq
apt-get install -y unattended-upgrades apt-listchanges

# -------------------------------------------------------
# Step 2: Configure unattended-upgrades
# -------------------------------------------------------
echo "[2/3] Configuring unattended-upgrades..."

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'UPGRADES_EOF'
// Requests v1.0 — Unattended security upgrades configuration
// Only enable security updates (ACSC Essential Eight compliance)

Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    // "${distro_id}:${distro_codename}-updates";    // Disabled: only security
    // "${distro_id}:${distro_codename}-proposed";    // Disabled
    // "${distro_id}:${distro_codename}-backports";   // Disabled
};

// List of packages to NOT update automatically
Unattended-Upgrade::Package-Blacklist {
    // "postgresql*";    // Uncomment to exclude PostgreSQL if needed
    // "redis*";         // Uncomment to exclude Redis if needed
};

// Send email notifications
UPGRADES_EOF

# Append the email config (needs variable expansion)
cat >> /etc/apt/apt.conf.d/50unattended-upgrades <<UPGRADES_DYNAMIC_EOF
Unattended-Upgrade::Mail "${ADMIN_EMAIL}";
UPGRADES_DYNAMIC_EOF

cat >> /etc/apt/apt.conf.d/50unattended-upgrades <<'UPGRADES_EOF2'
Unattended-Upgrade::MailReport "on-change";

// Remove unused kernel packages after update
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";

// Remove unused auto-installed dependencies
Unattended-Upgrade::Remove-Unused-Dependencies "true";

// Do NOT automatically reboot (healthcare system — manual reboot preferred)
Unattended-Upgrade::Automatic-Reboot "false";

// Log to syslog
Unattended-Upgrade::SyslogEnable "true";
Unattended-Upgrade::SyslogFacility "daemon";

// Bandwidth limit (KB/s) — avoid saturating connection during business hours
// Unattended-Upgrade::Bandwidth "70";
UPGRADES_EOF2

# -------------------------------------------------------
# Step 3: Enable automatic updates
# -------------------------------------------------------
echo "[3/3] Enabling automatic update checks..."

cat > /etc/apt/apt.conf.d/20auto-upgrades <<'AUTO_EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
AUTO_EOF

# Enable and start the timer
systemctl enable apt-daily.timer
systemctl enable apt-daily-upgrade.timer
systemctl start apt-daily.timer
systemctl start apt-daily-upgrade.timer

echo ""
echo "=== Unattended upgrades setup complete ==="
echo ""
echo "Configuration: /etc/apt/apt.conf.d/50unattended-upgrades"
echo "Schedule:      /etc/apt/apt.conf.d/20auto-upgrades"
echo "Notifications: ${ADMIN_EMAIL}"
echo ""
echo "Test with: sudo unattended-upgrades --dry-run --debug"
echo "Check logs: /var/log/unattended-upgrades/unattended-upgrades.log"
