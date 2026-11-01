"""
POST /messaging/sms  — protected.

Sends an SMS to the phone number associated with a lead.
When DEMO_MODE=true the message is logged to CloudWatch instead of SNS.
Tenant ownership of the lead is verified before sending.
"""

import uuid
from datetime import datetime, timezone

from ksm_common.middleware import lambda_handler
from ksm_common.auth import get_caller_identity, require_tenant_access
from ksm_common.validation import SendSmsRequest, parse_body
from ksm_common.exceptions import NotFoundError
from ksm_common import db, messaging, response as res
from ksm_common.logging import get_logger

logger = get_logger()


@lambda_handler
def handler(event, context):
    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    body = parse_body(SendSmsRequest, event.get("body"))

    # Verify lead exists and belongs to this tenant
    lead = db.get_item(pk=f"TENANT#{tenant_id}", sk=f"LEAD#{body.leadId}")
    if not lead:
        raise NotFoundError("Lead")
    require_tenant_access(event, lead["tenantId"])

    message_id = messaging.send_sms(
        phone_number=lead["phone"],
        message=body.message,
        metadata={"leadId": body.leadId, "tenantId": tenant_id, "sentBy": identity["sub"]},
    )

    # Write activity record
    _write_activity(
        tenant_id=tenant_id,
        lead_id=body.leadId,
        lead_name=f"{lead['firstName']} {lead['lastName']}",
        activity_type="SMS",
        description=f"SMS sent: {body.message[:80]}{'…' if len(body.message) > 80 else ''}",
    )

    import os
    status = "DEMO_LOGGED" if os.environ.get("DEMO_MODE", "false").lower() == "true" else "SENT"
    logger.info("SMS dispatched", lead_id=body.leadId, tenant_id=tenant_id, message_id=message_id)
    return res.ok({"messageId": message_id, "status": status})


def _write_activity(tenant_id, lead_id, lead_name, activity_type, description):
    now = datetime.now(timezone.utc).isoformat()
    activity_id = str(uuid.uuid4())
    db.put_item({
        "PK": f"TENANT#{tenant_id}",
        "SK": f"ACTIVITY#{now}#{activity_id}",
        "activityId": activity_id,
        "leadId": lead_id,
        "leadName": lead_name,
        "tenantId": tenant_id,
        "type": activity_type,
        "description": description,
        "createdAt": now,
    })
