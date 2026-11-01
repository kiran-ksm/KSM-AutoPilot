"""
Unit tests for ksm_common.validation — Pydantic request models.
No AWS calls — pure Python.
"""

import pytest
from ksm_common.validation import (
    CreateLeadRequest,
    UpdateLeadRequest,
    SendSmsRequest,
    SendEmailRequest,
    parse_body,
)


class TestCreateLeadRequest:
    def test_valid_minimal(self):
        req = CreateLeadRequest(
            firstName="Jane",
            lastName="Doe",
            email="jane@example.com",
            phone="+61412345678",
        )
        assert req.firstName == "Jane"
        assert req.source == "WEBSITE"

    def test_strips_whitespace(self):
        req = CreateLeadRequest(
            firstName="  Jane  ",
            lastName="  Doe  ",
            email="jane@example.com",
            phone="+61412345678",
        )
        assert req.firstName == "Jane"
        assert req.lastName == "Doe"

    def test_invalid_email(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CreateLeadRequest(
                firstName="Jane", lastName="Doe",
                email="not-an-email", phone="0400000000"
            )

    def test_invalid_phone(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CreateLeadRequest(
                firstName="Jane", lastName="Doe",
                email="jane@example.com", phone="abc"
            )

    def test_empty_first_name_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            CreateLeadRequest(
                firstName="   ", lastName="Doe",
                email="jane@example.com", phone="0400000000"
            )


class TestUpdateLeadRequest:
    def test_valid_status_update(self):
        req = UpdateLeadRequest(status="QUALIFIED")
        assert req.status == "QUALIFIED"

    def test_requires_at_least_one_field(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            UpdateLeadRequest()

    def test_valid_notes_only(self):
        req = UpdateLeadRequest(notes="Called and left voicemail")
        assert req.notes == "Called and left voicemail"


class TestSendSmsRequest:
    def test_valid(self):
        req = SendSmsRequest(leadId="lead-001", message="Hello!")
        assert req.message == "Hello!"

    def test_empty_message_rejected(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SendSmsRequest(leadId="lead-001", message="   ")

    def test_message_too_long(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            SendSmsRequest(leadId="lead-001", message="x" * 1601)


class TestParseBody:
    def test_valid_json(self):
        import json
        body = json.dumps({"firstName": "A", "lastName": "B", "email": "a@b.com", "phone": "0400000000"})
        req = parse_body(CreateLeadRequest, body)
        assert req.firstName == "A"

    def test_missing_body(self):
        with pytest.raises(ValueError, match="required"):
            parse_body(CreateLeadRequest, None)

    def test_invalid_json(self):
        with pytest.raises(ValueError, match="valid JSON"):
            parse_body(CreateLeadRequest, "not json")

    def test_validation_error_message(self):
        import json
        body = json.dumps({"firstName": "A"})  # Missing required fields
        with pytest.raises(ValueError):
            parse_body(CreateLeadRequest, body)
