"""
GET /dashboard/stats  — protected.

Returns KPI summary stats for the authenticated tenant.
Counts are derived from DynamoDB queries — no full table scans.
"""

from datetime import datetime, timezone, timedelta

from ksm_common.middleware import lambda_handler
from ksm_common.auth import get_caller_identity
from ksm_common import db, response as res
from ksm_common.logging import get_logger
import os

logger = get_logger()


@lambda_handler
def handler(event, context):
    identity = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    gsi1_name = os.environ.get("DYNAMODB_GSI1_NAME", "GSI1")

    def count_by_status(status: str) -> int:
        result = db.query_gsi(
            index_name=gsi1_name,
            pk_name="GSI1PK",
            pk_value=f"STATUS#{status}",
            sk_name="GSI1SK",
            sk_prefix=f"TENANT#{tenant_id}#LEAD#",
            limit=1000,
        )
        return len(result["items"])

    # Count all active statuses (exclude DELETED)
    statuses = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST", "NURTURE"]
    counts = {s: count_by_status(s) for s in statuses}
    total = sum(counts.values())

    # New today — scan NEW leads and filter by createdAt date
    today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    all_new = db.query_gsi(
        index_name=gsi1_name,
        pk_name="GSI1PK",
        pk_value="STATUS#NEW",
        sk_name="GSI1SK",
        sk_prefix=f"TENANT#{tenant_id}#LEAD#",
        limit=1000,
    )["items"]
    new_today = sum(1 for i in all_new if i.get("createdAt", "").startswith(today_prefix))

    conversion_rate = round(counts["WON"] / total * 100, 1) if total > 0 else 0.0

    stats = {
        "totalLeads": total,
        "newToday": new_today,
        "contacted": counts["CONTACTED"],
        "qualified": counts["QUALIFIED"],
        "wonThisMonth": counts["WON"],
        "conversionRate": conversion_rate,
        "avgResponseMinutes": 0,  # Phase 5: populate from activity timestamps
    }

    logger.info("Dashboard stats computed", tenant_id=tenant_id, total_leads=total)
    return res.ok(stats)
