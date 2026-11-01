"""
Unit tests for ksm_common.messaging — DEMO_MODE behaviour.
All real AWS SDK calls are mocked.
"""

import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend", "layer", "python"))


class TestDemoModeSms:
    def test_demo_mode_returns_mock_id(self, monkeypatch):
        monkeypatch.setenv("DEMO_MODE", "true")
        import importlib
        import ksm_common.messaging as msg
        importlib.reload(msg)  # Reload to pick up env var

        result = msg.send_sms("+61400000000", "Test message")
        assert result.startswith("demo-sms-")

    def test_demo_mode_does_not_call_sns(self, monkeypatch):
        monkeypatch.setenv("DEMO_MODE", "true")
        import importlib
        import ksm_common.messaging as msg
        importlib.reload(msg)

        called = []
        monkeypatch.setattr("boto3.client", lambda *a, **kw: called.append(a))
        msg.send_sms("+61400000000", "hello")
        assert not called, "boto3.client should not be called in DEMO_MODE"


class TestDemoModeEmail:
    def test_demo_mode_returns_mock_id(self, monkeypatch):
        monkeypatch.setenv("DEMO_MODE", "true")
        import importlib
        import ksm_common.messaging as msg
        importlib.reload(msg)

        result = msg.send_email("test@example.com", "Subject", "Body text")
        assert result.startswith("demo-email-")

    def test_demo_mode_does_not_call_ses(self, monkeypatch):
        monkeypatch.setenv("DEMO_MODE", "true")
        import importlib
        import ksm_common.messaging as msg
        importlib.reload(msg)

        called = []
        monkeypatch.setattr("boto3.client", lambda *a, **kw: called.append(a))
        msg.send_email("test@example.com", "Hi", "Body")
        assert not called, "boto3.client should not be called in DEMO_MODE"
