import json
import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()
import rag_engine
import agents

# Initialize RAG Engine
rag_engine_inst = rag_engine.CodeRAG(persist_directory="./faiss_index")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sdlc-platform")

app = FastAPI(title="AI-SDLC Platform", version="1.0.0")

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Read origins from env so it works in any environment without code changes
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── OPTIONAL API KEY AUTH ─────────────────────────────────────────────────────
# Set PLATFORM_API_KEY in .env to enable header-based auth.
# Leave blank to run open (useful for local dev / demos).
_PLATFORM_API_KEY = os.getenv("PLATFORM_API_KEY", "")

@app.middleware("http")
async def api_key_guard(request: Request, call_next):
    """If PLATFORM_API_KEY is set, require matching X-API-Key header on /api/* routes."""
    if _PLATFORM_API_KEY and request.url.path.startswith("/api/"):
        client_key = request.headers.get("X-API-Key", "")
        if client_key != _PLATFORM_API_KEY:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid or missing X-API-Key header"},
            )
    return await call_next(request)

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

# Store for real-time events (webhooks)
WEBHOOK_EVENTS = []

# Lazy OpenAI client — only instantiated when a request is made
try:
    from openai import OpenAI as _OpenAI
    _openai_available = True
except ImportError:
    _OpenAI = None
    _openai_available = False

_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ─── MOCK RESPONSES ───────────────────────────────────────────────────────────

MOCK_REQUIREMENTS = {
    "summary": "Vague performance, usability, optional dark mode, and unspecified login security requirements.",
    "ambiguities": [
        {"phrase": "load pages quickly", "issue": "No measurable threshold defined", "suggested_clarification": "What is the maximum acceptable page load time? (e.g., under 2s on 4G)"},
        {"phrase": "easy to use for all users", "issue": "Subjective and untestable; 'all users' is undefined", "suggested_clarification": "Which user personas? What usability standard? (e.g., WCAG 2.1 AA)"},
        {"phrase": "might also support dark mode", "issue": "'Might' indicates this is not a firm requirement", "suggested_clarification": "Is dark mode in scope for this release or a future enhancement?"},
        {"phrase": "needs to be secure", "issue": "Security is not defined — no standard, threat model, or specific controls mentioned", "suggested_clarification": "Which security controls are required? (e.g., MFA, rate limiting, OWASP Top 10)"}
    ],
    "entities": {
        "actors": ["end users", "system administrator"],
        "data_objects": ["pages", "login credentials", "user sessions"],
        "business_rules": ["login must meet unspecified security standard", "pages must load within undefined threshold"]
    },
    "user_stories": [
        {"id": "US-001", "title": "Fast page load", "priority": "high", "scenario": {"given": "a user with a standard 4G connection", "when": "they navigate to any page in the application", "then": "the page fully loads within 2 seconds"}, "acceptance_criteria": ["Lighthouse performance score >= 90", "Time to Interactive (TTI) < 2s on simulated 4G"]},
        {"id": "US-002", "title": "Secure login", "priority": "high", "scenario": {"given": "a registered user on the login page", "when": "they attempt to log in with invalid credentials 5 times", "then": "their account is temporarily locked for 15 minutes"}, "acceptance_criteria": ["Rate limiting: max 5 attempts per 15 minutes per IP", "Passwords stored as bcrypt hashes (cost factor >= 12)", "HTTPS enforced on login endpoint"]},
        {"id": "US-003", "title": "Accessible interface", "priority": "medium", "scenario": {"given": "a user with visual impairment using a screen reader", "when": "they navigate the application", "then": "all elements are accessible per WCAG 2.1 AA"}, "acceptance_criteria": ["All images have alt text", "Color contrast ratio >= 4.5:1", "Keyboard navigation works throughout"]}
    ],
    "risk_flags": [
        {"type": "missing_criteria", "description": "Dark mode has no defined scope or release target", "recommendation": "Explicitly exclude from this sprint or create a separate ticket"},
        {"type": "scope_creep", "description": "'All users' implies broad accessibility requirements not scoped", "recommendation": "Define specific user personas and accessibility standards"}
    ],
    "completeness_score": 28,
    "ready_for_development": False
}

MOCK_CODE_REVIEW = {
    "pr_summary": "This PR refactors the login function to use parameterized queries (preventing SQL injection) and adds proper password hashing via bcrypt instead of plaintext comparison.",
    "overall_assessment": "request_changes",
    "risk_level": "high",
    "comments": [
        {"id": "CR-001", "file": "auth/login.py", "line": 14, "severity": "critical", "category": "security", "title": "SQL Injection vulnerability", "message": "The original query uses f-string interpolation with user input directly, making it trivially injectable. Any user can bypass authentication with `' OR 1=1 --`.", "code_snippet": "query = f\"SELECT * FROM users WHERE username='{username}'\"", "suggested_fix": "user = db.query(User).filter(User.username == username).first()", "references": ["https://owasp.org/www-community/attacks/SQL_Injection"]},
        {"id": "CR-002", "file": "auth/login.py", "line": 16, "severity": "critical", "category": "security", "title": "Plaintext password comparison", "message": "Comparing raw passwords directly against the database value means passwords are stored in plaintext — a catastrophic security failure.", "code_snippet": "if user and user.password == password:", "suggested_fix": "if user and verify_password(password, user.hashed_password):", "references": ["https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html"]},
        {"id": "CR-003", "file": "auth/login.py", "line": 18, "severity": "major", "category": "error_handling", "title": "Silent None return on auth failure", "message": "Returning None instead of raising an exception makes it harder for callers to distinguish between 'user not found' and 'wrong password', and can lead to null pointer errors upstream.", "code_snippet": "return None", "suggested_fix": "raise AuthError(\"Invalid credentials\")", "references": []}
    ],
    "positive_observations": [
        "The refactored version correctly uses ORM parameterized queries",
        "bcrypt via verify_password() is the industry standard for password verification",
        "Raising AuthError instead of returning None improves API contract clarity"
    ],
    "missing_tests": [
        "test_login_with_sql_injection_attempt()",
        "test_login_with_incorrect_password_returns_auth_error()",
        "test_login_rate_limiting_after_5_attempts()"
    ],
    "security_checklist": {
        "sql_injection": "fail",
        "xss": "not_applicable",
        "auth_checked": "fail",
        "secrets_exposed": "pass",
        "input_validated": "fail"
    }
}

MOCK_TEST_GEN = {
    "impact_analysis": {
        "high_risk_paths": ["get_user_by_id() — called on every authenticated request", "create_user() — writes to database, enforces unique constraint"],
        "external_dependencies": ["Session (SQLAlchemy DB)", "User (ORM model)", "hash_password()", "ConflictError"],
        "regression_risk": "high",
        "estimated_coverage_gain": "68%"
    },
    "test_files": [
        {
            "filename": "test_user_service.py",
            "priority": 1,
            "rationale": "Both functions are critical path — get_user_by_id is called on every request, create_user writes to the DB with a unique constraint.",
            "code": """import pytest
from unittest.mock import MagicMock, patch, call
from services.user_service import get_user_by_id, create_user
from models import User
from exceptions import ConflictError


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def sample_user():
    user = MagicMock(spec=User)
    user.id = "abc-123"
    user.email = "test@example.com"
    return user


class TestGetUserById:

    def test_returns_user_when_id_exists(self, mock_db, sample_user):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user
        result = get_user_by_id("abc-123", mock_db)
        assert result.email == "test@example.com"

    def test_returns_none_when_user_not_found(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        result = get_user_by_id("nonexistent", mock_db)
        assert result is None

    def test_raises_value_error_on_empty_id(self, mock_db):
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            get_user_by_id("", mock_db)

    def test_raises_value_error_on_none_id(self, mock_db):
        with pytest.raises(ValueError):
            get_user_by_id(None, mock_db)

    def test_raises_value_error_on_sql_injection_attempt(self, mock_db):
        with pytest.raises(ValueError):
            get_user_by_id("' OR 1=1 --", mock_db)

    def test_raises_value_error_on_whitespace_only_id(self, mock_db):
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            get_user_by_id("   ", mock_db)


class TestCreateUser:

    def test_creates_user_successfully(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        with patch("services.user_service.hash_password", return_value="hashed_pw"):
            result = create_user("new@example.com", "securePass123!", mock_db)
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_raises_conflict_when_email_exists(self, mock_db, sample_user):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user
        with pytest.raises(ConflictError, match="Email already registered"):
            create_user("test@example.com", "password123", mock_db)

    def test_raises_value_error_on_empty_email(self, mock_db):
        with pytest.raises(ValueError):
            create_user("", "password123", mock_db)

    def test_raises_value_error_on_empty_password(self, mock_db):
        with pytest.raises(ValueError):
            create_user("user@example.com", "", mock_db)

    def test_does_not_store_plaintext_password(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        with patch("services.user_service.hash_password", return_value="$2b$12$hashed") as mock_hash:
            create_user("user@example.com", "plaintext", mock_db)
            mock_hash.assert_called_once_with("plaintext")
            added_user = mock_db.add.call_args[0][0]
            assert added_user.hashed_password != "plaintext"

    def test_rolls_back_on_commit_failure(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.commit.side_effect = Exception("DB error")
        with patch("services.user_service.hash_password", return_value="hashed"):
            with pytest.raises(Exception, match="DB error"):
                create_user("user@example.com", "pass", mock_db)
        mock_db.rollback.assert_called_once()
"""
        }
    ],
    "edge_cases_covered": [
        "Empty user_id raises ValueError",
        "None user_id raises ValueError",
        "SQL injection attempt in user_id raises ValueError",
        "Whitespace-only user_id treated as empty",
        "Duplicate email raises ConflictError",
        "Empty email raises ValueError",
        "Empty password raises ValueError",
        "Plaintext password never stored directly",
        "DB commit failure triggers rollback"
    ],
    "recommended_manual_tests": [
        "End-to-end registration flow: POST /register → verify DB row → POST /login → check JWT returned",
        "Concurrent user creation with same email — verify only one row created (race condition test)",
        "Load test: 1000 concurrent get_user_by_id() calls — verify no connection pool exhaustion"
    ]
}

MOCK_DEPLOYMENT = {
    "risk_score": 62,
    "risk_level": "high",
    "recommendation": "staged",
    "confidence": "high",
    "score_breakdown": [
        {"signal": "Authentication code modified (auth/login.py)", "impact": "+25", "reason": "Auth changes carry the highest blast radius — a bug locks out all users"},
        {"signal": "Database migration file included", "impact": "+20", "reason": "Schema changes are irreversible without a down migration"},
        {"signal": "No canary rollout planned", "impact": "+15", "reason": "All traffic hits the new code simultaneously"},
        {"signal": "No rollback plan documented", "impact": "+15", "reason": "No documented steps if the deployment fails"},
        {"signal": "Deployment during peak hours", "impact": "+10", "reason": "Higher user impact if something goes wrong"},
        {"signal": "Staging environment passed", "impact": "-10", "reason": "Reduces unknown-unknowns in the new code"},
        {"signal": "Test coverage increased +5%", "impact": "-10", "reason": "More test coverage = lower regression probability"},
        {"signal": "Fewer than 5 files changed", "impact": "-10", "reason": "Small blast radius, easy to reason about"}
    ],
    "blocking_issues": [
        "No rollback plan documented — required before any production deployment of auth changes",
        "DB migration has no corresponding down migration script"
    ],
    "warnings": [
        "Deployment during peak hours (09:00–18:00) increases user impact if errors occur",
        "No monitoring alert configured for auth failure rate spike"
    ],
    "mitigations": [
        {"action": "Write and test a rollback migration script before deploying", "risk_reduction": "Removes the 'no rollback plan' penalty (-15 points)", "effort": "medium"},
        {"action": "Wrap new auth logic in a feature flag (AUTH_V2_ENABLED)", "risk_reduction": "Allows instant rollback without redeployment (-15 points)", "effort": "low"},
        {"action": "Reschedule deployment to off-peak hours (before 09:00 or after 18:00)", "risk_reduction": "Reduces peak-hour penalty (-10 points)", "effort": "low"},
        {"action": "Deploy to 5% canary first, monitor for 30 min", "risk_reduction": "Limits blast radius dramatically (-10 points)", "effort": "low"}
    ],
    "rollback_plan": "1. Revert deployment via `git revert HEAD` and redeploy previous image. 2. Run down migration script to restore previous schema. 3. Flush session cache to force re-authentication. 4. Verify /api/health returns 200 and auth success rate > 99%.",
    "monitoring_checklist": [
        "Auth endpoint error rate < 0.1% (alert if > 1%)",
        "P95 login latency within 10% of 7-day baseline",
        "Zero 500-series errors on /api/auth/* for first 5 minutes",
        "Active session count stable (no mass logouts)",
        "DB connection pool utilization < 80%"
    ]
}

MOCK_TRACEABILITY = {
    "artifact": {"type": "requirement", "id": "REQ-001", "title": "User Authentication — Login with email and password", "status": "approved"},
    "traceability_chain": {
        "upstream": [],
        "downstream": [
            {"type": "user_story", "id": "US-001", "title": "Secure login with rate limiting", "status": "completed"},
            {"type": "user_story", "id": "US-002", "title": "Password stored as bcrypt hash", "status": "completed"},
            {"type": "user_story", "id": "US-003", "title": "HTTPS enforced on login endpoint", "status": "in_progress"},
            {"type": "commit", "id": "a3f9d12", "title": "refactor: replace raw SQL with ORM in login()", "status": "merged"},
            {"type": "commit", "id": "b7c1e45", "title": "feat: add bcrypt password hashing", "status": "merged"},
            {"type": "test", "id": "TC-001", "title": "test_login_with_valid_credentials_returns_token", "status": "passed"},
            {"type": "test", "id": "TC-002", "title": "test_login_rate_limiting_after_5_attempts", "status": "passed"},
            {"type": "test", "id": "TC-003", "title": "test_https_redirect_on_http_request", "status": "skipped"},
            {"type": "deployment", "id": "DEP-042", "title": "Production deploy v2.1.0 — auth refactor", "status": "deployed"}
        ]
    },
    "coverage_summary": {
        "total_stories": 3,
        "stories_with_tests": 2,
        "stories_deployed": 2,
        "orphaned_commits": [],
        "untested_stories": ["US-003 — HTTPS enforcement (TC-003 is skipped)"]
    },
    "gaps": [
        {"type": "no_tests", "description": "US-003 (HTTPS enforcement) has a test but it is marked 'skipped' — effectively untested", "affected_artifact": "US-003", "recommendation": "Un-skip TC-003 or create an integration test that verifies HTTP→HTTPS redirect in the staging environment"}
    ],
    "audit_trail": [
        {"event": "Requirement REQ-001 created", "timestamp": "2024-01-10T09:00:00Z", "actor": "pm@company.com"},
        {"event": "User stories US-001, US-002, US-003 generated by AI", "timestamp": "2024-01-10T09:15:00Z", "actor": "ai-system"},
        {"event": "Commit a3f9d12 linked to US-001", "timestamp": "2024-01-15T14:23:00Z", "actor": "dev@company.com"},
        {"event": "Commit b7c1e45 linked to US-002", "timestamp": "2024-01-16T10:05:00Z", "actor": "dev@company.com"},
        {"event": "Test TC-001, TC-002 passed in CI", "timestamp": "2024-01-16T11:30:00Z", "actor": "ci-system"},
        {"event": "Deployment DEP-042 to production", "timestamp": "2024-01-17T02:00:00Z", "actor": "deploy@company.com"}
    ]
}

# ─── SYSTEM PROMPTS ────────────────────────────────────────────────────────────

REQUIREMENTS_PROMPT = """You are an expert business analyst and software architect with 15+ years of experience.
Analyze raw requirement text and return ONLY valid JSON (no markdown, no preamble):
{
  "summary": "One-sentence summary",
  "ambiguities": [{"phrase": "...", "issue": "...", "suggested_clarification": "..."}],
  "entities": {"actors": [], "data_objects": [], "business_rules": []},
  "user_stories": [{"id": "US-001", "title": "...", "priority": "high|medium|low", "scenario": {"given": "...", "when": "...", "then": "..."}, "acceptance_criteria": []}],
  "risk_flags": [{"type": "scope_creep|missing_criteria|undefined_dependency|contradiction", "description": "...", "recommendation": "..."}],
  "completeness_score": 0,
  "ready_for_development": false
}"""

CODE_REVIEW_PROMPT = """You are a principal software engineer doing a production-grade code review.
Return ONLY valid JSON (no markdown):
{
  "pr_summary": "2 sentence summary",
  "overall_assessment": "approve|request_changes|needs_discussion",
  "risk_level": "low|medium|high|critical",
  "comments": [{"id": "CR-001", "file": "...", "line": 0, "severity": "critical|major|minor|info", "category": "security|logic|performance|error_handling|architecture|testability", "title": "...", "message": "...", "code_snippet": "...", "suggested_fix": "...", "references": []}],
  "positive_observations": [],
  "missing_tests": [],
  "security_checklist": {"sql_injection": "pass|fail|not_applicable", "xss": "pass|fail|not_applicable", "auth_checked": "pass|fail|not_applicable", "secrets_exposed": "pass|fail|not_applicable", "input_validated": "pass|fail|not_applicable"}
}"""

TEST_GEN_PROMPT = """You are a senior QA engineer. Generate complete runnable tests.
Return ONLY valid JSON (no markdown):
{
  "impact_analysis": {"high_risk_paths": [], "external_dependencies": [], "regression_risk": "low|medium|high", "estimated_coverage_gain": "X%"},
  "test_files": [{"filename": "test_x.py", "priority": 1, "rationale": "...", "code": "FULL TEST FILE"}],
  "edge_cases_covered": [],
  "recommended_manual_tests": []
}"""

DEPLOYMENT_PROMPT = """You are an SRE assessing deployment risk (score 0-100).
Return ONLY valid JSON (no markdown):
{
  "risk_score": 0,
  "risk_level": "low|medium|high|critical",
  "recommendation": "deploy|canary|staged|hold",
  "confidence": "high|medium|low",
  "score_breakdown": [{"signal": "...", "impact": "+N", "reason": "..."}],
  "blocking_issues": [],
  "warnings": [],
  "mitigations": [{"action": "...", "risk_reduction": "...", "effort": "low|medium|high"}],
  "rollback_plan": "...",
  "monitoring_checklist": []
}"""

TRACEABILITY_PROMPT = """You are a traceability assistant. Trace artifact chains.
Return ONLY valid JSON (no markdown):
{
  "artifact": {"type": "...", "id": "...", "title": "...", "status": "..."},
  "traceability_chain": {"upstream": [], "downstream": []},
  "coverage_summary": {"total_stories": 0, "stories_with_tests": 0, "stories_deployed": 0, "orphaned_commits": [], "untested_stories": []},
  "gaps": [{"type": "missing_link|no_tests|no_deployment|orphaned_code", "description": "...", "affected_artifact": "...", "recommendation": "..."}],
  "audit_trail": [{"event": "...", "timestamp": "ISO8601", "actor": "..."}]
}"""

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def call_openai(system_prompt: str, user_message: str) -> dict:
    """Call OpenAI GPT-4o and parse the JSON response."""
    if DEMO_MODE or not _openai_available or not _OPENAI_API_KEY:
        raise RuntimeError("demo")
    client = _OpenAI(api_key=_OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=8192,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 1)[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip().rstrip("```").strip()
    logger.info(f"OpenAI call successful: {len(raw)} bytes returned")
    return json.loads(raw)

def safe_call(system_prompt: str, user_message: str, mock_response: dict) -> dict:
    """Call OpenAI and fall back to mock data on quota/billing errors or demo mode."""
    try:
        return call_openai(system_prompt, user_message)
    except Exception as e:
        err = str(e)
        # Quota/billing error or demo mode → return mock
        if "quota" in err.lower() or "billing" in err.lower() or "credit" in err.lower() or "demo" in err or "429" in err:
            logger.warning(f"Falling back to MOCK data: {err}")
            return {**mock_response, "_demo": True}
        logger.error(f"API Call Failed: {err}")
        raise HTTPException(status_code=500, detail=err)

# ─── MODELS ───────────────────────────────────────────────────────────────────

class RequirementRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=10_000, description="Raw requirement text to analyze")
    project_id: str = Field("default", max_length=100)

class CodeReviewRequest(BaseModel):
    diff: str = Field(..., min_length=5, max_length=50_000, description="Git diff content")
    repo: str = Field("", max_length=200)
    pr_number: int = Field(0, ge=0)
    rag_context: str = Field("", max_length=5_000)
    ticket_context: str = Field("", max_length=5_000)

class TestGenRequest(BaseModel):
    commit_sha: str = Field("", max_length=100)
    repo: str = Field("", max_length=200)
    framework: str = Field("pytest", max_length=50)
    language: str = Field("python", max_length=50)
    function_bodies: str = Field(..., min_length=5, max_length=30_000, description="Source code to generate tests for")
    dependency_graph: str = Field("", max_length=5_000)
    existing_coverage: str = Field("", max_length=5_000)

class DeploymentScoreRequest(BaseModel):
    commit_sha: str = Field("", max_length=100)
    environment: str = Field("production", max_length=50)
    files_changed: list[str] = Field(default_factory=list, max_length=200)
    coverage_delta: float = Field(0.0, ge=-100.0, le=100.0)
    incident_history: str = Field("No incidents", max_length=2_000)
    deploy_time: str = Field("", max_length=50)
    has_rollback_plan: bool = False
    has_feature_flag: bool = False
    staging_passed: bool = False

class TraceabilityRequest(BaseModel):
    artifact_type: str = Field(..., max_length=50)
    artifact_id: str = Field(..., max_length=100)
    artifact_data: str = Field(..., min_length=5, max_length=10_000)
    linked_artifacts: str = Field("", max_length=5_000)

class BugFixRequest(BaseModel):
    bug_report: str = Field(..., min_length=10, description="Description of the bug to fix")

class ArchitectRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Description or code to generate architecture for")

class IndexRequest(BaseModel):
    path: str = Field(default=".", description="Path to index")

# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    demo = DEMO_MODE or not _openai_available or not _OPENAI_API_KEY
    return {"status": "ok", "demo_mode": demo}

@app.post("/api/v1/requirements/analyze")
async def analyze_requirement(req: RequirementRequest):
    return safe_call(REQUIREMENTS_PROMPT, req.text, MOCK_REQUIREMENTS)

@app.post("/api/v1/review/code")
async def review_code(req: CodeReviewRequest):
    msg = f"DIFF:\n{req.diff}\n\nTICKET:\n{req.ticket_context}"
    return safe_call(CODE_REVIEW_PROMPT, msg, MOCK_CODE_REVIEW)

@app.post("/api/v1/tests/generate")
async def generate_tests(req: TestGenRequest):
    msg = f"FRAMEWORK: {req.framework}\nLANG: {req.language}\n\nFUNCTIONS:\n{req.function_bodies}"
    return safe_call(TEST_GEN_PROMPT, msg, MOCK_TEST_GEN)

@app.post("/api/v1/deployment/score")
async def score_deployment(req: DeploymentScoreRequest):
    msg = (f"Files: {req.files_changed}\nCoverage delta: {req.coverage_delta}%\n"
           f"Env: {req.environment}\nDeploy time: {req.deploy_time}\n"
           f"Rollback plan: {req.has_rollback_plan}\nFeature flag: {req.has_feature_flag}\n"
           f"Staging passed: {req.staging_passed}\nIncidents: {req.incident_history}")
    return safe_call(DEPLOYMENT_PROMPT, msg, MOCK_DEPLOYMENT)

@app.post("/api/v1/traceability/trace")
async def trace_artifact(req: TraceabilityRequest):
    msg = (f"TYPE: {req.artifact_type}\nID: {req.artifact_id}\n"
           f"DATA:\n{req.artifact_data}\nLINKED:\n{req.linked_artifacts}")
    return safe_call(TRACEABILITY_PROMPT, msg, MOCK_TRACEABILITY)

# ─── NEW ENDPOINTS ────────────────────────────────────────────────────────────

@app.post("/api/v1/webhooks/github")
async def github_webhook(request: Request):
    payload = await request.json()
    event = {
        "source": "github",
        "type": request.headers.get("X-GitHub-Event", "push"),
        "payload": payload,
        "timestamp": os.popen("date /T").read().strip() + " " + os.popen("time /T").read().strip()
    }
    WEBHOOK_EVENTS.insert(0, event)
    logger.info(f"Received GitHub webhook: {event['type']}")
    return {"status": "received"}

@app.post("/api/v1/webhooks/jira")
async def jira_webhook(request: Request):
    payload = await request.json()
    event = {
        "source": "jira",
        "type": payload.get("webhookEvent", "jira:issue_updated"),
        "payload": payload,
        "timestamp": os.popen("date /T").read().strip() + " " + os.popen("time /T").read().strip()
    }
    WEBHOOK_EVENTS.insert(0, event)
    logger.info(f"Received Jira webhook: {event['type']}")
    return {"status": "received"}

@app.get("/api/v1/events")
async def get_events():
    return WEBHOOK_EVENTS[:50]

@app.post("/api/v1/rag/index")
async def index_code(req: IndexRequest):
    try:
        # Resolve path relative to project root if needed
        abs_path = os.path.abspath(req.path)
        rag_engine_inst.index_directory(abs_path)
        return {"status": "success", "message": f"Indexed directory: {abs_path}"}
    except Exception as e:
        logger.error(f"Indexing failed: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/v1/agents/fix-bug")
async def fix_bug(req: BugFixRequest):
    agent_fixer = agents.MultiAgentBugFixer(rag_engine_inst, safe_call)
    result = await agent_fixer.fix_bug(req.bug_report)
    return result

@app.post("/api/v1/architect/generate")
async def generate_architecture(req: ArchitectRequest):
    architect = agents.SystemArchitect(rag_engine_inst, safe_call)
    result = await architect.generate_architecture(req.text)
    return result
