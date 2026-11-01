"""
GET /dashboard/leads-by-status  — protected.

Returns lead counts grouped by status for chart rendering.
"""

import os
from ksm_common.middleware import lambda_handler
from ksm_common.auth import get_caller_identity
from ksm_common import db, response as res
from ksm_common.logging import get_logger

logger = get_logger()

ACTIVE_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST", "NURTURE"]


@lambda_handler
def handler(event, context):
    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]
    gsi1_name = os.environ.get("DYNAMODB_GSI1_NAME", "GSI1")

    result = []
    for status in ACTIVE_STATUSES:
        items = db.query_gsi(
            index_name=gsi1_name,
            pk_name="GSI1PK",
            pk_value=f"STATUS#{status}",
            sk_name="GSI1SK",
            sk_prefix=f"TENANT#{tenant_id}#LEAD#",
            limit=1000,
        )["items"]
        result.append({"status": status, "count": len(items)})

    logger.info("Leads by status computed", tenant_id=tenant_id)
    return res.ok(result)
