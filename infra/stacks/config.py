"""
Environment-specific configuration.

All resource names, ARNs, account IDs and region identifiers are read from
here — never hardcoded in stack files.
"""

from dataclasses import dataclass, field


@dataclass
class EnvConfig:
    env_name: str
    aws_region: str
    demo_mode: bool
    log_level: str
    # Bedrock
    bedrock_model_id: str
    # Lambda
    lambda_memory_mb: int
    lambda_timeout_seconds: int
    # CloudFront
    price_class: str
    # SES
    ses_from_address: str
    # Per-environment email override:
    #   email_demo_mode=False  → real SES send
    #   email_demo_mode=True   → simulate (default matches demo_mode)
    #   ses_to_override        → redirect all email to this address in dev/staging
    email_demo_mode: bool = True
    ses_to_override: str = ""
    # Removal policy
    removal_policy: str = "DESTROY"


_CONFIGS: dict[str, EnvConfig] = {
    "dev": EnvConfig(
        env_name="dev",
        aws_region="us-east-1",
        demo_mode=True,
        log_level="DEBUG",
        bedrock_model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        lambda_memory_mb=256,
        lambda_timeout_seconds=30,
        price_class="PriceClass_100",
        ses_from_address="info@ksmtechnologies.net",
        email_demo_mode=False,             # real SES in dev — verified sender + recipient
        ses_to_override="kiran786@gmail.com",  # redirect all dev email here per §1 instruction 13
        removal_policy="DESTROY",
    ),
    "staging": EnvConfig(
        env_name="staging",
        aws_region="us-east-1",
        demo_mode=True,
        log_level="INFO",
        bedrock_model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        lambda_memory_mb=512,
        lambda_timeout_seconds=30,
        price_class="PriceClass_100",
        ses_from_address="info@ksmtechnologies.net",
        email_demo_mode=False,
        ses_to_override="kiran786@gmail.com",
        removal_policy="DESTROY",
    ),
    "prod": EnvConfig(
        env_name="prod",
        aws_region="us-east-1",
        demo_mode=False,
        log_level="WARNING",
        bedrock_model_id="anthropic.claude-3-sonnet-20240229-v1:0",
        lambda_memory_mb=512,
        lambda_timeout_seconds=30,
        price_class="PriceClass_200",
        ses_from_address="info@ksmtechnologies.net",
        email_demo_mode=False,             # real SES in prod — no override
        ses_to_override="",
        removal_policy="RETAIN",
    ),
}


def get_env_config(env_name: str) -> EnvConfig:
    if env_name not in _CONFIGS:
        raise ValueError(
            f"Unknown environment '{env_name}'. Valid options: {list(_CONFIGS.keys())}"
        )
    return _CONFIGS[env_name]
