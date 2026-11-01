"""
CDK snapshot / assertion tests for KSM AutoPilot stacks.

Validates that key resources exist and are configured correctly
without actually deploying to AWS.

Requires: pip install aws-cdk-lib constructs pytest
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "infra"))

try:
    import aws_cdk as cdk
    from aws_cdk.assertions import Template
    from stacks.config import get_env_config
    from stacks.foundation_stack import FoundationStack
    from stacks.database_stack import DatabaseStack
    CDK_AVAILABLE = True
except ImportError:
    CDK_AVAILABLE = False

pytestmark = pytest.mark.skipif(not CDK_AVAILABLE, reason="aws-cdk-lib not installed")


@pytest.fixture(scope="module")
def dev_config():
    return get_env_config("dev")


@pytest.fixture(scope="module")
def foundation_template(dev_config):
    app = cdk.App()
    stack = FoundationStack(app, "TestFoundation", env_name="dev", config=dev_config)
    return Template.from_stack(stack)


@pytest.fixture(scope="module")
def database_template(dev_config):
    app = cdk.App()
    stack = DatabaseStack(app, "TestDatabase", env_name="dev", config=dev_config)
    return Template.from_stack(stack)


class TestFoundationStack:
    def test_s3_bucket_exists(self, foundation_template):
        foundation_template.resource_count_is("AWS::S3::Bucket", 1)

    def test_s3_bucket_blocks_public_access(self, foundation_template):
        foundation_template.has_resource_properties(
            "AWS::S3::Bucket",
            {
                "PublicAccessBlockConfiguration": {
                    "BlockPublicAcls": True,
                    "BlockPublicPolicy": True,
                    "IgnorePublicAcls": True,
                    "RestrictPublicBuckets": True,
                }
            },
        )

    def test_cloudfront_distribution_exists(self, foundation_template):
        foundation_template.resource_count_is("AWS::CloudFront::Distribution", 1)

    def test_cognito_user_pool_exists(self, foundation_template):
        foundation_template.resource_count_is("AWS::Cognito::UserPool", 1)

    def test_cognito_self_sign_up_disabled(self, foundation_template):
        foundation_template.has_resource_properties(
            "AWS::Cognito::UserPool",
            {"AdminCreateUserConfig": {"AllowAdminCreateUserOnly": True}},
        )


class TestDatabaseStack:
    def test_dynamodb_table_exists(self, database_template):
        database_template.resource_count_is("AWS::DynamoDB::Table", 1)

    def test_table_uses_pay_per_request(self, database_template):
        database_template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {"BillingMode": "PAY_PER_REQUEST"},
        )

    def test_gsi1_exists(self, database_template):
        database_template.has_resource_properties(
            "AWS::DynamoDB::Table",
            {
                "GlobalSecondaryIndexes": [
                    {"IndexName": "GSI1"}
                ]
            },
        )


class TestEnvConfig:
    def test_dev_config_has_demo_mode(self, dev_config):
        assert dev_config.demo_mode is True

    def test_prod_config_has_no_demo_mode(self):
        prod = get_env_config("prod")
        assert prod.demo_mode is False

    def test_prod_removal_policy_is_retain(self):
        prod = get_env_config("prod")
        assert prod.removal_policy == "RETAIN"

    def test_invalid_env_raises(self):
        with pytest.raises(ValueError):
            get_env_config("unknown-env")
