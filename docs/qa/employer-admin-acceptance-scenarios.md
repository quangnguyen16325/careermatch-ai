# Employer and Admin Acceptance Scenarios — CM-065

**Issue:** [CM-065 / #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65)
**Document status:** Framework established; detailed scenarios and approval are pending.
**Scope:** Acceptance scenarios for Employer and Admin business workflows.

## 1. Purpose and scope

CM-065 defines a reviewable, traceable acceptance-scenario set for these business areas:

1. Company Verification.
2. Job Moderation.
3. Candidate Review.
4. Account Management.
5. Report Management.

Commit 1 established the format, identifiers, status vocabulary, and traceability table. This commit adds draft scenarios for Company Verification and Job Moderation. It does not decide unconfirmed business rules or claim that a mock frontend action is persisted by the API. Candidate Review, Account Management, and Report Management are reserved for later CM-065 commits.

### Implementation evidence vocabulary

Record implementation separately for the frontend, API, and end-to-end flow. Use the most specific applicable description:

- **Implemented — API:** An endpoint/behavior is present in the API and supported by implementation evidence such as tests or current Swagger.
- **Mock/preview — frontend:** The screen or action uses local fixtures or browser state and is not persisted to the backend.
- **Integrated:** The frontend calls the implemented API and the integrated flow has been verified.
- **Pending/unverified:** Required behavior, API, or evidence has not been confirmed. A schema or design document alone is not proof of a working endpoint.

As observed in this repository snapshot, the Employer and Admin business screens use mock data. Recruitment API documentation records company/job APIs, including company verification and job moderation, as implemented, but that does not mean these screens are integrated. Candidate/application review, admin account actions, and report operations have no corresponding API module documented in the current API delivery guide; verify current routes and issue scope before promoting them from pending. The Prisma schema contains application and report data models, which alone do not establish API behavior.

## 2. Scenario writing convention

Write each scenario using **Given–When–Then**:

- **Given** — preconditions and relevant starting data/state.
- **When** — one user action or event under test.
- **Then** — observable, testable system outcomes, including persisted state, authorization, messages, history, and side effects where applicable.

Keep one principal behavior per scenario. State the actor and starting status explicitly. Negative and boundary scenarios should name the validation or authorization condition being exercised. Do not encode an assumption as an expected result: mark it for product/domain confirmation first.

### Scenario ID convention

Use a stable, zero-padded sequence per business area:

| Prefix      | Business area        |
| ----------- | -------------------- |
| `AC-CV-###` | Company Verification |
| `AC-JM-###` | Job Moderation       |
| `AC-CR-###` | Candidate Review     |
| `AC-AM-###` | Account Management   |
| `AC-RM-###` | Report Management    |

Do not reuse an ID after a scenario is removed. Keep the ID when editing a scenario; record substantial scope changes in its history or linked issue.

### Scenario status vocabulary

- **Draft:** Written but not reviewed for business correctness.
- **Needs confirmation:** Depends on a business rule, contract, role, or outcome that has not been agreed.
- **Approved:** Reviewed by the requirement owner and ready for execution.
- **Verified:** Executed with recorded evidence against the stated implementation target.
- **Blocked:** Cannot be executed because a dependency or environment is unavailable; name it.

`Verified` applies only to the specific target and evidence recorded. A frontend preview test does not verify API persistence or authorization.

## 3. Acceptance scenario template

Copy this template for each detailed scenario in later commits:

```markdown
### AC-XX-001 — <short, observable outcome>

- **Role:** Employer | Admin
- **Type:** Positive | Negative | Boundary
- **Scenario status:** Draft | Needs confirmation | Approved | Verified | Blocked
- **Implementation status:** Implemented — API | Mock/preview — frontend | Integrated | Pending/unverified
- **Prerequisites:** <role/session, records, and starting state>
- **Given:** <initial context>
- **When:** <user action>
- **Then:**
  - <observable outcome>
  - <state/history/notification outcome, if required by the approved contract>
- **Expected result:** <concise acceptance statement>
- **Related issue/specification:** <issue number and/or repository document>
- **Verification method:** <unit, API integration, browser/manual, or other reproducible method>
- **Evidence:** <test name, run/CI link, screenshots, or execution record; pending until available>
```

Do not use a mock action as evidence of a persisted state change. For access-control scenarios, identify both the caller role and the protected resource owner. For asynchronous behavior, specify what the user can observe while waiting and the terminal outcomes.

## 4. Company Verification scenarios (Commit 2)

These are draft acceptance targets based on the current DTOs, guards, service transitions, delivery guide, and preview UI. `API implemented` does not mean the Employer/Admin screens are integrated. No scenario in this section is marked verified by this documentation commit.

### AC-CV-001 — Admin lists and searches companies

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** API implemented (`GET /api/v1/admin/companies`); frontend list is mock/preview; integration pending.
- **Prerequisites:** Authenticated Admin; companies exist with different verification states and names/tax codes.
- **Given:** The Admin company-list endpoint is available.
- **When:** Admin requests page 1, page size 20, status `PENDING`, and a search term.
- **Then:** The API returns only matching companies, paginated with `data` and `meta` (`total`, `page`, `pageSize`, `totalPages`); search matches company name or tax code.
- **Expected result:** List, status filter, search and pagination agree with the query and returned metadata.
- **Related issue/specification:** CM-065 #65; WBS #69/#84; `AdminCompaniesController.findAll`; `QueryCompaniesDto`; `docs/recruitment-api.md`.
- **Verification method:** Controller/service tests and API query tests; browser filter check after frontend integration.
- **Evidence:** Existing controller/service tests are source evidence; scenario execution evidence pending.

### AC-CV-002 — Admin reviews company details

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Frontend detail dialog is mock/preview. Admin list API returns company records; a separate Admin detail endpoint is not documented.
- **Prerequisites:** Admin page has a company row with profile data.
- **Given:** A company is present in the Admin list.
- **When:** Admin selects “View profile”.
- **Then:** The preview dialog presents the available company profile fields and current verification status; closing the dialog makes no change.
- **Expected result:** The displayed details correspond to the selected list item; no server persistence is implied.
- **Related issue/specification:** CM-065 #65; `EmployerManagementPage`; `AdminCompaniesController.findAll`.
- **Verification method:** Browser/manual check of selected fields and dialog close behavior; separately confirm which fields are required for review.
- **Evidence:** Preview source exists; browser execution pending.

### AC-CV-003 — Admin verifies a pending company

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** API transition implemented (`PENDING → VERIFIED`); frontend action is mock/preview; integration pending.
- **Prerequisites:** Authenticated Admin; company status is `PENDING`.
- **Given:** The company is pending verification.
- **When:** Admin submits `status: VERIFIED` to `PATCH /api/v1/admin/companies/{id}/verify`.
- **Then:** The API returns the updated company with verification status `VERIFIED` and sets `verifiedAt` according to the delivery specification.
- **Expected result:** One valid transition is persisted; the preview UI must not be described as server persistence.
- **Related issue/specification:** CM-065 #65; WBS #69/#84; `VerifyCompanyDto`; `canTransitionCompanyVerification`; `docs/recruitment-api.md`.
- **Verification method:** Company service/controller tests and API integration test; after integration, verify status and any documented employer notification.
- **Evidence:** Existing service/controller tests are source evidence; scenario execution pending.

### AC-CV-004 — Admin rejects a pending company with a valid reason

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** API transition implemented (`PENDING → REJECTED`); frontend action is mock/preview; integration pending.
- **Prerequisites:** Authenticated Admin; company status is `PENDING`; reason is 10–1000 characters after trimming.
- **Given:** The pending company does not satisfy the confirmed verification requirements.
- **When:** Admin submits `status: REJECTED` with a valid reason.
- **Then:** The API returns the updated company with status `REJECTED`; the decision reason is passed to the service for its documented audit/notification behavior.
- **Expected result:** Rejection is accepted once with the supplied reason; do not infer additional employer-facing fields beyond the implemented response/notification contract.
- **Related issue/specification:** CM-065 #65; `VerifyCompanyDto`; `CompaniesService.adminVerify`; `docs/recruitment-state-transitions.md`.
- **Verification method:** Service tests for valid rejection and API integration test.
- **Evidence:** Existing company service tests cover rejection path; scenario execution pending.

### AC-CV-005 — Rejection reason is missing, too short, or too long

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Draft
- **Implementation status:** API validation implemented: trimmed reason must be at least 10 characters when rejecting and DTO caps it at 1000; frontend remains preview.
- **Prerequisites:** Authenticated Admin; company is pending.
- **Given:** Admin submits a rejection with a missing/blank reason, fewer than 10 trimmed characters, or more than 1000 characters.
- **When:** The verification request is validated.
- **Then:** Missing/blank/short reason returns `400 REJECTION_REASON_REQUIRED`; a reason above DTO maximum is rejected by request validation. Company status remains unchanged.
- **Expected result:** No invalid rejection mutates the company. The exact generic DTO-validation response body is not asserted as a feature-specific code.
- **Related issue/specification:** CM-065 #65; `VerifyCompanyDto`; `CompaniesService.adminVerify`.
- **Verification method:** DTO and service tests at trimmed lengths 0, 9, 10, 1000 and 1001; assert unchanged state on failure.
- **Evidence:** Service source and tests exist; full boundary matrix execution pending.

### AC-CV-006 — Admin repeats or submits a disallowed verification transition

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** API transition guard implemented; frontend verification actions are mock/preview.
- **Prerequisites:** Authenticated Admin; company is already `VERIFIED` and a repeated `VERIFIED` decision is submitted, or the source state changes before a stale decision is committed.
- **Given:** The requested status is not allowed from the current persisted state.
- **When:** Admin submits the verification decision.
- **Then:** API returns `400 INVALID_STATE_TRANSITION`; the current company status remains unchanged and transaction-dependent side effects are not duplicated.
- **Expected result:** Stale or repeated decisions do not overwrite a newer state.
- **Related issue/specification:** CM-065 #65; `canTransitionCompanyVerification`; `CompaniesService.adminVerify`; conditional-write notes in `docs/recruitment-api.md`.
- **Verification method:** Transition/service tests and controlled stale-write integration test.
- **Evidence:** Transition guard and conditional update are implemented; execution evidence pending.

### AC-CV-007 — Admin revokes or re-verifies through documented transitions

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Needs confirmation
- **Implementation status:** API supports `VERIFIED → REJECTED` and `REJECTED → VERIFIED`; frontend action/integration is pending. Whether all such transitions belong in CM-065 acceptance needs owner confirmation.
- **Prerequisites:** Authenticated Admin; company starts `VERIFIED` for revocation or `REJECTED` for re-verification.
- **Given:** The source state and target state form one of the documented transitions.
- **When:** Admin submits the decision; a `REJECTED` target includes a valid reason.
- **Then:** API applies only the allowed transition or returns the documented validation/transition error.
- **Expected result:** No direct reopening to `PENDING` by Admin is assumed; Employer resubmission and revocation consequences require business-owner review.
- **Related issue/specification:** CM-065 #65; `canTransitionCompanyVerification`; `docs/recruitment-state-transitions.md`; `docs/recruitment-api.md`.
- **Verification method:** Transition tests plus product confirmation of revocation policy and notification behavior.
- **Evidence:** The code/specification define transitions; acceptance approval pending.

### AC-CV-008 — Employer cannot use Admin company-list or verification operations

- **Role:** Employer
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** API Admin controller has ADMIN role guard; frontend preview does not prove API authorization.
- **Prerequisites:** Authenticated Employer session.
- **Given:** Employer calls `GET /api/v1/admin/companies` or `PATCH /api/v1/admin/companies/{id}/verify`.
- **When:** The API evaluates the caller role.
- **Then:** Each request returns `403 FORBIDDEN` and does not disclose Admin list data or change company state.
- **Expected result:** Employer can use only the self-company routes allowed to Employer; verification decisions remain Admin-only.
- **Related issue/specification:** CM-065 #65; `AdminCompaniesController`; `docs/authorization.md`.
- **Verification method:** API authorization tests for both GET and PATCH with an Employer token.
- **Evidence:** Controller guards are present; route-level execution pending.

### AC-CV-009 — Anonymous caller cannot use Admin verification operations

- **Role:** Unauthenticated user
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** API controller uses `AuthGuard` and ADMIN role guard; frontend route protection is separate.
- **Prerequisites:** No valid session/access token.
- **Given:** Caller has no authenticated session.
- **When:** Caller requests the Admin company list or submits a verification action.
- **Then:** API returns `401 AUTHENTICATION_REQUIRED`; company state remains unchanged.
- **Expected result:** Anonymous requests do not reveal protected Admin data or perform writes.
- **Related issue/specification:** CM-065 #65; `AdminCompaniesController`; `docs/authorization.md`.
- **Verification method:** API integration tests without credentials for GET and PATCH.
- **Evidence:** Guards and Swagger response declarations are present; execution pending.

### AC-CV-010 — Company creation without tax code follows an agreed prerequisite

- **Role:** Employer
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** **Not settled:** `CreateCompanyDto` makes `taxCode` optional, while the state-transition specification says a valid tax code is required for company verification setup.
- **Prerequisites:** Authenticated Employer without a linked company; request otherwise has a valid company name.
- **Given:** No tax code is supplied.
- **When:** Employer creates a company profile and the profile is considered for verification.
- **Then:** Acceptance outcome remains undecided until the requirement owner resolves the DTO/specification mismatch; do not assert create rejection or verification eligibility yet.
- **Expected result:** Product decision records whether tax code is required on creation, before submission, or at another step.
- **Related issue/specification:** CM-065 #65; `CreateCompanyDto`; company verification section in `docs/recruitment-state-transitions.md`.
- **Verification method:** Requirement review, then DTO/service boundary test matching the approved rule.
- **Evidence:** Mismatch confirmed by source comparison; product decision pending.

### AC-CV-011 — Invalid company profile fields are rejected

- **Role:** Employer
- **Type:** Boundary
- **Scenario status:** Draft
- **Implementation status:** Company create/update DTO validation is implemented; Employer page still uses preview state.
- **Prerequisites:** Authenticated Employer.
- **Given:** Request includes a blank/too-short/too-long name, or a supplied tax code outside its DTO length bounds; description/website/location exceed their maximums.
- **When:** Employer submits the create or update request.
- **Then:** DTO validation rejects invalid values; no invalid profile mutation is accepted.
- **Expected result:** Create name is 2–255 characters; provided tax code is 6–50; description max 5000; website/location max 255. Update validates fields when supplied and supports null only for nullable fields declared by its DTO.
- **Related issue/specification:** CM-065 #65; `CreateCompanyDto`; `UpdateCompanyDto`; `ValidationPipe` configuration.
- **Verification method:** DTO/controller/API tests for boundaries, null, wrong type and unknown fields.
- **Evidence:** DTO validators exist; complete boundary execution pending.

### AC-CV-012 — Verification of an unknown company returns not found

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** API not-found behavior is implemented; frontend integration pending.
- **Prerequisites:** Authenticated Admin; company ID does not exist.
- **Given:** The referenced company cannot be found.
- **When:** Admin submits a verification request for that ID.
- **Then:** API returns `404 COMPANY_NOT_FOUND`; no company is created or changed.
- **Expected result:** Unknown IDs fail explicitly without a success message.
- **Related issue/specification:** CM-065 #65; `CompaniesService.adminVerify`; `AdminCompaniesController`.
- **Verification method:** Company service/API test using an unknown ID.
- **Evidence:** Not-found branch and controller response are present; execution pending.

### AC-CV-013 — Unexpected verification service failure is not reported as success

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Needs confirmation
- **Implementation status:** API unexpected-error contract and integrated frontend error presentation are not specified by the feature delivery guide.
- **Prerequisites:** Authenticated Admin; controlled database/service failure during a verification request.
- **Given:** The operation fails before a successful transaction completes.
- **When:** Admin submits the verification decision.
- **Then:** The client must not claim success and the persisted company state must remain consistent; exact response code/body and retry wording need confirmation against the API error contract.
- **Expected result:** Failure is visible without a false successful state or duplicated side effect.
- **Related issue/specification:** CM-065 #65; `CompaniesService.adminVerify`; `docs/api-contracts.md`; `docs/recruitment-api.md`.
- **Verification method:** Controlled API failure test and, after integration, browser error/retry check.
- **Evidence:** Failure behavior not yet evidenced; acceptance is blocked pending contract alignment.

### AC-CV-014 — Missing or unsupported verification status is rejected

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Draft
- **Implementation status:** `VerifyCompanyDto` accepts only `VERIFIED` or `REJECTED`; the application validation pipe rejects missing or unsupported values.
- **Prerequisites:** Authenticated Admin; company exists in a state where at least one valid decision could otherwise be made.
- **Given:** Request body omits `status` or sends a status outside `VERIFIED`/`REJECTED`.
- **When:** Admin submits the verification request.
- **Then:** API returns HTTP 400 validation failure and does not change the company.
- **Expected result:** Only the DTO-supported decision values proceed to transition validation.
- **Related issue/specification:** CM-065 #65; `VerifyCompanyDto`; app `ValidationPipe`.
- **Verification method:** API tests for missing status and unsupported enum values; assert unchanged company state.
- **Evidence:** DTO enum constraint exists; execution pending.

## 5. Job Moderation scenarios (Commit 2)

### AC-JM-001 — Admin lists, searches, and filters jobs

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** API implemented (`GET /api/v1/admin/jobs`); Admin page filters local mock data; integration pending.
- **Prerequisites:** Authenticated Admin; jobs exist across statuses and companies.
- **Given:** The Admin job-list endpoint is available.
- **When:** Admin requests `PENDING_APPROVAL` with search by title/company, optional company UUID, and valid pagination.
- **Then:** API returns matching records and `{ data, meta }`; results are ordered newest-created first as implemented by the service.
- **Expected result:** Search/status/company/pagination filters are reflected in returned records and totals. Frontend currently exposes text search and status filter only.
- **Related issue/specification:** CM-065 #65; WBS #72/#86; `AdminJobsController.findAll`; `QueryAdminJobsDto`; `docs/recruitment-api.md`.
- **Verification method:** Controller/service tests, query DTO/API boundaries, then browser filters after integration.
- **Evidence:** Controller/service source and tests exist; scenario execution pending.

### AC-JM-002 — Admin reviews a job's available details

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Detail dialog is preview-only; Admin list API returns job with company/category/skills; separate Admin detail endpoint is not documented.
- **Prerequisites:** A job appears in the Admin list.
- **Given:** Admin has opened a selected job from the moderation list.
- **When:** Admin chooses “Review listing”.
- **Then:** Preview displays available listing fields, current status and any existing moderation reason; closing makes no change.
- **Expected result:** Details match the selected job; acceptance criteria for content-policy evidence and required review fields remain subject to policy confirmation.
- **Related issue/specification:** CM-065 #65; `JobModerationPage`; `AdminJobsController.findAll`.
- **Verification method:** Browser/manual detail-field and close behavior check.
- **Evidence:** Preview source exists; browser execution pending.

### AC-JM-003 — Admin approves a pending-approval job

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** API supports `PENDING_APPROVAL → PUBLISHED`; UI approval currently updates mock state only.
- **Prerequisites:** Authenticated Admin; job is `PENDING_APPROVAL`; required submission data has already passed Employer submission validation.
- **Given:** The job is pending moderation.
- **When:** Admin sends `status: PUBLISHED` to `PATCH /api/v1/admin/jobs/{id}/moderate`.
- **Then:** API returns the updated published job and performs the documented notification/audit behavior.
- **Expected result:** Only a pending job is published by this transition; frontend preview must be labeled as non-persistent.
- **Related issue/specification:** CM-065 #65; WBS #72/#86; `ModerateJobDto`; `canTransitionJob`; `docs/recruitment-api.md`.
- **Verification method:** Service/transition/API tests; after integration, verify published state and documented notification.
- **Evidence:** API source/tests exist; scenario execution pending.

### AC-JM-004 — Admin rejects a pending-approval job with a reason

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** API supports pending rejection; UI action is mock/preview; integration pending.
- **Prerequisites:** Authenticated Admin; job is `PENDING_APPROVAL`; reason has 10–1000 characters after trimming.
- **Given:** A submitted job is pending moderation.
- **When:** Admin sends `status: REJECTED` with a valid reason.
- **Then:** API returns the updated job as `REJECTED`; the documented employer notification includes the reason.
- **Expected result:** Rejection is recorded and the reason is available according to the implemented response/event contract.
- **Related issue/specification:** CM-065 #65; `ModerateJobDto`; `JobsService.adminModerate`; `docs/recruitment-api.md`.
- **Verification method:** Job service/API tests including rejection reason and notification.
- **Evidence:** Service/controller/test source exists; scenario execution pending.

### AC-JM-005 — Rejection reason is missing, too short, or too long

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Draft
- **Implementation status:** API trims reason, requires at least 10 characters for `REJECTED`, and DTO caps it at 1000; UI remains preview.
- **Prerequisites:** Authenticated Admin; job is in a source state where rejection is allowed.
- **Given:** Admin submits a missing/blank, fewer than 10 trimmed characters, or more than 1000 characters as reason.
- **When:** API validates the moderation request.
- **Then:** Missing/blank/short reason returns `400 REJECTION_REASON_REQUIRED`; too-long input is rejected by DTO validation; job status remains unchanged.
- **Expected result:** No invalid rejection mutates the job; exact generic DTO-validation body is not asserted as a feature-specific code.
- **Related issue/specification:** CM-065 #65; `ModerateJobDto`; `JobsService.adminModerate`.
- **Verification method:** DTO/service tests at trimmed lengths 0, 9, 10, 1000 and 1001.
- **Evidence:** Service validation exists; full boundary matrix execution pending.

### AC-JM-006 — Admin closes or rejects a published job

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Needs confirmation
- **Implementation status:** API supports `PUBLISHED → CLOSED` and `PUBLISHED → REJECTED`; rejection reason is required. Current mock UI does not expose these same published-job outcomes.
- **Prerequisites:** Authenticated Admin; job is `PUBLISHED`; a policy-defined basis exists for the action.
- **Given:** A published listing needs an approved moderation action.
- **When:** Admin submits `CLOSED`, or submits `REJECTED` with a valid reason.
- **Then:** API applies the documented transition; rejection emits its documented employer notification.
- **Expected result:** The distinction and criteria for closing versus rejecting a published job must be approved by the moderation owner before this scenario is Approved.
- **Related issue/specification:** CM-065 #65; `canTransitionJob`; `docs/recruitment-api.md`; `docs/recruitment-state-transitions.md`.
- **Verification method:** Transition/service/database tests; obtain policy decision on close/reject semantics.
- **Evidence:** Transition support is implemented; acceptance policy approval pending.

### AC-JM-007 — Admin cannot moderate a job from an unsupported source state

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** API transition guard and conditional update are implemented; UI uses mock statuses.
- **Prerequisites:** Authenticated Admin; job is `DRAFT`, `REJECTED`, or `CLOSED`.
- **Given:** The requested target status is not allowed from the persisted source status.
- **When:** Admin submits moderation, such as `DRAFT → PUBLISHED` or attempting to reopen `CLOSED`.
- **Then:** API returns `400 INVALID_STATE_TRANSITION`; current status and side effects remain unchanged.
- **Expected result:** Only documented actor/state transitions succeed; a stale concurrent decision cannot overwrite the latest status.
- **Related issue/specification:** CM-065 #65; `canTransitionJob`; `JobsService.adminModerate`; `recruitment.database.mjs`.
- **Verification method:** Transition unit tests and concurrent database moderation test.
- **Evidence:** Transition/service implementation exists; execution evidence pending.

### AC-JM-008 — Mock “Flag listing” is not treated as an API status

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Frontend mock supports `Flagged`; API `ModerateJobDto` accepts only `PUBLISHED`, `REJECTED`, or `CLOSED`. No API transition to `FLAGGED` is implemented in the reviewed controller/DTO.
- **Prerequisites:** Admin is viewing a mock job row that offers “Flag listing”.
- **Given:** The user interface has a local `Flagged` action.
- **When:** Admin selects it in preview, or an API client submits `status: FLAGGED`.
- **Then:** Preview may show its explicitly labeled mock state; API request with `FLAGGED` is rejected by DTO validation. Do not describe the preview as persisted moderation.
- **Expected result:** Product owner confirms whether `Flagged` is an accepted domain state or only a preview shortcut; no endpoint/status is inferred.
- **Related issue/specification:** CM-065 #65; `JobModerationPage`; `ModerateJobDto`; `apps/api/prisma/schema.prisma` JobStatus.
- **Verification method:** Inspect preview label; DTO/API test confirms only allowed values; resolve status semantics with owner.
- **Evidence:** UI and DTO source evidence available; business decision pending.

### AC-JM-009 — Employer cannot use Admin job-list or moderation operations

- **Role:** Employer
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** Admin controller is ADMIN-guarded; frontend preview is not authorization evidence.
- **Prerequisites:** Authenticated Employer session.
- **Given:** Employer calls `GET /api/v1/admin/jobs` or `PATCH /api/v1/admin/jobs/{id}/moderate`.
- **When:** API evaluates the role.
- **Then:** Each request returns `403 FORBIDDEN`; no Admin list data is returned and no job is changed.
- **Expected result:** Employer manages only jobs scoped to their company through Employer routes, not Admin moderation routes.
- **Related issue/specification:** CM-065 #65; `AdminJobsController`; `docs/authorization.md`.
- **Verification method:** API authorization tests for GET and PATCH with Employer token.
- **Evidence:** Role guards and route declarations exist; route-level execution pending.

### AC-JM-010 — Anonymous caller cannot use Admin job operations

- **Role:** Unauthenticated user
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** Admin controller uses `AuthGuard` and ADMIN role guard.
- **Prerequisites:** No valid session/access token.
- **Given:** Caller has no authenticated session.
- **When:** Caller requests the Admin job list or submits moderation.
- **Then:** API returns `401 AUTHENTICATION_REQUIRED`; no protected data or mutation is exposed.
- **Expected result:** Anonymous access fails before moderation side effects.
- **Related issue/specification:** CM-065 #65; `AdminJobsController`; `docs/authorization.md`.
- **Verification method:** API integration tests without credentials for GET and PATCH.
- **Evidence:** Guards and Swagger response declarations exist; execution pending.

### AC-JM-011 — Missing or unsupported moderation request fields are rejected

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Draft
- **Implementation status:** DTO and application validation are implemented; generic validation error envelope is framework-level.
- **Prerequisites:** Authenticated Admin; a job exists.
- **Given:** Request omits `status`, uses an unsupported enum (including `FLAGGED`), has invalid pagination/company ID query, or includes an unknown body field.
- **When:** API validates the request.
- **Then:** API returns HTTP 400 validation failure; no moderation mutation occurs. Do not assert a feature-specific error code unless present in actual response contract.
- **Expected result:** Only allowed DTO values and query bounds are accepted.
- **Related issue/specification:** CM-065 #65; `ModerateJobDto`; `QueryAdminJobsDto`; app `ValidationPipe`.
- **Verification method:** Controller/API validation tests for omitted/invalid fields, query limits and unknown properties.
- **Evidence:** DTO decorators exist; the full boundary matrix remains to be executed.

### AC-JM-012 — Unknown job or concurrent stale moderation fails without success

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** API returns `404 JOB_NOT_FOUND`; conditional write rejects stale transitions. Generic infrastructure failure response is not specified here.
- **Prerequisites:** Authenticated Admin; one request uses an unknown ID, or two moderation decisions race for the same job.
- **Given:** Job does not exist, or another request changes its source state before this update commits.
- **When:** Admin submits the moderation decision.
- **Then:** Unknown ID returns `404 JOB_NOT_FOUND`; stale decision returns `400 INVALID_STATE_TRANSITION`; no false success or duplicate notification is produced.
- **Expected result:** Only the winning valid transition is committed.
- **Related issue/specification:** CM-065 #65; `JobsService.adminModerate`; `apps/api/test/recruitment.database.mjs`.
- **Verification method:** Unknown-ID service/API test and existing concurrent moderation database test.
- **Evidence:** Error branches and database test exist; execution for this scenario pending.

### AC-JM-013 — Moderation decision follows an approved content-policy rubric

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** API accepts decisions but the reviewed DTO/state specification does not define a complete objective rubric for what content must be rejected or closed.
- **Prerequisites:** A content-policy version and evidence checklist are approved by the requirement owner.
- **Given:** A job contains content that may violate a platform rule.
- **When:** Admin evaluates the listing against the approved rubric.
- **Then:** Expected decision and required reason are determined by that rubric, not inferred from a sample/mock listing.
- **Expected result:** The policy owner defines consistent criteria and examples before this scenario is Approved.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-state-transitions.md`; `ModerateJobDto`.
- **Verification method:** Policy review followed by positive, negative and boundary test cases tied to approved examples.
- **Evidence:** Rubric not found in the reviewed API/state documents; confirmation pending.

## 6. Traceability table

This matrix links each scenario drafted in Commit 2 to its requirement and evidence source. The remaining three areas are coverage targets for later commits. Related issue numbers are traceability leads from the repository WBS map, not proof that their exact acceptance criteria were reviewed or approved. All scenarios below remain **Draft** unless marked **Needs confirmation**; none has execution evidence from this documentation change.

| Business Area        | Requirement (initial coverage target)                                                                             | Scenario ID        | Related Issue / specification                                                                                                                                                                               | Implementation Status (repository evidence)                                                                                                                                            | Verification Method                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Company Verification | Admin lists and searches companies                                                                                | `AC-CV-001`        | CM-065 #65; WBS #69/#84; `AdminCompaniesController.findAll`; `QueryCompaniesDto`                                                                                                                            | API implemented; frontend list is mock/preview; integration pending                                                                                                                    | Controller/service tests; API query tests; browser list/filter check after integration                                                                       |
| Company Verification | Admin reviews the selected company details                                                                        | `AC-CV-002`        | CM-065 #65; `AdminCompaniesController.findAll`; `EmployerManagementPage`                                                                                                                                    | Frontend detail dialog is preview; API list returns company records; dedicated Admin detail route is not documented                                                                    | Browser detail-content check; confirm required review fields with business owner                                                                             |
| Company Verification | Admin approves a pending company                                                                                  | `AC-CV-003`        | CM-065 #65; WBS #69/#84; `VerifyCompanyDto`; company transition table                                                                                                                                       | API transition implemented; frontend action is preview; integration pending                                                                                                            | `CompaniesService` tests; API authorization/transition check; browser status and notification check after integration                                        |
| Company Verification | Admin rejects a pending company with a valid reason                                                               | `AC-CV-004`        | CM-065 #65; `VerifyCompanyDto`; `CompaniesService.adminVerify`                                                                                                                                              | API implemented; UI preview; integration pending                                                                                                                                       | Service validation tests and API request with reason                                                                                                         |
| Company Verification | Empty, short, or too-long rejection reason is rejected                                                            | `AC-CV-005`        | CM-065 #65; `VerifyCompanyDto`; `CompaniesService.adminVerify`                                                                                                                                              | API min/max constraints documented in code; frontend preview validation exists, end-to-end pending                                                                                     | DTO/service boundary tests (9/10/1000/1001 trimmed characters)                                                                                               |
| Company Verification | Repeat or otherwise disallowed verification transition is rejected without changing status                        | `AC-CV-006`        | CM-065 #65; `canTransitionCompanyVerification`; `CompaniesService.adminVerify`                                                                                                                              | API transition guard implemented; frontend does not call API                                                                                                                           | Transition/service tests; verify unchanged status and no duplicate side effects                                                                              |
| Company Verification | Admin can revoke or re-verify only through supported transitions                                                  | `AC-CV-007`        | CM-065 #65; `recruitment-state-transitions.md`; `recruitment-api.md`                                                                                                                                        | API supports `VERIFIED → REJECTED` and `REJECTED → VERIFIED`; frontend integration pending                                                                                             | Transition tests; confirm revocation policy and reason requirements with owner                                                                               |
| Company Verification | Employer cannot access Admin company list or verification action                                                  | `AC-CV-008`        | CM-065 #65; `AdminCompaniesController`; authorization guide                                                                                                                                                 | API route is ADMIN-guarded; frontend role UI is not API authorization evidence                                                                                                         | API tests with EMPLOYER token expect 403                                                                                                                     |
| Company Verification | Anonymous caller cannot access Admin company routes                                                               | `AC-CV-009`        | CM-065 #65; `AdminCompaniesController`; authorization guide                                                                                                                                                 | API route uses `AuthGuard`; frontend role UI is not API authorization evidence                                                                                                         | API requests without a session expect 401                                                                                                                    |
| Company Verification | Company profile without a tax code follows an agreed verification prerequisite                                    | `AC-CV-010`        | CM-065 #65; `CreateCompanyDto`; company state transition specification                                                                                                                                      | **Needs confirmation:** DTO makes taxCode optional, while state transition specification says valid taxCode is required                                                                | Confirm product rule; then add DTO/service boundary test. Do not assert an outcome yet                                                                       |
| Company Verification | Invalid company profile fields are rejected under DTO constraints                                                 | `AC-CV-011`        | CM-065 #65; `CreateCompanyDto`; `UpdateCompanyDto`                                                                                                                                                          | API DTO constraints implemented; profile UI remains preview                                                                                                                            | DTO/API tests for name and taxCode boundaries and invalid types                                                                                              |
| Company Verification | Unknown company ID returns not found                                                                              | `AC-CV-012`        | CM-065 #65; `CompaniesService.adminVerify`; Admin controller                                                                                                                                                | API 404 `COMPANY_NOT_FOUND` documented; frontend integration pending                                                                                                                   | Service/API test using unknown company ID                                                                                                                    |
| Company Verification | Unexpected verification failure is not shown as success                                                           | `AC-CV-013`        | CM-065 #65; `CompaniesService.adminVerify`; API error docs                                                                                                                                                  | **Needs confirmation:** feature-specific unexpected error envelope and UI retry/message behavior are not specified                                                                     | Agree safe failure behavior; controlled service failure test                                                                                                 |
| Company Verification | Missing or unsupported verification status is rejected                                                            | `AC-CV-014`        | CM-065 #65; `VerifyCompanyDto`; app `ValidationPipe`                                                                                                                                                        | DTO allows only `VERIFIED`/`REJECTED`; UI remains preview                                                                                                                              | API tests for missing and unsupported status values                                                                                                          |
| Job Moderation       | Admin lists pending jobs with search, status, company, and pagination filters                                     | `AC-JM-001`        | CM-065 #65; WBS #72/#86; `AdminJobsController.findAll`; `QueryAdminJobsDto`                                                                                                                                 | API implemented; Admin UI filters are mock/preview; integration pending                                                                                                                | Controller/service tests; query boundaries; browser filters after integration                                                                                |
| Job Moderation       | Admin reviews a selected listing and its available details                                                        | `AC-JM-002`        | CM-065 #65; `AdminJobsController.findAll`; `JobModerationPage`                                                                                                                                              | Preview detail dialog exists; Admin API list includes job/company/category/skills; separate detail route not documented                                                                | Browser verifies displayed fields; reconcile required moderation checklist with policy                                                                       |
| Job Moderation       | Admin approves a pending-approval job                                                                             | `AC-JM-003`        | CM-065 #65; WBS #72/#86; `ModerateJobDto`; `canTransitionJob`                                                                                                                                               | API supports `PENDING_APPROVAL → PUBLISHED`; UI action is preview; integration pending                                                                                                 | Job service/transition tests; API response and publication state check                                                                                       |
| Job Moderation       | Admin rejects a pending-approval job with a valid reason                                                          | `AC-JM-004`        | CM-065 #65; `ModerateJobDto`; `JobsService.adminModerate`                                                                                                                                                   | API implemented; UI preview; integration pending                                                                                                                                       | Service tests with reason and persisted status; notification evidence if required                                                                            |
| Job Moderation       | Rejection reason is required and bounded                                                                          | `AC-JM-005`        | CM-065 #65; `ModerateJobDto`; `JobsService.adminModerate`                                                                                                                                                   | API trims reason, requires at least 10 characters for REJECTED, and limits it to 1000; UI preview                                                                                      | DTO/service boundary tests (9/10/1000/1001 trimmed characters)                                                                                               |
| Job Moderation       | Admin closes or rejects an already published job as an allowed moderation outcome                                 | `AC-JM-006`        | CM-065 #65; `recruitment-api.md`; `canTransitionJob`                                                                                                                                                        | API allows `PUBLISHED → CLOSED` and `PUBLISHED → REJECTED`; rejection requires a reason. UI preview status choices differ.                                                             | Transition/service tests; confirm policy for closing versus rejecting a published listing                                                                    |
| Job Moderation       | Admin action from an unsupported source state is rejected without mutation                                        | `AC-JM-007`        | CM-065 #65; `canTransitionJob`; `JobsService.adminModerate`                                                                                                                                                 | API rejects invalid transitions; UI preview actions currently use separate local statuses                                                                                              | API transition tests for DRAFT, REJECTED, and CLOSED; assert no state or side-effect update                                                                  |
| Job Moderation       | “Flag listing” is treated as preview-only until an API status/contract is agreed                                  | `AC-JM-008`        | CM-065 #65; `JobModerationPage`; `ModerateJobDto`; `JobStatus`                                                                                                                                              | UI has `Flagged` preview state; moderation DTO accepts only PUBLISHED, REJECTED, CLOSED. **API behavior pending confirmation/not implemented.**                                        | Verify preview label; confirm whether Flagged is a real business state before adding an API acceptance criterion                                             |
| Job Moderation       | Employer cannot list or moderate jobs through Admin-only routes                                                   | `AC-JM-009`        | CM-065 #65; `AdminJobsController`; authorization guide                                                                                                                                                      | API routes are ADMIN-guarded; frontend preview is not access control                                                                                                                   | API requests with Employer token expect 403                                                                                                                  |
| Job Moderation       | Anonymous caller cannot use Admin job routes                                                                      | `AC-JM-010`        | CM-065 #65; `AdminJobsController`; authorization guide                                                                                                                                                      | API routes use `AuthGuard`; frontend preview is not access control                                                                                                                     | API requests without a session expect 401                                                                                                                    |
| Job Moderation       | Invalid/missing status or unsupported DTO values are rejected                                                     | `AC-JM-011`        | CM-065 #65; `ModerateJobDto`; `QueryAdminJobsDto`                                                                                                                                                           | DTO validation is implemented; exact validation response envelope is framework-level                                                                                                   | API tests for missing/invalid status, bad enum, invalid page/pageSize/companyId and unknown fields per app ValidationPipe                                    |
| Job Moderation       | Unknown job and concurrent stale moderation do not produce success                                                | `AC-JM-012`        | CM-065 #65; `JobsService.adminModerate`; `recruitment.database.mjs`                                                                                                                                         | Not-found and conditional state update are implemented; generic infrastructure failure UX remains unspecified                                                                          | Service/database race test; unknown-ID test; assert no mutation or duplicate side effect                                                                     |
| Job Moderation       | Moderation follows an approved content-policy rubric                                                              | `AC-JM-013`        | CM-065 #65; state-transition spec; approved content policy if available                                                                                                                                     | **Needs confirmation:** API accepts decisions, but the reviewed documents do not define an objective violation rubric                                                                  | Policy owner approves rubric and examples before scenario approval                                                                                           |
| Candidate Review     | Employer reviews an application and moves it through only approved application outcomes                           | `AC-CR-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #26/#75/#89; [state transitions](../recruitment-state-transitions.md); [API integration contract](../api-contracts.md) | Employer candidate screen uses mock data. Application schema/state specification exists; a matching API implementation is not confirmed by the current recruitment API delivery guide. | Confirm the application API contract first; then test owner scoping, transitions/history and browser feedback. Preview-only checks must be labeled as such.  |
| Account Management   | Admin searches accounts and performs approved account status actions with authorization and reason/feedback rules | `AC-AM-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #29/#77/#94; [authorization guide](../authorization.md)                                                                | Admin user screen is present, but uses frontend mock state. No Admin account-management API action is evidenced in the current feature API documentation.                              | Confirm allowed statuses, reasons and API contract; test Admin/forbidden access, validation, persistence and failure behavior when supported.                |
| Report Management    | User report is triaged by an authorized Admin under an agreed status workflow, with handling history              | `AC-RM-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #29/#78/#94/#95; [API integration contract](../api-contracts.md)                                                       | Admin report screen and actions use frontend preview state. A Report data model exists, but an implemented report-management API is not evidenced in the current API delivery guide.   | Confirm report submission/moderation contract; test state transitions, authorization, history and failures at API level, then verify the Admin browser flow. |

## 7. Source documents and implementation evidence

Use these repository sources while adding detailed scenarios. If a source conflicts with an approved issue/decision, record the discrepancy and request clarification; do not silently select one version.

- [Repository README](../../README.md) — project boundaries, architecture, commands, and documentation entry points.
- [Recruitment API delivery](../recruitment-api.md) — delivered company/job/catalog API scope and explicit integration caveat for current frontend screens.
- [Recruitment state transitions](../recruitment-state-transitions.md) — designed Company, Job, Application, and Interview state machines; treat as a specification to reconcile, not automatic evidence that every flow is implemented.
- [Recruitment data design](../recruitment-data-design.md) — entity/data model reference; model presence does not prove endpoint availability.
- [API integration contract](../api-contracts.md) — distinguishes implemented authentication routes from proposed feature endpoints.
- [Authorization guide](../authorization.md) — role, ownership, and API authorization expectations.
- `apps/web/src/features/employer/` — Employer company/job and candidate preview screens/data.
- `apps/web/src/features/admin/` — Admin dashboard, employer verification, job moderation, user, and report preview screens/data.
- `apps/api/src/companies/` and `apps/api/src/jobs/` — current company and job API modules; verify controller/service tests and Swagger for each API claim.
- `apps/api/prisma/schema.prisma` — persisted model definitions; not a route or workflow implementation checklist.
- `docs/wbs-issue-map.json` — WBS-to-Issue traceability references; team baseline approval is pending as noted in `docs/project-baseline.md`.

## 8. Review and completion checklist

Before marking a scenario approved or verified:

- Confirm its business rule and related issue with the requirement owner.
- Confirm actor role, ownership scope, initial state, permitted transition, validation, and error outcome.
- Distinguish UI preview behavior from backend persistence and authorization.
- Select a reproducible verification method and retain evidence.
- Record any dependency that blocks API, integration, or browser verification.
- Review the full matrix for gaps across positive, negative, and boundary cases.

This framework itself does not make CM-065 or any related implementation issue Done. Detailed scenarios and their review/evidence remain for subsequent commits.
