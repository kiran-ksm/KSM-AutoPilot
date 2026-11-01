"""
AI module — Amazon Bedrock integration with Guardrails.

All generative AI calls must go through this module to ensure:
1. Bedrock Guardrails are applied on every invocation.
2. No private customer data is exposed to the model beyond what's needed.
3. Structured logging captures all AI requests/responses for audit.

Environment variables
─────────────────────
BEDROCK_MODEL_ID           e.g. "anthropic.claude-3-sonnet-20240229-v1:0"
BEDROCK_GUARDRAIL_ID       ARN or ID of the Bedrock Guardrail resource
BEDROCK_GUARDRAIL_VERSION  e.g. "DRAFT" or a numeric version
DEMO_MODE                  "true" to skip real Bedrock calls
"""

import os
import json
import boto3
from typing import Any
from ksm_common.logging import get_logger

logger = get_logger()

DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")
GUARDRAIL_ID = os.environ.get("BEDROCK_GUARDRAIL_ID", "")
GUARDRAIL_VERSION = os.environ.get("BEDROCK_GUARDRAIL_VERSION", "DRAFT")

_bedrock_client = None


def _get_client():
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            "bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1")
        )
    return _bedrock_client


def score_lead(lead_data: dict[str, Any]) -> dict[str, Any]:
    """
    Use Bedrock to score a lead on a 0–100 scale.

    Args:
        lead_data: Sanitised lead fields (no PII beyond what's needed).

    Returns:
        {"score": int, "reasoning": str}
    """
    if DEMO_MODE:
        import random
        score = random.randint(55, 95)
        logger.info("DEMO_MODE AI score generated", score=score)
        return {
            "score": score,
            "reasoning": (
                "DEMO MODE: Simulated score based on vehicle interest and enquiry recency. "
                "In production, Claude evaluates engagement signals, vehicle preferences, "
                "and historical conversion patterns."
            ),
        }

    prompt = _build_scoring_prompt(lead_data)
    response_text = _invoke_bedrock(prompt)
    return _parse_scoring_response(response_text)


def _build_scoring_prompt(lead_data: dict[str, Any]) -> str:
    """Build a structured prompt with only necessary, sanitised fields."""
    safe_data = {
        "vehicle_interest": lead_data.get("vehicleInterest", "Not specified"),
        "source": lead_data.get("source", "UNKNOWN"),
        "notes_length": len(lead_data.get("notes", "")),
        "has_phone": bool(lead_data.get("phone")),
        "days_since_created": lead_data.get("days_since_created", 0),
    }
    return f"""You are a lead scoring assistant for a car dealership.
Score this lead from 0 to 100 based on purchase intent signals.
Respond ONLY with a valid JSON object: {{"score": <integer 0-100>, "reasoning": "<one sentence>"}}

Lead data:
{json.dumps(safe_data, indent=2)}"""


def _invoke_bedrock(prompt: str) -> str:
    """Invoke Bedrock with the configured model and guardrails."""
    client = _get_client()

    request_body: dict[str, Any] = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 256,
        "messages": [{"role": "user", "content": prompt}],
    }

    kwargs: dict[str, Any] = {
        "modelId": MODEL_ID,
        "contentType": "application/json",
        "accept": "application/json",
        "body": json.dumps(request_body),
    }

    # Apply Guardrails if configured
    if GUARDRAIL_ID:
        kwargs["guardrailIdentifier"] = GUARDRAIL_ID
        kwargs["guardrailVersion"] = GUARDRAIL_VERSION

    response = client.invoke_model(**kwargs)
    body = json.loads(response["body"].read())

    logger.info(
        "Bedrock invocation complete",
        model_id=MODEL_ID,
        guardrail_id=GUARDRAIL_ID or "none",
        input_tokens=body.get("usage", {}).get("input_tokens"),
        output_tokens=body.get("usage", {}).get("output_tokens"),
    )

    return body["content"][0]["text"]


def _parse_scoring_response(text: str) -> dict[str, Any]:
    """Parse Bedrock JSON response, with fallback for malformed output."""
    try:
        data = json.loads(text)
        score = max(0, min(100, int(data.get("score", 50))))
        reasoning = str(data.get("reasoning", "No reasoning provided"))
        return {"score": score, "reasoning": reasoning}
    except (json.JSONDecodeError, ValueError, KeyError):
        logger.warning("Failed to parse Bedrock response", raw_text=text[:200])
        return {"score": 50, "reasoning": "Score could not be determined from model response"}
