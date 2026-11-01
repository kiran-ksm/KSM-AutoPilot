# Integrations — KSM AutoPilot

## Implementation Status

| Integration | Status | Phase | Notes |
|------------|--------|-------|-------|
| DynamoDB | ✅ Operational | 2 | Single-table, GSI1 |
| Amazon Cognito | ✅ Operational | 2 | Custom tenantId/role attrs |
| Amazon Bedrock | ✅ Operational | 3 | Claude 3 Sonnet + Guardrails |
| CloudFront + S3 | ✅ Operational | 2 | OAI, HTTPS, SPA routing |
| SES (Email) | 🟡 Simulated | 4 | DEMO_MODE=true; from: info@ksmtechnologies.net |
| SNS SMS | 🟡 Simulated | 4 | DEMO_MODE=true; no real sends |
| Inventory Feed | 🟡 Mock adapter | 5 | 15 demo vehicles; InventoryProvider interface ready |
| CRM (VinSolutions / DealerSocket) | ❌ Not configured | 5 | CRMProvider interface defined |
| DMS (CDK / Reynolds) | ❌ Not configured | 5 | Requires authorized DMS API access |
| Telephony / AI Voice | ❌ Not configured | 5 | §6.3 path 2 — requires authorized provider |
| Website Chat / Inbound | ❌ Not configured | 5 | §6.3 path 4 — requires verified adapter |
| Outbound Campaigns | ❌ Not configured | 5 | §9.3B — requires per-tenant enablement |
| Calendar / Appointments | ❌ Not configured | 5 | No double-booking without calendar integration |

## Adding a New Integration

All integrations are implemented behind provider interfaces in the Lambda Layer:

```
backend/layer/python/ksm_common/
├── messaging.py       # SMS and email adapter (replace for real provider)
├── ai.py              # Bedrock wrapper (configurable model ID)
└── integrations/      # Add new adapters here (Phase 5)
    ├── crm_provider.py
    └── inventory_provider.py
```

### Steps to connect a real vendor

1. Store credentials in AWS Secrets Manager (never in env vars or source code)
2. Implement the provider interface in `ksm_common/integrations/`
3. Write unit tests with mocked provider responses
4. Test in `dev` environment with sandbox/test credentials
5. Document field mapping, conflict-resolution rules, retry policy, and webhook signature verification
6. Deploy to `staging`, run smoke tests
7. Obtain written authorization from the dealership before connecting any live system
8. Enable in `prod` only after staging validation

## §6.3 Inbound Intake Paths — Implementation Status

Per spec §6.3, five intake paths are required:

| Path | Status | Notes |
|------|--------|-------|
| 1. Website inquiry | ✅ Implemented | `POST /api/v1/public/leads` with full attribution |
| 2. Phone call / AI voice | ❌ Phase 5 | Requires authorized telephony provider (Twilio / Amazon Connect). Recording needs approved notice/consent policy. |
| 3. Missed call | ❌ Phase 5 | Requires missed-call webhook from phone system. Text-back needs consent check. |
| 4. Chat / inbound SMS / email | ❌ Phase 5 | Each channel needs a verified provider adapter. |
| 5. Prospect list import | ❌ Phase 5 | Needs authorization, data quality validation, and eligibility checks. |

## §9.3 Outbound Campaigns — Implementation Status

Per spec §9.3B:

- **Manual single-lead messaging**: ✅ Implemented (SMS + email from lead detail, DEMO_MODE simulated)
- **Outbound campaign management**: ❌ Phase 5
- **Prospect segmentation**: ❌ Phase 5
- **Automated sending**: ❌ Phase 5 (requires per-tenant enablement with approved templates, audience rules, quiet hours, opt-out, audit logs)

## CRM Provider Interface (Contract)

```python
class CRMProvider(ABC):
    @abstractmethod
    def create_lead(self, lead: dict) -> str: ...         # returns external CRM ID
    @abstractmethod
    def update_lead(self, crm_id: str, fields: dict): ...
    @abstractmethod
    def sync_status(self, crm_id: str) -> dict: ...
    @abstractmethod
    def health_check(self) -> bool: ...
```

## Inventory Provider Interface (Contract)

```python
class InventoryProvider(ABC):
    @abstractmethod
    def list_vehicles(self, dealership_id: str) -> list[dict]: ...
    @abstractmethod
    def get_vehicle(self, vin: str) -> dict | None: ...
    @abstractmethod
    def last_sync_timestamp(self) -> str: ...
    @abstractmethod
    def health_check(self) -> bool: ...
```
