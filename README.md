# KSM-AutoPilot

Multi-tenant dealership lead management and follow-up automation platform.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Material UI (MUI v5) |
| Hosting | S3 (private) + CloudFront + OAC |
| Auth | Amazon Cognito |
| API | API Gateway REST + Python Lambda |
| Database | DynamoDB (single-table design) |
| AI | Amazon Bedrock + Guardrails |
| Messaging | SNS/SES (DEMO_MODE available) |
| Infrastructure | AWS CDK (Python) |
| Logging | AWS Lambda Powertools (structured JSON) |
| Shared Code | Lambda Layer |

## Rollback Strategy

Every CDK stack is prefixed with `KsmAp-<env>-`. To roll back a full environment:

```bash
cdk destroy KsmAp-dev-*       # destroy dev
cdk destroy KsmAp-staging-*   # destroy staging
cdk destroy KsmAp-prod-*      # destroy prod (confirm carefully)
```

Individual stacks:
- `KsmAp-<env>-Foundation`  — S3, CloudFront, Cognito
- `KsmAp-<env>-Database`    — DynamoDB tables
- `KsmAp-<env>-Api`         — Lambda Layer, Lambda functions, API Gateway
- `KsmAp-<env>-Ai`          — Bedrock Guardrails, IAM roles
- `KsmAp-<env>-Messaging`   — SNS, SES config

## Environments

- `dev` — local/sandbox development
- `staging` — pre-production validation
- `prod` — live production

## Project Structure

```
KSM-AutoPilot/
├── frontend/           # React + TypeScript + Vite
├── backend/
│   ├── layer/          # Shared Lambda Layer (Python)
│   └── functions/      # Lambda function handlers
├── infra/              # AWS CDK (Python)
├── scripts/            # Deploy / teardown helpers
└── tests/              # Automated tests
```

## Quick Start

See `scripts/deploy.sh` for full deployment instructions.

## Implementation Phases

| Phase | Scope |
|---|---|
| 1 | React app, responsive layouts, public lead form, demo dashboard |
| 2 | Python Lambda APIs, DynamoDB, Cognito |
| 3 | AI lead scoring (Bedrock) |
| 4 | SMS and email integration |
| 5 | Follow-up automation and inbound messaging |
| 6 | CDK deployment, S3 + CloudFront, tests, documentation |
