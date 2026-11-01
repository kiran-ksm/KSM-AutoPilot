"""
API Gateway response helpers.

Centralises CORS headers, JSON serialisation and error formatting so every
Lambda function returns consistent responses.
"""

import json
import os
from decimal import Decimal
from typing import Any
from ksm_common.logging import get_logger

logger = get_logger()

# CloudFront distribution origin — set per-environment by CDK via env var.
# The wildcard fallback is only used during local development.
_ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")


def _cors_headers() -> dict[str, str]:
    return {
        "Access-Control-Allow-Origin": _ALLOWED_ORIGIN,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    }


class _DecimalEncoder(json.JSONEncoder):
    """DynamoDB returns Decimal for numbers — convert to int or float."""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def ok(body: Any, status_code: int = 200) -> dict[str, Any]:
    """Return a successful API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {**_cors_headers(), "Content-Type": "application/json"},
        "body": json.dumps(body, cls=_DecimalEncoder),
    }


def created(body: Any) -> dict[str, Any]:
    """Return a 201 Created response."""
    return ok(body, status_code=201)


def no_content() -> dict[str, Any]:
    """Return a 204 No Content response."""
    return {
        "statusCode": 204,
        "headers": _cors_headers(),
        "body": "",
    }


def error(message: str, status_code: int = 400, code: str = "BAD_REQUEST") -> dict[str, Any]:
    """Return an error API Gateway response."""
    logger.warning("API error response", status_code=status_code, code=code, detail=message)
    return {
        "statusCode": status_code,
        "headers": {**_cors_headers(), "Content-Type": "application/json"},
        "body": json.dumps({"code": code, "message": message}),
    }


def not_found(resource: str = "Resource") -> dict[str, Any]:
    return error(f"{resource} not found", 404, "NOT_FOUND")


def forbidden(message: str = "Access denied") -> dict[str, Any]:
    return error(message, 403, "FORBIDDEN")


def unauthorized(message: str = "Unauthorised") -> dict[str, Any]:
    return error(message, 401, "UNAUTHORIZED")


def server_error(message: str = "Internal server error") -> dict[str, Any]:
    return error(message, 500, "INTERNAL_ERROR")


def handle_options() -> dict[str, Any]:
    """Handle CORS preflight OPTIONS requests."""
    return {
        "statusCode": 200,
        "headers": _cors_headers(),
        "body": "",
    }
