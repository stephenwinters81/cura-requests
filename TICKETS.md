# Requests v1.0 — Ticket Database

> Comprehensive audit checklist extracted from PRD.md, IMPLEMENTATION.md, FEATURES.md, and API-SPEC.md.
> Each ticket is a single, atomic requirement that can be verified against the codebase.
> Use this to audit implementation completeness.

**Total tickets: 530+**

---

## How to Use

1. During/after implementation, audit each ticket against the codebase
2. Check the box when verified as implemented and working
3. Tickets are grouped by source document, then by category
4. Cross-reference: many PRD tickets map to IMPL tickets — both must pass

---

# Part 1: PRD Requirements

> Source: PRD.md — What the system must do

## FORM — Imaging Request Form

- [ ] **[FORM-001]** Searchable radiology practice dropdown that auto-populates practice details | Source: Core Features S1
- [ ] **[FORM-002]** Manual entry fallback if practice not in list | Source: Core Features S1
- [ ] **[FORM-003]** Exam type dropdown with 27 options plus "Other" | Source: Core Features S1
- [ ] **[FORM-004]** Provider selection (doctor + location) field | Source: Core Features S1
- [ ] **[FORM-005]** Provider auto-selected based on logged-in user | Source: Core Features S1
- [ ] **[FORM-006]** Keyboard navigation optimised for speed | Source: Core Features S1
- [ ] **[FORM-007]** Smart defaults and autofill where possible | Source: Core Features S1
- [ ] **[FORM-008]** Recently-used practices shortlist for fast selection | Source: Core Features S1
- [ ] **[FORM-009]** Auto-save form state to localStorage (survives timeout/tab close) | Source: Core Features S1
- [ ] **[FORM-010]** Duplicate submission detection (same patient + exam within 24hrs) | Source: Core Features S1
- [ ] **[FORM-011]** Clinical details field on the form | Source: Data Model
- [ ] **[FORM-012]** Contrast reaction field on the form | Source: Data Model
- [ ] **[FORM-013]** eGFR field on the form | Source: Data Model
- [ ] **[FORM-014]** Report by Bhatia checkbox/field on the form | Source: Data Model
- [ ] **[FORM-015]** Patient email field on the form | Source: Data Model
- [ ] **[FORM-016]** Send to patient checkbox on the form | Source: Data Model
- [ ] **[FORM-017]** Delivery method selection (email/fax/both) on the form | Source: Data Model
- [ ] **[FORM-018]** Exam "Other" free-text field when Other is selected | Source: Data Model
- [ ] **[FORM-019]** Server-side validation of all inputs on submit | Source: Delivery Logic
- [ ] **[FORM-020]** Return success to UI immediately after queueing | Source: Delivery Logic

## PHI — Patient Data Handling and Parsing

- [ ] **[PHI-001]** Single textarea for pasting patient information | Source: Core Features S2
- [ ] **[PHI-002]** Server-side parsing via regex (Synaptum7 pattern) | Source: Core Features S2
- [ ] **[PHI-003]** Both raw input and parsed entities stored with field-level encryption | Source: Core Features S2
- [ ] **[PHI-004]** Parse names (first line, 2+ words) | Source: Core Features S2
- [ ] **[PHI-005]** Parse DOB (multiple date format patterns) | Source: Core Features S2
- [ ] **[PHI-006]** Parse phone numbers (mobile + landline patterns) | Source: Core Features S2
- [ ] **[PHI-007]** Parse Medicare numbers | Source: Core Features S2
- [ ] **[PHI-008]** Parse addresses (with state + postcode) | Source: Core Features S2
- [ ] **[PHI-009]** Parse email addresses | Source: Core Features S2
- [ ] **[PHI-010]** Graceful fallback if parsing fails — raw text preserved | Source: Core Features S2
- [ ] **[PHI-011]** Reference implementation: Synaptum7 phi_parser.py | Source: CLAUDE.md

## PDF — PDF Generation and Display

- [ ] **[PDF-001]** Custom-designed PDF request form | Source: Core Features S4
- [ ] **[PDF-002]** One layout with dynamic doctor signature/provider details | Source: Core Features S4
- [ ] **[PDF-003]** Designed for print — clean, professional, medical-standard | Source: Core Features S4
- [ ] **[PDF-004]** PDF generated server-side | Source: Core Features S4
- [ ] **[PDF-005]** After submission: success confirmation with "View/Print PDF" link | Source: Core Features S6
- [ ] **[PDF-006]** Clean print-optimised layout | Source: Core Features S6
- [ ] **[PDF-007]** PDF accessible from request history | Source: Core Features S6
- [ ] **[PDF-008]** PDFs stored encrypted on disk (AES-256) | Source: Security
- [ ] **[PDF-009]** PDFs purged from active storage after 90 days | Source: Security

## DLVR — Delivery Workflows

- [ ] **[DLVR-001]** On form submission, queue deliveries asynchronously via BullMQ | Source: Core Features S5
- [ ] **[DLVR-002]** Email PDF as attachment to radiology practice email | Source: Core Features S5a
- [ ] **[DLVR-003]** Email from address: clinic@curaspecialists.com.au | Source: Core Features S5a
- [ ] **[DLVR-004]** Email subject: "New imaging booking" | Source: Core Features S5a
- [ ] **[DLVR-005]** Fax PDF via Notifyre fax API when no email or fax preferred | Source: Core Features S5b
- [ ] **[DLVR-006]** Fax number sourced from practice record (no OpenAI lookup) | Source: Core Features S5b
- [ ] **[DLVR-007]** Fax delivery confirmation via Notifyre webhook callbacks | Source: Core Features S5b
- [ ] **[DLVR-008]** File copy: email PDF to clinic@curaspecialists.com.au | Source: Core Features S5c
- [ ] **[DLVR-009]** Patient copy: email PDF to patient email when checkbox ticked | Source: Core Features S5d
- [ ] **[DLVR-010]** Jobs retry with exponential backoff (max 3 attempts) | Source: Delivery Logic
- [ ] **[DLVR-011]** Alert staff on delivery failure via dashboard notification | Source: Delivery Logic
- [ ] **[DLVR-012]** Fax delivery confirmation visible to staff | Source: Success Criteria
- [ ] **[DLVR-013]** Failed deliveries can be retried by staff | Source: Success Criteria
- [ ] **[DLVR-014]** BullMQ worker runs as separate PM2 process | Source: CLAUDE.md
- [ ] **[DLVR-015]** Delivery logging for all email sends | Source: Email Service
- [ ] **[DLVR-016]** Delivery logging for all fax sends | Source: Fax Service
- [ ] **[DLVR-017]** Notifyre webhook HMAC signature verification | Source: Fax Service
- [ ] **[DLVR-018]** Fallback fax provider: GoFax if Notifyre unsuitable | Source: Fax Service
- [ ] **[DLVR-019]** TLS enforced for all outgoing SMTP email | Source: Email Service
- [ ] **[DLVR-020]** Delivery pipeline alerting (failed notifications) | Source: Monitoring

## AUTH — Authentication, MFA, Sessions

- [ ] **[AUTH-001]** Staff login with individual email + password via Auth.js | Source: Security
- [ ] **[AUTH-002]** TOTP-based MFA mandatory for all users | Source: Security
- [ ] **[AUTH-003]** Session-based auth with secure httpOnly cookies | Source: Security
- [ ] **[AUTH-004]** Password hashing with bcrypt | Source: Security
- [ ] **[AUTH-005]** Session timeout after inactivity (configurable, 15 min) | Source: Security
- [ ] **[AUTH-006]** Auto-save form state survives session timeout | Source: Security
- [ ] **[AUTH-007]** Account lockout after 5 failed attempts (30 min cooldown) | Source: Security
- [ ] **[AUTH-008]** Auth.js v5 as authentication library | Source: Technical Approach

## RBAC — Access Control and Roles

- [ ] **[RBAC-001]** Admin role: manage staff accounts | Source: Security
- [ ] **[RBAC-002]** Admin role: manage practices | Source: Security
- [ ] **[RBAC-003]** Admin role: view all request history | Source: Security
- [ ] **[RBAC-004]** Staff role: submit requests | Source: Security
- [ ] **[RBAC-005]** Staff role: view own request history | Source: Security
- [ ] **[RBAC-006]** No public-facing pages — entire app behind auth | Source: Security
- [ ] **[RBAC-007]** IP allowlisting option | Source: Security

## PRAC — Radiology Practice Management

- [ ] **[PRAC-001]** Admin page to add radiology practices | Source: Core Features S3
- [ ] **[PRAC-002]** Admin page to edit radiology practices | Source: Core Features S3
- [ ] **[PRAC-003]** Admin page to remove radiology practices | Source: Core Features S3
- [ ] **[PRAC-004]** Practice field: Name | Source: Core Features S3
- [ ] **[PRAC-005]** Practice field: Address | Source: Core Features S3
- [ ] **[PRAC-006]** Practice field: Phone | Source: Core Features S3
- [ ] **[PRAC-007]** Practice field: Fax | Source: Core Features S3
- [ ] **[PRAC-008]** Practice field: Email | Source: Core Features S3
- [ ] **[PRAC-009]** Practices searchable from the request form | Source: Core Features S3
- [ ] **[PRAC-010]** Practice list manageable without developer involvement | Source: Success Criteria

## SEC — Security

- [ ] **[SEC-001]** HTTPS only (TLS via Let's Encrypt) | Source: Data in Transit
- [ ] **[SEC-002]** HSTS headers enforced | Source: Data in Transit
- [ ] **[SEC-003]** SMTP with TLS for all outgoing email | Source: Data in Transit
- [ ] **[SEC-004]** Notifyre fax API: TLS + AES-256 | Source: Data in Transit
- [ ] **[SEC-005]** PostgreSQL with pgcrypto for field-level PHI encryption | Source: Data at Rest
- [ ] **[SEC-006]** VPS disk encryption | Source: Data at Rest
- [ ] **[SEC-007]** Encryption keys managed via env vars with rotation procedure | Source: Data at Rest
- [ ] **[SEC-008]** CSRF protection on all forms | Source: Application Security
- [ ] **[SEC-009]** Rate limiting on login | Source: Application Security
- [ ] **[SEC-010]** Rate limiting on form submission | Source: Application Security
- [ ] **[SEC-011]** Input sanitisation and validation | Source: Application Security
- [ ] **[SEC-012]** Security headers (CSP, X-Frame-Options, etc.) | Source: Application Security
- [ ] **[SEC-013]** Dependency vulnerability scanning | Source: Application Security
- [ ] **[SEC-014]** Audit log of all submissions and admin actions | Source: Application Security
- [ ] **[SEC-015]** Two-tier logging: audit trail (no PHI) + app logs (no PHI) | Source: Application Security
- [ ] **[SEC-016]** Zod for server-side input validation | Source: CLAUDE.md

## INFRA — Infrastructure

- [ ] **[INFRA-001]** VPS firewall — only ports 443 and SSH | Source: Infrastructure
- [ ] **[INFRA-002]** SSH key-only access | Source: Infrastructure
- [ ] **[INFRA-003]** Fail2ban for SSH brute force | Source: Infrastructure
- [ ] **[INFRA-004]** Automated OS security updates | Source: Infrastructure
- [ ] **[INFRA-005]** Encrypted database backups to geo-redundant storage | Source: Infrastructure
- [ ] **[INFRA-006]** Host-level file integrity monitoring | Source: Infrastructure
- [ ] **[INFRA-007]** Off-box log shipping | Source: Infrastructure
- [ ] **[INFRA-008]** External uptime monitoring (60s poll) | Source: Monitoring
- [ ] **[INFRA-009]** SMS/email alerts on downtime | Source: Monitoring
- [ ] **[INFRA-010]** Disk space monitoring | Source: Monitoring
- [ ] **[INFRA-011]** Memory monitoring | Source: Monitoring
- [ ] **[INFRA-012]** Certificate expiry monitoring | Source: Monitoring
- [ ] **[INFRA-013]** Backup job alerting | Source: Monitoring
- [ ] **[INFRA-014]** BinaryLane VPS hosted in Sydney | Source: Technical Approach
- [ ] **[INFRA-015]** Redis for BullMQ job queue | Source: Technical Approach
- [ ] **[INFRA-016]** PM2 for process management | Source: CLAUDE.md

## COMP — Compliance

- [ ] **[COMP-001]** Australian Privacy Act / APPs compliance | Source: Compliance
- [ ] **[COMP-002]** All data stays in Australia | Source: Compliance
- [ ] **[COMP-003]** Two-tier retention: 90-day active + 7-year archive | Source: Compliance
- [ ] **[COMP-004]** NDB plan documented before go-live | Source: Compliance
- [ ] **[COMP-005]** Audit trail proves who accessed what and when | Source: Compliance
- [ ] **[COMP-006]** Manual fallback procedure documented | Source: Compliance
- [ ] **[COMP-007]** Named responsible person for breach assessment | Source: Incident Response
- [ ] **[COMP-008]** OAIC notification process documented | Source: Incident Response
- [ ] **[COMP-009]** Patient notification workflow defined | Source: Incident Response
- [ ] **[COMP-010]** Breach assessment criteria and escalation procedure | Source: Incident Response
- [ ] **[COMP-011]** Parallel run with Make.com before cutover | Source: Success Criteria
- [ ] **[COMP-012]** Manual fallback posted at workstations | Source: Success Criteria
- [ ] **[COMP-013]** Archived data encrypted in cold storage for 7 years | Source: Data at Rest

## DATA — Data Model and Seed Data

### User Table
- [ ] **[DATA-001]** User.id field | Source: Data Model
- [ ] **[DATA-002]** User.email field | Source: Data Model
- [ ] **[DATA-003]** User.name field | Source: Data Model
- [ ] **[DATA-004]** User.passwordHash field | Source: Data Model
- [ ] **[DATA-005]** User.role field (admin/staff) | Source: Data Model
- [ ] **[DATA-006]** User.mfaSecret field | Source: Data Model
- [ ] **[DATA-007]** User.mfaEnabled field | Source: Data Model
- [ ] **[DATA-008]** User.defaultProviderId field | Source: Data Model
- [ ] **[DATA-009]** User.failedAttempts field | Source: Data Model
- [ ] **[DATA-010]** User.lockedAt field | Source: Data Model
- [ ] **[DATA-011]** User.createdAt field | Source: Data Model
- [ ] **[DATA-012]** User.updatedAt field | Source: Data Model

### RadiologyPractice Table
- [ ] **[DATA-013]** RadiologyPractice.id | Source: Data Model
- [ ] **[DATA-014]** RadiologyPractice.name | Source: Data Model
- [ ] **[DATA-015]** RadiologyPractice.address | Source: Data Model
- [ ] **[DATA-016]** RadiologyPractice.phone | Source: Data Model
- [ ] **[DATA-017]** RadiologyPractice.fax | Source: Data Model
- [ ] **[DATA-018]** RadiologyPractice.email | Source: Data Model
- [ ] **[DATA-019]** RadiologyPractice.usageCount | Source: Data Model
- [ ] **[DATA-020]** RadiologyPractice.lastUsedAt | Source: Data Model
- [ ] **[DATA-021]** RadiologyPractice.createdAt | Source: Data Model
- [ ] **[DATA-022]** RadiologyPractice.updatedAt | Source: Data Model

### Provider Table
- [ ] **[DATA-023]** Provider.id | Source: Data Model
- [ ] **[DATA-024]** Provider.doctorName | Source: Data Model
- [ ] **[DATA-025]** Provider.providerNumber | Source: Data Model
- [ ] **[DATA-026]** Provider.location | Source: Data Model
- [ ] **[DATA-027]** Provider.signatureImage | Source: Data Model

### ImagingRequest Table
- [ ] **[DATA-028]** ImagingRequest.id | Source: Data Model
- [ ] **[DATA-029]** ImagingRequest.practiceId | Source: Data Model
- [ ] **[DATA-030]** ImagingRequest.rawPhiInput (encrypted) | Source: Data Model
- [ ] **[DATA-031]** ImagingRequest.parsedPhi (encrypted JSON) | Source: Data Model
- [ ] **[DATA-032]** ImagingRequest.examType | Source: Data Model
- [ ] **[DATA-033]** ImagingRequest.examOther | Source: Data Model
- [ ] **[DATA-034]** ImagingRequest.clinicalDetails | Source: Data Model
- [ ] **[DATA-035]** ImagingRequest.contrastReaction | Source: Data Model
- [ ] **[DATA-036]** ImagingRequest.egfr | Source: Data Model
- [ ] **[DATA-037]** ImagingRequest.providerId | Source: Data Model
- [ ] **[DATA-038]** ImagingRequest.reportByBhatia | Source: Data Model
- [ ] **[DATA-039]** ImagingRequest.patientEmail | Source: Data Model
- [ ] **[DATA-040]** ImagingRequest.sendToPatient | Source: Data Model
- [ ] **[DATA-041]** ImagingRequest.deliveryMethod | Source: Data Model
- [ ] **[DATA-042]** ImagingRequest.status | Source: Data Model
- [ ] **[DATA-043]** ImagingRequest.pdfPath | Source: Data Model
- [ ] **[DATA-044]** ImagingRequest.createdBy | Source: Data Model
- [ ] **[DATA-045]** ImagingRequest.createdAt | Source: Data Model

### DeliveryJob Table
- [ ] **[DATA-046]** DeliveryJob.id | Source: Data Model
- [ ] **[DATA-047]** DeliveryJob.requestId | Source: Data Model
- [ ] **[DATA-048]** DeliveryJob.type (provider_email/fax/filing/patient_email) | Source: Data Model
- [ ] **[DATA-049]** DeliveryJob.status (queued/processing/sent/delivered/failed) | Source: Data Model
- [ ] **[DATA-050]** DeliveryJob.attempts | Source: Data Model
- [ ] **[DATA-051]** DeliveryJob.lastError | Source: Data Model
- [ ] **[DATA-052]** DeliveryJob.externalId | Source: Data Model
- [ ] **[DATA-053]** DeliveryJob.confirmedAt | Source: Data Model
- [ ] **[DATA-054]** DeliveryJob.createdAt | Source: Data Model
- [ ] **[DATA-055]** DeliveryJob.updatedAt | Source: Data Model

### AuditLog Table
- [ ] **[DATA-056]** AuditLog.id | Source: Data Model
- [ ] **[DATA-057]** AuditLog.userId | Source: Data Model
- [ ] **[DATA-058]** AuditLog.action | Source: Data Model
- [ ] **[DATA-059]** AuditLog.resourceType | Source: Data Model
- [ ] **[DATA-060]** AuditLog.resourceId | Source: Data Model
- [ ] **[DATA-061]** AuditLog.details | Source: Data Model
- [ ] **[DATA-062]** AuditLog.ipAddress | Source: Data Model
- [ ] **[DATA-063]** AuditLog.createdAt | Source: Data Model

### Session Table
- [ ] **[DATA-064]** Session.id | Source: Data Model
- [ ] **[DATA-065]** Session.token | Source: Data Model
- [ ] **[DATA-066]** Session.userId | Source: Data Model
- [ ] **[DATA-067]** Session.expiresAt | Source: Data Model
- [ ] **[DATA-068]** Session.ipAddress | Source: Data Model
- [ ] **[DATA-069]** Session.createdAt | Source: Data Model

### Seed: Providers
- [ ] **[DATA-070]** Seed: Winters / 4111709B / RPAH | Source: Providers
- [ ] **[DATA-071]** Seed: Winters / 411170ML / CURA Medical Specialists | Source: Providers
- [ ] **[DATA-072]** Seed: Winters / 411170GH / Central Coast Neurosciences | Source: Providers
- [ ] **[DATA-073]** Seed: Harrison / 4758688Y / CURA Medical Specialists | Source: Providers
- [ ] **[DATA-074]** Seed: Harrison / 4758689J / Dubbo Hospital | Source: Providers
- [ ] **[DATA-075]** Seed: Harrison / 475868AX / Nepean Hospital | Source: Providers
- [ ] **[DATA-076]** Seed: Khalil / 1640066F / CURA Medical Specialists | Source: Providers

### Seed: Exam Types
- [ ] **[DATA-077]** Seed: Other | Source: Exam Types
- [ ] **[DATA-078]** Seed: Non-contrast CT Brain | Source: Exam Types
- [ ] **[DATA-079]** Seed: CT Angiography - Circle of Willis | Source: Exam Types
- [ ] **[DATA-080]** Seed: CT Angiography - Arch to COW | Source: Exam Types
- [ ] **[DATA-081]** Seed: Photon Counting - CT Angiography - Circle of Willis | Source: Exam Types
- [ ] **[DATA-082]** Seed: Photon Counting - CT Angiography - Arch to COW | Source: Exam Types
- [ ] **[DATA-083]** Seed: CT Perfusion | Source: Exam Types
- [ ] **[DATA-084]** Seed: CT Post-contrast Brain | Source: Exam Types
- [ ] **[DATA-085]** Seed: CT Venography - Brain | Source: Exam Types
- [ ] **[DATA-086]** Seed: MRI Brain | Source: Exam Types
- [ ] **[DATA-087]** Seed: MRI Cervical Spine | Source: Exam Types
- [ ] **[DATA-088]** Seed: MRI Lumbar Spine | Source: Exam Types
- [ ] **[DATA-089]** Seed: MRI Whole Spine | Source: Exam Types
- [ ] **[DATA-090]** Seed: MRI Cervical / Thoracic Spine | Source: Exam Types
- [ ] **[DATA-091]** Seed: MRI Cervical / Lumbar Spine | Source: Exam Types
- [ ] **[DATA-092]** Seed: MRI Thoracic / Lumbar Spine | Source: Exam Types
- [ ] **[DATA-093]** Seed: Nerve root injection | Source: Exam Types
- [ ] **[DATA-094]** Seed: Facet joint injection | Source: Exam Types
- [ ] **[DATA-095]** Seed: Epidural injection | Source: Exam Types
- [ ] **[DATA-096]** Seed: Lumbar puncture - IIH | Source: Exam Types
- [ ] **[DATA-097]** Seed: Lumbar puncture - Demyelination | Source: Exam Types
- [ ] **[DATA-098]** Seed: Lumbar puncture - Other | Source: Exam Types
- [ ] **[DATA-099]** Seed: Cerebral angiography | Source: Exam Types
- [ ] **[DATA-100]** Seed: Cerebral venography | Source: Exam Types
- [ ] **[DATA-101]** Seed: Cerebral venography & LP | Source: Exam Types
- [ ] **[DATA-102]** Seed: GA Neurointervention | Source: Exam Types
- [ ] **[DATA-103]** Seed: Conscious Sedation Neurointervention | Source: Exam Types
- [ ] **[DATA-104]** Seed: 1 admin user via prisma db seed | Source: CLAUDE.md

## API — Synaptum 8 Integration (PRD)

- [ ] **[API-001]** REST API at /api/v1/ | Source: Core Features S7
- [ ] **[API-002]** API key authentication (service-to-service) | Source: Core Features S7
- [ ] **[API-003]** API keys scoped per integration | Source: Core Features S7
- [ ] **[API-004]** API keys hashed (SHA-256) | Source: Core Features S7
- [ ] **[API-005]** API key access audit-logged | Source: Core Features S7
- [ ] **[API-006]** Endpoint: create request | Source: Core Features S7
- [ ] **[API-007]** Endpoint: get status | Source: Core Features S7
- [ ] **[API-008]** Endpoint: list requests | Source: Core Features S7
- [ ] **[API-009]** Endpoint: resend failed delivery | Source: Core Features S7
- [ ] **[API-010]** Endpoint: download PDF | Source: Core Features S7
- [ ] **[API-011]** Endpoint: list practices | Source: Core Features S7
- [ ] **[API-012]** Endpoint: list providers | Source: Core Features S7
- [ ] **[API-013]** Endpoint: list exam types | Source: Core Features S7
- [ ] **[API-014]** PHI accepted via rawPhiInput, parsed and encrypted server-side | Source: Core Features S7
- [ ] **[API-015]** PHI never returned in API responses | Source: Core Features S7
- [ ] **[API-016]** Webhook push on delivery status changes | Source: Core Features S7
- [ ] **[API-017]** Webhooks signed with HMAC-SHA256 | Source: Core Features S7
- [ ] **[API-018]** Duplicate detection same as UI (409 with override) | Source: Core Features S7
- [ ] **[API-019]** Rate limited per API key | Source: Core Features S7
- [ ] **[API-020]** Admin UI for API key creation | Source: Core Features S7
- [ ] **[API-021]** Admin UI for API key revocation | Source: Core Features S7
- [ ] **[API-022]** Admin UI for API key scoping | Source: Core Features S7
- [ ] **[API-023]** Admin UI for API key expiry | Source: Core Features S7
- [ ] **[API-024]** Optional IP allowlist per API key | Source: CLAUDE.md
- [ ] **[API-025]** API requests audit-logged with apiKeyId | Source: CLAUDE.md

---

# Part 2: Implementation Tasks

> Source: IMPLEMENTATION.md — How it gets built

## SCAF — Project Scaffold

- [ ] **[SCAF-001]** Initialise Next.js 14+ with TypeScript, App Router | Source: Layer 0 / 0.1
- [ ] **[SCAF-002]** Configure Tailwind CSS | Source: Layer 0 / 0.1
- [ ] **[SCAF-003]** Configure ESLint | Source: Layer 0 / 0.1
- [ ] **[SCAF-004]** Configure Prettier | Source: Layer 0 / 0.1
- [ ] **[SCAF-005]** Setup folder structure per File Ownership table | Source: Layer 0 / 0.1
- [ ] **[SCAF-006]** Git init with .gitignore | Source: Layer 0 / 0.1
- [ ] **[SCAF-007]** Create .env.example with all variable placeholders | Source: Layer 0 / 0.1
- [ ] **[SCAF-008]** Install prisma and @prisma/client | Source: Layer 0 / 0.1
- [ ] **[SCAF-009]** Install next-auth (Auth.js v5) | Source: Layer 0 / 0.1
- [ ] **[SCAF-010]** Install bullmq and ioredis | Source: Layer 0 / 0.1
- [ ] **[SCAF-011]** Install nodemailer | Source: Layer 0 / 0.1
- [ ] **[SCAF-012]** Install @react-pdf/renderer | Source: Layer 0 / 0.1
- [ ] **[SCAF-013]** Install zod | Source: Layer 0 / 0.1
- [ ] **[SCAF-014]** Install bcryptjs | Source: Layer 0 / 0.1
- [ ] **[SCAF-015]** Install otplib | Source: Layer 0 / 0.1
- [ ] **[SCAF-016]** Install qrcode | Source: Layer 0 / 0.1
- [ ] **[SCAF-017]** Install tailwind-merge and clsx | Source: Layer 0 / 0.1
- [ ] **[SCAF-018]** Install @radix-ui/react-* primitives | Source: Layer 0 / 0.1
- [ ] **[SCAF-019]** Install framer-motion | Source: Layer 0 / 0.1

### Environment Variables in .env.example
- [ ] **[SCAF-020]** DATABASE_URL | Source: Layer 0 / Env Vars
- [ ] **[SCAF-021]** NEXTAUTH_SECRET | Source: Layer 0 / Env Vars
- [ ] **[SCAF-022]** NEXTAUTH_URL | Source: Layer 0 / Env Vars
- [ ] **[SCAF-023]** MFA_ISSUER | Source: Layer 0 / Env Vars
- [ ] **[SCAF-024]** SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM | Source: Layer 0 / Env Vars
- [ ] **[SCAF-025]** NOTIFYRE_API_KEY, NOTIFYRE_WEBHOOK_SECRET, NOTIFYRE_SENDER_ID | Source: Layer 0 / Env Vars
- [ ] **[SCAF-026]** REDIS_URL | Source: Layer 0 / Env Vars
- [ ] **[SCAF-027]** PDF_STORAGE_PATH, PDF_ENCRYPTION_KEY | Source: Layer 0 / Env Vars
- [ ] **[SCAF-028]** FIELD_ENCRYPTION_KEY | Source: Layer 0 / Env Vars
- [ ] **[SCAF-029]** ALLOWED_IPS | Source: Layer 0 / Env Vars
- [ ] **[SCAF-030]** RATE_LIMIT_LOGIN, RATE_LIMIT_SUBMIT | Source: Layer 0 / Env Vars
- [ ] **[SCAF-031]** SESSION_TIMEOUT_MINUTES | Source: Layer 0 / Env Vars
- [ ] **[SCAF-032]** MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES | Source: Layer 0 / Env Vars
- [ ] **[SCAF-033]** HEALTH_CHECK_TOKEN | Source: Layer 0 / Env Vars
- [ ] **[SCAF-034]** ACTIVE_RETENTION_DAYS, ARCHIVE_RETENTION_YEARS | Source: Layer 0 / Env Vars
- [ ] **[SCAF-035]** NEXT_PUBLIC_APP_URL, NODE_ENV | Source: Layer 0 / Env Vars

## SCHEMA — Prisma Schema (110 field-level tickets)

> See IMPLEMENTATION.md Section 0.2 for full Prisma schema.
> Each model and field verified against the schema file.

- [ ] **[SCHEMA-001]** User model defined with all 13 fields + 4 relations | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-002]** Session model defined with all 6 fields + 1 relation | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-003]** RadiologyPractice model defined with all 10 fields + 1 relation | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-004]** Provider model defined with all 6 fields + 3 relations | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-005]** ImagingRequest model defined with all 17 fields + 4 relations | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-006]** DeliveryJob model defined with all 10 fields + 1 relation | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-007]** AuditLog model defined with all 9 fields + 2 relations (User + ApiKey) | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-008]** ApiKey model defined with all 12 fields + 2 relations (User + AuditLog) | Source: Layer 0 / 0.2
- [ ] **[SCHEMA-009]** Prisma migration run to create all tables | Source: Layer 0 / 0.2

## VALID — Zod Validation Schemas

- [ ] **[VALID-001]** imagingRequestSchema defined in lib/validation.ts | Source: Layer 0 / 0.3
- [ ] **[VALID-002]** imagingRequestSchema: all 13 fields with correct types/constraints | Source: Layer 0 / 0.3
- [ ] **[VALID-003]** practiceSchema defined in lib/validation.ts | Source: Layer 0 / 0.3
- [ ] **[VALID-004]** userSchema defined in lib/validation.ts | Source: Layer 0 / 0.3
- [ ] **[VALID-005]** loginSchema defined in lib/validation.ts | Source: Layer 0 / 0.3

## UTIL — Shared Utilities

- [ ] **[UTIL-001]** lib/db.ts — Prisma client singleton | Source: Layer 0 / 0.4
- [ ] **[UTIL-002]** lib/audit.ts — logAudit() function | Source: Layer 0 / 0.4
- [ ] **[UTIL-003]** lib/encryption.ts — pgcrypto encrypt helper | Source: Layer 0 / 0.4
- [ ] **[UTIL-004]** lib/encryption.ts — pgcrypto decrypt helper | Source: Layer 0 / 0.4
- [ ] **[UTIL-005]** lib/types.ts — shared TypeScript interfaces | Source: Layer 0 / 0.4

## SEED — Seed Data

- [ ] **[SEED-001]** 7 Provider records seeded | Source: Layer 0 / 0.6
- [ ] **[SEED-002]** 27 exam types as constant array | Source: Layer 0 / 0.6
- [ ] **[SEED-003]** 1 admin user with temp password + MFA required | Source: Layer 0 / 0.6
- [ ] **[SEED-004]** Migration + seed script runs successfully | Source: Layer 0 / 0.6

## Team A: AUTH — Auth + Security Implementation

- [ ] **[AAUTH-I-001]** Auth.js v5 with Credentials provider in lib/auth.ts | Source: Team A
- [ ] **[AAUTH-I-002]** /login page (email + password form) | Source: Team A
- [ ] **[AAUTH-I-003]** /login/mfa page (TOTP code entry) | Source: Team A
- [ ] **[AAUTH-I-004]** /login/mfa/setup page (QR code + backup codes) | Source: Team A
- [ ] **[AAUTH-I-005]** MFA mandatory — redirect to MFA after password validation | Source: Team A
- [ ] **[AAUTH-I-006]** First login redirects to MFA setup | Source: Team A
- [ ] **[AAUTH-I-007]** bcrypt cost factor 12 | Source: Team A
- [ ] **[AAUTH-I-008]** Account lockout after 5 failed attempts (30 min) | Source: Team A
- [ ] **[AAUTH-I-009]** Session timeout 15 min inactivity | Source: Team A
- [ ] **[AAUTH-I-010]** middleware.ts protects all routes except /login, /api/auth, /api/health, /api/fax/webhook, /api/v1/* | Source: Team A
- [ ] **[AAUTH-I-011]** Security headers: CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy | Source: Team A
- [ ] **[AAUTH-I-012]** Rate limit: 5 login/IP/15min | Source: Team A
- [ ] **[AAUTH-I-013]** Rate limit: 60 form submissions/hour | Source: Team A
- [ ] **[AAUTH-I-014]** CSRF validation | Source: Team A
- [ ] **[AAUTH-I-015]** Optional IP allowlisting | Source: Team A
- [ ] **[AAUTH-I-016]** /api/health endpoint (status + DB check) | Source: Team A
- [ ] **[AAUTH-I-017]** Audit: login, logout, login_failed, lockout, mfa_setup | Source: Team A

## Team B: PARSE + FORM — PHI Parser + Form

### PHI Parser (13 tickets)
- [ ] **[PARSE-001]** lib/phi-parser.ts created, porting Synaptum7 | Source: Team B
- [ ] **[PARSE-002]** Names extraction (first line, 2+ words) | Source: Team B
- [ ] **[PARSE-003]** DOB extraction: DOB: and Date of Birth: labels | Source: Team B
- [ ] **[PARSE-004]** DOB format: DD/MM/YYYY | Source: Team B
- [ ] **[PARSE-005]** DOB format: DD-MM-YYYY | Source: Team B
- [ ] **[PARSE-006]** DOB format: DD MMM YYYY | Source: Team B
- [ ] **[PARSE-007]** Medicare numbers: NNNN NNNNN N pattern | Source: Team B
- [ ] **[PARSE-008]** Mobile phones: 04xx pattern | Source: Team B
- [ ] **[PARSE-009]** Landline phones: (0N) NNNN NNNN pattern | Source: Team B
- [ ] **[PARSE-010]** Email extraction | Source: Team B
- [ ] **[PARSE-011]** Address extraction (state + 4-digit postcode) | Source: Team B
- [ ] **[PARSE-012]** Returns ParsedPhi interface | Source: Team B
- [ ] **[PARSE-013]** Graceful fallback when parsing fails | Source: Team B

### Form Components (11 tickets)
- [ ] **[FCOMP-001]** PracticeCombobox.tsx — searchable dropdown with typeahead | Source: Team B
- [ ] **[FCOMP-002]** Practices sorted by usageCount, top 5 highlighted | Source: Team B
- [ ] **[FCOMP-003]** Auto-populates practice details on select | Source: Team B
- [ ] **[FCOMP-004]** "Not listed" toggle for manual entry | Source: Team B
- [ ] **[FCOMP-005]** ExamSelect.tsx — searchable (27 + Other) | Source: Team B
- [ ] **[FCOMP-006]** "Other" reveals free-text field | Source: Team B
- [ ] **[FCOMP-007]** ProviderSelect.tsx — grouped by doctor | Source: Team B
- [ ] **[FCOMP-008]** Auto-selects user's defaultProviderId | Source: Team B
- [ ] **[FCOMP-009]** PhiTextarea.tsx — patient details | Source: Team B
- [ ] **[FCOMP-010]** Hint text on textarea | Source: Team B
- [ ] **[FCOMP-011]** Character count indicator | Source: Team B

### Form Page (13 tickets)
- [ ] **[FPAGE-001]** ImagingRequestForm.tsx full form | Source: Team B
- [ ] **[FPAGE-002]** Auto-save to localStorage on field change | Source: Team B
- [ ] **[FPAGE-003]** Restore state on page load | Source: Team B
- [ ] **[FPAGE-004]** Clear state on successful submission | Source: Team B
- [ ] **[FPAGE-005]** Survives session timeout and browser close | Source: Team B
- [ ] **[FPAGE-006]** Duplicate detection: server check same patient+exam within 24hrs | Source: Team B
- [ ] **[FPAGE-007]** Duplicate confirmation dialog | Source: Team B
- [ ] **[FPAGE-008]** Client-side validation | Source: Team B
- [ ] **[FPAGE-009]** Server-side Zod validation | Source: Team B
- [ ] **[FPAGE-010]** Keyboard navigation (Tab/Enter) | Source: Team B
- [ ] **[FPAGE-011]** Auto-focus first field | Source: Team B
- [ ] **[FPAGE-012]** Server action: validate → parse PHI → save → return ID | Source: Team B
- [ ] **[FPAGE-013]** Server action does NOT trigger delivery | Source: Team B

## Team C: PDFG — PDF Generation (16 tickets)

- [ ] **[PDFG-001]** ImagingRequestPDF.tsx using @react-pdf/renderer | Source: Team C
- [ ] **[PDFG-002]** A4 portrait, print-optimised margins | Source: Team C
- [ ] **[PDFG-003]** Header: CURA logo + clinic contact | Source: Team C
- [ ] **[PDFG-004]** To block: practice name/address/phone/fax/email | Source: Team C
- [ ] **[PDFG-005]** Patient block: parsed details (name, DOB, Medicare, phone, address) | Source: Team C
- [ ] **[PDFG-006]** Patient block fallback to raw PHI if parsing incomplete | Source: Team C
- [ ] **[PDFG-007]** Request block: exam, clinical details, contrast, eGFR | Source: Team C
- [ ] **[PDFG-008]** Referring doctor: name, provider number, location | Source: Team C
- [ ] **[PDFG-009]** Signature image from /public/signatures/{providerId}.png | Source: Team C
- [ ] **[PDFG-010]** Footer: date (DD/MM/YYYY), reference number, Bhatia flag | Source: Team C
- [ ] **[PDFG-011]** generatePDF() in lib/pdf.ts renders to buffer | Source: Team C
- [ ] **[PDFG-012]** Encrypt PDF buffer (AES-256) to disk | Source: Team C
- [ ] **[PDFG-013]** Update ImagingRequest.pdfPath | Source: Team C
- [ ] **[PDFG-014]** Return unencrypted buffer for delivery | Source: Team C
- [ ] **[PDFG-015]** POST /api/pdf/generate route | Source: Team C
- [ ] **[PDFG-016]** GET /api/pdf/[id] route (auth + audit logged) | Source: Team C

## Team D: Delivery Pipeline

### Queue (5 tickets)
- [ ] **[QUEUE-001]** lib/queue.ts with queue name "delivery" | Source: Team D
- [ ] **[QUEUE-002]** Job types: provider_email, provider_fax, filing_email, patient_email | Source: Team D
- [ ] **[QUEUE-003]** Redis connection via REDIS_URL | Source: Team D
- [ ] **[QUEUE-004]** queueDelivery() function | Source: Team D
- [ ] **[QUEUE-005]** Job data: requestId, deliveryJobId, type, recipient, pdfPath | Source: Team D

### Email (8 tickets)
- [ ] **[EMAIL-001]** Nodemailer + Google Workspace SMTP (587/STARTTLS) | Source: Team D
- [ ] **[EMAIL-002]** Auth via SMTP_PASSWORD app password | Source: Team D
- [ ] **[EMAIL-003]** sendProviderEmail() with PDF attachment | Source: Team D
- [ ] **[EMAIL-004]** Subject: "New imaging booking", from clinic@ | Source: Team D
- [ ] **[EMAIL-005]** sendFilingEmail() to clinic@ | Source: Team D
- [ ] **[EMAIL-006]** Filing subject: "Please file this request form" | Source: Team D
- [ ] **[EMAIL-007]** sendPatientEmail() subject "Your request form" | Source: Team D
- [ ] **[EMAIL-008]** All return { success, messageId?, error? } | Source: Team D

### Fax (9 tickets)
- [ ] **[FAX-001]** Notifyre REST API in lib/fax.ts | Source: Team D
- [ ] **[FAX-002]** sendFax() returns { success, faxId, error } | Source: Team D
- [ ] **[FAX-003]** verifyWebhook() HMAC-SHA256 | Source: Team D
- [ ] **[FAX-004]** POST /api/fax/webhook route | Source: Team D
- [ ] **[FAX-005]** Webhook HMAC verification (reject invalid) | Source: Team D
- [ ] **[FAX-006]** Webhook IP allowlisting | Source: Team D
- [ ] **[FAX-007]** Webhook Zod payload validation | Source: Team D
- [ ] **[FAX-008]** Webhook updates DeliveryJob status + confirmedAt | Source: Team D
- [ ] **[FAX-009]** Webhook rate limited | Source: Team D

### Worker (11 tickets)
- [ ] **[WORK-001]** worker/delivery-worker.ts as separate PM2 process | Source: Team D
- [ ] **[WORK-002]** Processes jobs from delivery queue | Source: Team D
- [ ] **[WORK-003]** Sets DeliveryJob status to processing | Source: Team D
- [ ] **[WORK-004]** Loads encrypted PDF buffer | Source: Team D
- [ ] **[WORK-005]** Executes email or fax based on job type | Source: Team D
- [ ] **[WORK-006]** Success: status → sent/delivered | Source: Team D
- [ ] **[WORK-007]** Failure: increment attempts, set lastError | Source: Team D
- [ ] **[WORK-008]** Updates parent ImagingRequest status | Source: Team D
- [ ] **[WORK-009]** Retry: 3 attempts, exponential backoff (30s, 2min, 10min) | Source: Team D
- [ ] **[WORK-010]** Dead letter: after 3 failures → failed, manual retry available | Source: Team D
- [ ] **[WORK-011]** Idempotency via job ID | Source: Team D

## Team E: ORCH — Submission Orchestrator (16 tickets)

- [ ] **[ORCH-001]** orchestrateSubmission() in lib/delivery.ts | Source: Team E
- [ ] **[ORCH-002]** Loads ImagingRequest with practice + provider | Source: Team E
- [ ] **[ORCH-003]** Calls generatePDF() | Source: Team E
- [ ] **[ORCH-004]** Practice has email → queue provider_email | Source: Team E
- [ ] **[ORCH-005]** Practice has fax → queue provider_fax | Source: Team E
- [ ] **[ORCH-006]** Practice has both → queue both | Source: Team E
- [ ] **[ORCH-007]** Always queue filing_email | Source: Team E
- [ ] **[ORCH-008]** sendToPatient → queue patient_email | Source: Team E
- [ ] **[ORCH-009]** Creates DeliveryJob records | Source: Team E
- [ ] **[ORCH-010]** Adds all jobs to BullMQ | Source: Team E
- [ ] **[ORCH-011]** Returns { requestId, jobIds, deliveryMethod } | Source: Team E
- [ ] **[ORCH-012]** Wire form server action to orchestrateSubmission() | Source: Team E
- [ ] **[ORCH-013]** Returns success immediately (async delivery) | Source: Team E
- [ ] **[ORCH-014]** POST /api/requests — create + orchestrate | Source: Team E
- [ ] **[ORCH-015]** GET /api/requests/[id] — detail with delivery jobs | Source: Team E
- [ ] **[ORCH-016]** POST /api/requests/[id]/resend — re-queue failed | Source: Team E

## Team F: Dashboard + Admin

### Dashboard (7 tickets)
- [ ] **[DASH-001]** Sidebar.tsx navigation | Source: Team F
- [ ] **[DASH-002]** Header.tsx with user name, logout, role | Source: Team F
- [ ] **[DASH-003]** Dashboard page | Source: Team F
- [ ] **[DASH-004]** "New Imaging Request" quick action button | Source: Team F
- [ ] **[DASH-005]** Recent submissions (last 10) with status badges | Source: Team F
- [ ] **[DASH-006]** Failed/pending highlighted red/amber | Source: Team F
- [ ] **[DASH-007]** Row click → /requests/[id] | Source: Team F

### Request History (8 tickets)
- [ ] **[HIST-001]** Request history table page | Source: Team F
- [ ] **[HIST-002]** Date range filter | Source: Team F
- [ ] **[HIST-003]** Provider filter | Source: Team F
- [ ] **[HIST-004]** Status filter | Source: Team F
- [ ] **[HIST-005]** Patient name search | Source: Team F
- [ ] **[HIST-006]** Pagination | Source: Team F
- [ ] **[HIST-007]** Admin sees all; staff sees own | Source: Team F
- [ ] **[HIST-008]** Row click → /requests/[id] | Source: Team F

### Request Detail (6 tickets)
- [ ] **[HIST-009]** Request detail page with all info | Source: Team E
- [ ] **[HIST-010]** Delivery timeline (jobs as rows with status badges) | Source: Team E
- [ ] **[HIST-011]** Fax Notifyre confirmation status | Source: Team E
- [ ] **[HIST-012]** Re-send button for failed jobs | Source: Team E
- [ ] **[HIST-013]** View PDF / Print buttons | Source: Team E
- [ ] **[HIST-014]** Audit logged on view | Source: Team E

### Admin: Practices (5 tickets)
- [ ] **[ADMIN-001]** /admin/practices list (searchable, sortable) | Source: Team F
- [ ] **[ADMIN-002]** /admin/practices/new add form | Source: Team F
- [ ] **[ADMIN-003]** Validation: at least email or fax required | Source: Team F
- [ ] **[ADMIN-004]** /admin/practices/[id]/edit + delete with confirmation | Source: Team F
- [ ] **[ADMIN-005]** Audit log on create/update/delete | Source: Team F

### Admin: Users (7 tickets)
- [ ] **[ADMIN-006]** /admin/users list | Source: Team F
- [ ] **[ADMIN-007]** /admin/users/new — generates temp password shown once | Source: Team F
- [ ] **[ADMIN-008]** Forces MFA setup on first login | Source: Team F
- [ ] **[ADMIN-009]** /admin/users/[id]/edit — name/role, reset password, toggle active | Source: Team F
- [ ] **[ADMIN-010]** Cannot delete self | Source: Team F
- [ ] **[ADMIN-011]** Cannot demote last admin | Source: Team F
- [ ] **[ADMIN-012]** Audit log on create/update | Source: Team F

## Team G: API Layer

### API Routes (12 tickets)
- [ ] **[APIR-001]** POST /api/v1/requests — create request | Source: Team G
- [ ] **[APIR-002]** GET /api/v1/requests — list (paginated, filterable) | Source: Team G
- [ ] **[APIR-003]** GET /api/v1/requests/[id] — detail + delivery status | Source: Team G
- [ ] **[APIR-004]** POST /api/v1/requests/[id]/resend — re-queue failed | Source: Team G
- [ ] **[APIR-005]** GET /api/v1/requests/[id]/pdf — download PDF | Source: Team G
- [ ] **[APIR-006]** GET /api/v1/practices — list/search | Source: Team G
- [ ] **[APIR-007]** GET /api/v1/providers — list | Source: Team G
- [ ] **[APIR-008]** GET /api/v1/exam-types — list | Source: Team G
- [ ] **[APIR-009]** { ok, data } / { ok, error } envelope on all responses | Source: Team G
- [ ] **[APIR-010]** PHI never in responses | Source: Team G
- [ ] **[APIR-011]** Zod validation on request bodies | Source: Team G
- [ ] **[APIR-012]** Duplicate detection (409 + force:true) | Source: Team G

### API Key Auth (11 tickets)
- [ ] **[APIK-001]** validateApiKey() in lib/api-auth.ts | Source: Team G
- [ ] **[APIK-002]** IP allowlist check | Source: Team G
- [ ] **[APIK-003]** Middleware for /api/v1/* routes | Source: Team G
- [ ] **[APIK-004]** Rate limit: 120 req/min general | Source: Team G
- [ ] **[APIK-005]** Rate limit: 30 req/min POST | Source: Team G
- [ ] **[APIK-006]** Audit log every API call with apiKeyId | Source: Team G
- [ ] **[APIK-007]** /admin/api-keys list page | Source: Team G
- [ ] **[APIK-008]** /admin/api-keys/new create page | Source: Team G
- [ ] **[APIK-009]** Full key shown once at creation | Source: Team G
- [ ] **[APIK-010]** /admin/api-keys/[id] detail + revoke | Source: Team G
- [ ] **[APIK-011]** Audit log on create/revoke | Source: Team G

### Webhook Dispatcher (6 tickets)
- [ ] **[HOOK-001]** dispatchWebhook() in lib/webhook.ts (HMAC-SHA256) | Source: Team G
- [ ] **[HOOK-002]** Event: delivery.status_changed | Source: Team G
- [ ] **[HOOK-003]** Event: request.status_changed | Source: Team G
- [ ] **[HOOK-004]** Called from delivery worker on status change | Source: Team G
- [ ] **[HOOK-005]** Retry: 3 attempts, exponential backoff (5s, 30s, 2min) | Source: Team G
- [ ] **[HOOK-006]** Timeout: 5 second response deadline | Source: Team G

## Layer 3: Operations

### Integration Testing (4 tickets)
- [ ] **[INTG-001]** E2E: login → MFA → form → submit → PDF → delivery → status | Source: Layer 3 / 3.1
- [ ] **[INTG-002]** All components work together | Source: Layer 3 / 3.1
- [ ] **[INTG-003]** Interface mismatches fixed | Source: Layer 3 / 3.1
- [ ] **[INTG-004]** Audit log coverage verified | Source: Layer 3 / 3.1

### Monitoring (7 tickets)
- [ ] **[MON-001]** External uptime check (60s poll) | Source: Layer 3 / 3.2
- [ ] **[MON-002]** SMS/email downtime alerts | Source: Layer 3 / 3.2
- [ ] **[MON-003]** Disk space alert at 80% | Source: Layer 3 / 3.2
- [ ] **[MON-004]** Certificate expiry alert (14 days) | Source: Layer 3 / 3.2
- [ ] **[MON-005]** Delivery failure alerting | Source: Layer 3 / 3.2
- [ ] **[MON-006]** BullMQ queue health dashboard/endpoint | Source: Layer 3 / 3.2
- [ ] **[MON-007]** Backup alerting | Source: Layer 3 / 3.2

### Data Retention (5 tickets)
- [ ] **[RET-001]** Cron: export >90 day records to GPG archive | Source: Layer 3 / 3.3
- [ ] **[RET-002]** Ship archive to geo-redundant storage | Source: Layer 3 / 3.3
- [ ] **[RET-003]** Purge from active DB after archival | Source: Layer 3 / 3.3
- [ ] **[RET-004]** PDFs: 90 day active + 7 year archive | Source: Layer 3 / 3.3
- [ ] **[RET-005]** Audit logs: archive but never purge | Source: Layer 3 / 3.3

### Deployment (6 tickets)
- [ ] **[DEPL-001]** Nginx reverse proxy (HTTPS, HSTS, OCSP) | Source: Layer 3 / 3.4
- [ ] **[DEPL-002]** PM2 ecosystem (app + worker, auto-restart) | Source: Layer 3 / 3.4
- [ ] **[DEPL-003]** UFW rules (443 + SSH) | Source: Layer 3 / 3.4
- [ ] **[DEPL-004]** Fail2ban config | Source: Layer 3 / 3.4
- [ ] **[DEPL-005]** Let's Encrypt auto-renewal | Source: Layer 3 / 3.4
- [ ] **[DEPL-006]** AIDE file integrity monitoring | Source: Layer 3 / 3.4

### Backup (6 tickets)
- [ ] **[BACK-001]** Daily pg_dump encrypted with GPG | Source: Layer 3 / 3.5
- [ ] **[BACK-002]** Off-box geo-redundant storage | Source: Layer 3 / 3.5
- [ ] **[BACK-003]** PDF archive shipped separately | Source: Layer 3 / 3.5
- [ ] **[BACK-004]** Encryption keys stored separately | Source: Layer 3 / 3.5
- [ ] **[BACK-005]** RTO: 4 hours documented | Source: Layer 3 / 3.5
- [ ] **[BACK-006]** RPO: 24 hours documented | Source: Layer 3 / 3.5

### Documentation (3 tickets)
- [ ] **[DOCS-001]** docs/ndb-response-plan.md | Source: Layer 3 / 3.6
- [ ] **[DOCS-002]** docs/deployment-runbook.md | Source: Layer 3 / 3.6
- [ ] **[DOCS-003]** docs/manual-fallback.md | Source: Layer 3 / 3.6

## Layer 4: Testing + Go-Live

### Testing (35 tickets)
- [ ] **[TEST-001]** PHI parsing accuracy (various formats, edge cases) | Source: Layer 4 / 4.1
- [ ] **[TEST-002]** Duplicate submission detection | Source: Layer 4 / 4.1
- [ ] **[TEST-003]** Auto-save/restore across timeout, tab close, crash | Source: Layer 4 / 4.1
- [ ] **[TEST-004]** Email delivery (staging → production SMTP) | Source: Layer 4 / 4.1
- [ ] **[TEST-005]** Fax delivery (Notifyre test number) | Source: Layer 4 / 4.1
- [ ] **[TEST-006]** Webhook HMAC (valid + invalid signatures) | Source: Layer 4 / 4.1
- [ ] **[TEST-007]** PDF: all 3 doctor signatures, edge case content | Source: Layer 4 / 4.1
- [ ] **[TEST-008]** Print on clinic printers | Source: Layer 4 / 4.1
- [ ] **[TEST-009]** Security: auth bypass | Source: Layer 4 / 4.1
- [ ] **[TEST-010]** Security: MFA bypass | Source: Layer 4 / 4.1
- [ ] **[TEST-011]** Security: CSRF | Source: Layer 4 / 4.1
- [ ] **[TEST-012]** Security: SQL injection | Source: Layer 4 / 4.1
- [ ] **[TEST-013]** Security: XSS | Source: Layer 4 / 4.1
- [ ] **[TEST-014]** Security: rate limiting | Source: Layer 4 / 4.1
- [ ] **[TEST-015]** Browser: Chrome | Source: Layer 4 / 4.1
- [ ] **[TEST-016]** Browser: Edge | Source: Layer 4 / 4.1
- [ ] **[TEST-017]** API: key auth | Source: Layer 4 / 4.1
- [ ] **[TEST-018]** API: scope enforcement | Source: Layer 4 / 4.1
- [ ] **[TEST-019]** API: rate limiting | Source: Layer 4 / 4.1
- [ ] **[TEST-020]** API: duplicate detection | Source: Layer 4 / 4.1
- [ ] **[TEST-021]** API: webhook HMAC | Source: Layer 4 / 4.1
- [ ] **[TEST-022]** API: PHI exclusion from responses | Source: Layer 4 / 4.1
- [ ] **[TEST-023]** API: Synaptum 8 E2E (create → poll → webhook) | Source: Layer 4 / 4.1
- [ ] **[TEST-024]** Queue: failure, retry, dead letter, re-send | Source: Layer 4 / 4.1
- [ ] **[TEST-025]** Delivery failure alerting | Source: Layer 4 / 4.1
- [ ] **[TEST-026]** Backup restore drill | Source: Layer 4 / 4.1
- [ ] **[TEST-027]** Import practice list from Snapforms | Source: Layer 4 / 4.2
- [ ] **[TEST-028]** Verify seeded providers | Source: Layer 4 / 4.2
- [ ] **[TEST-029]** Create staff accounts (MFA on first login) | Source: Layer 4 / 4.2
- [ ] **[TEST-030]** Upload doctor signatures | Source: Layer 4 / 4.2
- [ ] **[TEST-031]** Parallel run (minimum 1 week) | Source: Layer 4 / 4.3
- [ ] **[TEST-032]** Compare outputs between systems | Source: Layer 4 / 4.3
- [ ] **[TEST-033]** Verify deliveries arrive during parallel run | Source: Layer 4 / 4.3
- [ ] **[TEST-034]** Verify fax confirmations match | Source: Layer 4 / 4.3
- [ ] **[TEST-035]** Fix discrepancies before cutover | Source: Layer 4 / 4.3

### Go-Live Checklist (23 tickets)
- [ ] **[GOLV-001]** DNS → requests.curaspecialists.com.au | Source: Layer 4 / 4.4
- [ ] **[GOLV-002]** HTTPS cert + auto-renewal | Source: Layer 4 / 4.4
- [ ] **[GOLV-003]** PostgreSQL running, encrypted, backed up | Source: Layer 4 / 4.4
- [ ] **[GOLV-004]** Redis + BullMQ worker active | Source: Layer 4 / 4.4
- [ ] **[GOLV-005]** Google Workspace SMTP configured | Source: Layer 4 / 4.4
- [ ] **[GOLV-006]** Notifyre credentials configured + tested | Source: Layer 4 / 4.4
- [ ] **[GOLV-007]** Notifyre webhook verified (HMAC + IP) | Source: Layer 4 / 4.4
- [ ] **[GOLV-008]** All staff accounts + MFA enabled | Source: Layer 4 / 4.4
- [ ] **[GOLV-009]** Practice list imported | Source: Layer 4 / 4.4
- [ ] **[GOLV-010]** Doctor signatures uploaded | Source: Layer 4 / 4.4
- [ ] **[GOLV-011]** Backup job running + verified | Source: Layer 4 / 4.4
- [ ] **[GOLV-012]** Monitoring/alerting configured + tested | Source: Layer 4 / 4.4
- [ ] **[GOLV-013]** Off-box log shipping active | Source: Layer 4 / 4.4
- [ ] **[GOLV-014]** NDB plan documented + accessible | Source: Layer 4 / 4.4
- [ ] **[GOLV-015]** Deployment runbook documented | Source: Layer 4 / 4.4
- [ ] **[GOLV-016]** Manual fallback printed + posted | Source: Layer 4 / 4.4
- [ ] **[GOLV-017]** Synaptum 8 API key created (scoped, webhook) | Source: Layer 4 / 4.4
- [ ] **[GOLV-018]** Synaptum 8 integration E2E tested | Source: Layer 4 / 4.4
- [ ] **[GOLV-019]** API rate limits verified | Source: Layer 4 / 4.4
- [ ] **[GOLV-020]** Parallel run completed (1 week+) | Source: Layer 4 / 4.4
- [ ] **[GOLV-021]** Staff trained | Source: Layer 4 / 4.4
- [ ] **[GOLV-022]** Snapforms deactivated | Source: Layer 4 / 4.4
- [ ] **[GOLV-023]** Make.com deactivated (keep 30 days rollback) | Source: Layer 4 / 4.4

### Frontend Design System (19 tickets)
- [ ] **[DESIGN-001]** Distinctive display font + refined body font (no generic) | Source: Layer 0 / 0.5
- [ ] **[DESIGN-002]** Dark/muted base color theme via CSS variables | Source: Layer 0 / 0.5
- [ ] **[DESIGN-003]** Accent colours for status badges | Source: Layer 0 / 0.5
- [ ] **[DESIGN-004]** Staggered reveals on page load | Source: Layer 0 / 0.5
- [ ] **[DESIGN-005]** Subtle hover states on interactive elements | Source: Layer 0 / 0.5
- [ ] **[DESIGN-006]** Toast notifications for delivery status updates | Source: Layer 0 / 0.5
- [ ] **[DESIGN-007]** Consistent spacing scale via Tailwind | Source: Layer 0 / 0.5
- [ ] **[DESIGN-008]** UI component: button | Source: Layer 0 / 0.5
- [ ] **[DESIGN-009]** UI component: input | Source: Layer 0 / 0.5
- [ ] **[DESIGN-010]** UI component: select | Source: Layer 0 / 0.5
- [ ] **[DESIGN-011]** UI component: badge | Source: Layer 0 / 0.5
- [ ] **[DESIGN-012]** UI component: card | Source: Layer 0 / 0.5
- [ ] **[DESIGN-013]** UI component: table | Source: Layer 0 / 0.5
- [ ] **[DESIGN-014]** UI component: dialog | Source: Layer 0 / 0.5
- [ ] **[DESIGN-015]** UI component: toast | Source: Layer 0 / 0.5
- [ ] **[DESIGN-016]** Keyboard navigation on all form components | Source: Layer 0 / 0.5
- [ ] **[DESIGN-017]** Skeleton loading screens (not spinners) | Source: Layer 0 / 0.5
- [ ] **[DESIGN-018]** Inline validation messages (not modal alerts) | Source: Layer 0 / 0.5
- [ ] **[DESIGN-019]** Desktop-first, functional on tablet | Source: Layer 0 / 0.5

---

# Part 3: User & Admin Feature Verification

> Source: FEATURES.md — What users see and do

## UF — Staff Features (52 tickets)

- [ ] **[UF-001]** Single form to send imaging request | Source: Submit
- [ ] **[UF-002]** Search practices by name | Source: Submit
- [ ] **[UF-003]** Recently-used practices first | Source: Submit
- [ ] **[UF-004]** Manual practice entry if not listed | Source: Submit
- [ ] **[UF-005]** Searchable exam dropdown (27 + Other) | Source: Submit
- [ ] **[UF-006]** Free text for "Other" exam | Source: Submit
- [ ] **[UF-007]** Provider number selection | Source: Submit
- [ ] **[UF-008]** Provider auto-selected for logged-in user | Source: Submit
- [ ] **[UF-009]** Single text box for patient details | Source: Submit
- [ ] **[UF-010]** Auto-extraction of structured fields | Source: Submit
- [ ] **[UF-011]** "Ask Dr Bhatia to report" checkbox | Source: Submit
- [ ] **[UF-012]** Patient copy option (email + checkbox) | Source: Submit
- [ ] **[UF-013]** Clinical details field | Source: Submit
- [ ] **[UF-014]** Contrast reaction field | Source: Submit
- [ ] **[UF-015]** eGFR field | Source: Submit
- [ ] **[UF-016]** Auto-save as you type | Source: Form Convenience
- [ ] **[UF-017]** Restore after timeout/tab close | Source: Form Convenience
- [ ] **[UF-018]** Tab through fields | Source: Form Convenience
- [ ] **[UF-019]** Enter to submit | Source: Form Convenience
- [ ] **[UF-020]** Duplicate warning (same patient+exam 24hrs) | Source: Form Convenience
- [ ] **[UF-021]** Confirmation required to proceed past duplicate | Source: Form Convenience
- [ ] **[UF-022]** Auto-focus first field | Source: Form Convenience
- [ ] **[UF-023]** Immediate success confirmation | Source: After Submit
- [ ] **[UF-024]** Async background deliveries | Source: After Submit
- [ ] **[UF-025]** PDF generated | Source: After Submit
- [ ] **[UF-026]** Email to practice | Source: After Submit
- [ ] **[UF-027]** Fax to practice | Source: After Submit
- [ ] **[UF-028]** Filing copy to clinic inbox | Source: After Submit
- [ ] **[UF-029]** Patient email copy when ticked | Source: After Submit
- [ ] **[UF-030]** PDF viewable from success page | Source: After Submit
- [ ] **[UF-031]** PDF printable from success page | Source: After Submit
- [ ] **[UF-032]** PDF viewable from history | Source: After Submit
- [ ] **[UF-033]** Dashboard: recent submissions | Source: Track
- [ ] **[UF-034]** Dashboard: delivery status shown | Source: Track
- [ ] **[UF-035]** Dashboard: failed highlighted | Source: Track
- [ ] **[UF-036]** Dashboard: pending highlighted | Source: Track
- [ ] **[UF-037]** Click request → full details | Source: Track
- [ ] **[UF-038]** Fax confirmations auto-appear | Source: Track
- [ ] **[UF-039]** Searchable request history table | Source: History
- [ ] **[UF-040]** Filter: date range | Source: History
- [ ] **[UF-041]** Filter: provider | Source: History
- [ ] **[UF-042]** Filter: delivery status | Source: History
- [ ] **[UF-043]** Search: patient name | Source: History
- [ ] **[UF-044]** Click row → full details + timeline | Source: History
- [ ] **[UF-045]** One-click re-send for failed deliveries | Source: Re-send
- [ ] **[UF-046]** Auto-retry up to 3 times | Source: Re-send
- [ ] **[UF-047]** View PDF from detail page | Source: Print
- [ ] **[UF-048]** Print PDF from detail page | Source: Print
- [ ] **[UF-049]** Print-quality PDF layout | Source: Print
- [ ] **[UF-050]** PDF: doctor signature | Source: Print
- [ ] **[UF-051]** PDF: provider number | Source: Print
- [ ] **[UF-052]** PDF: all request details | Source: Print

## AF — Admin Features (38 tickets)

- [ ] **[AF-001]** Add practices | Source: Practices
- [ ] **[AF-002]** Edit practices | Source: Practices
- [ ] **[AF-003]** Remove practices | Source: Practices
- [ ] **[AF-004]** Practice: name field | Source: Practices
- [ ] **[AF-005]** Practice: address field | Source: Practices
- [ ] **[AF-006]** Practice: phone field | Source: Practices
- [ ] **[AF-007]** Practice: fax field | Source: Practices
- [ ] **[AF-008]** Practice: email field | Source: Practices
- [ ] **[AF-009]** Validation: email or fax required | Source: Practices
- [ ] **[AF-010]** Searchable from form, no dev needed | Source: Practices
- [ ] **[AF-011]** Usage count visible | Source: Practices
- [ ] **[AF-012]** Create staff accounts | Source: Users
- [ ] **[AF-013]** Temp password shown once | Source: Users
- [ ] **[AF-014]** MFA required on first login | Source: Users
- [ ] **[AF-015]** Assign Admin role | Source: Users
- [ ] **[AF-016]** Assign Staff role | Source: Users
- [ ] **[AF-017]** Edit user details | Source: Users
- [ ] **[AF-018]** Reset passwords | Source: Users
- [ ] **[AF-019]** Toggle active/inactive | Source: Users
- [ ] **[AF-020]** Cannot delete self | Source: Users
- [ ] **[AF-021]** Cannot demote last admin | Source: Users
- [ ] **[AF-022]** Create API keys | Source: API Keys
- [ ] **[AF-023]** Scoped keys | Source: API Keys
- [ ] **[AF-024]** Optional expiry | Source: API Keys
- [ ] **[AF-025]** Optional IP restriction | Source: API Keys
- [ ] **[AF-026]** Webhook URL per key | Source: API Keys
- [ ] **[AF-027]** Last-used timestamp visible | Source: API Keys
- [ ] **[AF-028]** Instant revocation | Source: API Keys
- [ ] **[AF-029]** Full key shown once only | Source: API Keys
- [ ] **[AF-030]** Admin sees all requests | Source: View All
- [ ] **[AF-031]** Same filters/search as staff | Source: View All
- [ ] **[AF-032]** Every action logged | Source: Audit
- [ ] **[AF-033]** Login events tracked | Source: Audit
- [ ] **[AF-034]** Form submissions tracked | Source: Audit
- [ ] **[AF-035]** Practice changes tracked | Source: Audit
- [ ] **[AF-036]** User changes tracked | Source: Audit
- [ ] **[AF-037]** API calls tracked | Source: Audit
- [ ] **[AF-038]** No PHI in audit log | Source: Audit

## LF — Login & Security Features (13 tickets)

- [ ] **[LF-001]** Email + password login | Source: Login
- [ ] **[LF-002]** MFA mandatory | Source: Login
- [ ] **[LF-003]** Authenticator app support | Source: Login
- [ ] **[LF-004]** First login MFA setup with QR | Source: Login
- [ ] **[LF-005]** Lockout: 5 failures → 30 min | Source: Login
- [ ] **[LF-006]** Session timeout: 15 min | Source: Login
- [ ] **[LF-007]** Auto-save preserved across timeout | Source: Login
- [ ] **[LF-008]** HTTPS encryption in transit | Source: Security
- [ ] **[LF-009]** Field-level encryption at rest | Source: Security
- [ ] **[LF-010]** PDFs encrypted on disk | Source: Security
- [ ] **[LF-011]** 90 day active + 7 year archive | Source: Security
- [ ] **[LF-012]** No PHI in logs or errors | Source: Security
- [ ] **[LF-013]** Entire app behind login | Source: Security

---

# Part 4: API Specification Verification

> Source: API-SPEC.md — Endpoint-level audit

## AEP — API Endpoints (59 tickets)

### POST /api/v1/requests
- [ ] **[AEP-001]** Endpoint exists, returns 201 | Source: Create Request
- [ ] **[AEP-002]** Requires scope requests:write | Source: Create Request
- [ ] **[AEP-003]** Accepts practiceId (conditional) | Source: Create Request
- [ ] **[AEP-004]** Accepts manualPractice object (email/fax required) | Source: Create Request
- [ ] **[AEP-005]** Accepts rawPhiInput (required, max 10k chars) | Source: Create Request
- [ ] **[AEP-006]** Server parses rawPhiInput via PHI parser | Source: Create Request
- [ ] **[AEP-007]** Accepts examType (required, validated) | Source: Create Request
- [ ] **[AEP-008]** Accepts examOther (required when Other) | Source: Create Request
- [ ] **[AEP-009]** Accepts clinicalDetails (required) | Source: Create Request
- [ ] **[AEP-010]** Accepts contrastReaction (enum yes/no) | Source: Create Request
- [ ] **[AEP-011]** Accepts egfr (optional) | Source: Create Request
- [ ] **[AEP-012]** Accepts providerId (required, validated) | Source: Create Request
- [ ] **[AEP-013]** Accepts reportByBhatia (default false) | Source: Create Request
- [ ] **[AEP-014]** Accepts patientEmail (optional) | Source: Create Request
- [ ] **[AEP-015]** Accepts sendToPatient (requires patientEmail) | Source: Create Request
- [ ] **[AEP-016]** Accepts deliveryMethod (auto-determined if omitted) | Source: Create Request
- [ ] **[AEP-017]** Response: id, status, examType, deliveryJobs, createdAt | Source: Create Request
- [ ] **[AEP-018]** deliveryJobs: id, type, status | Source: Create Request
- [ ] **[AEP-019]** PHI encrypted at rest | Source: Create Request
- [ ] **[AEP-020]** PHI never in responses | Source: Create Request
- [ ] **[AEP-021]** Duplicate: 409 with existing ID | Source: Create Request
- [ ] **[AEP-022]** force:true overrides duplicate | Source: Create Request
- [ ] **[AEP-023]** Delivery jobs queued async | Source: Create Request

### GET /api/v1/requests/:id
- [ ] **[AEP-024]** Endpoint exists, returns 200 | Source: Get Status
- [ ] **[AEP-025]** Requires scope requests:read | Source: Get Status
- [ ] **[AEP-026]** Response: metadata fields (no PHI) | Source: Get Status
- [ ] **[AEP-027]** Response: deliveryJobs with attempts, lastError, confirmedAt | Source: Get Status
- [ ] **[AEP-028]** Never returns PHI | Source: Get Status

### GET /api/v1/requests
- [ ] **[AEP-029]** Endpoint exists, returns 200 | Source: List Requests
- [ ] **[AEP-030]** Requires scope requests:read | Source: List Requests
- [ ] **[AEP-031]** Scoped to API key's user | Source: List Requests
- [ ] **[AEP-032]** page param (default 1) | Source: List Requests
- [ ] **[AEP-033]** limit param (default 20, max 100) | Source: List Requests
- [ ] **[AEP-034]** status filter | Source: List Requests
- [ ] **[AEP-035]** providerId filter | Source: List Requests
- [ ] **[AEP-036]** since/until date filters | Source: List Requests
- [ ] **[AEP-037]** Pagination object in response | Source: List Requests

### POST /api/v1/requests/:id/resend
- [ ] **[AEP-038]** Endpoint exists, returns 200 | Source: Resend
- [ ] **[AEP-039]** Requires scope requests:write | Source: Resend
- [ ] **[AEP-040]** Optional jobTypes filter | Source: Resend
- [ ] **[AEP-041]** Re-queues all failed if omitted | Source: Resend
- [ ] **[AEP-042]** Response: requeuedJobs array | Source: Resend

### GET /api/v1/requests/:id/pdf
- [ ] **[AEP-043]** Endpoint exists, returns 200 | Source: Get PDF
- [ ] **[AEP-044]** Requires scope requests:read | Source: Get PDF
- [ ] **[AEP-045]** Content-Type: application/pdf | Source: Get PDF
- [ ] **[AEP-046]** Content-Disposition: attachment | Source: Get PDF
- [ ] **[AEP-047]** Audit logged | Source: Get PDF

### GET /api/v1/practices
- [ ] **[AEP-048]** Endpoint exists, returns 200 | Source: List Practices
- [ ] **[AEP-049]** Requires scope practices:read | Source: List Practices
- [ ] **[AEP-050]** search param (case-insensitive, partial) | Source: List Practices
- [ ] **[AEP-051]** limit param (default 50, max 200) | Source: List Practices
- [ ] **[AEP-052]** Response: id, name, address, phone, fax, email | Source: List Practices

### GET /api/v1/providers
- [ ] **[AEP-053]** Endpoint exists, returns 200 | Source: List Providers
- [ ] **[AEP-054]** Requires scope providers:read | Source: List Providers
- [ ] **[AEP-055]** Response: id, doctorName, providerNumber, location | Source: List Providers

### GET /api/v1/exam-types
- [ ] **[AEP-056]** Endpoint exists, returns 200 | Source: List Exam Types
- [ ] **[AEP-057]** Requires scope providers:read | Source: List Exam Types
- [ ] **[AEP-058]** Response: array of strings | Source: List Exam Types

## AAUTH — API Authentication (17 tickets)

- [ ] **[AAUTH-001]** Bearer token via Authorization header | Source: Auth
- [ ] **[AAUTH-002]** rq_live_ prefix (production) | Source: Auth
- [ ] **[AAUTH-003]** rq_test_ prefix (development) | Source: Auth
- [ ] **[AAUTH-004]** SHA-256 hash storage | Source: Auth
- [ ] **[AAUTH-005]** Key prefix stored for identification | Source: Auth
- [ ] **[AAUTH-006]** Associated userId for audit | Source: Auth
- [ ] **[AAUTH-007]** Configurable scopes array | Source: Auth
- [ ] **[AAUTH-008]** Default scopes: requests:write/read, practices:read, providers:read | Source: Auth
- [ ] **[AAUTH-009]** Optional expiresAt | Source: Auth
- [ ] **[AAUTH-010]** revokedAt for revocation | Source: Auth
- [ ] **[AAUTH-011]** lastUsedAt updated on use | Source: Auth
- [ ] **[AAUTH-012]** All calls logged with apiKeyId + userId | Source: Auth
- [ ] **[AAUTH-013]** Scope: requests:write | Source: Scopes
- [ ] **[AAUTH-014]** Scope: requests:read | Source: Scopes
- [ ] **[AAUTH-015]** Scope: practices:read | Source: Scopes
- [ ] **[AAUTH-016]** Scope: providers:read | Source: Scopes
- [ ] **[AAUTH-017]** Scope: practices:write (optional) | Source: Scopes

## ARLIM — API Rate Limiting (6 tickets)

- [ ] **[ARLIM-001]** 120 req/min per key | Source: Rate Limiting
- [ ] **[ARLIM-002]** 30 req/min create request | Source: Rate Limiting
- [ ] **[ARLIM-003]** 120 req/min read endpoints | Source: Rate Limiting
- [ ] **[ARLIM-004]** X-RateLimit-Limit header | Source: Rate Limiting
- [ ] **[ARLIM-005]** X-RateLimit-Remaining header | Source: Rate Limiting
- [ ] **[ARLIM-006]** X-RateLimit-Reset header | Source: Rate Limiting

## ARESP — API Response Format (9 tickets)

- [ ] **[ARESP-001]** Success: { ok: true, data } | Source: Response Format
- [ ] **[ARESP-002]** Error: { ok: false, error: { code, message, details } } | Source: Response Format
- [ ] **[ARESP-003]** UNAUTHORIZED → 401 | Source: Error Codes
- [ ] **[ARESP-004]** FORBIDDEN → 403 | Source: Error Codes
- [ ] **[ARESP-005]** NOT_FOUND → 404 | Source: Error Codes
- [ ] **[ARESP-006]** VALIDATION_ERROR → 422 | Source: Error Codes
- [ ] **[ARESP-007]** DUPLICATE_REQUEST → 409 | Source: Error Codes
- [ ] **[ARESP-008]** RATE_LIMITED → 429 | Source: Error Codes
- [ ] **[ARESP-009]** INTERNAL_ERROR → 500 | Source: Error Codes

## AWHK — Webhook Dispatcher (10 tickets)

- [ ] **[AWHK-001]** Configurable via env (WEBHOOK_URL, WEBHOOK_SECRET) | Source: Webhook
- [ ] **[AWHK-002]** Configurable per API key via admin UI | Source: Webhook
- [ ] **[AWHK-003]** POST to configured URL | Source: Webhook
- [ ] **[AWHK-004]** X-Requests-Signature header (HMAC-SHA256) | Source: Webhook
- [ ] **[AWHK-005]** Content-Type: application/json | Source: Webhook
- [ ] **[AWHK-006]** Payload: event, requestId, deliveryJob, requestStatus, timestamp | Source: Webhook
- [ ] **[AWHK-007]** Event: delivery.status_changed | Source: Webhook
- [ ] **[AWHK-008]** Event: request.status_changed | Source: Webhook
- [ ] **[AWHK-009]** 5 second response deadline | Source: Webhook
- [ ] **[AWHK-010]** 3 retries with exponential backoff | Source: Webhook

## ASEC — API Security (14 tickets)

- [ ] **[ASEC-001]** TLS only — reject non-HTTPS | Source: Security
- [ ] **[ASEC-002]** Keys hashed, never plaintext | Source: Security
- [ ] **[ASEC-003]** PHI never in responses | Source: Security
- [ ] **[ASEC-004]** PHI never in logs | Source: Security
- [ ] **[ASEC-005]** Scoped keys (least privilege) | Source: Security
- [ ] **[ASEC-006]** Rate limiting per key | Source: Security
- [ ] **[ASEC-007]** Webhook HMAC verification | Source: Security
- [ ] **[ASEC-008]** Key rotation supported | Source: Security
- [ ] **[ASEC-009]** Optional expiry forces rotation | Source: Security
- [ ] **[ASEC-010]** Optional IP allowlisting | Source: Security
- [ ] **[ASEC-011]** PHI is write-only (cannot read back) | Source: Security
- [ ] **[ASEC-012]** Cannot manage users/practices via API | Source: Security
- [ ] **[ASEC-013]** Cannot bypass rate limits | Source: Security
- [ ] **[ASEC-014]** Cannot bypass duplicate detection | Source: Security
