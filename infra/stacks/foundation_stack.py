"""
KsmAp-<env>-Foundation

Resources:
- S3 bucket (private, versioned) for SPA static assets
- CloudFront distribution with Origin Access Identity (OAI)
  · HTTPS only, TLS 1.2
  · Custom error responses: 404/403 → /index.html (SPA routing)
- Cognito User Pool + App Client
- CDK Outputs for downstream stacks and CI/CD
"""

import aws_cdk as cdk
from aws_cdk import (
    Stack,
    RemovalPolicy,
    CfnOutput,
    aws_s3 as s3,
    aws_cloudfront as cf,
    aws_cloudfront_origins as origins,
    aws_cognito as cognito,
)
from constructs import Construct
from stacks.config import EnvConfig


class FoundationStack(Stack):
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

        # ── S3 Bucket ─────────────────────────────────────────────────────────
        self.bucket = s3.Bucket(
            self,
            "FrontendBucket",
            bucket_name=None,          # CDK-generated — no hardcoded names
            versioned=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            removal_policy=removal,
            auto_delete_objects=config.removal_policy == "DESTROY",
        )

        # ── CloudFront OAC origin ─────────────────────────────────────────────
        # Use Origin Access Identity (OAI) — fully supported by CDK 2.140.
        # CDK automatically adds the correct s3:GetObject grant to the bucket policy.
        oai = cf.OriginAccessIdentity(
            self,
            "OAI",
            comment=f"KSM AutoPilot {env_name} OAI",
        )
        self.bucket.grant_read(oai)
        oai_origin = origins.S3Origin(self.bucket, origin_access_identity=oai)

        # ── CloudFront Distribution ───────────────────────────────────────────
        self.distribution = cf.Distribution(
            self,
            "Distribution",
            default_behavior=cf.BehaviorOptions(
                origin=oai_origin,
                viewer_protocol_policy=cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cf.CachePolicy.CACHING_OPTIMIZED,
                compress=True,
            ),
            default_root_object="index.html",
            # SPA routing: send 403/404 back to index.html for React Router
            error_responses=[
                cf.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=cdk.Duration.seconds(0),
                ),
                cf.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=cdk.Duration.seconds(0),
                ),
            ],
            price_class=cf.PriceClass.PRICE_CLASS_100,
            minimum_protocol_version=cf.SecurityPolicyProtocol.TLS_V1_2_2021,
            enable_logging=True,
        )

        # ── Cognito User Pool ─────────────────────────────────────────────────
        self.user_pool = cognito.UserPool(
            self,
            "UserPool",
            user_pool_name=f"ksmap-{env_name}-users",
            self_sign_up_enabled=False,
            sign_in_aliases=cognito.SignInAliases(email=True),
            password_policy=cognito.PasswordPolicy(
                min_length=10,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=removal,
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True),
            ),
            custom_attributes={
                "tenantId": cognito.StringAttribute(mutable=False),
                "role": cognito.StringAttribute(mutable=True),
            },
            advanced_security_mode=cognito.AdvancedSecurityMode.ENFORCED,
        )

        self.user_pool_client = self.user_pool.add_client(
            "WebClient",
            user_pool_client_name=f"ksmap-{env_name}-web",
            auth_flows=cognito.AuthFlow(user_srp=True, user_password=True),
            prevent_user_existence_errors=True,
            access_token_validity=cdk.Duration.hours(1),
            id_token_validity=cdk.Duration.hours(1),
            refresh_token_validity=cdk.Duration.days(30),
            enable_token_revocation=True,
        )

        # ── Convenience property ──────────────────────────────────────────────
        self.distribution_domain = f"https://{self.distribution.distribution_domain_name}"

        # ── CDK Outputs ───────────────────────────────────────────────────────
        CfnOutput(self, "BucketName", value=self.bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=self.distribution.distribution_id)
        CfnOutput(self, "DistributionDomain", value=self.distribution_domain)
        CfnOutput(self, "UserPoolId", value=self.user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=self.user_pool_client.user_pool_client_id)
        CfnOutput(self, "CognitoRegion", value=config.aws_region)
