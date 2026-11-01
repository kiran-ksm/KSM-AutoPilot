# Testing Guide — KSM AutoPilot

## Running Tests

### Backend

```powershell
cd c:\Projects\KSM-AutoPilot
pip install -r tests/backend/requirements-test.txt
pytest tests/backend -v
```

### Frontend

```powershell
cd frontend
npm run test          # single run (vitest --run)
npm run test:watch    # watch mode
```

### CDK Synthesis

```powershell
cd infra
cdk synth --context deploy_env=dev
```

## Test Coverage — Status

### Backend (pytest + moto)

| Area | Status |
|------|--------|
| Pydantic validation — CreateLeadRequest | ✅ Implemented |
| Pydantic validation — UpdateLeadRequest, SMS, Email | ✅ Implemented |
| Auth — get_caller_identity, require_tenant_access, require_role | ✅ Implemented |
| Response helpers (ok/created/error/Decimal serialization) | ✅ Implemented |
| Messaging — DEMO_MODE never calls boto3 | ✅ Implemented |
| Lambda handler — create_lead (moto DynamoDB) | ✅ Implemented |
| Lambda handler — list_leads, get_lead, update_lead | ✅ Implemented |
| Cross-tenant access prevention | ✅ Implemented |
| VehicleInterest as object vs string | ⚠ Not yet tested |
| Consent / attribution fields | ⚠ Not yet tested |
| AI scoring — Bedrock timeout / guardrail block / malformed output | ⚠ Not yet tested |
| Appointment creation handler | ⚠ Not yet tested (handler not yet deployed) |
| Duplicate lead / idempotency | ⚠ Not yet tested |
| Opt-out suppression enforcement | ❌ Not implemented (Phase 5) |

### Frontend (Vitest + Testing Library)

| Area | Status |
|------|--------|
| LeadFormPage — validation + submit + error | ✅ Implemented |
| DemoConsolePage — event display + clear | ✅ Implemented |
| LeadStatusChip — all statuses | ✅ Implemented |
| Loading / empty / error states | ⚠ Partial |
| Responsive states | ⚠ Not automated |

### Infrastructure (CDK)

| Check | Status |
|-------|--------|
| CDK synthesis (dev) | ✅ Passes |
| S3 bucket private + OAC | ✅ Verified |
| API CORS not wildcard | ✅ Verified (CloudFront domain only) |
| CloudFront HTTPS redirect | ✅ Verified |
| No secrets in frontend assets | ✅ Verified (no hardcoded values) |

## Running a Deployment Smoke Test

```powershell
# 1. Verify public lead endpoint
$body = '{"firstName":"Test","lastName":"User","email":"t@t.com","phone":"(201) 555-0001","inquiryType":"TEST_DRIVE","consent":{"email":true,"sms":false,"phone":false}}'
$r = Invoke-RestMethod -Uri "https://28o5fql3xg.execute-api.us-east-1.amazonaws.com/dev/api/v1/public/leads" -Method POST -Body $body -ContentType "application/json"
Write-Host "Lead created: $($r.leadId)"

# 2. Verify CloudFront serves 200
Invoke-WebRequest -Uri "https://d26x1mouwd2br3.cloudfront.net/" -UseBasicParsing | Select-Object StatusCode
```

## Gaps Requiring Tests Before Production

1. Cross-tenant authorization (tenant A cannot read tenant B's leads)
2. VehicleInterest structured object storage and retrieval
3. AI scoring with Bedrock guardrail block and timeout fallback
4. `DEMO_MODE=true` never calls SNS or SES (backend Lambda)
5. Appointment creation Lambda handler
6. Idempotency — duplicate lead submission prevention
7. Status transition validation (e.g. cannot move from WON to NEW without override)
