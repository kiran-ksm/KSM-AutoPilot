"""
Tenant authorisation helpers.

Every protected Lambda must call require_tenant_access() to verify that the
caller's Cognito JWT belongs to the tenantId they are trying to access.
Authorisation is ALWAYS enforced server-side — the frontend is never trusted
for tenant filtering.

Cognito custom attributes
─────────────────────────
custom:tenantId   — set at user creation time by the admin flow
custom:role       — "ADMIN" | "AGENT" | "VIEWER"
"""

import os
from typing import Any
from jose import jwt, JWTError
from ksm_common.logging import get_logger

logger = get_logger()

COGNITO_REGION = os.environ.get("AWS_REGION", "us-east-1")


class AuthError(Exception):
    """Raised when a request fails authorisation checks."""
    def __init__(self, message: str, status_code: int = 403):
        super().__init__(message)
        self.status_code = status_code


def _extract_claims(event: dict[str, Any]) -> dict[str, Any]:
    """
    Extract JWT claims from the API Gateway event.
    API Gateway Cognito authoriser injects claims into requestContext.
    """
    try:
        claims = event["requestContext"]["authorizer"]["claims"]
        return claims
    except (KeyError, TypeError):
        pass

    # Fallback: parse Authorization header manually (for local SAM testing)
    token = (event.get("headers") or {}).get("Authorization", "")
    if token.startswith("Bearer "):
        token = token[7:]
    if token:
        try:
            # Decode without verification for local dev — CDK sets SKIP_AUTH_VERIFY=true
            if os.environ.get("SKIP_AUTH_VERIFY") == "true":
                return jwt.get_unverified_claims(token)
        except JWTError:
            pass

    raise AuthError("Missing or invalid authorisation token", status_code=401)


def get_caller_identity(event: dict[str, Any]) -> dict[str, str]:
    """
    Return the authenticated caller's identity from the JWT claims.

    Returns:
        {
            "sub": "<cognito sub>",
            "email": "<email>",
            "tenant_id": "<tenantId>",
            "role": "ADMIN" | "AGENT" | "VIEWER",
        }
    """
    claims = _extract_claims(event)
    tenant_id = claims.get("custom:tenantId") or claims.get("tenantId")
    role = claims.get("custom:role") or claims.get("role", "AGENT")

    if not tenant_id:
        logger.warning("JWT missing tenantId claim", sub=claims.get("sub"))
        raise AuthError("Tenant ID not found in token", status_code=403)

    return {
        "sub": claims.get("sub", ""),
        "email": claims.get("email", ""),
        "tenant_id": tenant_id,
        "role": role,
    }


def require_tenant_access(event: dict[str, Any], resource_tenant_id: str) -> dict[str, str]:
    """
    Verify the caller belongs to resource_tenant_id.
    Raises AuthError (403) if tenant IDs do not match.

    Args:
        event:               Raw Lambda event dict.
        resource_tenant_id:  The tenantId of the resource being accessed.

    Returns:
        caller identity dict (same as get_caller_identity).
    """
    identity = get_caller_identity(event)
    if identity["tenant_id"] != resource_tenant_id:
        logger.warning(
            "Tenant access denied",
            caller_tenant=identity["tenant_id"],
            resource_tenant=resource_tenant_id,
        )
        raise AuthError("Access denied: tenant mismatch", status_code=403)
    return identity


def require_role(identity: dict[str, str], *allowed_roles: str) -> None:
    """
    Verify the caller has one of the allowed roles.
    Raises AuthError (403) otherwise.
    """
    if identity["role"] not in allowed_roles:
        logger.warning(
            "Role access denied",
            caller_role=identity["role"],
            allowed_roles=list(allowed_roles),
        )
        raise AuthError(
            f"Role '{identity['role']}' is not permitted. Requires: {', '.join(allowed_roles)}",
            status_code=403,
        )
