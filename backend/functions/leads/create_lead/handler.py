"""
POST /api/v1/public/leads  — public endpoint (no Cognito authoriser).

Accepts a lead submission from the public web form or inventory browser.
Tenant ID is derived from the API Gateway stage variable or the
DEFAULT_TENANT_ID environment variable — never from user-supplied body.
"""

import os
import uuid
from datetime import datetime, timezone

from ksm_common.middleware import lambda_handler
from ksm_common.validation import CreateLeadRequest, parse_body
from ksm_common import db, response as res
from ksm_common.logging import get_logger

logger = get_logger()


@lambda_handler
def handler(event, context):
    body = parse_body(CreateLeadRequest, event.get("body"))

    # Tenant ID from stage variable or environment — never from request body
    tenant_id = (
        (event.get("stageVariables") or {}).get("tenantId")
        or os.environ.get("DEFAULT_TENANT_ID", "")
    )
    if not tenant_id:
        return res.error("Tenant context missing", 400, "MISSING_TENANT")

    now = datetime.now(timezone.utc).isoformat()
    lead_id = str(uuid.uuid4())

    # Serialise vehicleInterest — may be a Pydantic model or plain string
    vehicle_interest = None
    if body.vehicleInterest:
        if isinstance(body.vehicleInterest, str):
            vehicle_interest = body.vehicleInterest
        else:
            vehicle_interest = body.vehicleInterest.model_dump(exclude_none=True)

    item = {
        # Single-table keys
        "PK":     f"TENANT#{tenant_id}",
        "SK":     f"LEAD#{lead_id}",
        "GSI1PK": "STATUS#NEW",
        "GSI1SK": f"TENANT#{tenant_id}#LEAD#{lead_id}",
        # Core fields
        "leadId":               lead_id,
        "tenantId":             tenant_id,
        "dealershipId":         body.dealershipId,
        "firstName":            body.firstName,
        "lastName":             body.lastName,
        "email":                body.email,
        "phone":                body.phone,
        "inquiryType":          body.inquiryType,
        "vehicleInterest":      vehicle_interest,
        "message":              body.message or "",
        "source":               body.source,
        "notes":                body.notes or "",
        "status":               "NEW",
        "priority":             "UNCLASSIFIED",
        "aiScore":              None,
        "assignedTo":           None,
        "preferredContactMethod": body.preferredContactMethod,
        "preferredContactTime": body.preferredContactTime,
        # Consent
        "consent": body.consent.model_dump() if body.consent else {"email": False, "sms": False, "phone": False},
        # Attribution
        "attribution": body.attribution.model_dump(exclude_none=True) if body.attribution else None,
        "lastActivity":  now,
        "nextFollowUp":  None,
        "createdAt":     now,
        "updatedAt":     now,
    }

    db.put_item(item)
    logger.info("Lead created", lead_id=lead_id, tenant_id=tenant_id,
                source=body.source, inquiry_type=body.inquiryType,
                has_vehicle=bool(vehicle_interest), dealership=body.dealershipId)

    return res.created(_to_api(item))


def _to_api(item: dict) -> dict:
    return {k: v for k, v in item.items() if k not in ("PK", "SK", "GSI1PK", "GSI1SK")}
