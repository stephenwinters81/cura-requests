# Requests v1.0 — Audit Report

> Generated: 2026-04-03
> Audited against: TICKETS.md (530+ tickets across 4 parts)
> Method: 8 parallel audit agents reading actual source files

---

## Executive Summary

| Category | PASS | PARTIAL | FAIL | N/A/DEFERRED | Total |
|----------|------|---------|------|--------------|-------|
| **Part 1: PRD Requirements** | 149 | 8 | 5 | 7 | 169 |
| **Part 2: Implementation Tasks** | 254 | 12 | 5 | 46 | 317 |
| **Part 3: User/Admin Features** | 96 | 3 | 0 | 1 | 100 |
| **Part 4: API Specification** | 96 | 5 | 8 | 0 | 109 |
| **TOTAL** | **595** | **28** | **18** | **54** | **695** |

**Pass rate: 85.6% PASS, 4.0% PARTIAL, 2.6% FAIL, 7.8% N/A/Deferred**

---

## Critical Failures (FAIL) — Must Fix Before Go-Live

### P0: Blocking — Functionality Broken

| # | Ticket(s) | Issue | Impact | Fix |
|---|-----------|-------|--------|-----|
| 1 | **HOOK-004, AWHK-007, AWHK-008** | `dispatchWebhook()` is implemented but **never called** from anywhere. Outbound webhooks to Synaptum 8 will never fire. | Synaptum 8 will never receive delivery status updates. Core integration feature is dead code. | Wire `dispatchWebhook()` into the delivery worker's `completed` and `failed` event handlers. Also call it from `recalculateRequestStatus()` when parent status changes. |
| 2 | **APIR-004, ORCH-016** | API resend endpoint (`POST /api/v1/requests/:id/resend`) resets DB status to "queued" but does **NOT call `queueDelivery()`** to re-enqueue to BullMQ. | API-resent jobs sit at "queued" forever — never processed. UI resend works correctly. | Add `queueDelivery()` calls after the DB status reset, matching the pattern in `src/app/requests/[id]/actions.ts`. |
| 3 | **AEP-006** | API `POST /api/v1/requests` does **not call `parsePhi()`** on the raw input. Stores empty ParsedPhi. | PDFs generated from API-created requests will have no structured patient fields — only raw text fallback. | Import `parsePhi` from `@/lib/phi-parser` and call it before encrypting, same as `actions.ts` does. |

### P1: Security — Must Address

| # | Ticket(s) | Issue | Impact | Fix |
|---|-----------|-------|--------|-----|
| 4 | **SEC-008** | No CSRF protection implemented. No CSRF tokens in any form. | Potential cross-site request forgery on form submissions. Auth.js handles its own routes; Next.js server actions have implicit SameSite cookie protection but no explicit CSRF tokens. | Low risk for this architecture (JWT + SameSite cookies + server actions). Document as accepted risk or add custom CSRF middleware. |
| 5 | **SEC-013** | No dependency vulnerability scanning. No Dependabot, Snyk, or npm audit in CI/CD. | Vulnerable dependencies could go undetected. | Add `npm audit` to build/deploy scripts. Consider Dependabot or Snyk integration. |
| 6 | **FAX-006** | Fax webhook endpoint lacks IP allowlisting for Notifyre egress ranges. | Relies solely on HMAC verification. An attacker with the webhook secret could spoof callbacks from any IP. | Add `NOTIFYRE_WEBHOOK_IPS` env var check before HMAC verification. |
| 7 | **ASEC-014** | `force: true` in API body bypasses duplicate detection. Ticket says "Cannot bypass duplicate detection." | API clients can override duplicate safeguard. | Either remove `force` support from API (keep it UI-only) or document as intentional. |

### P2: Infrastructure — Must Address Before Production

| # | Ticket(s) | Issue | Impact | Fix |
|---|-----------|-------|--------|-----|
| 8 | **INFRA-007, GOLV-013** | Off-box log shipping not implemented. Only referenced in comments. | Logs only exist locally — no tamper-resistant audit trail. Compliance gap. | Configure rsyslog, filebeat, or similar to ship to external storage. |
| 9 | **INFRA-004** | No automated OS security updates (unattended-upgrades). | VPS may miss critical security patches. | Add `unattended-upgrades` setup to deployment runbook or script. |
| 10 | **INFRA-011** | No memory monitoring in health checks. | Memory exhaustion goes undetected. | Add memory check to `deploy/health-monitor.sh`. |
| 11 | **MON-006** | No BullMQ queue health dashboard or endpoint. | Queue failures, stuck jobs, and worker crashes go undetected. | Add `/api/health/queue` endpoint or BullMQ Board integration. |

---

## Partial Implementations — Should Fix

### Functionality Gaps

| # | Ticket(s) | Issue | Severity |
|---|-----------|-------|----------|
| 12 | **DLVR-011, DLVR-020** | No in-app or external notifications for delivery failures. Worker only logs to console. | Medium — staff won't know deliveries failed unless they check the dashboard. |
| 13 | **FORM-017** | No explicit delivery method selector on the form UI. Auto-determined from practice record. | Low — auto-determination is actually better UX per the PRD. Document as intentional. |
| 14 | **UF-022, FPAGE-011** | No auto-focus on first form field (PracticeCombobox). | Low — minor UX convenience. |
| 15 | **UF-038** | Fax confirmations update in DB via webhook but no real-time push to UI. Users must refresh. | Low — acceptable for ~30 requests/week volume. |
| 16 | **ADMIN-001** | Practice list lacks interactive search/sort controls. Server-rendered sorted by name only. | Low — adequate for a small practice list. |

### Ops/Infra Placeholders

| # | Ticket(s) | Issue | Severity |
|---|-----------|-------|----------|
| 17 | **INFRA-005, BACK-002, RET-002** | Off-box backup/archive shipping is placeholder (commands commented out). | High — backups only exist locally. Single point of failure. |
| 18 | **INFRA-009, MON-002, MON-007** | Alert delivery (`send_alert()`) is placeholder in all monitoring/backup scripts. | High — monitoring detects problems but can't notify anyone. |
| 19 | **COMP-003, COMP-013** | 7-year archive retention has no operational storage backend. | Medium — archives created locally but not shipped to cold storage. |
| 20 | **INFRA-002** | SSH key-only access not configured in scripts. Left to manual setup. | Medium — documented in runbook but not enforced by automation. |

### API Gaps

| # | Ticket(s) | Issue | Severity |
|---|-----------|-------|----------|
| 21 | **AAUTH-003** | No `rq_test_` prefix for development API keys. Only `rq_live_` generated. | Low — cosmetic. Can be added later. |
| 22 | **AAUTH-017** | No `practices:write` scope. API cannot create/update practices. | Low — admin-only via web UI per spec. |
| 23 | **AWHK-001** | No env-level webhook config. Only per-API-key. | Low — per-key is actually more flexible. |

### Schema/Data

| # | Ticket(s) | Issue | Severity |
|---|-----------|-------|----------|
| 24 | **SCHEMA-009** | No `prisma/migrations/` directory. Migrations never generated. | Blocking for deployment — run `npx prisma migrate dev --name init`. |
| 25 | **SCAF-006** | Directory is not a git repository. | Blocking for deployment — run `git init`. |

---

## Not Implemented (by design)

| Ticket(s) | Item | Reason |
|-----------|------|--------|
| DLVR-018 | GoFax fallback fax provider | Notifyre is primary; GoFax is a future fallback if needed |
| PDF-009 | 90-day active PDF purge | Handled by `deploy/retention.sh` cron, not application code |
| FORM-003 note | EXAM_TYPES has 27 entries including "Other" | Matches PRD exactly (27 items listed, "Other" is #1) |

---

## N/A / Deferred (54 tickets)

- **35 TEST tickets**: All require runtime/manual testing (PHI parsing accuracy, email/fax delivery, security penetration testing, browser QA, backup restore drill, parallel run)
- **15 GOLV tickets**: Deferred to deployment (DNS, credentials, staff accounts, training, cutover)
- **4 INTG tickets**: Require live environment for E2E verification

---

## Recommendations — Priority Order

### Before Deployment (P0)

1. **Wire webhooks** — Import `dispatchWebhook` in delivery worker, call on job completion/failure and request status changes
2. **Fix API resend** — Add `queueDelivery()` calls in `POST /api/v1/requests/:id/resend`
3. **Fix API PHI parsing** — Call `parsePhi()` in `POST /api/v1/requests` before encrypting
4. **Run git init** — Initialize the repository
5. **Run prisma migrate** — Generate initial migration

### Before Go-Live (P1)

6. **Wire alerting** — Replace placeholder `send_alert()` with actual SMS/email/Slack integration
7. **Wire off-box shipping** — Uncomment and configure backup/archive remote transfer
8. **Add log shipping** — Configure rsyslog/filebeat for tamper-resistant audit trail
9. **Add queue health monitoring** — BullMQ dashboard or health endpoint
10. **Add memory monitoring** — Memory check in health-monitor.sh
11. **Configure unattended-upgrades** — Automated OS security patches
12. **Add fax webhook IP allowlisting** — NOTIFYRE_WEBHOOK_IPS env var check

### Nice to Have

13. Auto-focus first form field
14. `rq_test_` API key prefix for development
15. Practice list search/sort controls
16. Dependency vulnerability scanning (Dependabot/Snyk)
17. Real-time delivery status updates (WebSocket/polling)
