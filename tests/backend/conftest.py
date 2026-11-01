"""
Shared pytest fixtures for all backend Lambda tests.

Uses moto to mock AWS services — no real AWS calls are made during tests.
"""

import os
import json
import pytest
import boto3
from moto import mock_aws

# ── Environment variables required by ksm_common modules ─────────────────────
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SECURITY_TOKEN", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")
os.environ.setdefault("DYNAMODB_TABLE_NAME", "ksmap-test-table")
os.environ.setdefault("DYNAMODB_GSI1_NAME", "GSI1")
os.environ.setdefault("DEMO_MODE", "true")
os.environ.setdefault("ALLOWED_ORIGIN", "https://test.cloudfront.net")
os.environ.setdefault("SES_FROM_ADDRESS", "test@example.com")
os.environ.setdefault("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
os.environ.setdefault("POWERTOOLS_SERVICE_NAME", "ksmap-test")
os.environ.setdefault("LOG_LEVEL", "DEBUG")
os.environ.setdefault("SKIP_AUTH_VERIFY", "true")
os.environ.setdefault("DEFAULT_TENANT_ID", "tenant-test-001")


@pytest.fixture(scope="function")
def aws_credentials():
    """Ensure moto uses fake credentials."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"


@pytest.fixture(scope="function")
def dynamodb_table(aws_credentials):
    """Create a mocked DynamoDB table matching the single-table design."""
    with mock_aws():
        ddb = boto3.resource("dynamodb", region_name="us-east-1")
        table = ddb.create_table(
            TableName="ksmap-test-table",
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
                {"AttributeName": "GSI1PK", "AttributeType": "S"},
                {"AttributeName": "GSI1SK", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "GSI1",
                    "KeySchema": [
                        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                        {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        # Reset the ksm_common.db module-level cache so it picks up the mock table
        import ksm_common.db as db_module
        db_module._table = None
        db_module._dynamodb = None
        yield table
        db_module._table = None
        db_module._dynamodb = None


def make_api_event(
    method: str = "POST",
    path: str = "/",
    body: dict | None = None,
    path_params: dict | None = None,
    query_params: dict | None = None,
    tenant_id: str = "tenant-test-001",
    role: str = "ADMIN",
) -> dict:
    """Build a minimal API Gateway proxy event for Lambda handler testing."""
    return {
        "httpMethod": method,
        "path": path,
        "pathParameters": path_params or {},
        "queryStringParameters": query_params or {},
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body) if body else None,
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": "user-sub-001",
                    "email": "test@example.com",
                    "custom:tenantId": tenant_id,
                    "custom:role": role,
                }
            }
        },
        "stageVariables": {"tenantId": tenant_id},
    }


class FakeLambdaContext:
    aws_request_id = "test-request-id-001"
    function_name = "test-function"
    memory_limit_in_mb = 256
    invoked_function_arn = "arn:aws:lambda:us-east-1:123456789012:function:test"
    log_group_name = "/aws/lambda/test"
    log_stream_name = "test-stream"
