# Deployment Guide — KSM AutoPilot

## Prerequisites

- AWS CLI v1.22+ configured with credentials for the target account
- Python 3.12 with pip
- Node.js 20+
- AWS CDK CLI: `npm install -g aws-cdk@2.140.0`

## One-Time Setup

```powershell
.\scripts\setup_dev.ps1
```

This installs all frontend, backend layer, CDK, and test dependencies.

## Environment Configuration

After deploying CDK stacks, export outputs to `.env` files:

```powershell
python scripts/export_env.py --env dev
Copy-Item frontend\.env.dev.local frontend\.env.local
```

## Deploy a Full Environment

```powershell
.\scripts\deploy.ps1 -Env dev
```

This runs: CDK deploy → env export → frontend build → S3 sync → CloudFront invalidation.

## Deploy Individual Stacks

```powershell
# From infra/
cdk deploy KsmAp-dev-Foundation --context deploy_env=dev
cdk deploy KsmAp-dev-Database   --context deploy_env=dev
cdk deploy KsmAp-dev-Api        --context deploy_env=dev
cdk deploy KsmAp-dev-Ai         --context deploy_env=dev
```

## Stack Prefix Convention (Rollback)

All stacks are prefixed `KsmAp-<env>-` for safe rollback:

```powershell
cdk destroy "KsmAp-dev-*"        # dev — safe, DESTROY removal policy
cdk destroy "KsmAp-staging-*"    # staging — safe, DESTROY removal policy
# cdk destroy "KsmAp-prod-*"     # NEVER run without explicit sign-off — RETAIN policy
```

## Frontend-Only Deploy (after CDK is stable)

```powershell
.\scripts\deploy.ps1 -Env dev -SkipInfra
```

## Seed Demo Data

```powershell
python scripts/seed_demo_data.py
```

Populates 36 leads, 108+ activities, 9 appointments across 3 dealerships. Safe to re-run (idempotent).

## Smoke Test

```powershell
# Test public lead endpoint
$body = '{"firstName":"Smoke","lastName":"Test","email":"smoke@test.com","phone":"(201) 555-0001","inquiryType":"TEST_DRIVE","consent":{"email":true,"sms":false,"phone":false}}'
Invoke-RestMethod -Uri "$env:VITE_API_BASE_URL/public/leads" -Method POST -Body $body -ContentType "application/json"
```

## Required Secrets

| Secret | Where | Used by |
|--------|-------|---------|
| Cognito tokens | Amplify auth (browser) | Frontend JWT |
| DynamoDB access | Lambda execution role IAM | All Lambda functions |
| SES send | Lambda execution role IAM | send_email Lambda |
| SNS publish | Lambda execution role IAM | send_sms Lambda |
| Bedrock invoke | Lambda execution role IAM | score_lead Lambda |
| Third-party CRM/DMS | AWS Secrets Manager | Phase 5 only |

No secrets are stored in source control, `.env` files committed to git, or frontend bundles.

## Environments

| Env | Branch | Demo Mode | Removal | Log Level |
|-----|--------|-----------|---------|-----------|
| dev | develop | true | DESTROY | DEBUG |
| staging | staging | true | DESTROY | INFO |
| prod | main | false | RETAIN | WARNING |

## CI/CD

GitHub Actions: `.github/workflows/deploy.yml`
- OIDC role assumption (no long-lived keys)
- Branch → environment mapping
- Runs: lint → test → CDK deploy → S3 sync → CloudFront invalidation
