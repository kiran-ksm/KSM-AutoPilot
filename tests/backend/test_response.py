"""
Unit tests for ksm_common.response — API Gateway response helpers.
"""

import json
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "layer", "python"))

from ksm_common import response as res


class TestResponseHelpers:
    def test_ok_returns_200(self):
        r = res.ok({"key": "value"})
        assert r["statusCode"] == 200
        assert json.loads(r["body"]) == {"key": "value"}

    def test_created_returns_201(self):
        r = res.created({"id": "abc"})
        assert r["statusCode"] == 201

    def test_no_content_returns_204(self):
        r = res.no_content()
        assert r["statusCode"] == 204
        assert r["body"] == ""

    def test_error_returns_correct_code(self):
        r = res.error("Bad input", 400, "BAD_INPUT")
        assert r["statusCode"] == 400
        body = json.loads(r["body"])
        assert body["code"] == "BAD_INPUT"
        assert body["message"] == "Bad input"

    def test_not_found_returns_404(self):
        r = res.not_found("Lead")
        assert r["statusCode"] == 404
        body = json.loads(r["body"])
        assert "not found" in body["message"]

    def test_forbidden_returns_403(self):
        r = res.forbidden()
        assert r["statusCode"] == 403

    def test_server_error_returns_500(self):
        r = res.server_error()
        assert r["statusCode"] == 500

    def test_cors_headers_present(self):
        r = res.ok({})
        assert "Access-Control-Allow-Origin" in r["headers"]

    def test_decimal_serialisation(self):
        from decimal import Decimal
        r = res.ok({"score": Decimal("85"), "rate": Decimal("0.5")})
        body = json.loads(r["body"])
        assert body["score"] == 85
        assert body["rate"] == 0.5

    def test_options_preflight(self):
        r = res.handle_options()
        assert r["statusCode"] == 200
        assert "Access-Control-Allow-Methods" in r["headers"]
