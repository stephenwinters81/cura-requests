# PRD: Requests v1.0

> CURA Medical Specialists — Imaging Request System

## Problem

The current imaging request workflow runs on Snapforms (form) + Make.com (automation). This limits control over form design, print/PDF layout, workflow logic, and costs credits per execution. The fax routing depends on an OpenAI assistant lookup that has caused outages when quota is exceeded.

## Goal

A self-hosted web application on a Sydney-based VPS that replaces both Snapforms and Make.com, giving full control over:
- Form UI and UX (optimised for staff speed)
- PDF/print layout and design
- Email, fax, and filing workflows
- Radiology practice management

## Users

Staff at CURA Medical Specialists (small team - Dr Winters, Dr Harrison, Dr Khalil and admin staff).

## Core Features

### 1. Imaging Request Form
- Replaces the Snapforms form with the same fields
- Searchable radiology practice dropdown (auto-populates practice details)
- Manual entry fallback if practice not in list
- Exam type dropdown (same 28 options + "Other")
- Provider selection (doctor + location) - auto-selected based on logged-in user
- Optimised for speed - keyboard navigation, smart defaults, autofill where possible
- Recently-used practices shortlist for fast selection
- Auto-save form state to local storage (survives timeout/tab close)
- Duplicate submission detection (same patient + exam within 24hrs)

### 2. Patient Details (PHI Dump)
- Single textarea for pasting patient information (name, DOB, phone, Medicare, address)
- Server-side parsing via regex to extract structured fields (adopting Synaptum7 pattern)
- Both raw input and parsed entities stored with field-level encryption
- Parsed fields: names, DOB, phone numbers, Medicare numbers, addresses, emails
- Graceful fallback if parsing fails - raw text preserved

### 3. Radiology Practice Management
- Admin page to add/edit/remove radiology practices
- Fields: Name, Address, Phone, Fax, Email
- Searchable from the request form

### 4. PDF Generation
- Custom-designed PDF request form (replaces Google Docs templates)
- One layout with dynamic doctor signature/provider details
- Designed for print - clean, professional, medical-standard
- Generated server-side

### 5. Delivery Workflows (replaces Make.com)
On form submission, the system queues deliveries asynchronously:

**a) Email to Radiology Practice**
- Sends PDF as attachment to the practice email
- From: clinic@curaspecialists.com.au
- Subject: "New imaging booking"

**b) Fax to Radiology Practice** (when no email / fax preferred)
- Sends PDF via Notifyre fax API (Australian, ISO 27001, healthcare-compliant)
- Fax number sourced from practice record (replaces OpenAI lookup)
- Delivery confirmation via webhook callbacks

**c) File copy to CURA**
- Emails PDF to clinic@curaspecialists.com.au for patient file

**d) Patient copy** (optional, when checkbox ticked)
- Emails PDF to patient email address

### 6. Print Support
- After submission: success confirmation with "View/Print PDF" link (not mandatory preview)
- Clean print-optimised layout
- PDF accessible from request history

### 7. API for Synaptum 8 Integration
- REST API (`/api/v1/`) enabling Synaptum 8 to create and manage imaging requests programmatically
- API key authentication (service-to-service, scoped, hashed, audit-logged)
- Endpoints: create request, get status, list requests, resend failed, download PDF, list practices/providers/exam types
- PHI accepted via `rawPhiInput` (same as form), parsed and encrypted server-side
- PHI never returned in API responses — metadata and delivery status only
- Webhook push notifications to Synaptum 8 on delivery status changes (HMAC-signed)
- Duplicate detection same as UI (409 with override option)
- Rate limited per API key
- Admin UI for key management (create, revoke, scope, expire)
- See `API-SPEC.md` for full endpoint documentation

## Out of Scope (for now)
- Patient portal / patient-facing features
- Integration with Gentu or other practice management systems
- Multi-form support (future consideration)
- HealthLink/Medical Objects secure messaging (future consideration)

## Technical Approach

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Runtime | Node.js | Already in stack, good ecosystem |
| Framework | Next.js | Fast to build, SSR for form, API routes for workflows |
| Database | PostgreSQL + pgcrypto | Proper concurrency, field-level encryption, battle-tested Prisma support |
| PDF Generation | React-PDF or Puppeteer | Full control over layout, no Google Docs dependency |
| Email | Nodemailer + Google Workspace SMTP | Direct sending from clinic@curaspecialists.com.au, TLS enforced |
| Fax | Notifyre API | Australian, ISO 27001, healthcare-compliant, webhook delivery confirmation |
| Job Queue | BullMQ + Redis | Async delivery with retry, prevents timeout on fax/email |
| Auth | Auth.js with MFA | Established library, TOTP-based MFA mandatory |
| Hosting | BinaryLane VPS (Sydney) | Local, low latency, full control |

## Data Model

### User
id, email, name, passwordHash, role (admin/staff), mfaSecret, mfaEnabled, defaultProviderId, failedAttempts, lockedAt, createdAt, updatedAt

### RadiologyPractice
id, name, address, phone, fax, email, usageCount, lastUsedAt, createdAt, updatedAt

### Provider
id, doctorName, providerNumber, location, signatureImage

### ImagingRequest
id, practiceId, rawPhiInput (encrypted), parsedPhi (encrypted JSON), examType, examOther, clinicalDetails, contrastReaction, egfr, providerId, reportByBhatia, patientEmail, sendToPatient, deliveryMethod (email/fax/both), status, pdfPath, createdBy, createdAt

### DeliveryJob
id, requestId, type (provider_email/fax/filing/patient_email), status (queued/processing/sent/delivered/failed), attempts, lastError, externalId, confirmedAt, createdAt, updatedAt

### AuditLog
id, userId, action, resourceType, resourceId, details, ipAddress, createdAt

### Session
id, token, userId, expiresAt, ipAddress, createdAt

## Delivery Logic

```
On submit:
  1. Validate all inputs (server-side)
  2. Check for duplicate submission (same patient name + exam within 24hrs)
  3. Parse PHI from textarea into structured fields
  4. Generate PDF with form data + provider details
  5. Queue async delivery jobs:
     a. Send to practice (email and/or fax)
     b. Send filing copy to CURA
     c. Send patient copy (if requested)
  6. Return success to UI immediately (deliveries process in background)
  7. Jobs retry with exponential backoff on failure (max 3 attempts)
  8. Alert staff on delivery failure via dashboard notification
```

No OpenAI dependency. Fax numbers come straight from the practice record.

## Security

### Authentication
- Staff login with individual email + password via Auth.js
- TOTP-based MFA mandatory for all users (ACSC Essential Eight)
- Session-based auth with secure httpOnly cookies
- Password hashing with bcrypt
- Session timeout after inactivity (configurable, e.g. 15 min)
- Auto-save form state to localStorage survives session timeout
- Account lockout after 5 failed attempts (30 min cooldown)

### Access Control
- Admin role: manage staff accounts, manage practices, view all request history
- Staff role: submit requests, view own request history
- No public-facing pages - entire app behind auth
- IP allowlisting option (restrict to clinic network / VPN)

### Data in Transit
- HTTPS only (TLS via Let's Encrypt)
- HSTS headers enforced
- SMTP with TLS for all outgoing email
- Notifyre fax API: TLS + AES-256 encryption

### Data at Rest
- PostgreSQL with pgcrypto for field-level encryption of all PHI
- PDFs stored encrypted on disk (AES-256), purged from active storage after 90 days
- Archived to encrypted cold storage for 7-year retention (NSW Health Records requirement)
- VPS disk encryption
- Encryption keys managed via environment variables with documented rotation procedure

### Application Security (built from Phase 1, not deferred)
- CSRF protection on all forms
- Rate limiting on login and form submission
- Input sanitisation and validation
- Security headers (CSP, X-Frame-Options, etc.)
- Dependency vulnerability scanning
- Audit log of all submissions and admin actions
- Two-tier logging: audit trail (with record IDs, no PHI) + application logs (no PHI)

### Infrastructure
- VPS firewall - only ports 443 (HTTPS) and SSH open
- SSH key-only access (no password SSH)
- Fail2ban for SSH brute force protection
- Automated OS security updates
- Regular encrypted database backups to separate geo-redundant storage
- Host-level file integrity monitoring
- Off-box log shipping for tamper-resistant audit trail

### Monitoring & Alerting
- External uptime monitoring (health check endpoint polled every 60s)
- SMS/email alerts on downtime
- Delivery pipeline alerting (failed email/fax notifications)
- Disk space, memory, certificate expiry monitoring
- Backup job success/failure alerting

### Incident Response
- Documented Notifiable Data Breaches (NDB) response plan (Privacy Act Part IIIC)
- Named responsible person for breach assessment
- OAIC notification process documented
- Patient notification workflow defined
- Breach assessment criteria and escalation procedure

### Compliance
- Australian Privacy Act / APPs compliance for health data
- Data stays in Australia (Sydney VPS, Notifyre AU data residency)
- Two-tier retention: 90-day active + 7-year encrypted archive (NSW Health Records)
- Notifiable Data Breaches plan documented before go-live
- Audit trail proves who accessed what record and when
- Manual fallback procedure documented (phone + paper fax when system is down)

## Email Service

Google Workspace SMTP relay (existing infrastructure)
- Send via clinic@curaspecialists.com.au using Google Workspace SMTP
- TLS enforced
- Delivery logging and retry logic via BullMQ job queue

## Fax Service

Notifyre (Australian, ISO 27001:2022, healthcare-compliant)
- REST API with SDK support
- ~3c/page AUD, pay-as-you-go, no contracts
- Webhook delivery confirmations (HMAC signature verified)
- AES-256 encryption at rest and in transit
- Australian data residency
- Fallback: GoFax (GITC government-accredited) if Notifyre is unsuitable

## Exam Types

1. Other
2. Non-contrast CT Brain
3. CT Angiography - Circle of Willis
4. CT Angiography - Arch to COW
5. Photon Counting - CT Angiography - Circle of Willis
6. Photon Counting - CT Angiography - Arch to COW
7. CT Perfusion
8. CT Post-contrast Brain
9. CT Venography - Brain
10. MRI Brain
11. MRI Cervical Spine
12. MRI Lumbar Spine
13. MRI Whole Spine
14. MRI Cervical / Thoracic Spine
15. MRI Cervical / Lumbar Spine
16. MRI Thoracic / Lumbar Spine
17. Nerve root injection
18. Facet joint injection
19. Epidural injection
20. Lumbar puncture - IIH
21. Lumbar puncture - Demyelination
22. Lumbar puncture - Other
23. Cerebral angiography
24. Cerebral venography
25. Cerebral venography & LP
26. GA Neurointervention
27. Conscious Sedation Neurointervention

## Providers

| Doctor | Provider # | Location |
|--------|-----------|----------|
| Winters | 4111709B | RPAH |
| Winters | 411170ML | CURA Medical Specialists |
| Winters | 411170GH | Central Coast Neurosciences |
| Harrison | 4758688Y | CURA Medical Specialists |
| Harrison | 4758689J | Dubbo Hospital |
| Harrison | 475868AX | Nepean Hospital |
| Khalil | 1640066F | CURA Medical Specialists |

## Success Criteria

- Staff can submit an imaging request in equal or less time than current Snapforms
- PDF output is cleaner/more professional than current Google Docs template
- Emails and faxes deliver reliably without Make.com credit limits or OpenAI dependency
- Fax delivery confirmation visible to staff
- Failed deliveries alert staff and can be retried
- Practice list is easy to manage without developer involvement
- System runs on a single Sydney VPS with minimal maintenance
- All patient data encrypted in transit and at rest (field-level)
- Full audit trail of all actions
- MFA enforced for all users
- Notifiable Data Breaches plan in place before go-live
- Manual fallback procedure documented and posted at workstations
- Parallel run with Make.com before cutover

## Pentarchy Review Notes

This PRD was reviewed by a 5-expert council (Security Engineer, Healthcare IT Compliance, Software Architect, Clinical UX, DevOps/Reliability). Key changes incorporated:
- PostgreSQL replaces SQLite/SQLCipher (unsupported Prisma combo)
- BullMQ + Redis for async delivery (prevents timeout)
- Auth.js with mandatory MFA (replaces custom auth)
- Notifyre as fax provider (Australian, ISO 27001, healthcare)
- Two-tier data retention (90-day active + 7-year archive)
- Security built from Phase 1 (not deferred)
- NDB incident response plan required before go-live
- Monitoring and alerting infrastructure
- PHI dump with server-side parsing (Synaptum7 pattern)
- Duplicate submission detection
- Auto-save form state
- Deployment runbook and manual fallback procedure
