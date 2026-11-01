"""
Messaging module — SMS (SNS/Pinpoint) and Email (SES).

When DEMO_MODE=true the actual AWS SDK calls are skipped and the payload is
logged as a structured JSON event to CloudWatch instead of sending real messages.
This satisfies the requirement that mock calls log payloads to a dedicated console
rather than calling external communication SDKs.
"""

import os
import json
import boto3
from typing import Any
from ksm_common.logging import get_logger

logger = get_logger()

DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"
SES_FROM_ADDRESS = os.environ.get("SES_FROM_ADDRESS", "")
SNS_SMS_SENDER_ID = os.environ.get("SNS_SMS_SENDER_ID", "KSMAutoPilot")


def send_sms(phone_number: str, message: str, metadata: dict[str, Any] | None = None) -> str:
    """
    Send an SMS message.

    Args:
        phone_number: E.164 format, e.g. "+61412345678".
        message:      Message text (max 1600 chars).
        metadata:     Optional dict logged alongside the payload.

    Returns:
        message_id string (real SNS MessageId or synthetic demo id).
    """
    payload = {
        "phone_number": phone_number,
        "message": message,
        "metadata": metadata or {},
    }

    if DEMO_MODE:
        logger.info(
            "DEMO_MODE SMS intercepted",
            demo_event_type="SMS",
            **payload,
        )
        return f"demo-sms-{phone_number[:8]}"

    client = boto3.client("sns", region_name=os.environ["AWS_REGION"])
    response = client.publish(
        PhoneNumber=phone_number,
        Message=message,
        MessageAttributes={
            "AWS.SNS.SMS.SenderID": {"DataType": "String", "StringValue": SNS_SMS_SENDER_ID},
            "AWS.SNS.SMS.SMSType": {"DataType": "String", "StringValue": "Transactional"},
        },
    )
    message_id = response["MessageId"]
    logger.info("SMS sent", message_id=message_id, phone=phone_number[:6] + "****")
    return message_id


def send_email(
    to_address: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> str:
    """
    Send an email via SES.

    Args:
        to_address:  Recipient email.
        subject:     Email subject.
        body_text:   Plain text body.
        body_html:   Optional HTML body.
        metadata:    Optional dict logged alongside the payload.

    Returns:
        message_id string.
    """
    payload = {
        "to": to_address,
        "subject": subject,
        "body_preview": body_text[:200],
        "metadata": metadata or {},
    }

    if DEMO_MODE:
        logger.info(
            "DEMO_MODE Email intercepted",
            demo_event_type="EMAIL",
            **payload,
        )
        return f"demo-email-{to_address[:8]}"

    if not SES_FROM_ADDRESS:
        raise RuntimeError("SES_FROM_ADDRESS environment variable is not set")

    client = boto3.client("ses", region_name=os.environ["AWS_REGION"])

    body: dict[str, Any] = {"Text": {"Data": body_text, "Charset": "UTF-8"}}
    if body_html:
        body["Html"] = {"Data": body_html, "Charset": "UTF-8"}

    response = client.send_email(
        Source=SES_FROM_ADDRESS,
        Destination={"ToAddresses": [to_address]},
        Message={"Subject": {"Data": subject, "Charset": "UTF-8"}, "Body": body},
    )
    message_id = response["MessageId"]
    logger.info("Email sent", message_id=message_id, to=to_address)
    return message_id
