# Recruitment API delivery — CM-081 through CM-087

This slice adds company profiles/verification, employer job management, Admin job
moderation, public published-job search and student saved jobs. Swagger `/docs`
is the implemented route reference. The existing frontend business screens still
use mock data; API delivery does not imply frontend integration is complete.

Employer routes require the current EMPLOYER session and scope jobs to the
employer's company. Admin verification/moderation/catalog writes require ADMIN.
Saved-job routes require STUDENT and use the session's student profile. Public
job list/detail queries and student saved-job content include only PUBLISHED jobs;
saving a job does not grant access to later draft/rejected revisions. Employer details for
unpublished jobs use `GET /jobs/my/:id`; public detail uses `GET /jobs/:id`.
Current list responses use `{ data, meta: { total, page, pageSize, totalPages } }`.
These routes use Nest's HTTP exception shape, not the auth filter's envelope;
clients should use the current Swagger/response bodies for integration.

## Lifecycle and conditional writes

An employer drafts and submits a job for review; its company must be VERIFIED.
Pending jobs can be withdrawn to draft. Admins approve/reject pending jobs and
can close/reject published jobs. Editing rejected content returns it to DRAFT
so it can be submitted again. Closed jobs cannot be reopened directly.

Admin verification supports pending decisions, VERIFIED → REJECTED revocation,
and REJECTED → VERIFIED re-verification. Conditional updates compare against the
source state that was validated, allowing these transitions while rejecting stale
decisions before audit/notification side effects. Employer company edits also
compare verification state, preventing an in-flight edit from undoing revocation.
Concurrent company creation atomically claims an empty employer link and rolls
back the losing insert. Notifications are persisted; realtime sockets are future
work. The state/data design documents also describe future application/interview
flows; those feature APIs are not delivered by this slice.

PATCH omits unchanged values. Null is rejected for required strings and skill
arrays, and accepted only for nullable fields explicitly declared in the DTO.

## Seed and validation

`pnpm db:seed` uses the locked local tsx dependency and preserves non-fixture data.
It updates known demo fixtures, so use only a development/test database. Production
mode is refused. `SEED_RESET=1 pnpm db:seed` is an explicit destructive reset of
the configured database, within a transaction; use only a disposable database.
Known demo credentials are for local use. Never run reset on shared project data.

Docker CI runs `test/recruitment.database.mjs` with
RECRUITMENT_TEST_DISPOSABLE=1. It covers company-creation races, a draft edit
paused until publication, conflicting moderation, published-job close/rejection,
verification revoke/re-verify, stale company edits, corrected-job resubmission,
and null PATCH validation. Records are randomized and cleaned afterward.
