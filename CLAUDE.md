# Requests v1.0

## Project Overview

**Requests** is a self-hosted web application replacing Snapforms + Make.com for CURA Medical Specialists' imaging request workflow. Handles form submission, PHI parsing, PDF generation, async email delivery to radiology practices, and filing.

Each user account represents a doctor. Doctors manage their own provider numbers and can only create requests under their own provider numbers. Requests are scoped per-user — doctors only see their own.

Includes a REST API (`/api/v1/`) for Synaptum 8 to create and manage requests programmatically.

See `PRD.md` for full product requirements. See `IMPLEMENTATION.md` for phased build plan. See `API-SPEC.md` for API endpoint documentation.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Turbopack)
- **Database:** PostgreSQL + pgcrypto (field-level encryption)
- **ORM:** Prisma
- **Auth:** Auth.js v5 (beta.30) + TOTP MFA
- **Job Queue:** BullMQ + Redis (async delivery)
- **PDF:** @react-pdf/renderer
- **Signature:** react-signature-canvas (draw-to-sign on mobile/desktop)
- **Email:** Nodemailer + Google Workspace SMTP
- **Fax:** Notifyre API (Australian, ISO 27001, healthcare-compliant) — fallback only
- **Hosting:** BinaryLane VPS, Sydney (PM2 managed)
- **CSS:** Tailwind CSS
- **Validation:** Zod

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run worker       # Start BullMQ delivery worker
npx prisma db push   # Push schema changes (no shadow DB needed)
npx prisma studio    # Database GUI
npx prisma db seed   # Seed providers, exam types, admin + doctor users
pm2 restart requests-app --update-env   # Restart app (picks up new env vars)
pm2 restart requests-worker --update-env # Restart worker
git push             # Push to GitHub (token in remote URL)
```

## Git & Deployment

- **Repo:** github.com/stephenwinters81/cura-requests (private)
- **Branch:** main
- **Host:** BinaryLane VPS (requests-cura via Tailscale)
- **Process manager:** PM2 (requests-app + requests-worker)
- **Deploy workflow:** edit → `npm run build` → `pm2 restart requests-app requests-worker --update-env`
- **Git user:** Stephen Winters (stephen.winters@gmail.com / stephenwinters81)

## Architecture Notes

### User Model (User = Doctor)
- Each user is a doctor with one or more provider numbers (many-to-many: User <-> Provider)
- Provider numbers carry clinic details (name, address, phone, fax, email) that appear on PDFs
- Users manage their own providers via Settings > Provider Numbers
- `defaultProviderId` pre-selects the provider in the form
- Signatures are per-user (not per-provider) — stored in `data/signatures/`, served via authenticated `/api/signature` route

### Request Flow
1. Doctor selects a radiology practice (or enters manually — creates a new practice record)
2. Optionally selects a preferred reporting radiologist (filtered by practice)
3. Fills patient details (PHI textarea), exam type, clinical details
4. On submit: PHI parsed, all sensitive fields encrypted, request created, delivery orchestrated

### Delivery Pipeline
- **Email first, fax fallback** — email is the primary delivery method. Fax only triggers if email fails after 6 retries (~68 min window).
- PDF emailed to: (1) radiology practice, (2) provider's clinic for filing, (3) patient (if opted in)
- BullMQ worker (separate PM2 process) handles actual sending with retry + backoff (30s, 2m, 5m, 10m, 20m, 30m)
- Fax via Notifyre API; confirmation via webhook (HMAC verified)
- SMTP timeouts: 30s connection, 15s greeting, 30s socket. Notifyre fetch timeouts: 15s upload/send, 5s poll.
- `DeliveryJob.recipient` stores the email/fax address for reliable retry without re-derivation

### System Health Monitoring
- **Admin health page** at `/admin/system` — real-time status of DB, Redis, SMTP, Notifyre, worker liveness, queue depth, and failed job history
- **Worker heartbeat** — writes to Redis every 30s (`requests:worker:heartbeat`, TTL 120s). Health page shows stale if >2min old.
- **Periodic health checks** — worker runs dependency probes every 5 minutes (DB, Redis, SMTP, Notifyre)
- **Alert notifications** — email to `ALERT_EMAIL`, SMS fallback via Notifyre to `ALERT_PHONE` if SMTP is down
- **Throttling** — dependency-down alerts throttled to 1 per dependency per 15 minutes. Delivery failure alerts are unthrottled (fire only on permanent failure).
- **Bulk retry** — "Retry All Failed" button on `/admin/system` resets and re-queues all failed DeliveryJobs

### User Onboarding
- Admin creates user at `/admin/users/new` — welcome email with temp password sent automatically
- 4-step setup wizard at `/setup`: change password, set up MFA, add provider number, upload signature
- `onboardedAt` set on completion; middleware enforces `/setup` redirect until onboarded

### PDF Generation
- Header shows the provider's clinic name, address, contact details (not hardcoded)
- Preferred radiologist shown in a red-bordered box in the "To" section
- Doctor's drawn/uploaded signature appears in the Referring Doctor section
- PDFs encrypted on disk (AES-256-CBC)

### Radiologist Preferences
- Radiologists are linked to practices (many-to-many) via Admin > Radiologists
- When a doctor selects a practice that has linked radiologists, a dropdown appears
- Selected radiologist name appears on the PDF and is stored on the request

### API
- REST API (`/api/v1/`) for Synaptum 8 integration — API key auth, scoped, rate limited
- API keys hashed (SHA-256), scoped per integration, with optional IP allowlist and expiry
- Webhook push on delivery status changes (HMAC-SHA256 signed)
- PHI accepted via API but never returned in responses — metadata and delivery status only
- Provider validation: API rejects requests using providers not belonging to the authenticated user

## Security

### Encryption
- All PHI encrypted at field level via pgcrypto: `rawPhiInput`, `parsedPhi`, `clinicalDetails`, `patientEmail`
- MFA secrets encrypted at rest
- PDFs encrypted on disk (AES-256-CBC)
- `FIELD_ENCRYPTION_KEY` required — app throws on startup if missing (no fallback)

### Authentication & Authorization
- Auth.js v5 with JWT strategy (15-minute sessions)
- MFA (TOTP) support — lockout counter increments on both password AND MFA failures
- `mfaVerified` can only be set via the `authorize()` flow, never via client session update
- Staff users see only their own requests; admins see all
- Provider ownership validated on both web form and API submissions

### File Security
- Signature uploads validated by magic bytes (PNG/JPEG/WebP headers), not just MIME type
- Signatures stored outside `public/` in `data/signatures/`, served via authenticated API route
- Fax filenames are generic (`imaging-request.pdf`) — no PHI in metadata

### Headers & Rate Limiting
- CSP: `unsafe-eval` only in development, removed in production
- HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, strict Referrer-Policy
- Login rate limiting: in-memory (best-effort) + DB-level account lockout (primary defense)
- API rate limiting: Redis-backed sliding window (120 req/min general, 30 req/min creates)

### Audit Trail
- All actions logged with userId, action type, resource type/ID, IP address
- Delivery events logged as `delivery_completed` / `delivery_failed`
- No PHI in audit logs — only record IDs
- API requests logged with `apiKeyId` for traceability

## Data Context

- 3 referring doctors: Winters, Harrison, Khalil
- 7 provider number/location combinations
- 27 exam types + "Other"
- ~30 requests per week
- 103 radiology practices (verified against official websites)
- 23 preferred neuroradiologists linked to practices
- Practice groups: Lumus (16), I-MED (17), PRP (13), Castlereagh (8), Hunter (5), QScan/Quantum (4), Synergy (3), Spectrum (2), Hospitals (10), Other (25)

## PHI Handling (Synaptum7 Pattern)

Patient details entered as single textarea dump. Server-side `phi-parser.ts` extracts:
- Names (first line, 2+ words)
- DOB (multiple date format patterns)
- Medicare numbers
- Phone numbers (mobile + landline patterns)
- Email addresses
- Addresses (with state + postcode)

All of `rawPhiInput`, `parsedPhi`, `clinicalDetails`, and `patientEmail` stored encrypted. Graceful fallback if parsing fails.

## Key File Locations

- **Schema:** `prisma/schema.prisma`
- **Auth:** `src/lib/auth.ts`
- **Middleware:** `src/middleware.ts`
- **Encryption:** `src/lib/encryption.ts`
- **PDF template:** `src/components/pdf/ImagingRequestPDF.tsx`
- **PDF generation:** `src/lib/pdf.ts`
- **Delivery orchestration:** `src/lib/delivery.ts`
- **Worker:** `worker/delivery-worker.ts`
- **Validation schemas:** `src/lib/validation.ts`
- **API auth:** `src/lib/api-auth.ts`
- **Audit logging:** `src/lib/audit.ts`
- **Alert notifications:** `src/lib/alerts.ts`
- **Health probes:** `src/lib/health.ts`
- **Health monitor (worker):** `worker/health-monitor.ts`
- **System health page:** `src/app/(app)/admin/system/page.tsx`
- **Signature upload:** `src/app/(app)/settings/signature/`
- **Provider management:** `src/app/(app)/settings/providers/`
- **Radiologist management:** `src/app/(app)/admin/radiologists/`

## Conventions

- TypeScript throughout
- Server actions for form submissions
- Validate all inputs server-side with Zod
- All deliveries async via BullMQ (never in HTTP request cycle)
- Log all delivery attempts with status (DeliveryJob table)
- Encrypt all PHI fields — `clinicalDetails` and `patientEmail` included (not just rawPhiInput/parsedPhi)
- Signatures stored in `data/signatures/` (not `public/`) — served via auth'd API
- Keep patient data minimal — purge from active after 90 days, archive 7 years
- Audit log all access with record IDs (no PHI in logs)
- Two-tier logging: audit (DB) + application (file)
- API requests audit-logged with apiKeyId for traceability
- Practice data verified against official websites before import
