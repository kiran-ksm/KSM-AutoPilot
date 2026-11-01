"""
GET /leads  — protected (Cognito authoriser required).

Returns a paginated list of leads for the caller's tenant.
Optional query params: status, assignedTo, limit, nextToken.

Tenant authorisation is enforced server-side — the tenant_id is read from
the JWT claims, never from the request query string.
"""

import json
import base64
from ksm_common.middleware import lambda_handler
from ksm_common.auth import get_caller_identity
from ksm_common import db, response as res
from ksm_common.logging import get_logger

logger = get_logger()

DEFAULT_LIMIT = 50
MAX_LIMIT = 100


@lambda_handler
def handler(event, context):
    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    params = event.get("queryStringParameters") or {}
    status_filter = params.get("status")
    limit = min(int(params.get("limit", DEFAULT_LIMIT)), MAX_LIMIT)

    # Decode opaque pagination cursor (base64-encoded LastEvaluatedKey)
    next_token_raw = params.get("nextToken")
    exclusive_start_key = None
    if next_token_raw:
        try:
            exclusive_start_key = json.loads(base64.b64decode(next_token_raw).decode())
        except Exception:
            return res.error("Invalid nextToken", 400, "INVALID_CURSOR")

    if status_filter:
        # Query via GSI1 to find all leads with a given status for this tenant
        result = db.query_gsi(
            index_name=os.environ.get("DYNAMODB_GSI1_NAME", "GSI1"),
            pk_name="GSI1PK",
            pk_value=f"STATUS#{status_filter}",
            sk_name="GSI1SK",
            sk_prefix=f"TENANT#{tenant_id}#LEAD#",
            limit=limit,
            exclusive_start_key=exclusive_start_key,
        )
    else:
        # Query all leads under the tenant partition
        result = db.query_by_pk(
            pk=f"TENANT#{tenant_id}",
            sk_prefix="LEAD#",
            limit=limit,
            exclusive_start_key=exclusive_start_key,
        )

    items = [_to_api(item) for item in result["items"]]

    # Encode cursor opaquely so callers never see DynamoDB internals
    next_cursor = None
    if result.get("next_token"):
        next_cursor = base64.b64encode(
            json.dumps(result["next_token"]).encode()
        ).decode()

    logger.info(
        "Leads listed",
        tenant_id=tenant_id,
        count=len(items),
        has_more=bool(next_cursor),
        status_filter=status_filter,
    )

    return res.ok({
        "items": items,
        "total": len(items),   # count of current page; true total requires a scan
        "nextToken": next_cursor,
    })


def _to_api(item: dict) -> dict:
    return {k: v for k, v in item.items() if k not in ("PK", "SK", "GSI1PK", "GSI1SK")}


import os  # noqa: E402 — placed after module-level code intentionally
