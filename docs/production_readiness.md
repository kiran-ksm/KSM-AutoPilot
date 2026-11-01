# Production Readiness Checklist — KSM AutoPilot

## Legend
- ✅ Done
- ⚠ Partial / needs review
- ❌ Not done — required before production launch

---

## Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| S3 bucket private + OAC | ✅ | No public access |
| CloudFront HTTPS only | ✅ | TLS 1.2+, HTTP redirect |
| API CORS locked to CF domain | ✅ | Per environment, not wildcard |
| DynamoDB PITR enabled | ✅ | Staging + prod |
| Separate dev / staging / prod stacks | ✅ | `KsmAp-<env>-*` prefix |
| Prod removal policy = RETAIN | ✅ | Tables and buckets retained on destroy |
| Least-privilege IAM per Lambda | ✅ | Scope-limited per function |
| CDK rollback prefix convention | ✅ | `cdk destroy KsmAp-<env>-*` |
| CloudWatch log retention configured | ✅ | 1 month per env |
| SQS DLQs for async failures | ❌ | Required before enabling follow-up automation |
| CloudWatch alarms (errors, throttles, DLQ depth) | ❌ | Required before production launch |
| Cost alarms | ❌ | Required before production launch |

## Security

| Item | Status | Notes |
|------|--------|-------|
| Backend tenant authorization on every route | ✅ | JWT claims, never browser-supplied |
| No secrets in source control or frontend | ✅ | Verified |
| Secrets Manager for third-party credentials | ✅ | Template ready; no real credentials stored yet |
| Input validation with Pydantic | ✅ | All Lambda handlers use shared models |
| Bedrock Guardrails configured | ✅ | Content, PII, topic policies |
| Cognito advanced security mode | ✅ | Enforced |
| CORS not wildcard in production | ✅ | Review before each deployment |
| Data retention + deletion policy | ❌ | Required before production |
| Privacy notice and consent language | ❌ | Required before production — legal review |
| Opt-out / suppression for SMS | ❌ | Phase 5 |
| Penetration test / security review | ❌ | Recommended before production launch |

## Functionality

| Item | Status | Notes |
|------|--------|-------|
| Public lead form | ✅ | Mobile-first, attribution, consent |
| Lead list with all filters | ✅ | Status, source, dealership, inquiry, priority, salesperson, date range, follow-up |
| Customer 360 profile | ✅ | Contact, consent, vehicle, attribution, AI summary, timeline |
| Dashboard metrics (real data) | ✅ | 10 KPIs computed from DynamoDB |
| Inventory browser (mock) | ✅ | 3 dealerships, 15 vehicles, vehicle detail drawer |
| Appointments | ✅ | Request, confirm, reschedule, cancel, walk-in |
| Demo Console | ✅ | §9.1 compliant — masked, SIMULATED, correlation ID |
| Integration status page | ✅ | All 12 integrations documented |
| AI lead scoring | ✅ | Bedrock Claude 3 Sonnet + Guardrails |
| SMS simulation | ✅ | DEMO_MODE; real requires production enablement |
| Email simulation | ✅ | DEMO_MODE; from info@ksmtechnologies.net |
| Phone / missed-call intake (§6.3) | ❌ | Phase 5 |
| Inbound SMS / chat routing (§6.3) | ❌ | Phase 5 |
| Outbound campaigns (§9.3) | ❌ | Phase 5 |
| CRM sync | ❌ | Phase 5 |
| Calendar confirmation | ❌ | Phase 5 |
| Export with audit log | ❌ | Phase 5 |
| Duplicate detection | ❌ | Phase 5 |

## Demo Mode Safety

| Item | Status |
|------|--------|
| DEMO_MODE blocks real SMS | ✅ |
| DEMO_MODE blocks real email | ✅ |
| No real PII in demo seed data | ✅ |
| Demo Console shows SIMULATED label | ✅ |
| Demo data labeled in UI | ✅ |

## Known Limitations

1. **§6.3 intake paths 2–5** (phone, missed call, chat, prospect import) are not implemented. The application only supports website form intake in the MVP.
2. **§9.3B outbound campaigns** are not implemented. Manual single-lead messaging only. Any campaign capability requires per-tenant enablement with approved policies.
3. **Calendar integration** — appointments are requested but not auto-confirmed. No double-booking prevention without a connected calendar.
4. **Activity timeline** is partially synthetic on the lead detail page — backend activity query is not yet connected to a per-lead timeline API.
5. **Duplicate detection** — no server-side duplicate check on email/phone at lead creation.
6. **Demo Console persistence** — events are in-memory only; cleared on page reload. Production requires CloudWatch log-based audit trail.
7. **Bedrock AI voice agent** — spec §6.3 path 2 requires a connected telephony provider. Not in scope for MVP.

## Before Go-Live

- [ ] Deploy to staging, run full smoke test suite
- [ ] Confirm DEMO_MODE=false in prod config
- [ ] Confirm SES domain verified for info@ksmtechnologies.net
- [ ] Set up CloudWatch alarms for errors, throttles, DLQ, cost
- [ ] Define and document data retention and deletion procedures
- [ ] Legal review of privacy notice and per-channel consent language
- [ ] Obtain written authorization from dealership for each live integration
- [ ] Remove all synthetic demo seed data from production database
- [ ] Brief salesperson users on AI-assisted features and their limitations
