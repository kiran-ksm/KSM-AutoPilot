#!/usr/bin/env python3
"""
KSM AutoPilot CDK App entry point.

Instantiates all stacks for each environment.
Stack name prefix: KsmAp-<env>-<StackName>

Rollback any environment:
    cdk destroy KsmAp-dev-*
    cdk destroy KsmAp-staging-*
    cdk destroy KsmAp-prod-*        # confirm carefully

Deploy a single stack:
    cdk deploy KsmAp-dev-Foundation
"""

import os
import aws_cdk as cdk
from stacks.config import get_env_config
from stacks.foundation_stack import FoundationStack
from stacks.database_stack import DatabaseStack
from stacks.api_stack import ApiStack
from stacks.ai_stack import AiStack

app = cdk.App()

# Environments to deploy — driven by CDK_ENV context or all three by default
deploy_envs = app.node.try_get_context("deploy_env") or "dev"
envs = [e.strip() for e in deploy_envs.split(",")]

for env_name in envs:
    cfg = get_env_config(env_name)

    cdk_env = cdk.Environment(
        account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=os.environ.get("CDK_DEFAULT_REGION", cfg.aws_region),
    )

    prefix = f"KsmAp-{env_name}"

    foundation = FoundationStack(
        app,
        f"{prefix}-Foundation",
        env_name=env_name,
        config=cfg,
        env=cdk_env,
        description=f"KSM AutoPilot {env_name}: S3, CloudFront, Cognito",
    )

    database = DatabaseStack(
        app,
        f"{prefix}-Database",
        env_name=env_name,
        config=cfg,
        env=cdk_env,
        description=f"KSM AutoPilot {env_name}: DynamoDB single-table",
    )

    api = ApiStack(
        app,
        f"{prefix}-Api",
        env_name=env_name,
        config=cfg,
        user_pool=foundation.user_pool,
        table=database.table,
        allowed_origin=foundation.distribution_domain,
        env=cdk_env,
        description=f"KSM AutoPilot {env_name}: Lambda Layer, functions, API Gateway",
    )

    ai_stack = AiStack(
        app,
        f"{prefix}-Ai",
        env_name=env_name,
        config=cfg,
        api_functions=api.functions,
        env=cdk_env,
        description=f"KSM AutoPilot {env_name}: Bedrock Guardrails, IAM roles",
    )

    # Propagate CDK stack outputs as tags for traceability
    for stack in [foundation, database, api, ai_stack]:
        cdk.Tags.of(stack).add("Project", "KsmAutoPilot")
        cdk.Tags.of(stack).add("Environment", env_name)
        cdk.Tags.of(stack).add("ManagedBy", "CDK")

app.synth()
