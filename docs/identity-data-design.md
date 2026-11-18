# Identity and career-profile data design

CM-037, WBS 1.2.3. Reviewed 2026-11-17 against
`apps/api/prisma/schema.prisma` and the initial migration.

This change reviews existing models and proposes the missing persistence design.
It does not add tables, run a database migration, or implement authentication.
The working API proposal is [PR #114](https://github.com/quangnguyen16325/careermatch-ai/pull/114);
it has not yet been merged or accepted by the whole team. Reconcile that contract
and this design before implementing CM-040 through CM-045.

## Existing model coverage

- `User`: UUID primary key, unique email, passwordHash, role, account status,
  nullable emailVerified, createdAt/updatedAt. Index: `(role, status)`.
- `StudentProfile`: UUID primary key and unique userId foreign key; deleting a
  User cascades to its StudentProfile. Contains fullName, headline, biography,
  careerGoal, location, and graduationYear. It has no structured education,
  experience, project, or certificate collections.
- `EmployerProfile`: one-to-one User through unique userId, with optional Company.
  User deletion cascades to EmployerProfile, not to Company.
- `Skill`: UUID key, independently unique name and normalizedName.
- `StudentSkill`: composite primary key `(studentId, skillId)`, nullable level and
  source; deleting either parent cascades to the join row. No level bounds or
  source enum are enforced by the existing schema.
- `Cv`: UUID key, studentId foreign key, unique storageKey, originalName, MIME type,
  sizeBytes, and createdAt. Index: `(studentId, createdAt)`. Student deletion
  cascades to CV metadata; it does not delete the external file bytes.
- `CvAnalysis`: UUID key, cvId foreign key, status default QUEUED, required
  provider/model, optional modelVersion, JSON summary, errorCode, completedAt,
  createdAt. Deleting CV metadata cascades to analysis metadata.
- `CvExtractedSkill`: composite key `(analysisId, skillId)`, confidence and optional
  evidence. Analysis deletion cascades to these rows; deleting referenced catalog
  skills is restricted by the existing relation. The database does not currently
  enforce confidence bounds.

One User may have zero or one StudentProfile and zero or one EmployerProfile in
the physical schema. The database does not enforce mutual exclusivity or agreement
with User.role. Registration must create the proper profile in the same transaction;
role changes require an explicit workflow, not a generic user PATCH.

The initial database includes other recruitment models. Their design belongs to
CM-082 and must be coordinated with `NguyenDucHoangHuy`; this document does not
change their constraints or duplicate their implementation tasks.

## Proposed identity persistence

Add the following models in reviewed migrations during identity implementation.
IDs are UUIDs; proposed expiry/revocation timestamps use timezone-aware PostgreSQL
timestamps. Backend comparisons use server UTC time, never client-supplied time.

### AuthSession — one independently revocable device session

- `id`: UUID primary key, used as access-token `sid` and refresh-token family ID.
- `userId`: User foreign key, cascading only if the User is intentionally deleted.
- `createdAt`, `expiresAt`: required; session expiry is an absolute maximum for
  the family. Rotation cannot silently extend this maximum.
- `revokedAt`: nullable; once set, all access and refresh tokens for the family
  are invalid. `revocationReason`: nullable enum such as LOGOUT, REUSE,
  PASSWORD_RESET, or ACCOUNT_SUSPENDED.
- Indexes: `(userId, revokedAt)` for account-wide revocation, and `expiresAt`
  for bounded cleanup. Tokens reference the primary key.

For a protected request, check JWT signature, issuer/audience and expiry, then
load the session and current User. Require matching `sub`/session.userId, no
revocation, unexpired session, ACTIVE account, and the current permitted role.
The JWT's role claim must not override a changed database role. Avoid caching
session validity initially so logout and suspension take effect immediately.

### RefreshToken — retain the rotation chain

- `id`: UUID primary key identifying a token record; never use it alone as proof
  of possession. `sessionId`: AuthSession foreign key with cascade.
- `tokenDigest`: unique fixed-length digest of a cryptographically random secret.
  Persist no raw refresh token. High-entropy random tokens may use a SHA-256
  digest; user passwords require a password-hashing function instead.
- `createdAt`, `expiresAt`: required; expiry must not exceed session.expiresAt.
- `consumedAt`: nullable; record consumption instead of overwriting the previous
  digest. This lets the server recognize replay of a previously valid token.
- Indexes: unique tokenDigest, `(sessionId, consumedAt)`, and `expiresAt`.

Rotation uses a database transaction: verify the digest/session/account, acquire
the session row lock, re-check expiry/revocation, and conditionally set consumedAt
only when still null. Insert the next token and issue the response only after
commit. Retain consumed records at least until their family can no longer be
valid. A known consumed token revokes its session family; an unknown digest
cannot identify or revoke an arbitrary family.

Concurrent refresh calls are intentionally strict: the losing replay can revoke
the family, even if another refresh just succeeded. The frontend must use a
single-flight refresh operation rather than one refresh per failed request.
Add concurrency tests before enabling rotation in shared environments.

Logout uses the presented token digest to find and revoke its family, including
a consumed token when still retained. Clear the cookie even for an unknown token.
Password reset revokes every session belonging to the User in the same transaction.

### AccountActionToken — verification and password recovery

- `id`: UUID key; `userId`: User foreign key with cascade.
- `purpose`: required enum EMAIL_VERIFICATION or PASSWORD_RESET.
- `tokenDigest`: unique digest of a random secret; raw tokens appear only in the
  intended delivery channel, never in API responses, database records, or logs.
- `createdAt`, `expiresAt`: required; `consumedAt` and `invalidatedAt`: nullable.
- Indexes: `(userId, purpose)` and `expiresAt`, plus unique tokenDigest.

Consume only a matching-purpose, unexpired, non-invalidated token. Lock the User
row before invalidating/issuing/consuming action tokens so resend and reset cannot
race past each other. A password reset updates passwordHash, consumes the token,
invalidates other reset tokens, and revokes all sessions atomically. Verification
sets emailVerified and activates only PENDING_VERIFICATION accounts; it must not
reactivate a SUSPENDED account. Invalidate older verification tokens on resend.

Email transport, token TTLs, delivery retries, and abuse limits remain CM-043
implementation choices. Persisting a token is not proof an email was delivered.

## Registration and uniqueness

Public registration accepts only STUDENT or EMPLOYER and creates the matching
profile atomically with User. ADMIN provisioning is a separate restricted process.
Keep status PENDING_VERIFICATION until verification under the working API proposal.

Normalize email using the documented trim/lowercase rule before validation,
lookup, and insertion. The current PostgreSQL unique constraint is case-sensitive:
it prevents exact duplicates but does not independently enforce normalization.
Before adding a database normalization check or case-insensitive unique index,
audit existing rows for case/space collisions; resolve them explicitly rather than
silently rewriting accounts. A pre-insert existence check is not enough: catch
the unique conflict from the transaction and map it to EMAIL_ALREADY_EXISTS.

Use a vetted password hash with configurable cost. Never store password plaintext
or use refresh/action-token digest logic to hash passwords. Registration and login
need rate limits and tests, even when profile creation succeeds transactionally.

## Career-profile extensions and ownership

Proposed child entities for CM-044, subject to explicit API contract agreement:

- `StudentEducation`: id, studentId, institution, optional qualification/fieldOfStudy,
  nullable startDate/endDate, optional description, createdAt/updatedAt.
- `StudentExperience`: id, studentId, organization, title, nullable startDate/endDate,
  optional description, createdAt/updatedAt.
- `StudentProject`: id, studentId, name, optional description/url, nullable
  startDate/endDate, createdAt/updatedAt.
- `StudentCertificate`: id, studentId, name, optional issuer, issuedAt/expiresAt,
  optional credentialUrl, createdAt/updatedAt.

All have UUID primary keys and a cascading StudentProfile foreign key. Index
studentId and document a stable list order. Dates are date-only where appropriate;
an optional end date must not precede a supplied start date. Bound text lengths,
validate HTTPS URLs, and define whether null endDate means ongoing or unknown
before writing DTOs. Proposed fields are not existing Prisma columns or ready APIs.

Authorization resolves User → StudentProfile from the live session, then scopes
every child read/write to that studentId. Never authorize a child by its UUID alone.
Foreign and unknown private resources return the same 404. Employers receive only
applicant-scoped access through recruitment routes, not general profile/CV access.

Manual StudentSkill replacement validates catalog IDs and duplicates, locks the
StudentProfile row, then replaces rows in one transaction. Validate manual levels
as null or integers 1–5. Add database checks when migrated. Define MANUAL and
AI_CONFIRMED source values with CM-104; AI suggestions remain in analysis output
until confirmed and do not silently overwrite manual selections.

## CV and analysis invariants

Preserve the existing Cv/CvAnalysis/CvExtractedSkill relations and introduce
constraints only through new migrations:

- Enforce positive sizeBytes and the agreed upload ceiling (working API proposal:
  10 MiB). HTTP upload/parser limits and content validation remain necessary.
- Add confidence bounds 0–1 and document accepted source/model metadata. Map
  FastAPI model_version to a server-owned model identity; current FastAPI has no
  separate model field even though CvAnalysis.model is required.
- Add an index on `(cvId, createdAt)` for analysis lookup. Use a PostgreSQL partial
  unique index on cvId WHERE status IN ('QUEUED', 'PROCESSING') to enforce at most
  one active analysis per CV. This SQL constraint must remain in migrations even
  if Prisma schema introspection cannot represent it completely.
- Add terminal-state checks: QUEUED/PROCESSING have null completedAt/errorCode/summary;
  COMPLETED has non-null completedAt and summary, with null errorCode; FAILED has
  non-null completedAt/errorCode and null summary. Application validation also
  checks the JSON structure; a non-null JSON value alone is not a valid result.
- Conditional state transitions are QUEUED → PROCESSING → COMPLETED/FAILED.
  Worker retries update the same record; explicit reruns create a new record.
  Terminal records are immutable while retained, except for authorized deletion.

CV deletion and analysis creation must both lock the Cv row before checking active
analysis state. Otherwise deletion can race with queue acceptance. The storage
filesystem/object store is outside the database transaction: design a transactional
outbox or equivalent retryable cleanup record before enabling deletion. A database
cascade does not prove file cleanup. Registration/profile/CV operations must never
return raw Prisma records containing password hashes or storage keys.

## Existing deletion caveats

StudentProfile cascades to CV metadata but Application, SavedJob, and JobMatch
relations have other deletion semantics. Do not assume deleting a User safely
erases all personal data. Default to account suspension until retention, applicant
history, audit records, and storage cleanup have an agreed policy. Snapshotting
an application's submitted CV/profile versus linking the current editable profile
is an unresolved recruitment decision for CM-082/088/089.

## Migration and verification sequence

1. Validate the current Prisma schema without editing the applied initial migration.
   Review model coverage and existing constraints with the API contract owner.
2. Add identity models in a new migration during the auth slice; add profile
   collections and CV invariants in separate migrations with their feature slices.
3. Generate each migration against a disposable development database, inspect SQL
   and unique/check/index behavior, and test both a clean install and upgrade from
   the initial schema. Never reset a shared database as a verification shortcut.
4. Add transaction tests for duplicate normalized email, atomic User/profile
   creation, refresh replay/concurrency, reset token reuse, and account suspension.
5. Add ownership tests and storage cleanup/retry tests before exposing CV writes;
   test that two simultaneous analysis starts cannot create two active jobs.
6. Capture actual command results and migration/CI evidence in the relevant Issue.
   Schema validation alone does not prove database connectivity, concurrency safety,
   migration correctness, or an implemented API.

CM-037 supplies this design and current-schema validation. The architecture parent
CM-008 remains open for recruitment models and the full system ERD/data lifecycle.
The proposed models, constraints, and acceptance tests above remain implementation
work; frontend and AI teammates can develop fixtures from PR #114 in parallel.

### Validation evidence for this design change

The root `pnpm db:validate` command initially failed because DATABASE_URL was not
available in the API workspace's environment. Supplying the local sample URL from
`.env.example` explicitly allowed Prisma validation to pass. This validates the
schema syntax/relations only and does not connect to or change a database:

```bash
DATABASE_URL='postgresql://careermatch:careermatch_local@localhost:5432/careermatch?schema=public' pnpm db:validate
```

Resolve root/workspace environment loading in CM-038 before documenting a clean
clone as verified. Formatting, lint, typecheck, the existing tests (one API, two AI,
no frontend test files), and build passed locally. No coverage, concurrency,
database upgrade, or retention-policy test was run for these proposed models.
