# Requests API v1.0

> Service-to-service API for Synaptum 8 integration

## Overview

REST API enabling Synaptum 8 to programmatically create and manage imaging requests within Requests. Designed for backend-to-backend communication between Synaptum 8 (FastAPI) and Requests (Next.js).

**Base URL:** `https://requests.curaspecialists.com.au/api/v1`

---

## Authentication

### API Key Authentication

Service-to-service auth via API keys (not user JWT sessions). API keys are scoped to a specific user account (the "acting as" user) for audit trail purposes.

**Header:**
```
Authorization: Bearer rq_live_<api_key>
```

**Key format:** `rq_live_` prefix (production) or `rq_test_` prefix (development)

### API Key Model

```prisma
model ApiKey {
  id          String    @id @default(cuid())
  name        String                          // e.g. "Synaptum 8 Production"
  keyHash     String    @unique               // SHA-256 hash of the key (never store plaintext)
  keyPrefix   String                          // First 8 chars for identification (e.g. "rq_live_a3")
  userId      String                          // Acting-as user for audit trail
  scopes      String[]  @default(["requests:write", "requests:read", "practices:read", "providers:read"])
  lastUsedAt  DateTime?
  expiresAt   DateTime?                       // Optional expiry
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
}
```

### Key Management

- Admin creates API keys via `/admin/api-keys` UI
- Full key shown once at creation, then only prefix visible
- Keys can be scoped, expired, and revoked
- All API calls audit-logged with `apiKeyId` + `userId`

### Scopes

| Scope | Description |
|-------|-------------|
| `requests:write` | Create imaging requests |
| `requests:read` | Read request status and details |
| `practices:read` | List and search radiology practices |
| `providers:read` | List providers and exam types |
| `practices:write` | Create/update practices (optional) |

---

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Per API key | 120 requests/minute |
| Create request | 30 requests/minute |
| Read endpoints | 120 requests/minute |

Rate limit headers returned on every response:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 117
X-RateLimit-Reset: 1714000000
```

---

## Common Response Format

### Success

```json
{
  "ok": true,
  "data": { ... }
}
```

### Error

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [ ... ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | Key lacks required scope |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `DUPLICATE_REQUEST` | 409 | Duplicate submission detected |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### 1. Create Imaging Request

**`POST /api/v1/requests`**

Scope: `requests:write`

Creates an imaging request, generates the PDF, and queues all delivery jobs (email/fax) asynchronously — identical to a staff form submission.

**Request Body:**

```json
{
  "practiceId": "clx...",
  "manualPractice": null,
  "rawPhiInput": "John Smith\nDOB: 15/03/1965\nMedicare: 2345 67890 1\nMobile: 0412 345 678\n42 King St, Sydney NSW 2000",
  "examType": "MRI Brain",
  "examOther": null,
  "clinicalDetails": "Persistent headaches, rule out space-occupying lesion",
  "contrastReaction": "no",
  "egfr": "85",
  "providerId": "clx...",
  "reportByBhatia": false,
  "patientEmail": "john.smith@example.com",
  "sendToPatient": true,
  "deliveryMethod": "email"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `practiceId` | string | Conditional | Required if `manualPractice` is null |
| `manualPractice` | object | Conditional | `{ name, address?, phone?, fax?, email? }` — at least email or fax required |
| `rawPhiInput` | string | Yes | Patient details text block (max 10,000 chars). Server parses via PHI parser |
| `examType` | string | Yes | Must match a valid exam type or "Other" |
| `examOther` | string | Conditional | Required when `examType` is "Other" |
| `clinicalDetails` | string | Yes | Clinical indication / reason for request |
| `contrastReaction` | enum | Yes | `"yes"` or `"no"` |
| `egfr` | string | No | eGFR value if relevant |
| `providerId` | string | Yes | Must match a valid Provider ID |
| `reportByBhatia` | boolean | No | Default `false` |
| `patientEmail` | string | No | Patient email for copy delivery |
| `sendToPatient` | boolean | No | Default `false`. Requires `patientEmail` if `true` |
| `deliveryMethod` | enum | No | `"email"`, `"fax"`, or `"both"`. Auto-determined from practice record if omitted |

**Response: `201 Created`**

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "status": "pending",
    "examType": "MRI Brain",
    "providerId": "clx...",
    "practiceId": "clx...",
    "deliveryMethod": "email",
    "sendToPatient": true,
    "pdfGenerated": true,
    "deliveryJobs": [
      {
        "id": "clx...",
        "type": "provider_email",
        "status": "queued"
      },
      {
        "id": "clx...",
        "type": "filing_email",
        "status": "queued"
      },
      {
        "id": "clx...",
        "type": "patient_email",
        "status": "queued"
      }
    ],
    "createdAt": "2026-04-03T10:30:00.000Z"
  }
}
```

**Notes:**
- PHI is parsed server-side and encrypted at rest — the API never returns PHI in responses
- Duplicate detection: if same patient name + exam type within 24hrs exists, returns `409 DUPLICATE_REQUEST` with the existing request ID. Include `"force": true` in the body to override
- Delivery jobs are queued to BullMQ and processed asynchronously

---

### 2. Get Request Status

**`GET /api/v1/requests/:id`**

Scope: `requests:read`

Returns request metadata and delivery job statuses. **Never returns PHI fields.**

**Response: `200 OK`**

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "status": "delivered",
    "examType": "MRI Brain",
    "providerId": "clx...",
    "providerName": "Winters",
    "providerNumber": "4111709B",
    "practiceId": "clx...",
    "practiceName": "Sydney Radiology",
    "deliveryMethod": "email",
    "sendToPatient": true,
    "reportByBhatia": false,
    "createdBy": "user-id",
    "createdAt": "2026-04-03T10:30:00.000Z",
    "deliveryJobs": [
      {
        "id": "clx...",
        "type": "provider_email",
        "status": "delivered",
        "attempts": 1,
        "lastError": null,
        "confirmedAt": "2026-04-03T10:30:15.000Z"
      },
      {
        "id": "clx...",
        "type": "filing_email",
        "status": "delivered",
        "attempts": 1,
        "lastError": null,
        "confirmedAt": "2026-04-03T10:30:12.000Z"
      },
      {
        "id": "clx...",
        "type": "patient_email",
        "status": "sent",
        "attempts": 1,
        "lastError": null,
        "confirmedAt": null
      }
    ]
  }
}
```

---

### 3. List Requests

**`GET /api/v1/requests`**

Scope: `requests:read`

Paginated list of requests created by this API key's user. No PHI in responses.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `status` | string | — | Filter: `pending`, `delivered`, `partial`, `failed` |
| `providerId` | string | — | Filter by provider |
| `since` | ISO date | — | Requests created after this date |
| `until` | ISO date | — | Requests created before this date |

**Response: `200 OK`**

```json
{
  "ok": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "totalPages": 3
    }
  }
}
```

---

### 4. Resend Failed Delivery

**`POST /api/v1/requests/:id/resend`**

Scope: `requests:write`

Re-queues failed delivery jobs for a request.

**Request Body (optional):**

```json
{
  "jobTypes": ["provider_fax"]
}
```

If `jobTypes` omitted, re-queues all failed jobs.

**Response: `200 OK`**

```json
{
  "ok": true,
  "data": {
    "requeuedJobs": [
      { "id": "clx...", "type": "provider_fax", "status": "queued" }
    ]
  }
}
```

---

### 5. Get PDF

**`GET /api/v1/requests/:id/pdf`**

Scope: `requests:read`

Returns the generated PDF as a binary download. Audit logged.

**Response: `200 OK`**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="request-{id}.pdf"`

---

### 6. List Radiology Practices

**`GET /api/v1/practices`**

Scope: `practices:read`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Search by name (case-insensitive, partial match) |
| `limit` | int | 50 | Max results (max 200) |

**Response: `200 OK`**

```json
{
  "ok": true,
  "data": [
    {
      "id": "clx...",
      "name": "Sydney Radiology",
      "address": "123 George St, Sydney NSW 2000",
      "phone": "(02) 9123 4567",
      "fax": "(02) 9123 4568",
      "email": "bookings@sydneyradiology.com.au"
    }
  ]
}
```

---

### 7. List Providers

**`GET /api/v1/providers`**

Scope: `providers:read`

**Response: `200 OK`**

```json
{
  "ok": true,
  "data": [
    {
      "id": "clx...",
      "doctorName": "Winters",
      "providerNumber": "4111709B",
      "location": "RPAH"
    },
    {
      "id": "clx...",
      "doctorName": "Winters",
      "providerNumber": "411170ML",
      "location": "CURA Medical Specialists"
    }
  ]
}
```

---

### 8. List Exam Types

**`GET /api/v1/exam-types`**

Scope: `providers:read`

**Response: `200 OK`**

```json
{
  "ok": true,
  "data": [
    "Other",
    "Non-contrast CT Brain",
    "CT Angiography - Circle of Willis",
    "..."
  ]
}
```

---

### 9. Webhook: Request Status Updates (Requests → Synaptum 8)

Requests can push delivery status updates to Synaptum 8 via webhook.

**Configuration:** Set `WEBHOOK_URL` and `WEBHOOK_SECRET` in Requests env, or configure per API key via admin UI.

**Payload sent to Synaptum 8:**

```
POST {webhook_url}
X-Requests-Signature: sha256=<HMAC-SHA256 of body using webhook secret>
Content-Type: application/json
```

```json
{
  "event": "delivery.status_changed",
  "requestId": "clx...",
  "deliveryJob": {
    "id": "clx...",
    "type": "provider_fax",
    "status": "delivered",
    "confirmedAt": "2026-04-03T10:35:00.000Z"
  },
  "requestStatus": "delivered",
  "timestamp": "2026-04-03T10:35:01.000Z"
}
```

**Events:**

| Event | Trigger |
|-------|---------|
| `delivery.status_changed` | Any delivery job changes status (queued → sent → delivered / failed) |
| `request.status_changed` | Overall request status changes (pending → delivered / partial / failed) |

Synaptum 8 should verify the HMAC signature and respond with `200 OK` within 5 seconds. Failed webhooks retry 3 times with exponential backoff.

---

## Synaptum 8 Integration Flow

```
Synaptum 8 (consultation session)
  │
  │  User generates referral letter mentioning imaging
  │  or explicitly orders imaging from within session
  │
  ├─ GET /api/v1/practices?search=sydney       ← Find practice
  ├─ GET /api/v1/providers                      ← Get provider list
  ├─ GET /api/v1/exam-types                     ← Get exam options
  │
  ├─ POST /api/v1/requests                      ← Create request
  │   Body: practiceId, rawPhiInput (from session PHI),
  │         examType, clinicalDetails, providerId, etc.
  │
  │  ← 201: { id, status: "pending", deliveryJobs: [...] }
  │
  │  (async) Requests generates PDF, sends email/fax
  │
  ├─ GET /api/v1/requests/:id                   ← Poll status (optional)
  │  ← 200: { status: "delivered", deliveryJobs: [...] }
  │
  └─ Webhook → Synaptum 8                       ← Push notification (preferred)
     { event: "request.status_changed", requestStatus: "delivered" }
```

### PHI Handling in Integration

Synaptum 8 already holds encrypted patient data. When creating a request:

1. Synaptum 8 decrypts the patient's PHI from its own store
2. Sends `rawPhiInput` over TLS to Requests API
3. Requests parses, encrypts, and stores — same as manual form submission
4. PHI is **never returned** in API responses (only metadata + delivery status)
5. Both systems maintain independent encrypted copies

### Linking Records

Synaptum 8 can store the Requests `id` in its own session/patient record to link the imaging request back to the consultation. The API response includes the request ID immediately on creation.

---

## Security Considerations

- **TLS only** — API rejects non-HTTPS requests
- **API keys hashed** — SHA-256, never stored in plaintext
- **PHI never in responses** — API returns metadata only, never patient data
- **PHI never in logs** — Audit log records request IDs, not content
- **Scoped keys** — Principle of least privilege per integration
- **Rate limited** — Per-key limits prevent abuse
- **Webhook HMAC** — SHA-256 signature verification on both sides
- **Key rotation** — Create new key, update Synaptum 8 config, revoke old key
- **Expiring keys** — Optional expiry date forces periodic rotation
- **IP allowlisting** — Optional per-key source IP restriction
