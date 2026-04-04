# Implementation Plan: Requests v1.0

> CURA Medical Specialists — Imaging Request System
> Post-Pentarchy review. Optimised for parallel execution using Foundry agent teams.
> Each layer launches multiple Foundry teams simultaneously. A layer's teams share
> no code dependencies with each other — only with the completed layer above.

---

## Execution Model

```
LAYER 0  ─────────────────  Foundation (sequential, ~30 min)
              │
         ┌────┼────┬────┬────┐
LAYER 1  │ A  │ B  │ C  │ D  │ G  ──  5 Foundry teams in parallel
         └────┼────┴────┴────┘
              │
         ┌────┼────┐
LAYER 2  │ E  │ F  │  ────────────  2 Foundry teams in parallel
         └────┼────┘                (E wires G's API routes to orchestrator)
              │
LAYER 3  ─────────────────  Integration + Ops (sequential)
              │
LAYER 4  ─────────────────  Testing + Go-Live (sequential)
```

**Foundry pattern per team:** Engineer (plans) → Caster (implements) → Inspector (verifies)

---

## Layer 0: Foundation (Sequential — Must Complete First)

> Establishes the shared contract (schema, types, validation, project structure)
> that all Layer 1 teams build against. No code logic — only definitions.

### 0.1 Project Scaffold
- Initialise Next.js 14+ with TypeScript, App Router
- Configure Tailwind CSS, ESLint, Prettier
- Setup folder structure (see File Structure below)
- Git init with .gitignore
- Create `.env.example` with all variable placeholders
- Install core dependencies:
  - `prisma`, `@prisma/client` (PostgreSQL)
  - `next-auth` (Auth.js v5)
  - `bullmq`, `ioredis` (job queue)
  - `nodemailer` (email)
  - `@react-pdf/renderer` (PDF)
  - `zod` (validation)
  - `bcryptjs`, `otplib`, `qrcode` (auth + MFA)
  - `tailwind-merge`, `clsx` (UI utils)
  - `@radix-ui/react-*` (primitives: dialog, select, popover, toast, dropdown-menu, checkbox, label, separator)
  - `framer-motion` (animation — use sparingly per Section 0.5)

### 0.2 Prisma Schema (All Models)
```prisma
// All models defined, migrated, and seeded before Layer 1 begins.
// This is the contract. Layer 1 teams import types from @prisma/client.

model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  passwordHash      String
  role              String   @default("staff") // admin | staff
  mfaSecret         String?
  mfaEnabled        Boolean  @default(false)
  defaultProviderId String?
  failedAttempts    Int      @default(0)
  lockedAt          DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  sessions          Session[]
  requests          ImagingRequest[]
  auditLogs         AuditLog[]
  defaultProvider   Provider? @relation(fields: [defaultProviderId], references: [id])
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  ipAddress String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model RadiologyPractice {
  id         String   @id @default(cuid())
  name       String
  address    String?
  phone      String?
  fax        String?
  email      String?
  usageCount Int      @default(0)
  lastUsedAt DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  requests   ImagingRequest[]
}

model Provider {
  id              String   @id @default(cuid())
  doctorName      String
  providerNumber  String   @unique
  location        String
  signatureImage  String?  // path to signature file
  createdAt       DateTime @default(now())
  requests        ImagingRequest[]
  defaultUsers    User[]
}

model ImagingRequest {
  id                String   @id @default(cuid())
  practiceId        String?
  rawPhiInput       String   // encrypted via pgcrypto
  parsedPhi         Json?    // encrypted via pgcrypto
  examType          String
  examOther         String?
  clinicalDetails   String
  contrastReaction  String   // "yes" | "no"
  egfr              String?
  providerId        String
  reportByBhatia    Boolean  @default(false)
  patientEmail      String?
  sendToPatient     Boolean  @default(false)
  deliveryMethod    String   // "email" | "fax" | "both"
  status            String   @default("pending") // pending | delivered | partial | failed
  pdfPath           String?
  createdBy         String
  createdAt         DateTime @default(now())
  practice          RadiologyPractice? @relation(fields: [practiceId], references: [id])
  provider          Provider @relation(fields: [providerId], references: [id])
  creator           User     @relation(fields: [createdBy], references: [id])
  deliveryJobs      DeliveryJob[]
}

model DeliveryJob {
  id          String   @id @default(cuid())
  requestId   String
  type        String   // provider_email | provider_fax | filing_email | patient_email
  status      String   @default("queued") // queued | processing | sent | delivered | failed
  attempts    Int      @default(0)
  lastError   String?
  externalId  String?  // Notifyre fax ID
  confirmedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  request     ImagingRequest @relation(fields: [requestId], references: [id])
}

model AuditLog {
  id           String   @id @default(cuid())
  userId       String?
  action       String   // login | logout | login_failed | request_created | practice_updated | api_request | ...
  resourceType String?  // imaging_request | practice | user | api_key
  resourceId   String?
  details      String?
  ipAddress    String?
  apiKeyId     String?  // populated for API-originated actions
  createdAt    DateTime @default(now())
  user         User?    @relation(fields: [userId], references: [id])
  apiKey       ApiKey?  @relation(fields: [apiKeyId], references: [id])
}

model ApiKey {
  id          String    @id @default(cuid())
  name        String                          // e.g. "Synaptum 8 Production"
  keyHash     String    @unique               // SHA-256 hash (never store plaintext)
  keyPrefix   String                          // First 8 chars for identification
  userId      String                          // Acting-as user for audit trail
  scopes      String[]  @default(["requests:write", "requests:read", "practices:read", "providers:read"])
  webhookUrl  String?                         // Push delivery status updates here
  webhookSecret String?                       // HMAC secret for webhook signing
  allowedIps  String[]  @default([])          // Optional IP allowlist
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
  auditLogs   AuditLog[]
}
```

### 0.3 Zod Validation Schemas
```typescript
// lib/validation.ts — shared across all teams
// Define once, import everywhere. No team writes their own validation.

export const imagingRequestSchema = z.object({
  practiceId: z.string().optional(),
  manualPractice: z.object({ name, address, phone, fax, email }).optional(),
  rawPhiInput: z.string().min(1).max(10000),
  examType: z.string().min(1),
  examOther: z.string().optional(),
  clinicalDetails: z.string().min(1),
  contrastReaction: z.enum(["yes", "no"]),
  egfr: z.string().optional(),
  providerId: z.string().min(1),
  reportByBhatia: z.boolean().default(false),
  patientEmail: z.string().email().optional(),
  sendToPatient: z.boolean().default(false),
})

export const practiceSchema = z.object({ ... })
export const userSchema = z.object({ ... })
export const loginSchema = z.object({ ... })
```

### 0.4 Shared Utilities
- `lib/db.ts` — Prisma client singleton
- `lib/audit.ts` — `logAudit(userId, action, resourceType, resourceId, details, ip)` function
- `lib/encryption.ts` — pgcrypto encrypt/decrypt helpers for PHI fields
- `lib/types.ts` — shared TypeScript interfaces beyond Prisma types

### 0.5 Frontend Design System

> All agents building UI pages or components MUST use the `/frontend-design` skill.
> This ensures a cohesive, distinctive, production-grade aesthetic across the app.

#### Design Direction

**Context:** Medical imaging request system used by a small clinical team (3 doctors + admin). Speed and clarity are paramount — staff submit ~30 requests/week under time pressure. The UI must feel professional, trustworthy, and fast, not generic or templated.

**Aesthetic:** Clinical precision meets refined minimalism. Think high-end medical software — not sterile hospital white, not playful SaaS. Intentional, calm, confident.

#### Design Principles

- **Typography:** Choose a distinctive, highly legible display font paired with a refined body font. No generic system fonts (Inter, Roboto, Arial). Medical context demands readability at speed — optimise for scan-ability in forms and tables
- **Color & Theme:** Dark or muted base with sharp, purposeful accent colours. Use colour functionally: status badges (delivery states), priority indicators, role differentiation. CSS variables for full consistency. Avoid purple gradients, generic blue SaaS palettes
- **Motion:** Restrained but intentional. Staggered reveals on page load. Subtle hover states on interactive elements. Toast notifications for async delivery status updates. CSS-first, Motion library (framer-motion) for React where needed. No gratuitous animation — every motion should communicate state change
- **Spatial Composition:** Dense where needed (request history tables, delivery timelines), generous where it aids focus (form layout, login). Consistent spacing scale via Tailwind. Sidebar navigation with clear hierarchy
- **Backgrounds & Details:** Subtle depth — light shadows, fine borders, micro-textures on cards. Status-driven visual weight (failed deliveries should draw the eye immediately). Clean separation between form sections

#### Component Conventions

- Use Radix UI primitives + Tailwind for all interactive components (combobox, select, dialog, toast)
- Install `@radix-ui/react-*` packages as needed per component
- Shared component library in `components/ui/` — button, input, select, badge, card, table, dialog, toast
- All form components support keyboard navigation (Tab, Enter, Escape)
- Loading states: skeleton screens, not spinners (except inline async operations)
- Error states: inline validation messages, not modal alerts
- Responsive: desktop-first (clinic workstations), but functional on tablet

#### What to Avoid

- Generic AI-generated aesthetics (cookie-cutter cards, default shadows, bland colour schemes)
- Overused font families (Inter, Space Grotesk, system-ui)
- Purple-on-white gradient schemes
- Predictable, template-like layouts that lack context-specific character
- Unnecessary visual complexity — every element must earn its place

#### Skill Usage

Agents building UI (Teams A, B, F, and admin pages in Team G) must invoke `/frontend-design` when implementing pages and components. The skill provides real-time design guidance and ensures each page is distinctive yet cohesive with the overall system aesthetic.

### 0.6 Seed Data
- 7 Provider records (Winters x3, Harrison x3, Khalil x1)
- 27 exam types as constant array
- 1 admin user (temp password, MFA setup required on first login)
- Run migration + seed

### 0.7 Deliverable
After Layer 0, the repo contains:
- Working Next.js app with empty pages
- PostgreSQL with all tables created and seeded
- All Prisma types available via `@prisma/client`
- All Zod schemas importable from `lib/validation.ts`
- Shared utilities (db, audit, encryption) importable
- No UI, no business logic — just the contract

---

## Layer 1: Four Parallel Foundry Teams

> All four teams start simultaneously. Each team owns specific files and has
> NO dependency on any other Layer 1 team. They share only Layer 0 outputs.

### Team A: Auth + Security

**Owns:** `lib/auth.ts`, `middleware.ts`, `app/login/`, `app/api/auth/`, `app/api/health/`

**Scope:**
- **UI pages must use `/frontend-design` skill** (see Section 0.5 for design system)
- Auth.js v5 configuration with Credentials provider
- `/login` page (email + password form)
- `/login/mfa` page (TOTP code entry)
- `/login/mfa/setup` page (QR code generation, backup codes)
- MFA mandatory for all users — login flow:
  1. Enter email + password → validate → redirect to MFA
  2. Enter TOTP code → validate → create session
  3. First login: redirect to MFA setup instead
- Password hashing with bcrypt (cost factor 12)
- Account lockout after 5 failed attempts (30 min cooldown)
- Session timeout (15 min inactivity)
- `middleware.ts`:
  - Protect all routes except `/login`, `/api/auth`, `/api/health`, `/api/fax/webhook`
  - Security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy)
  - Rate limiting: 5 login attempts per IP per 15 min, 60 form submissions per hour
  - CSRF validation
  - Optional IP allowlisting
- `/api/health` endpoint (returns status + DB connectivity check)
- Audit log entries: login, logout, login_failed, lockout, mfa_setup

**Inputs from Layer 0:** User model, Session model, AuditLog model, loginSchema

**Does NOT touch:** Form, PDF, delivery, admin pages, dashboard

---

### Team B: PHI Parser + Imaging Request Form

**Owns:** `lib/phi-parser.ts`, `components/forms/`, `app/requests/new/`

**Scope:**
- **UI components and pages must use `/frontend-design` skill** (see Section 0.5 for design system)

#### PHI Parser (`lib/phi-parser.ts`)
- Port Synaptum7 pattern (`C:\apps\synaptum7\api\app\services\phi_parser.py`) to TypeScript
- Regex extraction for:
  - Names (first line if 2+ words, no label markers)
  - DOB (`DOB:`, `Date of Birth:` + multiple date formats: DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY)
  - Medicare numbers (`Medicare:`, `Medicare No:` + pattern `NNNN NNNNN N`)
  - Phone numbers (mobile `04xx`, landline `(0N) NNNN NNNN`)
  - Email addresses
  - Addresses (with state abbreviation + 4-digit postcode)
- Returns `ParsedPhi` interface: `{ names, dobs, phones, medicareNumbers, emails, addresses }`
- Graceful fallback: if no fields parse, return empty parsed + raw preserved

#### Form Components
- `PracticeCombobox.tsx` — searchable dropdown with typeahead
  - Fetches practices sorted by usageCount (recently-used first, top 5 highlighted)
  - On select: auto-populates practice details
  - "Not listed" toggle reveals manual entry fields
- `ExamSelect.tsx` — searchable dropdown (27 exam types + Other)
  - Selecting "Other" reveals free-text field
- `ProviderSelect.tsx` — grouped by doctor name
  - Auto-selects logged-in user's defaultProviderId
- `PhiTextarea.tsx` — patient details textarea
  - Hint text: "Paste patient details (Name, DOB, Phone, Medicare, Address)"
  - Character count indicator

#### Form Page (`app/requests/new/page.tsx`)
- `ImagingRequestForm.tsx` — full form with all sections
- Auto-save: form state to localStorage on every field change
  - Restored on page load if state exists
  - Cleared on successful submission
  - Survives session timeout and browser close
- Duplicate detection: on submit, POST to server which checks same patient name + exam within 24hrs
  - Show confirmation dialog: "A similar request was submitted X hours ago. Submit anyway?"
- Client-side validation (required fields, email format)
- Server-side validation (Zod schema from Layer 0)
- Keyboard navigation: Tab through all fields, Enter submits
- Auto-focus on first field on mount
- Server action: validates → parses PHI → saves ImagingRequest to DB → returns request ID
  - Does NOT trigger delivery (that's Team E's job in Layer 2)

**Inputs from Layer 0:** All Prisma models, imagingRequestSchema, practiceSchema, audit utility

**Does NOT touch:** Auth, PDF generation, delivery pipeline, admin pages

---

### Team C: PDF Generation

**Owns:** `lib/pdf.ts`, `components/pdf/`, `app/api/pdf/`

**Scope:**

#### PDF Template (`components/pdf/ImagingRequestPDF.tsx`)
- `@react-pdf/renderer` component
- A4 portrait, print-optimised margins
- Layout sections:
  - **Header**: CURA Medical Specialists logo, clinic contact details
  - **To block**: Radiology practice name, address, phone, fax, email
  - **Patient block**: Parsed patient details (name, DOB, Medicare, phone, address)
    - Falls back to raw PHI text if parsing incomplete
  - **Request block**: Exam type, clinical details, contrast reaction (Yes/No), eGFR
  - **Referring Doctor**: Doctor name, provider number, location
  - **Signature**: Doctor's signature image loaded from `/public/signatures/{providerId}.png`
  - **Footer**: Date (DD/MM/YYYY), reference number (request ID), "Ask Dr Bhatia to report" flag if set
- Professional medical form aesthetic — clean lines, clear hierarchy, readable at print resolution

#### PDF Generation Library (`lib/pdf.ts`)
- `generatePDF(request: ImagingRequest, practice: RadiologyPractice, provider: Provider): Promise<Buffer>`
- Renders React-PDF component to buffer
- Encrypts buffer with AES-256 and writes to `PDF_STORAGE_PATH/{requestId}.pdf.enc`
- Updates `ImagingRequest.pdfPath`
- Returns unencrypted buffer (for immediate delivery use)

#### API Routes
- `POST /api/pdf/generate` — accepts requestId, generates and stores PDF, returns PDF buffer
- `GET /api/pdf/[id]` — serves decrypted PDF (authenticated access only, audit logged)

**Inputs from Layer 0:** ImagingRequest model, Provider model, RadiologyPractice model, encryption utility

**Does NOT touch:** Auth, form UI, delivery pipeline, admin pages

---

### Team D: Async Delivery Pipeline

**Owns:** `lib/email.ts`, `lib/fax.ts`, `lib/queue.ts`, `worker/delivery-worker.ts`, `app/api/fax/webhook/`

**Scope:**

#### BullMQ Queue Setup (`lib/queue.ts`)
- Queue name: `delivery`
- Job types: `provider_email`, `provider_fax`, `filing_email`, `patient_email`
- Connection to Redis via `REDIS_URL`
- `queueDelivery(requestId, type, payload)` — adds job to queue
- Job data includes: requestId, deliveryJobId, type, recipient, pdfPath

#### Email Service (`lib/email.ts`)
- Nodemailer configured with Google Workspace SMTP
  - Host: `smtp.gmail.com`, Port: 587 (STARTTLS)
  - Auth: App Password from `SMTP_PASSWORD`
- Functions:
  - `sendProviderEmail(to, pdfBuffer, requestData)` — "New imaging booking" with PDF attachment, from clinic@curaspecialists.com.au
  - `sendFilingEmail(pdfBuffer, requestData)` — "Please file this request form" to clinic@curaspecialists.com.au
  - `sendPatientEmail(to, pdfBuffer, requestData)` — "Your request form" to patient
- Each function returns `{ success: boolean, messageId?: string, error?: string }`

#### Fax Service (`lib/fax.ts`)
- Notifyre REST API integration
- `sendFax(faxNumber, pdfBuffer, requestData)` — sends PDF, returns `{ success, faxId, error }`
- `verifyWebhook(payload, signature)` — HMAC-SHA256 verification using `NOTIFYRE_WEBHOOK_SECRET`

#### Webhook Endpoint (`app/api/fax/webhook/route.ts`)
- `POST /api/fax/webhook`
- HMAC signature verification (reject invalid)
- IP allowlisting for Notifyre egress ranges
- Schema validation on payload (Zod)
- Updates DeliveryJob: status → `delivered` or `failed`, sets confirmedAt
- Rate limited

#### Delivery Worker (`worker/delivery-worker.ts`)
- Separate process (PM2 managed)
- Processes jobs from `delivery` queue
- Per job:
  1. Load DeliveryJob record, set status → `processing`
  2. Load PDF buffer from encrypted file
  3. Execute send (email or fax based on job type)
  4. On success: update DeliveryJob status → `sent` (or `delivered` for email)
  5. On failure: increment attempts, set lastError
  6. Update parent ImagingRequest status based on all delivery jobs
- Retry: 3 attempts, exponential backoff (30s, 2min, 10min)
- Dead letter: after 3 failures, status → `failed`, remains for manual retry
- Idempotency: job ID prevents duplicate processing

**Inputs from Layer 0:** DeliveryJob model, ImagingRequest model, encryption utility

**Does NOT touch:** Auth, form UI, PDF template design, admin pages

---

### Team G: REST API Layer (Synaptum 8 Integration)

**Owns:** `lib/api-auth.ts`, `lib/webhook.ts`, `app/api/v1/`, `app/admin/api-keys/`

**Scope:**

#### API Key Authentication (`lib/api-auth.ts`)
- `validateApiKey(request): Promise<{ user, apiKey, scopes }>` — extract Bearer token, SHA-256 hash, lookup, verify not revoked/expired, check IP allowlist
- Middleware wrapper for all `/api/v1/*` routes
- Rate limiting: per-key counters in Redis (120 req/min general, 30 req/min for POST)
- Audit log every API call with `apiKeyId`

#### API Routes (`app/api/v1/`)

| Route | Method | Scope | Description |
|-------|--------|-------|-------------|
| `/api/v1/requests` | POST | `requests:write` | Create imaging request (validates → parses PHI → saves → orchestrates delivery) |
| `/api/v1/requests` | GET | `requests:read` | List requests (paginated, filterable) |
| `/api/v1/requests/[id]` | GET | `requests:read` | Request detail + delivery job statuses |
| `/api/v1/requests/[id]/resend` | POST | `requests:write` | Re-queue failed delivery jobs |
| `/api/v1/requests/[id]/pdf` | GET | `requests:read` | Download generated PDF |
| `/api/v1/practices` | GET | `practices:read` | List/search radiology practices |
| `/api/v1/providers` | GET | `providers:read` | List providers |
| `/api/v1/exam-types` | GET | `providers:read` | List exam types |

- All responses use `{ ok, data }` / `{ ok, error }` envelope
- PHI never returned in responses — metadata and delivery status only
- Zod validation on all request bodies (reuses Layer 0 schemas)
- Duplicate detection on create (409 with `force: true` override)

#### Webhook Dispatcher (`lib/webhook.ts`)
- `dispatchWebhook(apiKey, event, payload)` — HMAC-SHA256 signed POST to `apiKey.webhookUrl`
- Events: `delivery.status_changed`, `request.status_changed`
- Called from delivery worker when job status changes
- Retry: 3 attempts, exponential backoff (5s, 30s, 2min)
- Timeout: 5 second response deadline

#### Admin: API Key Management (`app/admin/api-keys/`)
- **Admin UI pages must use `/frontend-design` skill** (see Section 0.5 for design system)
- `/admin/api-keys` — list keys (name, prefix, scopes, last used, status)
- `/admin/api-keys/new` — create key (select user, scopes, optional expiry, optional webhook URL, optional IP allowlist). Full key displayed once
- `/admin/api-keys/[id]` — view details, revoke key
- Audit log on create/revoke

**Inputs from Layer 0:** All Prisma models (including ApiKey), Zod schemas, audit utility, encryption utility

**Does NOT touch:** Auth flow (Team A), form UI (Team B), PDF template (Team C), delivery worker internals (Team D)

**Note:** The POST `/api/v1/requests` endpoint reuses the same orchestration logic as the form submission (Team E's `orchestrateSubmission`). Team G builds the API route handlers and auth layer; Team E builds the shared orchestration function. They wire together in Layer 2.

---

## Layer 2: Two Parallel Foundry Teams

> Depends on ALL Layer 1 teams being complete. Wires the pieces together.

### Team E: Submission Orchestrator + Request Detail

**Owns:** `lib/delivery.ts`, `app/api/requests/`, `app/requests/[id]/`

**Depends on:** Team B (form + PHI parser), Team C (PDF generation), Team D (delivery queue)

**Scope:**

#### Submission Orchestrator (`lib/delivery.ts`)
- `orchestrateSubmission(requestId: string): Promise<OrchestrationResult>`
- Called after form submission creates the ImagingRequest record:
  ```
  1. Load ImagingRequest with practice + provider
  2. Call lib/pdf.ts → generatePDF() → get PDF buffer
  3. Determine delivery method:
     - Practice has email → queue provider_email job
     - Practice has fax → queue provider_fax job
     - Practice has both → queue both
  4. Always queue filing_email job
  5. If sendToPatient → queue patient_email job
  6. Create DeliveryJob records for each
  7. Add all jobs to BullMQ via lib/queue.ts
  8. Return { requestId, jobIds, deliveryMethod }
  ```

#### Wire Form Submit to Orchestrator
- Update Team B's server action to call `orchestrateSubmission()` after saving
- Return success immediately to UI (async delivery)

#### API Routes
- `POST /api/requests` — create request + orchestrate (alternative to server action)
- `GET /api/requests/[id]` — request detail with delivery jobs
- `POST /api/requests/[id]/resend` — re-queue failed delivery jobs

#### Request Detail Page (`app/requests/[id]/page.tsx`)
- Display: patient info, exam, practice, provider, PDF link
- Delivery timeline:
  - Each DeliveryJob as a row: type, status badge, timestamp, attempts, error
  - Fax: show Notifyre confirmation status
- "Re-send" button for failed jobs
- "View PDF" / "Print" buttons
- Audit logged on view

**Outputs:** Complete submission flow from form → PDF → queued delivery

---

### Team F: Dashboard + Admin Pages

**Owns:** `app/dashboard/`, `app/admin/`, `app/requests/page.tsx` (list), `components/layout/`

**Depends on:** Team A (auth, middleware, user model), Layer 0 (all models)

**Scope:**
- **All UI pages and layout components must use `/frontend-design` skill** (see Section 0.5 for design system)

#### Layout Components
- `Sidebar.tsx` — navigation: Dashboard, New Request, Request History, Admin (if admin role)
- `Header.tsx` — user name, logout button, role indicator

#### Staff Dashboard (`app/dashboard/page.tsx`)
- Quick action: "New Imaging Request" button (links to `/requests/new`)
- Recent submissions (last 10): date, patient name, exam, status badge
- Failed/pending deliveries section (highlighted red/amber)
- Click any row → `/requests/[id]`

#### Request History (`app/requests/page.tsx`)
- Table: Date, Patient Name, Exam, Practice, Provider, Delivery Status
- Filters: date range picker, provider dropdown, status dropdown
- Search by patient name
- Pagination
- Admin sees all requests; staff sees own (filter by `createdBy`)
- Click row → `/requests/[id]`

#### Admin: Practice Management
- `/admin/practices` — list (searchable, sortable by name/usageCount)
- `/admin/practices/new` — add form (name, address, phone, fax, email)
  - Validation: at least email or fax required
- `/admin/practices/[id]/edit` — edit form + delete with confirmation
- Audit log on create/update/delete

#### Admin: User Management
- `/admin/users` — list (name, email, role, MFA status, active)
- `/admin/users/new` — create (generates temp password, displays once)
  - Forces MFA setup on first login
- `/admin/users/[id]/edit` — edit name/role, reset password, toggle active
- Cannot delete self, cannot demote last admin
- Audit log on create/update

**Outputs:** All non-form UI pages, admin CRUD, navigation

---

## Layer 3: Integration + Operations (Sequential)

> One team. Connects everything, adds operational infrastructure.

### 3.1 Integration Testing & Fixes
- End-to-end flow: login → MFA → form → submit → PDF → delivery → status
- Verify all Layer 1/2 components work together
- Fix any interface mismatches between teams
- Verify audit log coverage across all actions

### 3.2 Monitoring & Alerting
- External uptime check: `/api/health` polled every 60s (UptimeRobot/Healthchecks.io)
- SMS/email alert on downtime
- Disk space alert at 80%
- Certificate expiry alert (14 days before)
- Delivery pipeline: alert on failed delivery after all retries exhausted
- BullMQ dashboard or status endpoint for queue health
- Backup job success/failure alerting

### 3.3 Data Retention Automation
- Cron job: export records older than 90 days to encrypted archive (GPG)
- Ship archive to geo-redundant storage (Backblaze B2 or equivalent)
- Purge from active PostgreSQL after confirmed archival
- PDFs: same lifecycle (active 90 days, archive 7 years)
- Audit logs: archive but never purge

### 3.4 Deployment Configuration
- Nginx reverse proxy config (HTTPS termination, HSTS, OCSP stapling)
- PM2 ecosystem config (Next.js app + BullMQ worker, auto-restart)
- UFW firewall rules (443 + SSH only)
- Fail2ban config
- Let's Encrypt / Certbot auto-renewal
- File integrity monitoring (AIDE) setup

### 3.5 Backup & Recovery
- Automated daily `pg_dump` encrypted with GPG
- Shipped to off-box geo-redundant storage
- PDF archive shipped separately
- Encryption key backup stored separately from data backups
- **RTO: 4 hours** | **RPO: 24 hours**

### 3.6 Documentation
- `docs/ndb-response-plan.md` — Notifiable Data Breaches plan
- `docs/deployment-runbook.md` — deploy, rollback, restart, logs, restore, secret rotation
- `docs/manual-fallback.md` — phone + paper fax procedure when system is down

---

## Layer 4: Testing + Go-Live (Sequential)

### 4.1 Testing
- PHI parsing accuracy (various input formats, edge cases)
- Duplicate submission detection
- Auto-save/restore across timeout, tab close, browser crash
- Email delivery (staging SMTP → production SMTP)
- Fax delivery (Notifyre test number)
- Webhook HMAC verification (valid + invalid signatures)
- PDF output review: all 3 doctor signatures, edge case content lengths
- Print testing on clinic printers
- Security: auth bypass, MFA bypass, CSRF, SQL injection, XSS, rate limiting
- Browser: Chrome + Edge (staff browsers)
- API: key auth, scope enforcement, rate limiting, duplicate detection, webhook HMAC, PHI exclusion from responses
- API integration: Synaptum 8 end-to-end flow (create request → poll status → webhook receipt)
- Job queue: failure, retry, dead letter, manual re-send
- Delivery failure alerting
- Backup and restore drill (full restore from backup)

### 4.2 Data Migration
- Import radiology practice list from current Snapforms dropdown
- Seed provider records (already in Layer 0, verify)
- Create staff accounts (force MFA setup on first login)
- Upload doctor signature images

### 4.3 Parallel Run (Minimum 1 Week)
- Run new system alongside Make.com
- Staff submit through both, compare outputs
- Verify all deliveries arrive at imaging providers
- Verify fax confirmations match
- Fix discrepancies before cutover

### 4.4 Go-Live Checklist
- [ ] DNS pointed to VPS (requests.curaspecialists.com.au)
- [ ] HTTPS certificate active + auto-renewal verified
- [ ] PostgreSQL running, encrypted, backed up
- [ ] Redis running, BullMQ worker active
- [ ] Google Workspace SMTP app password configured
- [ ] Notifyre API credentials configured + tested
- [ ] Notifyre webhook verified (HMAC + IP allowlist)
- [ ] All staff accounts created with MFA enabled
- [ ] Practice list imported
- [ ] Doctor signatures uploaded
- [ ] Backup job running + verified
- [ ] Monitoring/alerting configured + tested
- [ ] Off-box log shipping active
- [ ] NDB response plan documented + accessible
- [ ] Deployment runbook documented
- [ ] Manual fallback printed + posted at workstations
- [ ] API key created for Synaptum 8 (scoped, webhook configured)
- [ ] Synaptum 8 integration tested end-to-end (create → deliver → webhook)
- [ ] API rate limits verified
- [ ] Parallel run completed (minimum 1 week)
- [ ] Staff trained
- [ ] Snapforms form deactivated
- [ ] Make.com scenario deactivated (keep 30 days as rollback)

---

## Dependency Graph Summary

```
Layer 0 (Foundation)
  │
  ├── Team A: Auth + Security ──────────────────────────┐
  ├── Team B: PHI Parser + Form ──────────────┐         │
  ├── Team C: PDF Generation ─────────────┐   │         │
  ├── Team D: Delivery Pipeline ──────┐   │   │         │
  └── Team G: REST API Layer ─────┐   │   │   │         │
                                  │   │   │   │         │
                                  ▼   ▼   ▼   ▼         ▼
                                 Team E: Orchestrator  Team F: Dashboard + Admin
                                 (wires form + API      (wires admin + API key mgmt)
                                  to PDF + delivery)
                                      │                  │
                                      ▼                  ▼
                                 Layer 3: Integration + Ops
                                      │
                                      ▼
                                 Layer 4: Testing + Go-Live
```

**Critical path:** Layer 0 → Team B → Team E → Layer 3 → Layer 4
**Bottleneck mitigation:** Team E can begin with mock form payloads (Zod schema defines the interface) while Team B finishes. Team G builds API routes in parallel; Team E wires them to the shared orchestrator in Layer 2.

---

## File Ownership by Team

| File / Directory | Owner Team |
|---|---|
| `prisma/`, `lib/db.ts`, `lib/validation.ts`, `lib/audit.ts`, `lib/encryption.ts`, `lib/types.ts` | Layer 0 |
| `lib/auth.ts`, `middleware.ts`, `app/login/`, `app/api/auth/`, `app/api/health/` | Team A |
| `lib/phi-parser.ts`, `components/forms/`, `app/requests/new/` | Team B |
| `lib/pdf.ts`, `components/pdf/`, `app/api/pdf/` | Team C |
| `lib/email.ts`, `lib/fax.ts`, `lib/queue.ts`, `worker/`, `app/api/fax/webhook/` | Team D |
| `lib/delivery.ts`, `app/api/requests/`, `app/requests/[id]/` | Team E |
| `app/dashboard/`, `app/admin/`, `app/requests/page.tsx`, `components/layout/` | Team F |
| `lib/api-auth.ts`, `lib/webhook.ts`, `app/api/v1/`, `app/admin/api-keys/` | Team G |
| Nginx, PM2, monitoring, backup, docs | Layer 3 |

---

## Environment Variables

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/requests"

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://requests.curaspecialists.com.au"

# MFA
MFA_ISSUER="Requests"

# Email (Google Workspace)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=clinic@curaspecialists.com.au
SMTP_PASSWORD="..."
SMTP_FROM=clinic@curaspecialists.com.au

# Fax (Notifyre)
NOTIFYRE_API_KEY="..."
NOTIFYRE_WEBHOOK_SECRET="..."
NOTIFYRE_SENDER_ID="..."

# Redis (BullMQ)
REDIS_URL="redis://localhost:6379"

# PDF
PDF_STORAGE_PATH="./data/pdfs"
PDF_ENCRYPTION_KEY="..."

# Field Encryption (pgcrypto)
FIELD_ENCRYPTION_KEY="..."

# Security
ALLOWED_IPS=""
RATE_LIMIT_LOGIN=5
RATE_LIMIT_SUBMIT=60
SESSION_TIMEOUT_MINUTES=15
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Monitoring
HEALTH_CHECK_TOKEN="..."

# Data Retention
ACTIVE_RETENTION_DAYS=90
ARCHIVE_RETENTION_YEARS=7

# App
NEXT_PUBLIC_APP_URL=https://requests.curaspecialists.com.au
NODE_ENV=production
```
