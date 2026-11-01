# Architecture — KSM AutoPilot

## System Overview

KSM AutoPilot is a multi-tenant, serverless AWS application for dealership lead management and customer engagement.

```
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront Distribution                    │
│              (HTTPS, S3 OAC, SPA routing)                     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                    │
│  S3      │           API Gateway REST API                     │
│ (Static  │         (/api/v1/* with Cognito auth)              │
│  Assets) │                                                    │
│          │  ┌─────────────────────────────────────────────┐  │
│          │  │            Lambda Layer (ksm_common)          │  │
│          │  │  db · auth · validation · logging · ai ·      │  │
│          │  │  messaging · response · exceptions           │  │
│          │  └─────────────────────────────────────────────┘  │
│          │         │          │          │          │        │
│          │    ┌─────┴──┐  ┌───┴──┐  ┌───┴──┐  ┌───┴──┐     │
│          │    │ Leads  │  │ Dash │  │ AI   │  │ Msg  │     │
│          │    │ CRUD   │  │ board│  │ Score│  │ SMS  │     │
│          │    └────────┘  └──────┘  └──────┘  └──────┘     │
│          │         │                                       │
│          │    ┌─────┴──────────────────┐                    │
│          │    │     DynamoDB            │                    │
│          │    │  (single-table design)  │                    │
│          │    │  GSI1: status queries   │                    │
│          │    └─────────────────────────┘                    │
└──────────┴──────────────────────────────────────────────────┘
```

## Components

### Frontend
- **React 18 + TypeScript + Vite** — SPA with MUI v5
- **Inter** typography, **Lucide** icons
- Light/dark theme with localStorage persistence
- API service layer separate from components
- Pages: Dashboard, Leads, Lead Detail (Customer 360), Inventory, Appointments, Demo Console, Settings

### API Gateway
- REST API with `/api/v1/` versioning
- Cognito authorizer on protected routes
- CORS locked to CloudFront distribution domain
- Public endpoint: `POST /api/v1/public/leads` (no auth, with throttling)
- Access logging to CloudWatch

### Lambda Functions
| Function | Route | Auth | Purpose |
|----------|-------|------|---------|
| create_lead | POST /api/v1/public/leads | Public | Public lead form submission |
| list_leads | GET /api/v1/leads | Cognito | Paginated lead list with filters |
| get_lead | GET /api/v1/leads/{leadId} | Cognito | Single lead detail |
| update_lead | PATCH /api/v1/leads/{leadId} | Cognito | Update status/notes/assignment |
| delete_lead | DELETE /api/v1/leads/{leadId} | Cognito (ADMIN) | Soft-delete lead |
| get_stats | GET /api/v1/dashboard/summary | Cognito | Dashboard KPI metrics |
| get_leads_by_status | GET /api/v1/dashboard/leads-by-status | Cognito | Status chart data |
| get_activity | GET /api/v1/dashboard/activity | Cognito | Recent activity feed |
| send_sms | POST /api/v1/messaging/sms | Cognito | SMS (demo or real SNS) |
| send_email | POST /api/v1/messaging/email | Cognito | Email (demo or real SES) |
| score_lead | POST /api/v1/ai/score-lead/{leadId} | Cognito | Bedrock AI scoring with Guardrails |

### Lambda Layer (ksm_common)
Shared Python modules:
- `db` — DynamoDB single-table helpers
- `auth` — JWT tenant/role enforcement
- `validation` — Pydantic v2 request models
- `logging` — AWS Lambda Powertools structured JSON
- `messaging` — SNS/SES with DEMO_MODE intercept
- `ai` — Bedrock invocation with Guardrails
- `response` — API Gateway response helpers with CORS
- `exceptions` — Domain exception hierarchy
- `middleware` — Handler decorator with error mapping

### DynamoDB
- Single-table design with tenant-scoped partition keys
- GSI1 for status-based queries
- Pay-per-request billing
- Point-in-time recovery on staging/prod
- See [database_schema.md](./database_schema.md) for full schema

### Cognito
- User Pool with custom attributes: `tenantId`, `role`
- Self sign-up disabled (admin-only user creation)
- Advanced security mode enforced
- Token validity: 1 hour access/id, 30 day refresh

### Bedrock + Guardrails
- Dedicated Guardrail per environment
- Content filters: hate, violence, sexual, misconduct, prompt attack
- PII protection: block email/phone/address, anonymize name
- Topic restrictions: deny financial/medical advice
- Guardrail ID passed to Lambda via environment variable

## Environments

| Env | Demo Mode | Removal Policy | PITR | Log Level |
|-----|-----------|----------------|------|-----------|
| dev | true | DESTROY | off | DEBUG |
| staging | true | DESTROY | on | INFO |
| prod | false | RETAIN | on | WARNING |

## Multi-Tenancy

- Each tenant gets a unique `tenantId` stored in Cognito custom attribute
- All DynamoDB records scoped by `TENANT#<tenantId>` partition key prefix
- Backend authorization derives tenant from verified JWT claims
- Frontend never supplies tenant ID — server always authoritative

## DEMO_MODE

When `DEMO_MODE=true`:
- SMS/email calls are intercepted and logged to CloudWatch instead of calling SNS/SES
- Frontend logs payloads to Demo Event Console
- AI scoring returns synthetic results
- No external API calls are made
- All demo data is visibly labeled

## Cost Optimization

- Pay-per-request DynamoDB (no provisioned capacity)
- Lambda only runs on request (no always-on compute)
- CloudFront caching for static assets
- Lambda memory: 256MB (dev), 512MB (staging/prod)
- Log retention: 1 month
- Bedrock invoked on-demand only
