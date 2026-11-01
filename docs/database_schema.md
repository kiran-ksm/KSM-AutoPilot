# Database Schema — DynamoDB Single-Table Design

## Overview

KSM AutoPilot uses a single-table DynamoDB design with a tenant-scoped partition key pattern. This document defines all entities, key patterns, GSIs, and access patterns.

## Table Configuration

- **Billing mode:** Pay-per-request (on-demand)
- **Encryption:** AWS-managed (SSE-KMS)
- **Point-in-time recovery:** Enabled on staging and prod
- **Streams:** NEW_AND_OLD_IMAGES (for Phase 5 automation triggers)

## Entity Definitions

| Entity | PK Pattern | SK Pattern | Purpose |
|--------|-----------|-----------|---------|
| Lead | `TENANT#<tenantId>` | `LEAD#<leadId>` | Customer lead record |
| Activity | `TENANT#<tenantId>` | `ACTIVITY#<isoTimestamp>#<activityId>` | Chronological activity events |
| Appointment | `TENANT#<tenantId>` | `APPOINTMENT#<appointmentId>` | Appointment requests and confirmations |

## GSI Indexes

### GSI1 — Leads by Status

| Attribute | Type | Purpose |
|----------|------|---------|
| GSI1PK | String | `STATUS#<status>` — partition by status |
| GSI1SK | String | `TENANT#<tenantId>#LEAD#<leadId>` — sort by tenant + lead |

**Query patterns:**
- Get all leads with a given status for a tenant (filter GSI1SK by prefix)
- Count leads by status for dashboard metrics

## Access Patterns

| # | Pattern | Key Condition |
|---|---------|---------------|
| 1 | Get lead by tenant + lead ID | `PK = TENANT#<t> AND SK = LEAD#<id>` |
| 2 | List leads for a dealership | `PK = TENANT#<t>` begins_with `LEAD#` (filter by dealershipId) |
| 3 | List leads assigned to salesperson | `PK = TENANT#<t>` begins_with `LEAD#` (filter by assignedTo) |
| 4 | List leads requiring follow-up | `PK = TENANT#<t>` filter `nextFollowUp <= <timestamp>` |
| 5 | Get customer profile + activity timeline | `PK = TENANT#<t>` query, sort by SK prefix |
| 6 | Find customer by email/phone | Scan with filter (Phase 2: add GSI if needed) |
| 7 | List recent activity for tenant | `PK = TENANT#<t>` begins_with `ACTIVITY#` (reverse sort) |
| 8 | Get appointment by ID | `PK = TENANT#<t> AND SK = APPOINTMENT#<id>` |
| 9 | Dashboard aggregate metrics | Query GSI1 per status, count items |
| 10 | List demo messaging events | `PK = TENANT#<t>` begins_with `EVENT#` |

## Tenant Isolation

Every record includes `tenantId` in the PK prefix (`TENANT#<tenantId>`). Backend authorization derives the tenant from verified Cognito JWT claims, never from request parameters. A user from Tenant A cannot read or mutate Tenant B data because the PK is server-derived.

## Example Items

### Lead
```json
{
  "PK": "TENANT#tenant-dev-001",
  "SK": "LEAD#uuid-here",
  "GSI1PK": "STATUS#NEW",
  "GSI1SK": "TENANT#tenant-dev-001#LEAD#uuid-here",
  "leadId": "uuid-here",
  "tenantId": "tenant-dev-001",
  "dealershipId": "dealership-mercedes",
  "firstName": "James",
  "lastName": "Thompson",
  "email": "james.thompson@gmail.com",
  "phone": "(201) 555-0123",
  "inquiryType": "TEST_DRIVE",
  "vehicleInterest": {"year": 2024, "make": "Mercedes-Benz", "model": "C-Class", "trim": "C 300"},
  "status": "NEW",
  "source": "WEBSITE",
  "priority": "HOT",
  "aiScore": 85,
  "consent": {"email": true, "sms": true, "phone": false},
  "createdAt": "2026-10-31T00:00:00Z",
  "updatedAt": "2026-10-31T00:00:00Z"
}
```

### Activity
```json
{
  "PK": "TENANT#tenant-dev-001",
  "SK": "ACTIVITY#2026-10-31T00:00:00Z#uuid",
  "activityId": "uuid",
  "leadId": "lead-uuid",
  "leadName": "James Thompson",
  "type": "SMS",
  "description": "SMS sent: Hi! Your test drive is confirmed",
  "createdAt": "2026-10-31T00:00:00Z"
}
```

## Hot-Partition Considerations

Activity records use `ACTIVITY#<isoTimestamp>#<uuid>` as the sort key, distributing writes across time. If activity volume grows significantly, consider partition sharding by date (`TENANT#<t>#YYYY-MM`) to avoid hot partitions on high-traffic tenants.

## Idempotency

Lead creation uses conditional writes (`attribute_not_exists(PK)`) to prevent duplicates. For externally retried operations (webhooks, message events), an idempotency token is stored with a TTL for deduplication.
