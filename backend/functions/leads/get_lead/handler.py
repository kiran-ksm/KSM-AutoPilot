"""
GET /leads/{leadId}  — protected (Cognito authoriser required).

Returns a single lead. Enforces tenant ownership before returning data.
"""

from ksm_common.middleware import lambda_handler
from ksm_common.auth import require_tenant_access
from ksm_common.exceptions import NotFoundError
from ksm_common import db, response as res
from ksm_common.logging import get_logger

logger = get_logger()


@lambda_handler
def handler(event, context):
    lead_id = (event.get("pathParameters") or {}).get("leadId")
    if not lead_id:
        return res.error("Missing leadId path parameter", 400, "MISSING_PARAM")

    # We need the tenant_id to build the PK — get caller identity first
    from ksm_common.auth import get_caller_identity
    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    item = db.get_item(pk=f"TENANT#{tenant_id}", sk=f"LEAD#{lead_id}")
    if not item:
        raise NotFoundError("Lead")

    # Double-check tenant ownership (defensive — PK already scopes to tenant)
    require_tenant_access(event, item["tenantId"])

    logger.info("Lead fetched", lead_id=lead_id, tenant_id=tenant_id)
    return res.ok(_to_api(item))


def _to_api(item: dict) -> dict:
    return {k: v for k, v in item.items() if k not in ("PK", "SK", "GSI1PK", "GSI1SK")}
