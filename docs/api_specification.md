# API Specification — KSM AutoPilot v1

Base URL: `https://<api-id>.execute-api.<region>.amazonaws.com/<env>/api/v1`

All protected routes require `Authorization: Bearer <CognitoIdToken>` header.

Error responses use consistent format:
```json
{"code": "ERROR_CODE", "message": "Human-readable message"}
```

## Public Endpoints

### POST /public/leads
Public lead form submission. Rate-limited. No auth required.

**Request:**
```json
{
  "firstName": "James",
  "lastName": "Thompson",
  "email": "james@example.com",
  "phone": "(201) 555-0123",
  "inquiryType": "TEST_DRIVE",
  "vehicleInterest": {"year": 2024, "make": "Mercedes-Benz", "model": "C-Class", "trim": "C 300"},
  "message": "I'd like to schedule a test drive.",
  "preferredContactMethod": "EMAIL",
  "preferredContactTime": "Weekends",
  "consent": {"email": true, "sms": true, "phone": false},
  "source": "WEBSITE",
  "attribution": {"utmSource": "google", "utmMedium": "cpc", "utmCampaign": "summer_sale"}
}
```

**Response:** `201 Created`
```json
{
  "leadId": "uuid",
  "tenantId": "tenant-dev-001",
  "status": "NEW",
  "createdAt": "2026-10-31T00:00:00Z"
}
```

## Protected Endpoints (Cognito Auth)

### GET /leads
Paginated lead list. Tenant-scoped.

**Query params:** `status`, `assignedTo`, `limit`, `nextToken`

**Response:** `200 OK`
```json
{
  "items": [{"leadId": "...", "firstName": "...", "status": "NEW", ...}],
  "total": 36,
  "nextToken": "base64cursor"
}
```

### GET /leads/{leadId}
Single lead detail with all fields.

**Response:** `200 OK` — full Lead object or `404` if not found.

### PATCH /leads/{leadId}
Partial update of status, notes, assignment, priority, next follow-up.

**Request:**
```json
{"status": "CONTACTED", "notes": "Called and left voicemail"}
```

**Response:** `200 OK` — updated Lead object.

### DELETE /leads/{leadId}
Soft-delete lead (ADMIN role only). Sets status to DELETED.

**Response:** `204 No Content`

### GET /dashboard/summary
KPI metrics for authenticated tenant.

**Response:**
```json
{
  "totalLeads": 36,
  "newLeads": 5,
  "hotLeads": 8,
  "warmLeads": 12,
  "awaitingResponse": 10,
  "followUpsDueToday": 3,
  "followUpsOverdue": 2,
  "appointmentsRequested": 0,
  "appointmentsConfirmed": 0,
  "conversionRate": 27.8,
  "avgResponseMinutes": 0,
  "wonThisMonth": 4
}
```

### GET /dashboard/leads-by-status
Lead counts grouped by status for chart rendering.

**Response:** `200 OK`
```json
[{"status": "NEW", "count": 5}, {"status": "CONTACTED", "count": 8}]
```

### GET /dashboard/activity
Recent activity feed (most recent first).

**Query params:** `limit` (default 20, max 100)

**Response:** `200 OK`
```json
[{"activityId": "...", "leadId": "...", "type": "SMS", "description": "...", "createdAt": "..."}]
```

### POST /messaging/sms
Send SMS to lead's phone. In DEMO_MODE, logged to CloudWatch only.

**Request:** `{"leadId": "...", "message": "Hello!"}`

**Response:** `200 OK`
```json
{"messageId": "demo-sms-xxx", "status": "DEMO_LOGGED"}
```

### POST /messaging/email
Send email to lead's address. In DEMO_MODE, logged to CloudWatch only.

**Request:** `{"leadId": "...", "subject": "Subject", "body": "Body text"}`

**Response:** `200 OK`
```json
{"messageId": "demo-email-xxx", "status": "DEMO_LOGGED"}
```

### POST /ai/score-lead/{leadId}
Trigger AI lead scoring via Amazon Bedrock with Guardrails.

**Response:** `200 OK`
```json
{"leadId": "...", "score": 85, "reasoning": "Strong purchase intent...", "nextAction": "Schedule test drive"}
```

## CORS

- Allowed origins: CloudFront distribution domain only (per environment)
- Allowed methods: GET, POST, PATCH, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization
- Preflight cache: 1 hour

## Rate Limits

- Burst: 50 requests
- Rate: 100 requests/second
- Public endpoint: additional throttling recommended

## Idempotency

Lead creation uses conditional writes to prevent duplicates. For externally retried operations, include an `Idempotency-Key` header (Phase 2 implementation).

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Validation error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (tenant mismatch, insufficient role) |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Internal server error |
