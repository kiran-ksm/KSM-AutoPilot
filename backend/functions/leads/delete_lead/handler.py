"""
DELETE /leads/{leadId}  — protected, ADMIN role required.

Soft-deletes a lead by setting status to DELETED.
Hard deletion is intentionally avoided to preserve audit trail.
"""

from datetime import datetime, timezone

from ksm_common.middleware import lambda_handler
from ksm_common.auth import require_tenant_access, get_caller_identity, require_role
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

    # Only ADMINs may delete leads
    require_role(identity, "ADMIN")

    existing = db.get_item(pk=f"TENANT#{tenant_id}", sk=f"LEAD#{lead_id}")
    if not existing:
        raise NotFoundError("Lead")
    require_tenant_access(event, existing["tenantId"])

    now = datetime.now(timezone.utc).isoformat()
    db.update_item(
        pk=f"TENANT#{tenant_id}",
        sk=f"LEAD#{lead_id}",
        update_expression="SET #status = :status, #updatedAt = :updatedAt, GSI1PK = :gsi1pk",
        expression_values={
            ":status": "DELETED",
            ":updatedAt": now,
            ":gsi1pk": "STATUS#DELETED",
        },
        expression_names={"#status": "status", "#updatedAt": "updatedAt"},
    )

    logger.info(
        "Lead soft-deleted",
        lead_id=lead_id,
        tenant_id=tenant_id,
        deleted_by=identity["sub"],
    )
    return res.no_content()
