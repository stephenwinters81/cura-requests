#!/bin/bash
# -------------------------------------------------------
# Let's Encrypt SSL Setup — Requests v1.0
# CURA Medical Specialists Imaging Request System
#
# Obtains and configures TLS certificate via Certbot
# with Nginx plugin. Sets up automatic renewal.
#
# Prerequisites:
#   - Nginx installed and running
#   - DNS A record for requests.curaspecialists.com.au pointing to this server
#   - Port 80 open (temporarily, for ACME challenge)
#
# Usage:
#   sudo bash deploy/setup-ssl.sh
# -------------------------------------------------------

set -euo pipefail

DOMAIN="requests.curaspecialists.com.au"
# CUSTOMIZE: admin email for certificate expiry notifications
EMAIL="admin@curaspecialists.com.au"

echo "=== Requests v1.0 — SSL Certificate Setup ==="

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "[1/4] Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
else
    echo "[1/4] Certbot already installed."
fi

# Obtain certificate using Nginx plugin
echo "[2/4] Obtaining certificate for ${DOMAIN}..."
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --domain "${DOMAIN}" \
    --redirect

# Set up post-renewal hook to reload Nginx
echo "[3/4] Configuring post-renewal hook..."
mkdir -p /etc/letsencrypt/renewal-hooks/post
cat > /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh << 'HOOK'
#!/bin/bash
# Reload Nginx after certificate renewal to pick up new certs
systemctl reload nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

# Verify the systemd timer for auto-renewal is active
echo "[4/4] Verifying auto-renewal timer..."
if systemctl is-active --quiet certbot.timer; then
    echo "Certbot renewal timer is active."
else
    echo "Enabling certbot renewal timer..."
    systemctl enable --now certbot.timer
fi

# Test renewal (dry run)
echo ""
echo "Running renewal dry run..."
certbot renew --dry-run

echo ""
echo "=== SSL setup complete ==="
echo "Certificate: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
echo "Private key: /etc/letsencrypt/live/${DOMAIN}/privkey.pem"
echo "Auto-renewal: enabled via certbot.timer"
