#!/bin/bash
# -------------------------------------------------------
# UFW Firewall Setup — Requests v1.0
# CURA Medical Specialists Imaging Request System
#
# Configures firewall rules for production BinaryLane VPS.
# Run as root or with sudo.
#
# Usage:
#   sudo bash deploy/setup-firewall.sh
# -------------------------------------------------------

set -euo pipefail

echo "=== Requests v1.0 — Firewall Setup ==="

# Reset UFW to default state (non-interactive)
echo "[1/7] Resetting UFW to defaults..."
ufw --force reset

# Default policies: deny all incoming, allow all outgoing
echo "[2/7] Setting default policies..."
ufw default deny incoming
ufw default allow outgoing

# Allow HTTPS (port 443) — the only public-facing port
echo "[3/7] Allowing HTTPS (443/tcp)..."
ufw allow 443/tcp comment 'HTTPS'

# Allow SSH (port 22) with rate limiting
# UFW limit: max 6 connections in 30 seconds per IP
echo "[4/7] Allowing SSH (22/tcp) with rate limiting..."
ufw limit 22/tcp comment 'SSH rate-limited'

# Allow PostgreSQL only from localhost
# Prevents external access to the database
echo "[5/7] Allowing PostgreSQL (5432) from localhost only..."
ufw allow from 127.0.0.1 to any port 5432 proto tcp comment 'PostgreSQL localhost'

# Allow Redis only from localhost
# BullMQ worker and Next.js app connect locally
echo "[6/7] Allowing Redis (6379) from localhost only..."
ufw allow from 127.0.0.1 to any port 6379 proto tcp comment 'Redis localhost'

# Enable UFW (non-interactive)
echo "[7/7] Enabling UFW..."
ufw --force enable

# Display final rules
echo ""
echo "=== Active Firewall Rules ==="
ufw status verbose

echo ""
echo "=== Firewall setup complete ==="
