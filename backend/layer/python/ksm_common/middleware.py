"""
Lambda handler middleware.

Provides a decorator that wraps any Lambda handler with:
- Structured logging via Powertools (injects correlation IDs automatically)
- Centralised exception-to-HTTP-response mapping
- CORS preflight (OPTIONS) short-circuit

Usage:
    from ksm_common.middleware import lambda_handler
    from ksm_common import response as res

    @lambda_handler
    def handler(event, context):
        # Your business logic here
        return res.ok({"message": "hello"})
"""

import functools
from typing import Any, Callable
from aws_lambda_powertools.utilities.typing import LambdaContext
from ksm_common.logging import get_logger
from ksm_common import response as res
from ksm_common.auth import AuthError
from ksm_common.exceptions import KsmBaseError

logger = get_logger()


def lambda_handler(func: Callable) -> Callable:
    """
    Decorator that adds:
    - Powertools Logger inject_lambda_context (adds request ID, cold start flag)
    - OPTIONS preflight passthrough
    - Unified exception handling
    """
    @functools.wraps(func)
    def wrapper(event: dict[str, Any], context: LambdaContext) -> dict[str, Any]:
        # Short-circuit CORS preflight
        if event.get("httpMethod") == "OPTIONS":
            return res.handle_options()

        try:
            # Inject Lambda context into structured log output
            logger.append_keys(
                aws_request_id=getattr(context, "aws_request_id", "local"),
                path=event.get("path", ""),
                method=event.get("httpMethod", ""),
            )
            return func(event, context)

        except AuthError as exc:
            logger.warning("AuthError", detail=str(exc), status_code=exc.status_code)
            if exc.status_code == 401:
                return res.unauthorized(str(exc))
            return res.forbidden(str(exc))

        except KsmBaseError as exc:
            logger.warning("DomainError", code=exc.code, detail=str(exc))
            return res.error(str(exc), exc.status_code, exc.code)

        except ValueError as exc:
            logger.warning("ValidationError", detail=str(exc))
            return res.error(str(exc), 400, "VALIDATION_ERROR")

        except Exception as exc:
            logger.exception("Unhandled exception")
            return res.server_error()

    return wrapper
