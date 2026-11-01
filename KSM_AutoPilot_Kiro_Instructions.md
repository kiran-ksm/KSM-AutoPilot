# KSM AutoPilot — Kiro Project Instructions and Implementation Specification

**Document purpose:** This is the authoritative project instruction file for Kiro. Use it as the primary implementation guide when creating, modifying, testing, and deploying KSM AutoPilot.

**Product name:** KSM AutoPilot  
**Positioning:** AI-Powered Automotive Lead Management & Customer Engagement  
**Tagline:** Turn Every Inquiry Into an Opportunity.  
**Initial release:** AI Lead Capture & Follow-Up MVP  
**Architecture:** Multi-tenant, serverless AWS application  
**Primary deployment model:** One shared AWS platform serving multiple dealership groups, brands, and locations.

---

## 1. Instructions to Kiro

1. Read the existing repository, source files, configuration, and documentation before changing anything.
2. Preserve useful existing code and working functionality. Refactor incrementally; do not replace working files simply to impose a new structure.
3. Treat this document as authoritative when requirements conflict with older project notes. If a technical conflict remains unresolved, explain it and ask before making an irreversible architectural choice.
4. Implement a working end-to-end application, not just mock screens. Use mock adapters and synthetic data where external dealership credentials or APIs are unavailable.
5. Do not assume Ray Catena has approved a pilot, provided access, selected vendors, or authorized production integration. Ray Catena is a demonstration prospect only unless the project owner explicitly confirms otherwise.
6. Do not invent CRM, DMS, inventory, website, calendar, or communications API capabilities. Keep integrations behind replaceable adapters and document what is mocked versus verified.
7. Work in small, testable increments. After each phase, run tests, lint/type checks, and builds; fix failures before proceeding.
8. Do not silently omit a requirement. If a requirement cannot be implemented, document the reason, the dependency, the proposed alternative, and the remaining work.
9. Keep secrets out of source control and frontend bundles. Use AWS-managed secrets/configuration and least-privilege IAM.
10. Generate synthetic demonstration data only. Never seed real customer personal information.
11. Do not send real SMS  during development or demonstration. Use `DEMO_MODE` unless production messaging has been explicitly configured and authorized.
12. Before deploying or running any operation that can incur meaningful AWS charges, explain the resources and expected cost drivers and require an explicit deployment instruction from the project owner.
13. For Emails use from email address as info@ksmtechnologies.net and to email as kiran786@gmail.com

## 2. Product vision and scope

KSM AutoPilot is a customer engagement and lead-management layer that connects dealership website inquiries, approved browsing signals, inventory information, CRM records, salesperson workflows, and AI-assisted follow-up.

It is not intended to replace the dealership's existing CRM or DMS. Existing dealership systems remain authoritative systems of record. KSM AutoPilot should capture, enrich, route, summarize, and coordinate customer engagement while synchronizing approved information with those systems.

### 2.1 MVP goals

The first release must demonstrate this complete journey:

1. A prospective customer visits a dealership landing page or vehicle detail page.
2. The customer submits an inquiry, requests information, or asks for a test drive.
3. KSM AutoPilot captures the inquiry, source attribution, vehicle interest, consent choices, and server-generated timestamp.
4. The backend validates the request, resolves the correct tenant/dealership, prevents duplicate submissions where possible, and stores the lead.
5. The AI service generates a concise lead summary and suggested next action using approved data only.
6. The lead appears in the salesperson dashboard and is assigned or placed in an unassigned queue.
7. The system records an acknowledgement/follow-up event. In demo mode, messages are simulated and shown in the dashboard event console.
8. A customer reply can be simulated or received through a configured provider adapter.
9. The salesperson can review the lead, activity timeline, vehicle interest, communication history, and next action.
10. The application records appointment requests. It must not claim an appointment is confirmed until a connected dealership calendar or authorized user confirms it.

### 2.2 MVP success criteria

- A user can submit a valid public lead form on desktop and mobile.
- The lead is persisted in DynamoDB and remains after refresh/sign-in.
- Server-generated UTC timestamps are stored consistently.
- Lead source and campaign attribution are captured reliably.
- Tenant isolation is enforced in the backend.
- An authenticated salesperson can search, filter, view, update, and assign authorized leads.
- The customer profile includes a chronological activity timeline.
- AI-generated summaries are clearly labeled as AI-generated and can be regenerated.
- SMS/email simulation works without contacting external providers in `DEMO_MODE`.
- All simulated communications appear in a dedicated dashboard event console.
- Mock CRM and inventory adapters can be replaced without rewriting business logic.
- Automated tests cover authorization, tenant isolation, validation, lead creation, status changes, and demo messaging.
- The application deploys through repeatable Python CDK scripts to a selected environment.

## 3. Mandatory technology and implementation overrides

These requirements supersede any conflicting technology choices in earlier project documentation.

1. Frontend must use **React + TypeScript + Vite**.
2. Use **Material UI (MUI)** for responsive UI components.
3. Backend must use **Python AWS Lambda functions**.
4. All static frontend hosting must use **Amazon S3 + CloudFront**.
5. S3 frontend bucket must remain private and use **CloudFront Origin Access Control (OAC)**. Do not enable public bucket access.
6. Do not use AWS Amplify Hosting.
7. Do not use EC2, ECS, containers, or an always-running application server.
8. API communication must use **API Gateway REST APIs**. Configure CORS to allow only the configured CloudFront application origin(s) for the relevant environment. Do not use wildcard origins in production. CORS is not an authorization mechanism; also enforce authentication and authorization in the backend.
9. Database must use **DynamoDB**. Use a single-table design where it provides clear value for multi-tenant access patterns. Do not force every entity into one table if it makes access patterns, isolation, or operations worse. Document the rationale and all access patterns and indexes.
10. Authentication must use **Amazon Cognito**.
11. Infrastructure as code must use **AWS CDK written in Python**.
12. All pages must be responsive and mobile-first.
13. Implement shared Python modules for database access, authorization, validation, logging, AI, and messaging. Package reusable modules as a Lambda Layer to avoid duplicate distribution across functions. Keep function-specific handlers small.
14. Implement frontend API services separately from React components.
15. Configure separate **development, staging, and production** environments.
16. Never hardcode AWS account IDs, region-specific resource identifiers, credentials, bucket names, distribution IDs, or secrets.
17. Use environment-specific configuration and CDK stack outputs.
18. Configure CloudFront SPA routing and caching. Configure custom CloudFront error responses so 403/404 responses for application routes serve `/index.html` with an appropriate response code for React Router navigation. Ensure missing static assets do not silently return the SPA HTML as if they were valid assets.
19. Enable HTTPS. Redirect HTTP to HTTPS.
20. Include automated tests, linting/type checks, and deployment scripts.
21. Never expose backend AWS credentials or service secrets in frontend code.
22. Implement `DEMO_MODE` to simulate SMS and email without sending real messages. When `DEMO_MODE=true`, mock messaging calls must write structured payloads/events to a dedicated dashboard event console and must not call external communication SDKs or provider APIs.
23. Enforce tenant authorization in Python backend functions. Never rely on frontend filtering or a browser-supplied tenant ID.
24. Optimize for low operating cost and shared multi-dealership hosting.
25. Use structured JSON logging across every backend Lambda, preferably AWS Lambda Powertools. Include correlation/request ID, environment, tenant/dealership ID where authorized, function name, operation, outcome, and error details. Do not log secrets, full payment data, or unnecessary personal information.
26. All generative AI features using Amazon Bedrock must use dedicated **Guardrails for Amazon Bedrock**. Configure input/output checks appropriate to the feature, and prevent disclosure of private customer data across tenants. Guardrails supplement—not replace—authorization, data minimization, prompt construction controls, and output validation.
27. Use environment variables for non-secret configuration and AWS Secrets Manager or an equivalent managed secret store for secrets.
28. Use least-privilege IAM roles for every Lambda and service.
29. Use UTC ISO 8601 timestamps in storage and APIs. Convert to the user's/dealership's local timezone only in the UI.
30. Use idempotency controls for externally retried operations such as lead creation, webhook processing, and message events.

## 4. Application roles and permissions

Implement role-based access control. Roles are scoped to a tenant and, where applicable, one or more dealership locations.

- **Platform Administrator:** manages platform-level configuration and tenants; access must be tightly restricted and audited.
- **Dealer Group Administrator:** manages the group's dealerships, users, integrations, and settings.
- **Dealership Manager:** views and manages leads for authorized dealership locations, assigns salespeople, reviews activity and reporting.
- **Salesperson:** views and updates leads assigned to them or otherwise permitted by dealership policy; records notes and follow-up outcomes.
- **Marketing/Reporting User:** views permitted attribution and aggregate performance reports; cannot access unrelated customer details unless explicitly granted.
- **Demo User:** accesses synthetic demo data only and cannot trigger real communications or production integrations.

Cognito authenticates users. Backend authorization derives tenant, role, and dealership scope from verified claims and server-side membership/configuration. Do not accept role, tenant, or dealership scope as authoritative from request body or query parameters.

## 5. Multi-tenant and dealership model

The platform must support multiple dealer groups, brands, and dealership locations in one shared AWS account and application deployment.

Core hierarchy:

- Tenant / dealer group
- Brand (optional grouping)
- Dealership / rooftop / location
- User membership and role
- Lead and customer
- Vehicle interest and inventory reference
- Conversation and activity
- Appointment request
- Integration configuration
- Consent and communication preferences

Every tenant-owned record must have an unambiguous tenant identifier and, where applicable, dealership identifier. Enforce scope on every read and write. A user from Tenant A must never read or mutate Tenant B data, even if they guess an ID.

For a shared table, design keys and GSIs around documented query patterns. Avoid a single hot partition for all activity. Consider partition sharding or separate high-volume event storage if justified by load testing. Do not add indexes without a query requirement.

Required access patterns to document and implement:

1. Get a lead by tenant and lead ID.
2. List leads for a dealership, optionally filtered by status and date.
3. List leads assigned to a salesperson.
4. List leads requiring follow-up before/after a due timestamp.
5. Get a customer profile and recent activity timeline.
6. Find a customer by normalized email or phone within an authorized tenant.
7. Get vehicle/inventory details by dealer and VIN/stock number.
8. List recent demo messaging events for the authorized tenant.
9. Retrieve integration status and sync history.
10. List dashboard aggregate metrics for the selected authorized scope.

Use DynamoDB transactions or conditional writes where needed to maintain consistency. Define TTL only for records with a clear retention policy, such as temporary idempotency tokens or short-lived sessions. Do not apply TTL to leads or customer records by default.

## 6. Lead capture and attribution

Build a responsive public lead form that can be embedded or linked from dealership landing pages and vehicle detail pages.

### 6.1 Required lead fields

- First name
- Last name
- Email and/or phone (at least one contact method)
- Dealership/location
- Inquiry type (vehicle information, test drive, availability, trade-in, financing information, general question)
- Vehicle interest, when relevant: year, make, model, trim, VIN/stock number, vehicle detail URL
- Customer message
- Preferred contact method
- Preferred contact time (optional)
- Consent/preferences for each communication channel, captured separately
- Source attribution
- Server-generated `created_at` and `updated_at`

Validate and normalize phone numbers and email addresses. Do not silently invent missing values or use fake fallback values. Return clear field-level validation errors.

### 6.2 Attribution

Capture, when available:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- landing page URL
- referrer URL
- vehicle detail URL
- referring dealership/location
- campaign/source integration identifier
- session ID (pseudonymous)
- first-touch and last-touch attribution, where available

Do not trust a user-editable “source” field as the authoritative attribution source. Capture browser URL/referrer data and validate it server-side. Treat attribution as untrusted input until validated.

### 6.3 Privacy and identity

- Do not identify an anonymous browser session as a known person without an appropriate identifier and permitted purpose.
- Browsing events may be linked to a customer only after suitable identification and consent/notice.
- Store consent records with channel, purpose, status, source, timestamp, and policy/version where applicable.
- Provide opt-out and suppression handling for messaging.
- Do not send marketing messages based only on anonymous browsing or an inquiry that did not authorize that channel.
- Minimize personal data in logs, prompts, analytics, and event payloads.
- Define data retention and deletion workflows before production.

## 7. Lead management and salesperson workflow

Implement:

- Lead list with pagination, search, sorting, and filters.
- Filters for dealership, status, salesperson, source, inquiry type, date range, and follow-up due.
- Lead assignment and reassignment with audit history.
- Lead status workflow: New, Contacted, Qualified, Appointment Requested, Appointment Confirmed, Test Drive Completed, Proposal/Negotiation, Won, Lost, Nurture.
- Status changes must be validated against allowed transitions and recorded as activities.
- Priority levels: Hot, Warm, Cold, Unclassified. Explain that AI priority is a suggestion, not a guaranteed purchase probability.
- Notes and tasks with author and timestamp.
- Follow-up due date/time and owner.
- Duplicate detection suggestions; never merge customer records automatically without a safe, auditable process.
- Customer 360 detail page with contact details, consent, vehicle interest, lead source, conversation history, notes, appointment requests, AI summary, and chronological activity timeline.
- Export only for authorized roles, with audit logging and reasonable limits.

## 8. AI features and Bedrock guardrails

Use Amazon Bedrock behind a shared Python AI service module. Keep model choice configurable by environment. Do not hardcode model IDs in business logic.

### 8.1 MVP AI capabilities

- Lead summary from submitted inquiry and authorized associated data.
- Inquiry classification.
- Suggested next action.
- Suggested response draft for salesperson review.
- Optional lead priority suggestion with a transparent list of contributing signals.
- Vehicle question answering using approved, current inventory and dealership knowledge.

### 8.2 AI safety and data boundaries

- Configure dedicated Bedrock Guardrails for relevant input and output protections.
- Apply guardrails to model calls where supported by the selected Bedrock API.
- Use only the minimum customer data necessary for a task.
- Never put one tenant's records into another tenant's prompt or retrieval context.
- Do not use customer PII as model training data.
- Do not infer protected or sensitive personal characteristics.
- Do not make credit, financing eligibility, legal, or guaranteed purchase decisions.
- Do not claim a vehicle is available, reserved, or priced at a particular amount unless confirmed by the authoritative inventory/pricing source and timestamped.
- Validate AI output against a schema. Treat model output as untrusted.
- On timeout, throttling, guardrail block, or malformed output, fall back to a clear non-AI workflow.
- Label generated content as AI-assisted. Require human approval before sending sales or marketing messages in the MVP.
- Log model ID, latency, token usage where available, guardrail outcome, and request correlation ID without logging unnecessary PII or full prompts.

### 8.3 Prompt design

Use structured system prompts and explicit task inputs. Clearly separate trusted system instructions from untrusted customer text, website content, and external inventory descriptions. Treat all retrieved content as data, never as instructions. Protect against prompt injection. Do not allow a customer-supplied prompt to override tenant boundaries, safety rules, or application policy.

## 9. Messaging and follow-up automation

Create provider-independent messaging interfaces for SMS and email.

### 9.1 Demo mode

When `DEMO_MODE=true`:

- Do not call AWS End User Messaging SMS, SES, or any third-party messaging API.
- Do not send real messages.
- Create a structured simulated event containing tenant/dealership, lead ID, channel, destination masked for display, template/type, message preview, consent decision, timestamp, status `SIMULATED`, and correlation ID.
- Persist the event and display it in a dedicated **Demo Event Console** in the dashboard.
- Clearly label the event as simulated. Do not present it as delivered.
- Provide a way to inspect the simulated payload for developer/demo use, with sensitive values masked.

### 9.2 Production mode

When explicitly configured and authorized:

- Send only through approved provider adapters.
- Verify channel-specific consent and suppression status before sending.
- Use approved templates and configurable sender identities.
- Record provider message ID, delivery status, error, and timestamps.
- Process inbound replies and delivery webhooks with signature verification and idempotency.
- Support STOP/HELP and applicable opt-out/suppression behavior.
- Do not send marketing content under a transactional consent flag unless the legal/compliance basis and policy explicitly allow it.
- Never assume a message was delivered because the provider accepted the request.

### 9.3 Follow-up rules

- Follow-up schedule and message templates must be configurable per tenant/dealership.
- Respect business hours, local timezone, holidays where configured, quiet hours, consent, and opt-outs.
- Avoid duplicate messages with idempotency keys and event state.
- Support pause/cancel when a lead is won, lost, opted out, assigned for manual handling, or otherwise excluded.
- In MVP, follow-up can be simulated. Real automated sending requires explicit production enablement and approved policies.
- Store next action and next follow-up time in UTC.

## 10. Inventory integration

Create an `InventoryProvider` interface with a mock implementation for the demo. Do not bind core UI/business logic to a specific inventory vendor.

Support fields:

- Tenant/dealership ID
- VIN
- Stock number
- Year, make, model, trim
- New/used/certified status
- Mileage
- Price and currency
- Exterior/interior color where supplied
- Images
- Vehicle detail URL
- Availability status
- Source system
- Source update timestamp
- Last successful sync timestamp

Rules:

- Mock inventory must be visibly labeled demo data.
- Inventory data must include source and freshness metadata.
- Do not claim real-time availability unless the source supports it and the record is fresh.
- Do not scrape or call undocumented endpoints as a substitute for authorized access.
- Build a replaceable adapter for a future API, approved feed, or dealer-provided export.
- Reconcile stale or removed vehicles and avoid leaving invalid inventory marked available.

## 11. CRM and dealership system integration

Create a `CRMProvider` interface with a mock implementation and documented adapter contract.

Potential future integrations may include CRM, DMS, appointment/calendar, website forms, call center, and marketing platforms. Do not assume any particular vendor or API is selected.

Adapter requirements:

- Authentication/credential handling through managed secrets.
- Mapping between KSM and provider fields.
- Create/update lead operations where supported.
- Lead ownership/status synchronization where supported.
- Webhook signature verification.
- Retry with exponential backoff and dead-letter handling.
- Idempotency and duplicate prevention.
- Correlation IDs and audit trail.
- Per-tenant integration configuration and health status.
- Clear distinction between simulated, connected, degraded, and disconnected.

Do not overwrite authoritative CRM fields blindly. Define field ownership and conflict-resolution rules. Provide a sync preview or audit trail for material updates.

## 12. Appointment requests

The MVP supports appointment requests and salesperson follow-up.

- Capture requested date/time, timezone, location, appointment type, and notes.
- Display status: Requested, Pending Confirmation, Confirmed, Rescheduled, Cancelled, Completed, No Show.
- A request is not a confirmed appointment until an authorized person or connected calendar confirms it.
- Store external calendar ID/event ID when an authorized integration exists.
- Avoid double booking by relying on the authoritative calendar's availability and confirmation response.
- In demo mode, simulate appointment request and status events.

## 13. Dashboard and user experience

Build a premium, professional dealership operations interface. Default to a light theme with optional dark mode.

### 13.1 Design system

- React + TypeScript + Vite + MUI.
- Use Inter or Geist Sans typography.
- Use Lucide icons consistently.
- Prefer clean spacing, clear hierarchy, subtle borders and restrained shadows.
- Avoid excessive gradients, neon effects, unnecessary animation, and crowded layouts.
- Light palette:
  - Background `#F8FAFC`
  - Surface `#FFFFFF`
  - Primary text `#0F172A`
  - Secondary text `#64748B`
  - Border `#E2E8F0`
  - Primary action `#2563EB`
  - Success `#15803D`
  - Warning `#B45309`
  - Error `#DC2626`
- Dark palette:
  - Background `#0B1220`
  - Surface `#172235`
  - Primary text `#F8FAFC`
  - Secondary text `#94A3B8`
  - Border `#263449`
  - Primary action `#60A5FA`
  - Success `#4ADE80`
  - Warning `#FBBF24`
  - Error `#F87171`
- Card radius approximately 12px; input/button radius approximately 8px.
- Use consistent status badges, accessible contrast, keyboard navigation, focus states, and semantic labels.

### 13.2 Required pages

1. Login / authentication.
2. Dashboard overview.
3. Leads list.
4. Lead/customer detail (Customer 360).
5. Public lead capture form.
6. Inventory browser / vehicle detail for demo.
7. Appointments and requests.
8. Demo Event Console.
9. Integration status/settings (admin only).
10. User/dealership settings (role-gated).

### 13.3 Dashboard metrics

Use real queried data, not hardcoded display values:

- Total leads in selected period.
- New leads.
- Hot/warm leads.
- Leads awaiting response.
- Appointment requests and confirmed appointments.
- Average first-response time, if sufficient event data exists.
- Lead source breakdown.
- Lead status funnel.
- Follow-ups due today/overdue.
- Salesperson workload/performance within permitted scope.

Show empty states and explain when a metric is unavailable because the demo dataset lacks enough data.

### 13.4 Lead list and detail

Lead list should support search, sorting, filters, pagination, and responsive mobile cards. Show customer, vehicle, source, dealership, assigned salesperson, status, priority, last activity, and next follow-up.

Customer 360 should show:
- Customer/contact details and consent status.
- Vehicle(s) of interest.
- Lead attribution.
- AI summary and suggested next action.
- Conversation and simulated/real communication history.
- Notes and tasks.
- Appointment requests/status.
- Chronological activity timeline.
- CRM sync state, where configured.

### 13.5 Responsive requirements

- Mobile-first; support 360px width and above.
- Desktop: persistent navigation/sidebar where appropriate.
- Tablet: collapsible navigation.
- Mobile: drawer navigation and card-based lists.
- No horizontal page overflow at 360px.
- Tables must transform into readable cards or controlled responsive layouts.
- Forms must be usable with touch input and mobile keyboards.
- Test representative desktop, tablet, and mobile viewports.

## 14. API design

Use API Gateway REST APIs with JSON request/response contracts. Version routes under `/api/v1`.

Implement at least:

- `POST /api/v1/public/leads` — public lead submission with abuse protection, validation, idempotency, and rate limits.
- `GET /api/v1/leads` — authorized paginated lead list.
- `GET /api/v1/leads/{leadId}` — authorized lead detail.
- `PATCH /api/v1/leads/{leadId}` — update permitted fields/status.
- `POST /api/v1/leads/{leadId}/assign` — assign salesperson.
- `POST /api/v1/leads/{leadId}/notes` — add note.
- `POST /api/v1/leads/{leadId}/activities` — record activity.
- `POST /api/v1/leads/{leadId}/analyze` — request AI summary/classification.
- `GET /api/v1/leads/{leadId}/timeline` — activity timeline.
- `GET /api/v1/dashboard/summary` — scoped dashboard metrics.
- `GET /api/v1/inventory` and `GET /api/v1/inventory/{vehicleId}` — inventory adapter.
- `POST /api/v1/appointments` — create appointment request.
- `PATCH /api/v1/appointments/{appointmentId}` — authorized status update.
- `GET /api/v1/demo/events` — authorized demo event console query.
- `GET /api/v1/integrations` — integration health for authorized administrators.

For each route define request schema, response schema, auth requirements, tenant scope, validation, error codes, pagination, and idempotency requirements. Use consistent error responses and do not expose stack traces to clients.

Public endpoints must have appropriate throttling, input size limits, bot/abuse controls, and validation. Do not expose private lead/customer data through public routes.

## 15. DynamoDB data model

Before implementing tables, write `docs/database_schema.md` containing:

- Entity definitions.
- Primary key and sort key patterns.
- Every GSI and its purpose.
- Access patterns from Section 5.
- Tenant isolation approach.
- Example items.
- Expected read/write patterns and cost implications.
- Hot-partition considerations.
- Migration/versioning approach.

Use a single-table design where appropriate, with clear entity prefixes and tenant scoping. Suggested entities include Tenant, Dealership, UserMembership, Lead, Customer, Activity, Appointment, VehicleReference, Consent, MessageEvent, IntegrationConfig, and IdempotencyRecord.

Do not assume one generic partition key will scale for all high-volume events. If activity/message events require separate partition strategy or table, document why. Use conditional writes for uniqueness/idempotency and transactions for multi-item updates when needed.

## 16. Security, privacy, and compliance

- Cognito authentication for internal users.
- Backend authorization for every protected operation.
- Tenant and dealership scope derived from verified identity and server-side membership.
- Least-privilege IAM.
- Private S3 bucket with CloudFront OAC.
- HTTPS only.
- API Gateway CORS allowlist per environment.
- Validate all inputs with Pydantic or equivalent.
- Protect against injection, XSS, CSRF where applicable, replay, abuse, and excessive requests.
- Do not put secrets in Git, frontend environment variables, browser storage, or logs.
- Use Secrets Manager for third-party credentials.
- Encrypt data at rest and in transit using AWS-managed encryption by default; use customer-managed keys only when justified.
- Audit sensitive actions: login/role changes, lead export, assignment, consent changes, integration changes, message sends, and data deletion.
- Mask phone/email in operational logs and demo event console where appropriate.
- Establish retention and deletion procedures before production.
- Provide a privacy notice and channel-specific consent language approved by the dealership/legal owner before production.
- Do not describe the product as “HIPAA certified” or make unsupported compliance claims.
- CORS is not a substitute for authentication, authorization, or CSRF protection.

## 17. Observability and operations

- Use AWS Lambda Powertools for structured JSON logs, tracing, metrics, and correlation IDs where appropriate.
- Use CloudWatch dashboards and alarms for Lambda errors/throttles, API 4xx/5xx, DynamoDB throttles, queue age/depth, DLQ messages, and integration failures.
- Do not log full message bodies or unnecessary customer PII.
- Add alarms for failed scheduled follow-ups and failed provider webhooks.
- Use SQS DLQs for asynchronous processing where appropriate.
- Include request/correlation IDs in API responses and logs.
- Add health/status endpoints that do not reveal secrets or internal configuration.
- Document operational runbooks for failed deployment, failed message, stale inventory, CRM sync error, and tenant access incident.

## 18. Cost optimization

Optimize for a low-cost shared multi-dealership platform.

- Prefer Lambda, API Gateway, DynamoDB on-demand initially, S3, CloudFront, EventBridge, SQS, Cognito, and Bedrock only where needed.
- Avoid always-on compute.
- Set sensible Lambda memory/timeouts and reserved concurrency only where justified.
- Use caching for static assets and safe read-only data.
- Avoid unnecessary DynamoDB GSIs, scans, large payloads, and unbounded queries.
- Use pagination and projection expressions.
- Use S3 for documents/large payloads; do not store large blobs in DynamoDB.
- Configure log retention per environment.
- Make AI calls on demand or through controlled workflows; do not invoke a model for every browser event.
- Add per-tenant usage metrics and configurable quotas.
- Document cost assumptions and identify usage-based costs such as SMS, email, Bedrock, API Gateway, Lambda, CloudFront, and DynamoDB.
- Do not promise a fixed monthly operating cost without actual usage assumptions.

## 19. Environments and configuration

Create independent `dev`, `staging`, and `prod` configurations and CDK deployment stages/stacks.

Configuration must include, as appropriate:

- Environment name.
- AWS region (configuration, not hardcoded).
- CloudFront application origin(s) for CORS.
- Cognito settings.
- DynamoDB table names.
- S3/CloudFront outputs.
- Bedrock model/guardrail configuration.
- Demo mode flag.
- Messaging provider mode.
- Follow-up settings.
- Logging level/retention.
- Rate limits and quotas.

Use CDK outputs and deployment scripts to pass environment-specific values to the frontend build. Never commit real `.env` files. Provide `.env.example` with placeholders only.

Production deployment must require explicit configuration review and must not inherit demo settings accidentally.

## 20. Required Lambda functions and shared modules

Implement small, focused handlers. Suggested functions:

- `public_create_lead`
- `list_leads`
- `get_lead`
- `update_lead`
- `assign_lead`
- `add_lead_note`
- `add_lead_activity`
- `analyze_lead`
- `get_dashboard_summary`
- `list_inventory`
- `get_inventory_vehicle`
- `create_appointment_request`
- `update_appointment`
- `simulate_or_send_message`
- `process_inbound_message`
- `process_followup`
- `get_demo_events`
- `sync_crm_event`
- `process_inventory_sync`

Shared Lambda Layer modules should include:

- `auth` and tenant/dealership authorization.
- `database` and repository interfaces.
- `schemas` and validation.
- `logging` and correlation context.
- `ai` and Bedrock/Guardrails wrapper.
- `messaging` provider interfaces and demo simulator.
- `integrations` adapter contracts.
- `errors` and common response handling.
- `utils` for time, IDs, normalization, and idempotency.

Keep business rules out of React components and thin Lambda handlers. Use service/repository layers with unit tests.

## 21. Frontend architecture

- Use React functional components and TypeScript strict mode.
- Use MUI theme and reusable layout/components.
- Use React Router for navigation.
- Keep API clients in a dedicated `services/api` layer.
- Use typed API models and centralized error handling.
- Keep authentication/session handling in a dedicated auth context/service.
- Use route guards for user experience, but backend remains the security authority.
- Use loading, empty, success, and error states.
- Avoid storing sensitive customer data in localStorage. Prefer short-lived auth/session mechanisms supported by Cognito configuration.
- Do not embed AWS SDK credentials in the browser.
- Add reusable components for lead status, priority, vehicle card, activity timeline, consent indicator, and demo event.
- Use server pagination/filtering for growing datasets.

## 22. Demo mode and synthetic demonstration environment

Provide a repeatable synthetic demo tenant with at least three dealership locations/brands and representative users/roles.

Include synthetic:
- Customers and leads.
- New/used inventory.
- Lead sources and UTM attribution.
- Activities and notes.
- AI summaries (generated or clearly marked deterministic mock output).
- Appointment requests.
- Simulated SMS/email events.
- CRM/inventory integration status.

Demo requirements:
- Persistent backend storage; do not rely only on React state.
- Seed/reset scripts must be safe and clearly restricted to non-production.
- Visibly mark demo data and simulated actions.
- No real customer PII.
- No external messages.
- Demo can be reset to a known state.
- Use deterministic demo IDs or backend-generated IDs, not `Math.random()` in the browser.

## 23. Testing and quality requirements

Automated tests must include:

### Backend
- Unit tests for validation, services, repositories, attribution, consent, idempotency, AI output validation, and provider adapters.
- Authorization tests for every role and cross-tenant access attempts.
- API integration tests for lead creation/list/detail/update/assignment.
- Tests proving tenant IDs supplied by the browser cannot override identity scope.
- Tests proving `DEMO_MODE=true` never calls real SMS/email providers.
- Tests for opt-out/suppression enforcement.
- Tests for Bedrock timeout, throttling, guardrail block, and malformed output fallback.
- Tests for duplicate lead/webhook/message event handling.

### Frontend
- Component tests for lead form, dashboard, filters, lead detail, timeline, and demo event console.
- Tests for loading, empty, validation, error, and responsive states.
- Accessibility checks for labels, focus, keyboard interaction, and contrast where feasible.

### Infrastructure and deployment
- CDK synthesis tests.
- Verify S3 bucket is private and CloudFront OAC is configured.
- Verify API CORS origin allowlist is environment-specific and not wildcard in production.
- Verify CloudFront HTTPS redirect and SPA error routing.
- Verify no secrets are bundled into frontend assets.
- Build and lint frontend.
- Run Python formatting/linting/type checks and pytest.
- Include a deployment smoke test for each environment.

## 24. Implementation order and phases

Follow this order. Do not skip ahead to advanced AI or production integrations before the core workflow works.

### Phase 0 — Repository assessment and design
- Inspect current files and code.
- Identify reusable components and technical debt.
- Create/update architecture, API, database, security, and deployment docs.
- Confirm repository structure and dependency versions.
- Create a task checklist and implementation plan.

### Phase 1 — React application, responsive layouts, public lead form, and demo dashboard
- Establish Vite + React + TypeScript + MUI.
- Create theme, routing, layouts, navigation, and responsive behavior.
- Implement public lead form with validation and attribution capture.
- Implement dashboard shell, lead list, lead detail, inventory demo view, appointment request view, and Demo Event Console.
- Use typed mock API services initially, clearly separated from components.
- Do not treat in-memory React state as persistence.
- Use synthetic data and visibly label demo-only features.

### Phase 2 — Python Lambda APIs, DynamoDB, and Cognito
- Implement CDK stacks and environment configuration.
- Create private S3 + CloudFront OAC hosting and API Gateway REST API.
- Configure Cognito authentication.
- Implement shared Lambda Layer and Python handlers.
- Implement DynamoDB repositories and documented access patterns.
- Connect frontend API services to backend.
- Enforce tenant and role authorization.
- Implement persistent lead capture, lead management, activity timeline, dashboard queries, and demo event storage.
- Add tests and deployment scripts.

### Phase 3 — AI lead intelligence
- Integrate Bedrock through shared AI service.
- Configure and apply Bedrock Guardrails.
- Implement lead summary, inquiry classification, suggested next action, and response draft.
- Validate outputs and provide fallbacks.
- Require salesperson approval for generated messages.

### Phase 4 — Demo communications and follow-up
- Complete `DEMO_MODE` simulation and event console.
- Implement consent checks, templates, scheduling, idempotency, quiet hours, and opt-out logic.
- Add inbound reply simulation and activity updates.
- Keep real provider sending disabled until explicitly approved.

### Phase 5 — Inventory and CRM adapters
- Implement mock inventory and CRM provider interfaces.
- Demonstrate sync status, event processing, retry, idempotency, and error handling.
- Document the precise information required to connect a real vendor.
- Do not claim a real integration until tested with authorized credentials and vendor documentation.

### Phase 6 — Hardening and production readiness
- Complete cross-tenant and role security tests.
- Review privacy/consent and retention.
- Add alarms, dashboards, DLQs, runbooks, and cost monitoring.
- Test dev → staging → production deployment.
- Verify no demo messages can reach real customers.
- Produce a production-readiness checklist and known limitations.

## 25. Deployment scripts and documentation

Provide repeatable scripts or documented commands for:

- Installing frontend/backend/CDK dependencies.
- Running frontend and backend locally.
- Running tests and lint/type checks.
- Synthesizing CDK.
- Deploying a selected environment.
- Building and deploying frontend assets.
- Invalidating CloudFront cache when required.
- Seeding and resetting demo data.
- Running smoke tests.
- Destroying only explicitly disposable non-production stacks.

Document deployment outputs and required operator steps. Never put secrets in command history or source files.

Required documentation:
- `README.md`
- `docs/architecture.md`
- `docs/database_schema.md`
- `docs/api_specification.md`
- `docs/security_privacy.md`
- `docs/integrations.md`
- `docs/deployment.md`
- `docs/testing.md`
- `docs/cost_model.md`
- `docs/production_readiness.md`

## 26. Definition of Done

A feature is complete only when:

- It satisfies the documented acceptance criteria.
- It is implemented in the correct layer.
- It has validation, authorization, error handling, and audit/activity behavior appropriate to the feature.
- It has automated tests.
- It has responsive UI states where applicable.
- It has no hardcoded secrets or environment-specific resource identifiers.
- It works with persistent backend data, not just browser state.
- It respects tenant/dealership scope.
- It behaves correctly in `DEMO_MODE`.
- It is documented.
- Build, lint, type checks, and relevant tests pass.

## 27. Final instruction to Kiro

Start by inspecting the repository and existing files. Do not delete or rewrite useful work. Produce a short assessment of the current implementation, map existing files to the requirements above, identify gaps, and propose a sequenced task list. Then implement Phase 0 and Phase 1 first. Continue through later phases only after the preceding phase builds and tests successfully.

At every stage, clearly distinguish:
- Implemented and tested.
- Implemented but not yet tested.
- Mocked for demo.
- Dependent on external vendor/API access.
- Not implemented.

The result must be a maintainable, secure, multi-tenant KSM AutoPilot application that demonstrates a complete dealership lead-to-follow-up workflow and can later connect to real dealership systems through authorized, replaceable integrations.
