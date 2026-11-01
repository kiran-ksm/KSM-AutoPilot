"""
KsmAp-<env>-Database

Single-table DynamoDB design:
  PK        SK           — main partition
  GSI1PK    GSI1SK       — status-based lead queries

Point-in-time recovery enabled on staging and prod.
"""

import aws_cdk as cdk
from aws_cdk import (
    Stack,
    RemovalPolicy,
    CfnOutput,
    aws_dynamodb as ddb,
)
from constructs import Construct
from stacks.config import EnvConfig


class DatabaseStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        config: EnvConfig,
        **kwargs,
    ):
        super().__init__(scope, construct_id, **kwargs)

        removal = (
            RemovalPolicy.DESTROY if config.removal_policy == "DESTROY" else RemovalPolicy.RETAIN
        )

        self.table = ddb.Table(
            self,
            "MainTable",
            # Table name is CDK-generated — never hardcoded
            partition_key=ddb.Attribute(name="PK", type=ddb.AttributeType.STRING),
            sort_key=ddb.Attribute(name="SK", type=ddb.AttributeType.STRING),
            billing_mode=ddb.BillingMode.PAY_PER_REQUEST,  # Low-cost, auto-scaling
            point_in_time_recovery=env_name in ("staging", "prod"),
            encryption=ddb.TableEncryption.AWS_MANAGED,
            removal_policy=removal,
            stream=ddb.StreamViewType.NEW_AND_OLD_IMAGES,  # Phase 5: automation triggers
        )

        # GSI1 — query leads by status across a tenant
        self.table.add_global_secondary_index(
            index_name="GSI1",
            partition_key=ddb.Attribute(name="GSI1PK", type=ddb.AttributeType.STRING),
            sort_key=ddb.Attribute(name="GSI1SK", type=ddb.AttributeType.STRING),
            projection_type=ddb.ProjectionType.ALL,
        )

        # ── CDK Outputs ───────────────────────────────────────────────────────
        CfnOutput(self, "TableName", value=self.table.table_name)
        CfnOutput(self, "TableArn", value=self.table.table_arn)
        CfnOutput(self, "GSI1Name", value="GSI1")
        CfnOutput(self, "StreamArn", value=self.table.table_stream_arn or "N/A")
