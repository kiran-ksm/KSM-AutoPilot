"""
PATCH /leads/{leadId}  — protected (Cognito authoriser required).

Partial update: status, assignedTo, notes, vehicleInterest.
Tenant authorisation is enforced before any mutation.
"""

from datetime import datetime, timezone

from ksm_common.middleware import lambda_handler
from ksm_common.auth import require_tenant_access, get_caller_identity
from ksm_common.validation import UpdateLeadRequest, parse_body
from ksm_common.exceptions import NotFoundError
from ksm_common import db, response as res
from ksm_common.logging import get_logger

logger = get_logger()


@lambda_handler
def handler(event, context):
    lead_id = (event.get("pathParameters") or {}).get("leadId")
    if not lead_id:
        return res.error("Missing leadId path parameter", 400, "MISSING_PARAM")

    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    # Confirm lead exists and belongs to this tenant
    existing = db.get_item(pk=f"TENANT#{tenant_id}", sk=f"LEAD#{lead_id}")
    if not existing:
        raise NotFoundError("Lead")
    require_tenant_access(event, existing["tenantId"])

    body = parse_body(UpdateLeadRequest, event.get("body"))
    now = datetime.now(timezone.utc).isoformat()

    # Build a dynamic UpdateExpression from only the supplied fields
    set_parts = ["#updatedAt = :updatedAt"]
    expr_names = {"#updatedAt": "updatedAt"}
    expr_values: dict = {":updatedAt": now}

    if body.status is not None:
        set_parts.append("#status = :status")
        expr_names["#status"] = "status"
        expr_values[":status"] = body.status

        # Keep GSI1PK in sync with the new status
        set_parts.append("GSI1PK = :gsi1pk")
        expr_values[":gsi1pk"] = f"STATUS#{body.status}"

    if body.assignedTo is not None:
        set_parts.append("assignedTo = :assignedTo")
        expr_values[":assignedTo"] = body.assignedTo

    if body.notes is not None:
        set_parts.append("notes = :notes")
        expr_values[":notes"] = body.notes

    if body.vehicleInterest is not None:
        set_parts.append("vehicleInterest = :vehicleInterest")
        expr_values[":vehicleInterest"] = body.vehicleInterest

    update_expr = "SET " + ", ".join(set_parts)

    updated = db.update_item(
        pk=f"TENANT#{tenant_id}",
        sk=f"LEAD#{lead_id}",
        update_expression=update_expr,
        expression_values=expr_values,
        expression_names=expr_names,
    )

    logger.info(
        "Lead updated",
        lead_id=lead_id,
        tenant_id=tenant_id,
        updated_by=identity["sub"],
        fields=list(body.model_dump(exclude_none=True).keys()),
    )

    return res.ok(_to_api(updated))


def _to_api(item: dict) -> dict:
    return {k: v for k, v in item.items() if k not in ("PK", "SK", "GSI1PK", "GSI1SK")}
