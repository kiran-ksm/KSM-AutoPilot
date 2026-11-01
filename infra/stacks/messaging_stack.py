"""
KsmAp-<env>-Messaging  (Phase 4 — wired in when ready)

Placeholder stack for dedicated messaging infrastructure:
- SES domain identity verification
- SNS topic for follow-up automations (Phase 5)
- Dead-letter queue for failed message deliveries

This stack is not yet wired into app.py — it is activated in Phase 4.
"""

import aws_cdk as cdk
from aws_cdk import (
    Stack,
    CfnOutput,
    aws_sns as sns,
    aws_sqs as sqs,
    aws_ses as ses,
)
from constructs import Construct
from stacks.config import EnvConfig


class MessagingStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        config: EnvConfig,
        **kwargs,
    ):
        super().__init__(scope, construct_id, **kwargs)

        # ── Dead-letter queue for failed messages ──────────────────────────────
        self.dlq = sqs.Queue(
            self,
            "MessageDlq",
            queue_name=f"ksmap-{env_name}-message-dlq",
            retention_period=cdk.Duration.days(14),
            encryption=sqs.QueueEncryption.SQS_MANAGED,
        )

        # ── Follow-up automation SNS topic ─────────────────────────────────────
        self.followup_topic = sns.Topic(
            self,
            "FollowupTopic",
            topic_name=f"ksmap-{env_name}-followup",
            display_name=f"KSM AutoPilot {env_name} Follow-up Automation",
        )

        # ── CDK Outputs ───────────────────────────────────────────────────────
        CfnOutput(self, "DlqUrl", value=self.dlq.queue_url)
        CfnOutput(self, "DlqArn", value=self.dlq.queue_arn)
        CfnOutput(self, "FollowupTopicArn", value=self.followup_topic.topic_arn)
