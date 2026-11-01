"""
KsmAp-<env>-Api

Resources:
- Lambda Layer (KSM Common shared modules)
- Lambda functions (one per handler file)
- API Gateway REST API with Cognito authoriser
- CORS restricted to the CloudFront distribution domain only
- All env vars injected — no hardcoded resource identifiers
"""

import os
import aws_cdk as cdk
from aws_cdk import (
    Stack,
    CfnOutput,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_cognito as cognito,
    aws_dynamodb as ddb,
    aws_iam as iam,
    aws_logs as logs,
)
from constructs import Construct
from stacks.config import EnvConfig

# Path to backend source, relative to this file
BACKEND_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "backend")


class ApiStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        env_name: str,
        config: EnvConfig,
        user_pool: cognito.UserPool,
        table: ddb.Table,
        allowed_origin: str,
        **kwargs,
    ):
        super().__init__(scope, construct_id, **kwargs)

        # ── Lambda Layer ───────────────────────────────────────────────────────
        self.layer = lambda_.LayerVersion(
            self,
            "KsmCommonLayer",
            layer_version_name=f"ksmap-{env_name}-common",
            code=lambda_.Code.from_asset(os.path.join(BACKEND_ROOT, "layer")),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_12],
            description="KSM AutoPilot shared modules: db, auth, validation, logging, ai, messaging",
        )

        # ── Shared Lambda environment variables ────────────────────────────────
        common_env = {
            "DYNAMODB_TABLE_NAME": table.table_name,
            "DYNAMODB_GSI1_NAME": "GSI1",
            "DEMO_MODE": str(config.demo_mode).lower(),
            "ALLOWED_ORIGIN": allowed_origin,
            "SES_FROM_ADDRESS": config.ses_from_address,
            "BEDROCK_MODEL_ID": config.bedrock_model_id,
            "POWERTOOLS_SERVICE_NAME": f"ksmap-{env_name}",
            "LOG_LEVEL": config.log_level,
            "DEFAULT_TENANT_ID": "" if env_name == "prod" else f"tenant-{env_name}-001",
        }

        # ── Helper to build a Lambda function ─────────────────────────────────
        def make_fn(name: str, handler_path: str, extra_env: dict | None = None) -> lambda_.Function:
            fn = lambda_.Function(
                self,
                name,
                function_name=f"ksmap-{env_name}-{name.lower().replace('_', '-')}",
                runtime=lambda_.Runtime.PYTHON_3_12,
                handler="handler.handler",
                code=lambda_.Code.from_asset(
                    os.path.join(BACKEND_ROOT, "functions", handler_path)
                ),
                layers=[self.layer],
                environment={**common_env, **(extra_env or {})},
                memory_size=config.lambda_memory_mb,
                timeout=cdk.Duration.seconds(config.lambda_timeout_seconds),
                log_retention=logs.RetentionDays.ONE_MONTH,
                tracing=lambda_.Tracing.ACTIVE,
            )
            table.grant_read_write_data(fn)
            return fn

        # ── Lambda functions ───────────────────────────────────────────────────
        self.functions = {
            "create_lead":        make_fn("CreateLead",       "leads/create_lead"),
            "list_leads":         make_fn("ListLeads",        "leads/list_leads"),
            "get_lead":           make_fn("GetLead",          "leads/get_lead"),
            "update_lead":        make_fn("UpdateLead",       "leads/update_lead"),
            "delete_lead":        make_fn("DeleteLead",       "leads/delete_lead"),
            "get_stats":          make_fn("GetStats",         "dashboard/get_stats"),
            "get_leads_by_status":make_fn("GetLeadsByStatus", "dashboard/get_leads_by_status"),
            "get_activity":       make_fn("GetActivity",      "dashboard/get_activity"),
            "send_sms":           make_fn("SendSms",          "messaging/send_sms"),
            "send_email":         make_fn("SendEmail",        "messaging/send_email"),
            "score_lead":         make_fn("ScoreLead",        "ai/score_lead"),
        }

        # ── IAM: SNS publish permission for SMS ────────────────────────────────
        self.functions["send_sms"].add_to_role_policy(
            iam.PolicyStatement(
                actions=["sns:Publish"],
                resources=["*"],
                conditions={"StringEquals": {"sns:Protocol": "sms"}},
            )
        )

        # ── IAM: SES send permission ───────────────────────────────────────────
        self.functions["send_email"].add_to_role_policy(
            iam.PolicyStatement(
                actions=["ses:SendEmail", "ses:SendRawEmail"],
                resources=["*"],
            )
        )
        # Inject email-specific config — EMAIL_DEMO_MODE overrides global DEMO_MODE
        self.functions["send_email"].add_environment(
            "EMAIL_DEMO_MODE", str(config.email_demo_mode).lower()
        )
        if config.ses_to_override:
            self.functions["send_email"].add_environment(
                "SES_TO_OVERRIDE", config.ses_to_override
            )

        # ── IAM: Bedrock invocation ────────────────────────────────────────────
        self.functions["score_lead"].add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel", "bedrock:ApplyGuardrail"],
                resources=["*"],
            )
        )

        # ── Cognito Authoriser ─────────────────────────────────────────────────
        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "CognitoAuthorizer",
            cognito_user_pools=[user_pool],
            authorizer_name=f"ksmap-{env_name}-authorizer",
            identity_source="method.request.header.Authorization",
        )

        auth_method = {"authorizer": authorizer, "authorization_type": apigw.AuthorizationType.COGNITO}

        # ── API Gateway ────────────────────────────────────────────────────────
        log_group = logs.LogGroup(
            self,
            "ApiAccessLogs",
            log_group_name=f"/ksmap/{env_name}/api-access",
            retention=logs.RetentionDays.ONE_MONTH,
        )

        api_root = apigw.RestApi(
            self,
            "RestApi",
            rest_api_name=f"ksmap-{env_name}-api",
            description=f"KSM AutoPilot {env_name} REST API v1",
            deploy_options=apigw.StageOptions(
                stage_name=env_name,
                logging_level=apigw.MethodLoggingLevel.INFO,
                data_trace_enabled=False,
                access_log_destination=apigw.LogGroupLogDestination(log_group),
                access_log_format=apigw.AccessLogFormat.json_with_standard_fields(
                    caller=False, http_method=True, ip=False,
                    protocol=True, request_time=True, resource_path=True,
                    response_length=True, status=True, user=False,
                ),
                throttling_burst_limit=50,
                throttling_rate_limit=100,
            ),
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=[allowed_origin],
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"],
                max_age=cdk.Duration.hours(1),
            ),
        )

        self.api = api_root

        # v1 versioning: all routes under /api/v1
        v1 = api_root.root.add_resource("api").add_resource("v1")

        fn = self.functions

        # ── /api/v1/public/leads (public endpoint) ─────────────────────────────
        public = v1.add_resource("public")
        public_leads = public.add_resource("leads")
        public_leads.add_method("POST", apigw.LambdaIntegration(fn["create_lead"]))  # public, no auth

        # ── /api/v1/leads ──────────────────────────────────────────────────────
        leads = v1.add_resource("leads")
        leads.add_method("GET",  apigw.LambdaIntegration(fn["list_leads"]),  **auth_method)

        lead = leads.add_resource("{leadId}")
        lead.add_method("GET",    apigw.LambdaIntegration(fn["get_lead"]),    **auth_method)
        lead.add_method("PATCH",  apigw.LambdaIntegration(fn["update_lead"]), **auth_method)
        lead.add_method("DELETE", apigw.LambdaIntegration(fn["delete_lead"]), **auth_method)

        # ── /api/v1/dashboard ───────────────────────────────────────────────────
        dashboard = v1.add_resource("dashboard")
        dashboard.add_resource("summary").add_method(
            "GET", apigw.LambdaIntegration(fn["get_stats"]), **auth_method
        )
        dashboard.add_resource("leads-by-status").add_method(
            "GET", apigw.LambdaIntegration(fn["get_leads_by_status"]), **auth_method
        )
        dashboard.add_resource("activity").add_method(
            "GET", apigw.LambdaIntegration(fn["get_activity"]), **auth_method
        )

        # ── /api/v1/messaging ──────────────────────────────────────────────────
        messaging = v1.add_resource("messaging")
        messaging.add_resource("sms").add_method(
            "POST", apigw.LambdaIntegration(fn["send_sms"]), **auth_method
        )
        messaging.add_resource("email").add_method(
            "POST", apigw.LambdaIntegration(fn["send_email"]), **auth_method
        )

        # ── /api/v1/ai ──────────────────────────────────────────────────────────
        ai = v1.add_resource("ai")
        ai.add_resource("score-lead").add_resource("{leadId}").add_method(
            "POST", apigw.LambdaIntegration(fn["score_lead"]), **auth_method
        )

        # ── CDK Outputs ───────────────────────────────────────────────────────
        CfnOutput(self, "ApiUrl", value=api_root.url)
        CfnOutput(self, "LayerArn", value=self.layer.layer_version_arn)
