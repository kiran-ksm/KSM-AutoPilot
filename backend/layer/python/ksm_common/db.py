"""
DynamoDB single-table access helpers.

Single-table design key schema
───────────────────────────────
PK                    SK
TENANT#<tenantId>     LEAD#<leadId>
TENANT#<tenantId>     ACTIVITY#<createdAt>#<activityId>
TENANT#<tenantId>     META#STATS

GSI1PK                GSI1SK
STATUS#<status>       TENANT#<tenantId>#LEAD#<leadId>

All table/index names come from environment variables — never hardcoded.
"""

import os
import boto3
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError
from typing import Any
from ksm_common.logging import get_logger

logger = get_logger()

_dynamodb = None
_table = None


def _get_table():
    global _dynamodb, _table
    if _table is None:
        region = os.environ["AWS_REGION"]
        table_name = os.environ["DYNAMODB_TABLE_NAME"]
        _dynamodb = boto3.resource("dynamodb", region_name=region)
        _table = _dynamodb.Table(table_name)
        logger.debug("DynamoDB table initialised", table_name=table_name)
    return _table


# ── Generic helpers ──────────────────────────────────────────────────────────

def put_item(item: dict[str, Any]) -> None:
    """Write or replace an item."""
    table = _get_table()
    table.put_item(Item=item)
    logger.debug("put_item", pk=item.get("PK"), sk=item.get("SK"))


def get_item(pk: str, sk: str) -> dict[str, Any] | None:
    """Fetch a single item by PK + SK. Returns None if not found."""
    table = _get_table()
    response = table.get_item(Key={"PK": pk, "SK": sk})
    return response.get("Item")


def update_item(
    pk: str,
    sk: str,
    update_expression: str,
    expression_values: dict[str, Any],
    expression_names: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Partial update an item; returns the updated attributes."""
    table = _get_table()
    kwargs: dict[str, Any] = {
        "Key": {"PK": pk, "SK": sk},
        "UpdateExpression": update_expression,
        "ExpressionAttributeValues": expression_values,
        "ReturnValues": "ALL_NEW",
    }
    if expression_names:
        kwargs["ExpressionAttributeNames"] = expression_names
    response = table.update_item(**kwargs)
    return response.get("Attributes", {})


def delete_item(pk: str, sk: str) -> None:
    """Hard-delete an item."""
    table = _get_table()
    table.delete_item(Key={"PK": pk, "SK": sk})
    logger.debug("delete_item", pk=pk, sk=sk)


def query_by_pk(
    pk: str,
    sk_prefix: str | None = None,
    limit: int = 50,
    exclusive_start_key: dict | None = None,
) -> dict[str, Any]:
    """
    Query items under a partition key, optionally filtering SK by prefix.

    Returns:
        {"items": [...], "next_token": <last_evaluated_key or None>}
    """
    table = _get_table()
    key_condition = Key("PK").eq(pk)
    if sk_prefix:
        key_condition = key_condition & Key("SK").begins_with(sk_prefix)

    kwargs: dict[str, Any] = {
        "KeyConditionExpression": key_condition,
        "Limit": limit,
    }
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key

    response = table.query(**kwargs)
    return {
        "items": response.get("Items", []),
        "next_token": response.get("LastEvaluatedKey"),
    }


def query_gsi(
    index_name: str,
    pk_name: str,
    pk_value: str,
    sk_name: str | None = None,
    sk_prefix: str | None = None,
    limit: int = 50,
    exclusive_start_key: dict | None = None,
) -> dict[str, Any]:
    """Query a GSI with optional SK prefix filter."""
    table = _get_table()
    key_condition = Key(pk_name).eq(pk_value)
    if sk_name and sk_prefix:
        key_condition = key_condition & Key(sk_name).begins_with(sk_prefix)

    kwargs: dict[str, Any] = {
        "IndexName": index_name,
        "KeyConditionExpression": key_condition,
        "Limit": limit,
    }
    if exclusive_start_key:
        kwargs["ExclusiveStartKey"] = exclusive_start_key

    response = table.query(**kwargs)
    return {
        "items": response.get("Items", []),
        "next_token": response.get("LastEvaluatedKey"),
    }


def transact_write(items: list[dict[str, Any]]) -> None:
    """Execute a DynamoDB transactional write (up to 25 items)."""
    client = boto3.client("dynamodb", region_name=os.environ["AWS_REGION"])
    client.transact_write_items(TransactItems=items)
