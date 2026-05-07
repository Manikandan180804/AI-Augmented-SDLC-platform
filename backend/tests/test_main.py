"""
Backend test suite for AI-SDLC Platform.
Runs in demo mode — no real OpenAI key required.
Run with: pytest tests/ -v

Test groups:
  - Core endpoint response shape (5 tests)
  - Input validation / boundary tests (4 tests)
  - API key auth middleware (2 tests)
"""
import os
os.environ["DEMO_MODE"] = "true"  # Force demo mode for all tests

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint_returns_ok():
    """Health endpoint should always return status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "demo_mode" in data


def test_analyze_requirements_returns_expected_fields():
    """Requirements analyzer should return all required fields."""
    response = client.post("/api/v1/requirements/analyze", json={
        "text": "The system must load quickly and be secure.",
        "project_id": "TEST-001"
    })
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "user_stories" in data
    assert "ambiguities" in data
    assert "completeness_score" in data
    assert "ready_for_development" in data
    assert isinstance(data["completeness_score"], int)


def test_code_review_returns_expected_fields():
    """Code review endpoint should return assessment and comments."""
    response = client.post("/api/v1/review/code", json={
        "diff": "--- a/login.py\n+++ b/login.py\n-    if password == raw:\n+    if verify(password, hashed):",
        "repo": "test/repo",
        "pr_number": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert "overall_assessment" in data
    assert "comments" in data
    assert "risk_level" in data
    assert "security_checklist" in data
    assert data["overall_assessment"] in ("approve", "request_changes", "needs_discussion")


def test_deployment_score_is_valid_range():
    """Deployment risk score should be between 0 and 100."""
    response = client.post("/api/v1/deployment/score", json={
        "files_changed": ["auth/login.py", "db/migrations/001.sql"],
        "environment": "production",
        "coverage_delta": -2.0,
        "has_rollback_plan": False,
        "staging_passed": False
    })
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert 0 <= data["risk_score"] <= 100
    assert data["recommendation"] in ("deploy", "canary", "staged", "hold")


def test_test_generation_returns_test_files():
    """Test generator should return at least one test file."""
    response = client.post("/api/v1/tests/generate", json={
        "function_bodies": "def add(a: int, b: int) -> int:\n    return a + b",
        "framework": "pytest",
        "language": "python"
    })
    assert response.status_code == 200
    data = response.json()
    assert "test_files" in data
    assert "impact_analysis" in data
    assert isinstance(data["test_files"], list)
    assert len(data["test_files"]) > 0


def test_traceability_returns_chain_and_gaps():
    """Traceability should return upstream/downstream chain and gap analysis."""
    response = client.post("/api/v1/traceability/trace", json={
        "artifact_type": "requirement",
        "artifact_id": "REQ-001",
        "artifact_data": "Users must log in with email and password.",
        "linked_artifacts": ""
    })
    assert response.status_code == 200
    data = response.json()
    assert "traceability_chain" in data
    assert "upstream" in data["traceability_chain"]
    assert "downstream" in data["traceability_chain"]
    assert "gaps" in data
    assert "audit_trail" in data


# ─── INPUT VALIDATION TESTS ───────────────────────────────────────────────────

def test_requirements_rejects_empty_text():
    """Requirement text below min_length=10 should return 422 Unprocessable Entity."""
    response = client.post("/api/v1/requirements/analyze", json={"text": "short"})
    assert response.status_code == 422


def test_requirements_rejects_oversized_text():
    """Requirement text exceeding max_length=10_000 should return 422."""
    response = client.post("/api/v1/requirements/analyze", json={"text": "x" * 10_001})
    assert response.status_code == 422


def test_code_review_rejects_empty_diff():
    """Code review diff below min_length=5 should return 422."""
    response = client.post("/api/v1/review/code", json={"diff": "ab"})
    assert response.status_code == 422


def test_deployment_score_rejects_invalid_coverage_delta():
    """Coverage delta outside [-100, 100] should return 422."""
    response = client.post("/api/v1/deployment/score", json={
        "files_changed": ["app.py"],
        "coverage_delta": 999.0
    })
    assert response.status_code == 422


# ─── API KEY AUTH MIDDLEWARE TESTS ─────────────────────────────────────────────

def test_api_key_auth_is_open_when_no_key_configured():
    """When PLATFORM_API_KEY is not set, /api/* routes should be accessible without a key."""
    import main as _main
    original = _main._PLATFORM_API_KEY
    _main._PLATFORM_API_KEY = ""          # simulate no key configured
    try:
        response = client.post("/api/v1/requirements/analyze", json={
            "text": "The system must load quickly and be secure."
        })
        assert response.status_code == 200
    finally:
        _main._PLATFORM_API_KEY = original


def test_api_key_auth_blocks_request_when_key_configured():
    """When PLATFORM_API_KEY is set, requests without X-API-Key should get 401."""
    import main as _main
    original = _main._PLATFORM_API_KEY
    _main._PLATFORM_API_KEY = "supersecret"
    try:
        response = client.post("/api/v1/requirements/analyze", json={
            "text": "The system must load quickly and be secure."
        })
        assert response.status_code == 401
        assert "X-API-Key" in response.json()["detail"]
    finally:
        _main._PLATFORM_API_KEY = original
