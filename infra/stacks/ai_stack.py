"""
KsmAp-<env>-Ai

Resources:
- Bedrock Guardrail (prevents toxic inputs, model drift, PII exposure)
- SSM Parameter storing the Guardrail ID for runtime lookup
- IAM policy updates injected into the score_lead Lambda

The Guardrail is configured to:
1. Block hate speech, violence, sexual content
2. Deny PII leakage (customer personal data)
3. Enforce topic restrictions (no off-topic financial or medical advice)
"""

import aws_cdk as cdk
from aws_cdk import (
    Stack,
    CfnOutput,
    aws_bedrock as bedrock,
    aws_ssm as ssm,
    aws_lambda as lambda_,
    aws_iam as iam,
)
from constructs import Construct
from stacks.config import EnvConfig


class AiStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        config: EnvConfig,
        api_functions: dict[str, lambda_.Function],
        **kwargs,
    ):
        super().__init__(scope, construct_id, **kwargs)

        # ── Bedrock Guardrail ──────────────────────────────────────────────────
        self.guardrail = bedrock.CfnGuardrail(
            self,
            "LeadScoringGuardrail",
            name=f"ksmap-{env_name}-lead-scoring",
            description=(
                "Guardrail for KSM AutoPilot lead scoring. "
                "Blocks toxic content, prevents PII leakage, "
                "restricts model to dealership sales context."
            ),
            blocked_input_messaging=(
                "This request was blocked by content moderation. "
                "Please ensure your input contains only dealership-related information."
            ),
            blocked_outputs_messaging=(
                "The model response was blocked by content moderation."
            ),
            # Content filters
            content_policy_config=bedrock.CfnGuardrail.ContentPolicyConfigProperty(
                filters_config=[
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="HATE", input_strength="HIGH", output_strength="HIGH"
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="VIOLENCE", input_strength="HIGH", output_strength="HIGH"
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="SEXUAL", input_strength="HIGH", output_strength="HIGH"
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="MISCONDUCT", input_strength="HIGH", output_strength="HIGH"
                    ),
                    bedrock.CfnGuardrail.ContentFilterConfigProperty(
                        type="PROMPT_ATTACK", input_strength="HIGH", output_strength="NONE"
                    ),
                ]
            ),
            # PII protection — deny exposure of customer PII in outputs
            sensitive_information_policy_config=bedrock.CfnGuardrail.SensitiveInformationPolicyConfigProperty(
                pii_entities_config=[
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="EMAIL", action="BLOCK"
                    ),
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="PHONE", action="BLOCK"
                    ),
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="NAME", action="ANONYMIZE"
                    ),
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="ADDRESS", action="BLOCK"
                    ),
                ]
            ),
            # Topic restrictions
            topic_policy_config=bedrock.CfnGuardrail.TopicPolicyConfigProperty(
                topics_config=[
                    bedrock.CfnGuardrail.TopicConfigProperty(
                        name="FinancialAdvice",
                        definition="Requests for specific investment, loan, or financial planning advice",
                        examples=["What stocks should I buy?", "How should I invest my money?"],
                        type="DENY",
                    ),
                    bedrock.CfnGuardrail.TopicConfigProperty(
                        name="MedicalAdvice",
                        definition="Requests for specific medical, health, or clinical advice",
                        examples=["What medication should I take?"],
                        type="DENY",
                    ),
                ]
            ),
        )

        # Guardrail version (DRAFT for dev/staging; pin to a numbered version for prod)
        guardrail_version = "DRAFT"

        # ── SSM Parameter — runtime lookup by Lambda ───────────────────────────
        param = ssm.StringParameter(
            self,
            "GuardrailIdParam",
            parameter_name=f"/ksmap/{env_name}/bedrock/guardrail-id",
            string_value=self.guardrail.attr_guardrail_id,
            description="Bedrock Guardrail ID for KSM AutoPilot lead scoring",
        )

        # ── Inject Guardrail config into score_lead Lambda env ─────────────────
        score_fn = api_functions.get("score_lead")
        if score_fn:
            score_fn.add_environment(
                "BEDROCK_GUARDRAIL_ID", self.guardrail.attr_guardrail_id
            )
            score_fn.add_environment("BEDROCK_GUARDRAIL_VERSION", guardrail_version)
            # Allow score_lead to read the SSM param at startup
            param.grant_read(score_fn)

        # ── CDK Outputs ───────────────────────────────────────────────────────
        CfnOutput(self, "GuardrailId", value=self.guardrail.attr_guardrail_id)
        CfnOutput(self, "GuardrailArn", value=self.guardrail.attr_guardrail_arn)
        CfnOutput(self, "GuardrailParamName", value=param.parameter_name)
