"""
Input validation models using Pydantic v2.

All API request bodies should be validated through these models before any
business logic or database operations are performed.
"""

import re
from typing import Literal, Any
from pydantic import BaseModel, EmailStr, field_validator, model_validator


LeadStatus = Literal[
    "NEW", "CONTACTED", "QUALIFIED",
    "APPOINTMENT_REQUESTED", "APPOINTMENT_CONFIRMED", "TEST_DRIVE_COMPLETED",
    "PROPOSAL", "WON", "LOST", "NURTURE",
]
LeadSource   = Literal["WEBSITE", "WALK_IN", "REFERRAL", "SOCIAL", "OTHER"]
InquiryType  = Literal[
    "VEHICLE_INFORMATION", "TEST_DRIVE", "AVAILABILITY",
    "TRADE_IN", "FINANCING", "GENERAL_QUESTION",
]
ContactMethod = Literal["EMAIL", "PHONE", "SMS", "ANY"]


def _strip(v: str) -> str:
    return v.strip() if isinstance(v, str) else v


class VehicleInterestModel(BaseModel):
    """Structured vehicle interest — sent from the inventory browser."""
    year:             int | None = None
    make:             str | None = None
    model:            str | None = None
    trim:             str | None = None
    vin:              str | None = None
    stockNumber:      str | None = None
    vehicleDetailUrl: str | None = None
    vehicleType:      str | None = None  # free-text fallback


class ChannelConsentModel(BaseModel):
    email: bool = False
    sms:   bool = False
    phone: bool = False


class LeadAttributionModel(BaseModel):
    utmSource:   str | None = None
    utmMedium:   str | None = None
    utmCampaign: str | None = None
    utmContent:  str | None = None
    utmTerm:     str | None = None
    landingPageUrl: str | None = None
    referrerUrl:    str | None = None


class CreateLeadRequest(BaseModel):
    firstName:             str
    lastName:              str
    email:                 EmailStr
    phone:                 str
    inquiryType:           InquiryType | None = None
    # vehicleInterest accepts either a plain string (legacy) or the structured object
    vehicleInterest:       VehicleInterestModel | str | None = None
    message:               str | None = None
    source:                LeadSource = "WEBSITE"
    notes:                 str | None = None
    dealershipId:          str | None = None
    preferredContactMethod: ContactMethod | None = None
    preferredContactTime:  str | None = None
    consent:               ChannelConsentModel | None = None
    attribution:           LeadAttributionModel | None = None

    @field_validator("firstName", "lastName")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = _strip(v)
        if not v:
            raise ValueError("Name fields must not be empty")
        if len(v) > 100:
            raise ValueError("Name too long (max 100 characters)")
        return v

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        v = _strip(v)
        if not re.match(r"^(\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$", v):
            raise ValueError("Invalid US phone number format. Use (XXX) XXX-XXXX")
        return v

    @field_validator("notes", "message")
    @classmethod
    def max_length(cls, v: str | None) -> str | None:
        if v and len(v) > 2000:
            raise ValueError("Field too long (max 2000 characters)")
        return v


class UpdateLeadRequest(BaseModel):
    status:          LeadStatus | None = None
    assignedTo:      str | None = None
    notes:           str | None = None
    vehicleInterest: VehicleInterestModel | str | None = None
    priority:        Literal["HOT", "WARM", "COLD", "UNCLASSIFIED"] | None = None
    nextFollowUp:    str | None = None

    @model_validator(mode="after")
    def at_least_one_field(self) -> "UpdateLeadRequest":
        if all(v is None for v in [
            self.status, self.assignedTo, self.notes,
            self.vehicleInterest, self.priority, self.nextFollowUp,
        ]):
            raise ValueError("At least one field must be provided for update")
        return self


class SendSmsRequest(BaseModel):
    leadId:  str
    message: str

    @field_validator("message")
    @classmethod
    def message_length(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message must not be empty")
        if len(v) > 1600:
            raise ValueError("SMS message too long (max 1600 characters)")
        return v.strip()


class SendEmailRequest(BaseModel):
    leadId:  str
    subject: str
    body:    str

    @field_validator("subject")
    @classmethod
    def subject_length(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Subject must not be empty")
        if len(v) > 200:
            raise ValueError("Subject too long (max 200 characters)")
        return v

    @field_validator("body")
    @classmethod
    def body_length(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Body must not be empty")
        if len(v) > 50_000:
            raise ValueError("Email body too long (max 50,000 characters)")
        return v


def parse_body(model_class: Any, body: str | None) -> BaseModel:
    """
    Parse and validate a JSON request body against a Pydantic model.
    Raises ValueError with a descriptive message on failure.
    """
    import json
    from pydantic import ValidationError

    if not body:
        raise ValueError("Request body is required")
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise ValueError("Request body must be valid JSON")
    try:
        return model_class(**data)
    except ValidationError as exc:
        errors = [f"{'.'.join(str(l) for l in e['loc'])}: {e['msg']}" for e in exc.errors()]
        raise ValueError("; ".join(errors))
