"""
POST /api/v1/messaging/email  — protected (Cognito authoriser required).

Sends a branded HTML email via SES to the address associated with a lead.

Environment variables
─────────────────────
SES_FROM_ADDRESS      verified SES sender (info@ksmtechnologies.net)
SES_TO_OVERRIDE       when set, overrides the recipient — used in dev/staging
                      to redirect ALL email to a fixed address (kiran786@gmail.com)
                      without touching business logic.
DEMO_MODE             "true" → no SES call; payload logged to CloudWatch only.
EMAIL_DEMO_MODE       optional per-feature override — "true" or "false".
                      Takes precedence over DEMO_MODE for email sends only.
                      Set to "false" on the sendemail Lambda to enable real SES
                      while keeping the rest of the environment in DEMO_MODE.
"""

import os
import uuid
from datetime import datetime, timezone

from ksm_common.middleware import lambda_handler
from ksm_common.auth import get_caller_identity, require_tenant_access
from ksm_common.validation import SendEmailRequest, parse_body
from ksm_common.exceptions import NotFoundError
from ksm_common import db, response as res
from ksm_common.logging import get_logger

logger = get_logger()


def _email_demo_mode() -> bool:
    """
    Return True when email should be simulated, False when SES should be called.

    Priority:
    1. EMAIL_DEMO_MODE env var (per-feature override — "true" / "false")
    2. DEMO_MODE env var (environment-wide flag)
    """
    per_feature = os.environ.get("EMAIL_DEMO_MODE", "").lower()
    if per_feature == "false":
        return False
    if per_feature == "true":
        return True
    # Fall back to global DEMO_MODE
    return os.environ.get("DEMO_MODE", "true").lower() == "true"


def _build_html(subject: str, body_text: str, lead_first: str,
                from_name: str = "KSM AutoPilot") -> str:
    """
    Build a simple branded HTML email body.
    Keeps formatting clean while clearly labeling AI-generated content.
    """
    paragraphs = "".join(
        f"<p style='margin:0 0 12px 0;'>{p.strip()}</p>"
        for p in body_text.strip().split("\n")
        if p.strip()
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#0F172A;padding:20px 32px;">
              <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.5px;">
                KSM AutoPilot
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px 0;color:#0F172A;font-size:20px;">{subject}</h2>
              <div style="color:#334155;font-size:15px;line-height:1.7;">
                {paragraphs}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 32px;">
              <p style="margin:0;color:#94A3B8;font-size:12px;">
                This message was sent by KSM AutoPilot on behalf of your dealership.
                If you did not request this contact, please disregard this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


@lambda_handler
def handler(event, context):
    identity  = get_caller_identity(event)
    tenant_id = identity["tenant_id"]

    body = parse_body(SendEmailRequest, event.get("body"))

    # Verify lead exists and belongs to this tenant
    lead = db.get_item(pk=f"TENANT#{tenant_id}", sk=f"LEAD#{body.leadId}")
    if not lead:
        raise NotFoundError("Lead")
    require_tenant_access(event, lead["tenantId"])

    demo = _email_demo_mode()
    from_address = os.environ.get("SES_FROM_ADDRESS", "info@ksmtechnologies.net")

    # In dev/staging, redirect all email to a fixed address so real customers
    # are never contacted during testing.
    to_address_real = lead["email"]
    to_address_send = os.environ.get("SES_TO_OVERRIDE") or to_address_real

    html_body = _build_html(
        subject=body.subject,
        body_text=body.body,
        lead_first=lead.get("firstName", ""),
    )

    if demo:
        # DEMO_MODE — log to CloudWatch, no SES call
        logger.info(
            "DEMO_MODE Email intercepted",
            demo_event_type="EMAIL",
            to=to_address_real[:4] + "***",    # mask for logs
            subject=body.subject,
            body_preview=body.body[:100],
            lead_id=body.leadId,
            tenant_id=tenant_id,
        )
        message_id = f"demo-email-{uuid.uuid4().hex[:8]}"
        status = "DEMO_LOGGED"
    else:
        # Real SES send
        import boto3
        ses = boto3.client("ses", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        response = ses.send_email(
            Source=from_address,
            Destination={"ToAddresses": [to_address_send]},
            Message={
                "Subject": {"Data": body.subject, "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": body.body, "Charset": "UTF-8"},
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                },
            },
            ReplyToAddresses=[from_address],
        )
        message_id = response["MessageId"]
        status = "SENT"
        logger.info(
            "Email sent via SES",
            message_id=message_id,
            from_address=from_address,
            to_original=to_address_real[:4] + "***",
            to_sent=to_address_send[:4] + "***",
            subject=body.subject,
            lead_id=body.leadId,
            tenant_id=tenant_id,
        )

    # Write activity record
    _write_activity(
        tenant_id=tenant_id,
        lead_id=body.leadId,
        lead_name=f"{lead['firstName']} {lead['lastName']}",
        description=f"Email {'simulated' if demo else 'sent'}: {body.subject}",
    )

    return res.ok({"messageId": message_id, "status": status})


def _write_activity(tenant_id: str, lead_id: str, lead_name: str, description: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    activity_id = str(uuid.uuid4())
    db.put_item({
        "PK":          f"TENANT#{tenant_id}",
        "SK":          f"ACTIVITY#{now}#{activity_id}",
        "activityId":  activity_id,
        "leadId":      lead_id,
        "leadName":    lead_name,
        "tenantId":    tenant_id,
        "type":        "EMAIL",
        "description": description,
        "createdAt":   now,
    })
