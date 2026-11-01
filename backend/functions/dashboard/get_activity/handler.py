"""
GET /dashboard/activity  — protected.

Returns the most recent activity events for the tenant's activity feed.
Activities are stored as ACTIVITY#<iso_timestamp>#<activityId> SK entries.
"""

import os
from ksm_common.middleware import lambda_handler
from ksm_common.auth import get_caller_identity
from ksm_common import db, response as res
from ksm_common.logging import get_logger

logger = get_logger()


@lambda_handler
def handler(event, context):
    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    params = event.get("queryStringParameters") or {}
    limit = min(int(params.get("limit", 20)), 100)

    result = db.query_by_pk(
        pk=f"TENANT#{tenant_id}",
        sk_prefix="ACTIVITY#",
        limit=limit,
    )

    activities = [_to_api(item) for item in result["items"]]

    logger.info("Activity feed fetched", tenant_id=tenant_id, count=len(activities))
    return res.ok(activities)


def _to_api(item: dict) -> dict:
    return {k: v for k, v in item.items() if k not in ("PK", "SK", "GSI1PK", "GSI1SK")}
