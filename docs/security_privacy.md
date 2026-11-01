# Security & Privacy — KSM AutoPilot

## Authentication & Authorization

| Control | Implementation |
|---------|---------------|
| User authentication | Amazon Cognito User Pool |
| Session tokens | Cognito id/access tokens (1h validity), refresh token (30d) |
| Tenant scope | `custom:tenantId` Cognito attribute — set at user creation, immutable |
| Role | `custom:role` Cognito attribute — ADMIN / AGENT / VIEWER |
| Backend authorization | Every Lambda derives tenant + role from verified JWT claims |
| Tenant isolation | DynamoDB PK always `TENANT#<tenantId>` — cannot be overridden by frontend |
| Public endpoints | `POST /api/v1/public/leads` — no auth, rate-limited, no customer data returned |

## Infrastructure Security

- S3 bucket: private, block all public access, CloudFront OAC only
- CloudFront: HTTPS only, TLS 1.2+, HTTP → HTTPS redirect
- API Gateway: CORS allowlist scoped to CloudFront distribution domain per environment
- Lambda IAM: least-privilege per function (DynamoDB read/write only to own table; SNS publish to SMS only; SES send only)
- Secrets Manager: third-party credentials stored only in Secrets Manager — never in environment variables or source code
- CDK removal policy: DESTROY only on dev/staging; RETAIN on prod

## Data Protection

- DynamoDB: AWS-managed SSE (AES-256 at rest)
- CloudFront: HTTPS in transit
- S3: AWS-managed SSE
- Logs: structured JSON via Lambda Powertools — no full message bodies, no raw PII
- Demo Console: recipient destinations masked (e.g. `(***) ***-4321`, `j***@g***.com`)

## Privacy & Consent

- Consent captured per channel (email / SMS / phone) at lead creation
- Consent stored with channel, status, source, and timestamp on the lead record
- DEMO_MODE: no real messages sent regardless of consent
- Production: consent and suppression checked before every outbound message
- Browsing events not linked to a customer without explicit identification and consent
- Data retention and deletion procedures: **not yet defined — required before production launch**

## Audit Trail

Actions that must be audited (via activity timeline and CloudWatch):
- Lead creation, update, assignment, deletion
- Status changes
- Message sends (with consent decision)
- AI scoring invocations
- Appointment creation and status changes
- User login and role changes (via Cognito audit logs)
- Integration configuration changes

## Known Gaps / Pre-Production Requirements

1. **Retention & deletion workflow** — define per-tenant data retention policy and implement a deletion/anonymization path before production.
2. **Privacy notice** — channel-specific consent language must be reviewed by dealership legal owner.
3. **CORS wildcard** — currently uses CloudFront domain. Verify production origin is locked and never `*`.
4. **Suppression lists** — opt-out / STOP handling not yet implemented for SMS (Phase 5).
5. **HIPAA/PCI** — KSM AutoPilot does not handle health or payment card data. Do not make compliance claims without a formal assessment.
