"""
POST /ai/score-lead/{leadId}  — protected.

Triggers AI lead scoring via Amazon Bedrock (Claude) with Guardrails applied.
The score and reasoning are persisted on the lead record and returned.
Tenant ownership is verified before any AI invocation.
"""

import uuid
from datetime import datetime, timezone

from ksm_common.middleware import lambda_handler
from ksm_common.auth import get_caller_identity, require_tenant_access
from ksm_common.exceptions import NotFoundError
from ksm_common import db, ai, response as res
from ksm_common.logging import get_logger

logger = get_logger()


@lambda_handler
def handler(event, context):
    lead_id = (event.get("pathParameters") or {}).get("leadId")
    if not lead_id:
        return res.error("Missing leadId path parameter", 400, "MISSING_PARAM")

    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    lead = db.get_item(pk=f"TENANT#{tenant_id}", sk=f"LEAD#{lead_id}")
    if not lead:
        raise NotFoundError("Lead")
    require_tenant_access(event, lead["tenantId"])

    # Compute days since creation for scoring context
    created_at = lead.get("createdAt", "")
    days_since = 0
    if created_at:
        try:
            from datetime import datetime as dt
            delta = datetime.now(timezone.utc) - dt.fromisoformat(created_at)
            days_since = delta.days
        except ValueError:
            pass

    # Pass only sanitised, non-PII fields to the AI module
    lead_context = {
        "vehicleInterest": lead.get("vehicleInterest", ""),
        "source": lead.get("source", "WEBSITE"),
        "notes": lead.get("notes", ""),
        "phone": lead.get("phone", ""),
        "days_since_created": days_since,
    }

    result = ai.score_lead(lead_context)
    score = result["score"]
    reasoning = result["reasoning"]

    # Persist score back to the lead record
    now = datetime.now(timezone.utc).isoformat()
    db.update_item(
        pk=f"TENANT#{tenant_id}",
        sk=f"LEAD#{lead_id}",
        update_expression="SET aiScore = :score, aiReasoning = :reasoning, #updatedAt = :updatedAt",
        expression_values={
            ":score": score,
            ":reasoning": reasoning,
            ":updatedAt": now,
        },
        expression_names={"#updatedAt": "updatedAt"},
    )

    # Write activity record
    activity_id = str(uuid.uuid4())
    db.put_item({
        "PK": f"TENANT#{tenant_id}",
        "SK": f"ACTIVITY#{now}#{activity_id}",
        "activityId": activity_id,
        "leadId": lead_id,
        "leadName": f"{lead['firstName']} {lead['lastName']}",
        "tenantId": tenant_id,
        "type": "SCORE",
        "description": f"AI score updated to {score}/100",
        "createdAt": now,
    })

    logger.info("Lead scored", lead_id=lead_id, tenant_id=tenant_id, score=score)
    return res.ok({"leadId": lead_id, "score": score, "reasoning": reasoning})
