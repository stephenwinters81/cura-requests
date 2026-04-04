# Deployment Runbook

**CURA Medical Specialists -- Requests v1.0**

| | |
|---|---|
| **Last Updated** | 2026-04-03 |
| **System** | requests.curaspecialists.com.au |
| **Host** | BinaryLane VPS, Sydney |

---

## 1. Prerequisites

### Server Specifications

| Component | Requirement |
|---|---|
| Provider | BinaryLane (Sydney region) |
| OS | Ubuntu 22.04 LTS |
| CPU | 2+ vCPUs |
| RAM | 4 GB minimum |
| Disk | 40 GB SSD minimum (encrypted) |
| Node.js | 18+ (LTS) |
| PostgreSQL | 15+ |
| Redis | 7+ |
| Nginx | Latest stable |
| PM2 | Latest (`npm install -g pm2`) |
| Certbot | Latest (for Let's Encrypt SSL) |

### Network Requirements

- Domain `requests.curaspecialists.com.au` pointed to VPS IP
- Ports open: 443 (HTTPS), 22 (SSH -- key-only)
- All other ports blocked via UFW
- SSH key-only authentication (password auth disabled)
- Fail2ban active

---

## 2. Initial Setup

### 2.1 System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx postgresql postgresql-contrib redis-server ufw fail2ban aide git curl

# Install Node.js 18 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 2.2 Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2.3 PostgreSQL

```bash
sudo -u postgres createuser --pwprompt requests_user
sudo -u postgres createdb -O requests_user requests_db

# Enable pgcrypto
sudo -u postgres psql -d requests_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

### 2.4 Redis

```bash
# Verify Redis is running
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping  # Should return PONG
```

### 2.5 Application

```bash
# Clone the repository
cd /opt
sudo git clone [REPO_URL] requests
sudo chown -R $USER:$USER /opt/requests
cd /opt/requests

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Fill in all values -- see Section 8 for secret generation

# Run database migrations
npx prisma migrate deploy

# Seed the database (providers, exam types, admin user)
npx prisma db seed

# Build the application
npm run build
```

### 2.6 PM2 Configuration

Create `/opt/requests/ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'requests-web',
      script: 'npm',
      args: 'start',
      cwd: '/opt/requests',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'requests-worker',
      script: 'npm',
      args: 'run worker',
      cwd: '/opt/requests',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

```bash
# Start all processes
cd /opt/requests
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the output instructions to enable on boot
```

### 2.7 Nginx Configuration

Create `/etc/nginx/sites-available/requests`:

```nginx
server {
    listen 443 ssl http2;
    server_name requests.curaspecialists.com.au;

    ssl_certificate /etc/letsencrypt/live/requests.curaspecialists.com.au/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/requests.curaspecialists.com.au/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name requests.curaspecialists.com.au;
    return 301 https://$server_name$request_uri;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/requests /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2.8 SSL Certificate

```bash
sudo certbot --nginx -d requests.curaspecialists.com.au

# Verify auto-renewal
sudo certbot renew --dry-run
```

---

## 3. Standard Deploy Procedure

Use this for routine code updates.

```bash
cd /opt/requests

# 1. Pull latest code
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Run security audit
bash deploy/security-check.sh

# 4. Run any new database migrations
npx prisma migrate deploy

# 5. Build the application
npm run build

# 6. Restart all processes
pm2 restart all

# 7. Verify
pm2 status
curl -s -o /dev/null -w "%{http_code}" https://requests.curaspecialists.com.au
# Should return 200
```

### Pre-Deploy Checklist

- [ ] Database backed up (see Section 7.1)
- [ ] Current git SHA noted for rollback: `git rev-parse HEAD`
- [ ] Deployment scheduled during low-usage period if possible
- [ ] Staff notified if downtime expected

---

## 4. Rollback Procedure

If a deployment causes issues:

```bash
cd /opt/requests

# 1. Revert to the previous commit (replace SHA with the noted commit)
git revert HEAD --no-edit
# OR check out the specific known-good commit:
# git checkout <PREVIOUS_SHA> -- .

# 2. Install dependencies for that version
npm install

# 3. Rebuild
npm run build

# 4. Restart
pm2 restart all

# 5. Verify
pm2 status
curl -s -o /dev/null -w "%{http_code}" https://requests.curaspecialists.com.au
```

**If a database migration needs to be rolled back**, restore from the pre-deploy backup (see Section 7.2). Database migrations cannot be safely reversed automatically.

---

## 5. PM2 Management

```bash
# View status of all processes
pm2 status

# Restart all
pm2 restart all

# Restart specific process
pm2 restart requests-web
pm2 restart requests-worker

# Stop all
pm2 stop all

# Stop specific process
pm2 stop requests-web

# View logs (all)
pm2 logs

# View logs for specific process
pm2 logs requests-web
pm2 logs requests-worker

# View logs with timestamps
pm2 logs --timestamp

# Monitor CPU/memory in real time
pm2 monit

# Flush all log files
pm2 flush

# Reload with zero downtime (web only)
pm2 reload requests-web
```

---

## 6. Nginx Management

```bash
# Test configuration (always do this before reload)
sudo nginx -t

# Reload configuration (no downtime)
sudo systemctl reload nginx

# Restart Nginx (brief downtime)
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log

# Check status
sudo systemctl status nginx
```

### SSL Certificate Renewal

Certbot auto-renews via systemd timer. To check or manually renew:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 7. Database Operations

### 7.1 Backup

```bash
# Manual backup (encrypted with GPG)
pg_dump -U requests_user -h localhost requests_db | gpg --symmetric --cipher-algo AES256 -o /opt/backups/requests_db_$(date +%Y%m%d_%H%M%S).sql.gpg

# Verify backup was created
ls -lah /opt/backups/
```

**Automated daily backup** should be configured via cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM AEST
0 2 * * * pg_dump -U requests_user -h localhost requests_db | gpg --symmetric --batch --passphrase-file /opt/requests/.backup-passphrase --cipher-algo AES256 -o /opt/backups/requests_db_$(date +\%Y\%m\%d).sql.gpg 2>> /var/log/requests-backup.log
```

### 7.2 Restore from Backup

```bash
# Stop the application first
pm2 stop all

# Decrypt the backup
gpg --decrypt /opt/backups/requests_db_YYYYMMDD.sql.gpg > /tmp/restore.sql

# Drop and recreate the database
sudo -u postgres psql -c "DROP DATABASE requests_db;"
sudo -u postgres psql -c "CREATE DATABASE requests_db OWNER requests_user;"
sudo -u postgres psql -d requests_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Restore
psql -U requests_user -h localhost requests_db < /tmp/restore.sql

# Clean up the unencrypted file
shred -u /tmp/restore.sql

# Restart the application
pm2 restart all

# Verify
pm2 status
```

### 7.3 Run Migrations

```bash
cd /opt/requests

# Deploy pending migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

---

## 8. Redis Management

```bash
# Check Redis is running
redis-cli ping  # Returns PONG

# Monitor commands in real time (Ctrl+C to exit)
redis-cli monitor

# View queue info (BullMQ stores jobs in Redis)
redis-cli keys "bull:*" | head -20

# Flush all Redis data (CAUTION: clears all queued jobs)
redis-cli flushall

# Check memory usage
redis-cli info memory

# Restart Redis
sudo systemctl restart redis-server
```

---

## 9. Secret Rotation

### General Process

1. Generate the new secret value.
2. Update `/opt/requests/.env` with the new value.
3. Restart the relevant process(es).
4. Verify the system is working.
5. Document the rotation in the change log.

### FIELD_ENCRYPTION_KEY

**CRITICAL: Rotating the field encryption key requires re-encrypting all PHI in the database.** Do not rotate this key without a tested re-encryption migration.

```bash
# 1. Generate new key
openssl rand -hex 32

# 2. Create and test a database migration that re-encrypts all PHI fields
#    using the old key to decrypt and the new key to encrypt.
#    TEST THIS ON A COPY OF THE DATABASE FIRST.

# 3. Back up the database
# 4. Run the re-encryption migration
# 5. Update .env with the new key
# 6. Restart all processes
pm2 restart all
```

### PDF_ENCRYPTION_KEY

Similar to FIELD_ENCRYPTION_KEY -- existing encrypted PDFs on disk must be re-encrypted with the new key, or a key mapping maintained.

### NEXTAUTH_SECRET

```bash
# 1. Generate new secret
openssl rand -base64 32

# 2. Update .env
nano /opt/requests/.env

# 3. Restart (all active sessions will be invalidated)
pm2 restart requests-web
```

**Note:** All users will be logged out and must re-authenticate.

### API Keys (Synaptum 8 Integration)

API keys are rotated via the admin interface:

1. Log into the admin panel.
2. Navigate to API Key management.
3. Create a new API key for the integration.
4. Update the API key in Synaptum 8's configuration.
5. Verify Synaptum 8 can connect with the new key.
6. Revoke the old API key.

### SMTP_PASSWORD (Google Workspace)

```bash
# 1. Rotate the password/app password in Google Admin Console
# 2. Update .env
nano /opt/requests/.env

# 3. Restart the worker (handles email sending)
pm2 restart requests-worker

# 4. Test by sending a test request through the system
```

### NOTIFYRE_API_KEY

```bash
# 1. Generate a new API key in the Notifyre dashboard
# 2. Update .env
nano /opt/requests/.env

# 3. Restart the worker (handles fax sending)
pm2 restart requests-worker

# 4. Revoke the old key in Notifyre dashboard
```

### NOTIFYRE_WEBHOOK_SECRET

```bash
# 1. Generate new secret in Notifyre dashboard
# 2. Update .env with new NOTIFYRE_WEBHOOK_SECRET
# 3. Restart web process (receives webhook callbacks)
pm2 restart requests-web
```

---

## 10. Log Locations

| Log | Location | Command |
|---|---|---|
| Next.js app | PM2 managed | `pm2 logs requests-web` |
| BullMQ worker | PM2 managed | `pm2 logs requests-worker` |
| PM2 log files | `~/.pm2/logs/` | `ls ~/.pm2/logs/` |
| Nginx access | `/var/log/nginx/access.log` | `sudo tail -f /var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` | `sudo tail -f /var/log/nginx/error.log` |
| PostgreSQL | `/var/log/postgresql/` | `sudo tail -f /var/log/postgresql/postgresql-15-main.log` |
| Redis | `/var/log/redis/redis-server.log` | `sudo tail -f /var/log/redis/redis-server.log` |
| Backup job | `/var/log/requests-backup.log` | `cat /var/log/requests-backup.log` |
| Fail2ban | `/var/log/fail2ban.log` | `sudo tail -f /var/log/fail2ban.log` |
| System auth | `/var/log/auth.log` | `sudo tail -f /var/log/auth.log` |
| AIDE (integrity) | `/var/log/aide/aide.log` | `sudo cat /var/log/aide/aide.log` |

**Off-box log shipping** should be configured to send all logs to a remote syslog or log aggregation service for tamper-resistant storage.

---

## 11. Troubleshooting

### Application returns 502 Bad Gateway

```bash
# Check if the app is running
pm2 status
# If stopped, restart
pm2 restart requests-web
# Check logs for errors
pm2 logs requests-web --lines 50
```

### Application starts but immediately crashes

```bash
# Check logs for the error
pm2 logs requests-web --lines 100

# Common causes:
# - Missing environment variable: check .env against .env.example
# - Database not reachable: verify PostgreSQL is running
sudo systemctl status postgresql
# - Port 3000 already in use
lsof -i :3000
```

### Delivery jobs not processing (email/fax stuck)

```bash
# Check worker status
pm2 status requests-worker
pm2 logs requests-worker --lines 50

# Check Redis connectivity
redis-cli ping

# Check for failed jobs in Redis
redis-cli keys "bull:delivery:failed*"

# Restart the worker
pm2 restart requests-worker
```

### Database connection refused

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql

# Verify connection
psql -U requests_user -h localhost requests_db -c "SELECT 1;"
```

### SSL certificate expired

```bash
# Check certificate expiry
sudo certbot certificates

# Renew
sudo certbot renew
sudo systemctl reload nginx
```

### Fax delivery failing (Notifyre)

```bash
# Check worker logs for Notifyre API errors
pm2 logs requests-worker --lines 100 | grep -i notifyre

# Common causes:
# - API key expired or invalid: check Notifyre dashboard
# - Insufficient credit: top up Notifyre account
# - Invalid fax number format: check the radiology practice record
```

### High memory usage

```bash
# Check process memory
pm2 monit

# If a process is consuming too much memory, PM2 will auto-restart
# at the max_memory_restart threshold (see ecosystem.config.js)

# Check system memory
free -h
```

### Redis out of memory

```bash
# Check Redis memory
redis-cli info memory

# If needed, clear completed/failed jobs
redis-cli keys "bull:delivery:completed*" | xargs redis-cli del
redis-cli keys "bull:delivery:failed*" | xargs redis-cli del
```

---

## 12. Emergency Contacts

| Role | Name | Contact |
|---|---|---|
| **Practice Manager** | [NAME] | [PHONE] |
| **IT Support** | [NAME] | [PHONE] / [EMAIL] |
| **BinaryLane Support** | | https://support.binarylane.com.au |
| **Notifyre Support** | | support@notifyre.com.au |
| **Domain Registrar** | [PROVIDER] | [PHONE] |

---

*If the system is completely down and cannot be recovered quickly, switch to the manual fallback procedure: `docs/manual-fallback.md`*
