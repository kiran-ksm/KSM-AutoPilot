"""
Unit tests for ksm_common.auth — tenant authorisation enforcement.
"""

import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "layer", "python"))

from ksm_common.auth import (
    get_caller_identity,
    require_tenant_access,
    require_role,
    AuthError,
)
from conftest import make_api_event


class TestGetCallerIdentity:
    def test_extracts_identity_from_claims(self):
        event = make_api_event(tenant_id="tenant-abc", role="ADMIN")
        identity = get_caller_identity(event)
        assert identity["tenant_id"] == "tenant-abc"
        assert identity["role"] == "ADMIN"
        assert identity["email"] == "test@example.com"

    def test_raises_when_no_claims(self):
        event = {"httpMethod": "GET", "headers": {}, "requestContext": {}}
        with pytest.raises(AuthError):
            get_caller_identity(event)

    def test_raises_when_tenant_id_missing(self):
        event = make_api_event()
        # Remove tenantId from claims
        event["requestContext"]["authorizer"]["claims"].pop("custom:tenantId")
        with pytest.raises(AuthError, match="Tenant ID"):
            get_caller_identity(event)


class TestRequireTenantAccess:
    def test_allows_matching_tenant(self):
        event = make_api_event(tenant_id="tenant-001")
        identity = require_tenant_access(event, "tenant-001")
        assert identity["tenant_id"] == "tenant-001"

    def test_blocks_mismatched_tenant(self):
        event = make_api_event(tenant_id="tenant-001")
        with pytest.raises(AuthError, match="tenant mismatch"):
            require_tenant_access(event, "tenant-002")


class TestRequireRole:
    def test_allows_permitted_role(self):
        identity = {"tenant_id": "t1", "role": "ADMIN", "sub": "s1", "email": "e@e.com"}
        require_role(identity, "ADMIN", "AGENT")  # should not raise

    def test_blocks_unpermitted_role(self):
        identity = {"tenant_id": "t1", "role": "VIEWER", "sub": "s1", "email": "e@e.com"}
        with pytest.raises(AuthError, match="not permitted"):
            require_role(identity, "ADMIN")
