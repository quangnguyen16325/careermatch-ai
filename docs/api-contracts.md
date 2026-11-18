# API integration contract — working proposal v0.1

Prepared for CM-036. Review date: 2026-11-17.

This document defines the first frontend/backend integration slice. Service
information, health, registration, login, refresh, logout, and GET auth/me are implemented; see
[registration](registration.md) and [sessions](sessions.md) for delivery and limitations. All other NestJS
endpoints below are **proposed and not implemented**. Frontend work should use mocks until each
endpoint is delivered and verified in Swagger. Contract agreement is not proof
of feature completion or final scope approval.

## Service boundaries and ownership

- React calls NestJS at `http://localhost:3000/api/v1`. Its environment variable is
  `VITE_API_URL`. React owns presentation and transient UI state, not authorization.
- NestJS validates input, authorizes roles and ownership, manages sessions, and
  persists business records through Prisma/PostgreSQL. Never accept a client-supplied
  `userId`, `studentId`, account status, or verification flag for self-service writes.
- FastAPI is an internal analysis boundary at `AI_SERVICE_URL`, normally
  `http://localhost:8001`. React must not upload private CVs directly to this service.
  NestJS supplies minimal extracted text/skills and validates returned data before saving it.
- PostgreSQL is the source of truth. Redis may support queues/cache, but cached
  values cannot replace permission checks. CV bytes live in private storage;
  `Cv.storageKey` stays internal. Notifications follow persisted state changes.
- Match scores are advisory. Neither service accepts/rejects applicants automatically.

Existing NestJS `GET /api/v1` and `GET /api/v1/health` are public. `/docs` is the
current generated Swagger UI; it describes implemented routes only. Existing
`ValidationPipe` rejects unknown DTO fields. Session management and bounded local
auth rate limits are implemented. [Authorization helpers](authorization.md) are
available for feature modules; each new route must apply its own role and ownership
policy. The auth filter implements the error envelope for auth routes; feature
routes must explicitly adopt it. Other proposed behavior below remains future work.

## Shared wire conventions

- JSON uses camelCase; the FastAPI boundary retains its existing snake_case keys.
- IDs are UUID strings; timestamps are ISO 8601 UTC strings such as
  `2026-11-17T03:00:00.000Z`. Enums retain the uppercase values in the Prisma schema.
- Single-resource success responses return the resource directly, without a `data`
  wrapper. `204` responses have no body. Error responses use the proposed envelope below.
- Paginated lists accept `page` (integer, default 1, minimum 1) and `pageSize`
  (integer, default 20, range 1–100). Invalid values return `400`. Lists return
  `{ "items": [], "page": 1, "pageSize": 20, "total": 0 }`. CVs sort by
  `createdAt DESC, id DESC` for deterministic ordering.
- PATCH distinguishes omission (unchanged) from explicit `null` (clear a nullable
  field). Reject empty PATCH objects and unknown fields. Trim names and profile
  text; trim and lowercase email addresses. Do not trim or silently truncate passwords.
- Authenticated resource responses use `Cache-Control: no-store`. Never return
  password hashes, token digests, verification/reset tokens, or storage keys.

Proposed error format:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "details": [{ "field": "email", "code": "INVALID_EMAIL" }],
  "requestId": "req-example"
}
```

Clients branch on `code`, not English message text. `details` is an array (empty
when not applicable); field errors must never echo passwords or token values.
The error handler generates/validates a bounded request ID and returns it through
`X-Request-Id`. Propagate that ID to the AI call without logging private text.

Expected errors: `400 VALIDATION_ERROR`; `401 AUTHENTICATION_REQUIRED`,
`INVALID_CREDENTIALS`, or `INVALID_REFRESH_TOKEN`; `403 FORBIDDEN`,
`EMAIL_NOT_VERIFIED`, or `ACCOUNT_SUSPENDED`; `404 RESOURCE_NOT_FOUND`;
`409 EMAIL_ALREADY_EXISTS`, `PROFILE_ALREADY_EXISTS`, or `CV_ANALYSIS_IN_PROGRESS`;
`413 FILE_TOO_LARGE`; `415 UNSUPPORTED_CV_TYPE`; `429 RATE_LIMITED`;
`502 AI_INVALID_RESPONSE`; `503 AI_UNAVAILABLE`; `504 AI_TIMEOUT`.
Unexpected failures use `500 INTERNAL_ERROR` without stack traces. Rate-limited
responses provide `Retry-After`. These envelopes are not yet implemented.

## Authentication — CM-040 through CM-043

### POST /auth/register — public, implemented (CM-040)

```json
{
  "email": "student@example.com",
  "password": "example-password-change-me",
  "role": "STUDENT",
  "fullName": "Example Student"
}
```

`email` must be valid and at most 254 characters. Passwords are 12–128 characters;
`fullName` is 1–120 characters after trimming. Only `STUDENT` and `EMPLOYER` may
self-register; reject `ADMIN`. Create User and the appropriate profile atomically.
Reject a normalized-email uniqueness conflict with `409 EMAIL_ALREADY_EXISTS`.
Never expose a partial user/profile pair if a transaction fails.

Return `201` with the public User shape below and no session tokens. For this
working proposal, registration keeps the schema's `PENDING_VERIFICATION` default.
The email-verification slice must be delivered before a public registration/login
demo is considered end-to-end complete; do not silently mark accounts ACTIVE.
Seeded local test accounts may be ACTIVE and must remain clearly test-only.

### POST /auth/login — public, implemented (CM-041)

Request: `{ "email": "student@example.com", "password": "example-password-change-me" }`.
Return `200` for an ACTIVE account:

```json
{
  "user": {
    "id": "00000000-0000-4000-8000-000000000001",
    "email": "student@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "emailVerified": "2026-11-17T03:00:00.000Z"
  },
  "accessToken": "<access-token>",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

The public User shape is `id`, `email`, `role`, `status`, and nullable
`emailVerified`; registration uses the same shape. Invalid email/password pairs
return the same `401 INVALID_CREDENTIALS`. Check credentials before returning
`EMAIL_NOT_VERIFIED` or `ACCOUNT_SUSPENDED`. Token TTLs come from
`JWT_ACCESS_TTL`/`JWT_REFRESH_TTL`; `expiresIn` is computed seconds, not hardcoded.

### Session transport and lifecycle — implemented (CM-041)

Access tokens travel as `Authorization: Bearer <token>` and stay in frontend
memory. Refresh tokens are returned only in an HttpOnly cookie named
`careermatch_refresh`, never in JSON or localStorage. Cookie settings: host-only,
`Path=/api/v1/auth`, `SameSite=Lax`, and `Secure` in production. Local HTTP
development may omit Secure. Cookie lifetime matches the refresh TTL.

Frontend uses `credentials: "include"` on login, refresh, and logout. Production
deployment must keep frontend/API same-site over HTTPS for this cookie policy.
Cross-site hosting needs a separately reviewed cookie/CSRF design. NestJS must
validate Origin against configured `WEB_ORIGIN` for login, refresh, and logout;
browser cookie requests with a missing/disallowed Origin are rejected. Test/nonbrowser
clients must send the configured Origin too. CORS alone does not prevent CSRF.

- `POST /auth/refresh`: no JSON body, refresh cookie plus allowed Origin. Rotate
  refresh tokens atomically; return `200` with `accessToken`, `tokenType`, and
  `expiresIn`, and replace the cookie. Invalid/expired/reused tokens return
  `401 INVALID_REFRESH_TOKEN` and clear the cookie. Reuse revokes the session family.
- `POST /auth/logout`: no JSON body, refresh cookie plus allowed Origin. Revoke
  that session family and clear the cookie with the same attributes; return
  idempotent `204` even when the cookie is already absent/expired.
- `GET /auth/me`: Bearer token required, return `200` public User. Protected
  endpoints check current account and session state so logout/suspension revokes
  access immediately, rather than waiting for the access-token expiry.

Access JWTs include `sub`, `sid`, role, `iat`, `exp`, issuer, and audience. Verify
signature, expiry, issuer/audience, live session, and current account status on
every protected request. Session persistence, rotation/reuse tracking, JWT issuer/
audience configuration, password hashing, cookie parsing, Origin checks and local
rate limits are implemented in CM-040/041. Future feature routes still need the
reusable role/ownership guards in CM-042; distributed rate limits remain pending.

### Verification and recovery — CM-043, proposed pending scope confirmation

- `POST /auth/verify-email`: `{ "token": "<single-use-token>" }`; valid token
  returns `204` and atomically activates the account. Invalid/expired/used token
  returns `400 INVALID_VERIFICATION_TOKEN`. No access/refresh token is issued.
- `POST /auth/resend-verification`: `{ "email": "student@example.com" }`;
  always return `202` with `{ "message": "If eligible, verification instructions will be sent." }`.
- `POST /auth/forgot-password`: same email shape; always return `202` with
  `{ "message": "If eligible, password reset instructions will be sent." }`.
- `POST /auth/reset-password`: `{ "token": "<single-use-token>", "newPassword": "another-example-password" }`;
  valid request returns `204`, changes the password, consumes the token, and
  revokes all sessions. Invalid/expired/used token returns `400 INVALID_RESET_TOKEN`.

Use hashed, expiring, single-use verification/reset tokens; never return them in
API payloads or logs. Apply password rules and rate limits. Choose email transport
and verification/reset TTLs during CM-043; do not invent delivery evidence.

## Student and Career Profile — CM-044, proposed

All self-service routes below require an ACTIVE `STUDENT`. Resolve the profile
from the authenticated user, not a user ID in the request. Return `403 FORBIDDEN`
for other roles and `404 RESOURCE_NOT_FOUND` if no profile exists.

- `GET /students/me/profile`: return `200` with the Profile shape below.
- `PATCH /students/me/profile`: accept only `fullName` (1–120), nullable `headline`
  (maximum 160), `biography` (maximum 5000), `careerGoal` (maximum 2000), `location`
  (maximum 160), and `graduationYear` (integer 1900–2100 or null). Return the updated
  Profile with `200`. `fullName` cannot be null or blank.

```json
{
  "id": "00000000-0000-4000-8000-000000000002",
  "fullName": "Example Student",
  "headline": "Backend intern",
  "biography": null,
  "careerGoal": "Build reliable APIs",
  "location": "Da Nang",
  "graduationYear": 2027,
  "skills": [],
  "createdAt": "2026-11-17T03:00:00.000Z",
  "updatedAt": "2026-11-17T03:00:00.000Z"
}
```

Skills in Profile are objects `{ "skillId": "<uuid>", "name": "TypeScript",
"level": null, "source": "MANUAL" }`, ordered by name then skillId. Working
proposal: manual `level` is null or integer 1–5, and manually selected source is
server-set `MANUAL`. AI extraction does not overwrite confirmed skills automatically.

- `GET /skills?q=type&page=1&pageSize=20`: authenticated catalog lookup, returns
  paginated `{ "id": "<uuid>", "name": "TypeScript" }` items; `q` is optional,
  trimmed and at most 100 characters. Sort by name then id. Catalog writes belong
  to the Admin module, not this self-service contract.
- `PUT /students/me/skills`: `{ "skills": [{ "skillId": "<uuid>", "level": null }] }`;
  replace the complete skill selection atomically and return `200` updated Profile.
  Reject duplicate IDs, unknown skill IDs, more than 100 selections, or invalid
  levels with `400 VALIDATION_ERROR`. An empty array clears the selection.

Structured education, projects, experience, and certificates are not modeled in
the current StudentProfile schema. CM-037 must define their storage and contract
before the frontend treats these as editable persisted collections. AI section
arrays below are extraction output, not an undocumented profile persistence API.

## CV upload and analysis — CM-045 and CM-022, proposed

Require ACTIVE STUDENT ownership for every CV operation. Foreign and unknown CV
IDs both return `404 RESOURCE_NOT_FOUND`. This contract does not grant Employers
unrestricted CV access; applicant-specific access must be designed in recruitment APIs.

- `POST /students/me/cvs`: multipart/form-data with exactly one `file`, PDF or
  DOCX, maximum 10 MiB. Validate extension, detected content, and parser-compatible
  MIME type, not just the submitted Content-Type. Reject missing/multiple files
  with `400`, oversized files with `413`, unsupported/mismatched content with `415`.
  Return `201` CV metadata. Upload does not automatically invoke analysis.
- `GET /students/me/cvs?page=1&pageSize=20`: return paginated CV metadata items.
- `GET /students/me/cvs/:cvId/download`: return `200` private file bytes with the
  validated Content-Type and safe `Content-Disposition: attachment`. Do not return
  public storage URLs. Fetch with Bearer auth and create a temporary browser blob URL.
- `DELETE /students/me/cvs/:cvId`: delete the owned file and metadata/derived
  analysis under a documented recovery-safe storage strategy; return `204`.
  Return `409 CV_ANALYSIS_IN_PROGRESS` during an active analysis. Unknown/already
  deleted IDs return `404`, not success.

CV metadata is `{ "id": "<uuid>", "originalName": "sample-cv.pdf",
"mimeType": "application/pdf", "sizeBytes": 1024,
"createdAt": "2026-11-17T03:00:00.000Z" }`. DOCX MIME type is
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
Do not serialize raw Prisma Cv objects, student IDs, or storage keys.

- `POST /students/me/cvs/:cvId/analyses`: no JSON body; create a queued job and
  return `202` Analysis shape below with `status: QUEUED`. At most one QUEUED or
  PROCESSING job may exist per CV; competing starts return `409 CV_ANALYSIS_IN_PROGRESS`.
  A finished/failed CV may be analyzed again as a new analysis record.
- `GET /students/me/cvs/:cvId/analyses/:analysisId`: return `200` Analysis, checking
  both CV ownership and that the analysis belongs to the specified CV.
- State transitions: `QUEUED → PROCESSING → COMPLETED | FAILED`. Terminal records
  are immutable; explicit reruns create new records. Clients poll every 3 seconds
  while pending, stop at terminal state or unmount, and back off on failures.

```json
{
  "id": "00000000-0000-4000-8000-000000000003",
  "cvId": "00000000-0000-4000-8000-000000000004",
  "status": "QUEUED",
  "provider": "mock",
  "model": "mock-keyword",
  "modelVersion": "mock-keyword-v1",
  "result": null,
  "errorCode": null,
  "createdAt": "2026-11-17T03:00:00.000Z",
  "completedAt": null
}
```

`modelVersion` may be null until the worker receives output. COMPLETED has a
non-null result and completedAt, with null errorCode. FAILED has null result, a
safe errorCode, and completedAt. QUEUED/PROCESSING have null result/errorCode/
completedAt. Completed result contains `skills` (`name`, confidence 0–1, nullable
evidence), `education`, `projects`, `experience`, `certificates` (string arrays),
and nullable `careerGoal`. NestJS maps `career_goal` to `careerGoal`.

AI failures after queue acceptance are persisted as FAILED with `CV_TEXT_UNREADABLE`,
`AI_TIMEOUT`, `AI_UNAVAILABLE`, or `AI_INVALID_RESPONSE`; the polling GET still returns
`200` for the resource. Queue unavailability before acceptance returns `503` and
must not leave a job that the response claims was accepted. Worker retries must
be bounded and must not create duplicate records or completion notifications.

## Existing FastAPI boundary and pending integration

The following routes exist in `services/ai/app/main.py`. Full schema constraints
are in `services/ai/app/schemas.py`; these are currently local mock/rule-based
behavior, not evidence of a production LLM or embedding integration.

- `POST /v1/cv/analyze`: `{ "text": "Built REST APIs with TypeScript and PostgreSQL." }`.
  Text length is 1–100000. Response has `skills` with name/confidence/evidence,
  `education`, `projects`, `experience`, `certificates`, `career_goal`, `provider`,
  and `model_version`. The mock extracts known keywords; section arrays are empty.
- `POST /v1/matches/calculate`: `{ "student_skills": ["TypeScript"],
"required_skills": ["TypeScript", "Docker"], "preferred_skills": [] }`.
  Response has score 0–100, `matched_skills`, `missing_skills`, `explanation`,
  `engine_version`, and `advisory_only: true`. The starter is rule-based, not semantic
  matching. No required skills currently produces score zero.
- Invalid request schemas currently use FastAPI's native `422` response. The
  NestJS worker maps service/network/schema failures to safe public error codes;
  it must not forward provider exceptions or FastAPI internals to React.

CM-098/105/106 must add request correlation, explicit model identity, provider
timeouts, bounded retry/rate-limit behavior, and stable versioned schemas. Existing
analysis output has no separate `model` identifier; agree a server-owned mapping
before populating required `CvAnalysis.model`. Raw CV IDs/storage paths are not part
of the current FastAPI request. Service-to-service authentication/network isolation
must be implemented before exposing the worker in a shared/cloud environment.
Do not enable external LLM traffic until provider and data-handling settings are reviewed.

## Implementation handoff and acceptance

This proposal makes routine integration choices explicit. Scope approval for
verification/recovery and structured profile collections remains pending. Changes
to these shapes must be discussed in the linked Issue/PR before updating both
frontend mocks and backend DTOs; implemented DTOs and Swagger must match this document.

- `quangnguyen16325`: API conventions, identity/session persistence, Student and
  CV contracts, authentication and ownership tests.
- `tanthinh24`: Student/auth screens and mock fixtures for success, validation,
  unauthorized, expired-session, empty-list, and analysis-failure states.
- `letho2k5` and `NguyenDucHoangHuy`: reuse the conventions for Employer/Admin UI
  and recruitment APIs; confirm applicant-specific CV access separately.
- `Noooark`: agree AI schemas/version mapping with CM-098 and failure handling
  with CM-106; retain deterministic fixtures.

Before calling an endpoint delivered, verify valid and invalid requests, unknown
fields, anonymous/wrong-role/cross-user access, normalized-email races, refresh
rotation/reuse/logout, file validation, and analysis terminal states as applicable.
Capture real test and CI results. Planned dates are not delivery dates.

CM-036 delivers this written integration proposal. CM-037 resolves database gaps;
CM-038/039 verify environment/CI; CM-040/041/042 implement the initial auth slice.
CM-043 is required for public registration → verification → login under this proposal.
Do not wait for the entire backend to finish: build frontend mocks and AI fixtures
against the agreed contract while implementation progresses in parallel.
