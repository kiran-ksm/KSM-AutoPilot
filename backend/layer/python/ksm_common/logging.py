"""
Structured JSON logging via AWS Lambda Powertools.

All Lambda functions should import get_logger from this module instead of
using the stdlib logging module directly, to ensure consistent JSON output
in CloudWatch and support for analytical dashboards.

Usage:
    from ksm_common.logging import get_logger
    logger = get_logger()
    logger.info("Lead created", lead_id=lead_id, tenant_id=tenant_id)
"""

from aws_lambda_powertools import Logger

# Service name is read from the POWERTOOLS_SERVICE_NAME environment variable,
# which is set per-function in the CDK stack. Falls back to "ksm-autopilot".
_logger_cache: dict[str, Logger] = {}


def get_logger(service: str | None = None) -> Logger:
    """
    Return a cached structured Logger instance.

    Args:
        service: Optional override for the service name. If omitted, the value
                 of POWERTOOLS_SERVICE_NAME env var is used.

    Returns:
        Configured aws_lambda_powertools.Logger instance.
    """
    key = service or "__default__"
    if key not in _logger_cache:
        kwargs = {"service": service} if service else {}
        _logger_cache[key] = Logger(**kwargs)
    return _logger_cache[key]
