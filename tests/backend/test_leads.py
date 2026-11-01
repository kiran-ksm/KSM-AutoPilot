"""
Integration tests for lead Lambda handlers using mocked DynamoDB (moto).
"""

import json
import sys
import os
import pytest
from moto import mock_aws

# Ensure ksm_common is importable from the layer path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "layer", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "functions", "leads", "create_lead"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "functions", "leads", "list_leads"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "functions", "leads", "get_lead"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "functions", "leads", "update_lead"))

from conftest import make_api_event, FakeLambdaContext


@mock_aws
class TestCreateLead:
    def test_creates_lead_successfully(self, dynamodb_table):
        from backend.functions.leads.create_lead import handler as create_module
        # Re-import to pick up mocked table
        import importlib
        import ksm_common.db as db_module
        db_module._table = None

        event = make_api_event(
            method="POST",
            path="/leads",
            body={
                "firstName": "Alice",
                "lastName": "Smith",
                "email": "alice@example.com",
                "phone": "+61400000001",
                "vehicleInterest": "SUV",
            },
        )
        response = create_module.handler(event, FakeLambdaContext())
        assert response["statusCode"] == 201
        body = json.loads(response["body"])
        assert body["firstName"] == "Alice"
        assert body["status"] == "NEW"
        assert "leadId" in body
        assert "PK" not in body  # internal keys must be stripped

    def test_rejects_invalid_email(self, dynamodb_table):
        from backend.functions.leads.create_lead import handler as create_module
        event = make_api_event(
            method="POST",
            body={
                "firstName": "Bob",
                "lastName": "Jones",
                "email": "not-valid",
                "phone": "0400000000",
            },
        )
        response = create_module.handler(event, FakeLambdaContext())
        assert response["statusCode"] == 400

    def test_rejects_missing_tenant(self, dynamodb_table):
        from backend.functions.leads.create_lead import handler as create_module
        event = make_api_event(method="POST", body={
            "firstName": "A", "lastName": "B",
            "email": "a@b.com", "phone": "0400000000",
        })
        event["stageVariables"] = {}
        os.environ.pop("DEFAULT_TENANT_ID", None)
        response = create_module.handler(event, FakeLambdaContext())
        assert response["statusCode"] == 400
        os.environ["DEFAULT_TENANT_ID"] = "tenant-test-001"  # restore


@mock_aws
class TestListLeads:
    def test_returns_empty_list_for_new_tenant(self, dynamodb_table):
        import ksm_common.db as db_module
        db_module._table = None
        from backend.functions.leads.list_leads import handler as list_module
        event = make_api_event(method="GET", path="/leads")
        response = list_module.handler(event, FakeLambdaContext())
        assert response["statusCode"] == 200
        body = json.loads(response["body"])
        assert body["items"] == []
        assert body["total"] == 0


@mock_aws
class TestGetLead:
    def test_returns_404_for_missing_lead(self, dynamodb_table):
        import ksm_common.db as db_module
        db_module._table = None
        from backend.functions.leads.get_lead import handler as get_module
        event = make_api_event(
            method="GET",
            path_params={"leadId": "nonexistent-lead-id"},
        )
        response = get_module.handler(event, FakeLambdaContext())
        assert response["statusCode"] == 404


@mock_aws
class TestUpdateLead:
    def test_returns_404_for_missing_lead(self, dynamodb_table):
        import ksm_common.db as db_module
        db_module._table = None
        from backend.functions.leads.update_lead import handler as update_module
        event = make_api_event(
            method="PATCH",
            path_params={"leadId": "nonexistent-id"},
            body={"status": "CONTACTED"},
        )
        response = update_module.handler(event, FakeLambdaContext())
        assert response["statusCode"] == 404
