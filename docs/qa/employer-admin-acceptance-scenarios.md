# Employer and Admin Acceptance Scenarios — CM-065

**Issue:** [CM-065 / #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65)
**Document status:** Framework established; Company Verification, Job Moderation, Candidate Review, Account Management, and Report Management scenarios are drafted. Business approval and execution evidence remain pending.
**Scope:** Acceptance scenarios for Employer and Admin business workflows.

## 1. Purpose and scope

CM-065 defines a reviewable, traceable acceptance-scenario set for these business areas:

1. Company Verification.
2. Job Moderation.
3. Candidate Review.
4. Account Management.
5. Report Management.

Commit 1 established the format, identifiers, status vocabulary, and traceability table. Commits 2–4 add draft scenarios for Company Verification, Job Moderation, Candidate Review, Account Management, and Report Management. They do not decide unconfirmed business rules or claim that a mock frontend action is persisted by the API.

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

## 6. Candidate Review scenarios (Commit 3)

These draft scenarios distinguish the Employer candidate-screen preview from the recruitment application contract. The current API delivery guide does not list application review endpoints; the state-transition and data-design documents describe intended behavior, not proof that those routes exist. No scenario below is Approved or Verified.

### AC-CR-001 — Employer views applications for its jobs

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Candidate list is mock/preview. Application-list API is not evidenced in the current API delivery guide.
- **Prerequisites:** Employer is associated with a company; applications exist for jobs owned by that company and for another company.
- **Given:** Employer opens the candidate workspace for a job owned by their company.
- **When:** The application list is requested.
- **Then:** The integrated system returns only applications whose job belongs to the Employer's company; records for other companies are not disclosed.
- **Expected result:** The list is scoped at the data-access boundary to the authenticated Employer's company.
- **Related issue/specification:** CM-065 #65; WBS #26/#75/#89; `docs/recruitment-state-transitions.md` ownership rules; `docs/authorization.md`.
- **Verification method:** Employer API integration tests with two company owners, followed by browser verification after integration.
- **Evidence:** Ownership is specified; no application route/service was found in `apps/api/src`; execution pending.

### AC-CR-002 — Employer searches applicants by name in the preview

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: client-side name search; no API integration.
- **Prerequisites:** Candidate preview contains records with different names.
- **Given:** Employer is viewing the candidate list.
- **When:** Employer enters a full or partial candidate name in the search field.
- **Then:** The preview displays records whose names match the trimmed query without case sensitivity; a query with no match displays the no-results message.
- **Expected result:** Search affects only the local preview list. Email search is not promised by the current UI.
- **Related issue/specification:** CM-065 #65; WBS #26/#75/#89; `CandidateManagementDashboard`.
- **Verification method:** Browser/manual checks with case variants, whitespace, partial text, and a no-match query.
- **Evidence:** Search implementation filters mock candidate names; browser execution pending.

### AC-CR-003 — Employer filters applicants by job position and application status

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview filters for position and local display status; no API integration.
- **Prerequisites:** Preview contains candidates across at least two positions and statuses.
- **Given:** Employer is viewing the candidate list.
- **When:** Employer selects a position, a status, or both.
- **Then:** Only records satisfying all selected filters are displayed, and the result count reflects the filtered list; changing filters returns pagination to page one.
- **Expected result:** Filters combine rather than replacing each other and operate on preview fixtures only.
- **Related issue/specification:** CM-065 #65; `CandidateManagementDashboard`; backend status names in `docs/recruitment-state-transitions.md`.
- **Verification method:** Browser/manual checks for each filter and combined filters; assert displayed rows and count.
- **Evidence:** Position/status filtering and page reset exist in source; execution pending.

### AC-CR-004 — Employer sorts applicants by application date

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview sorting by `appliedAt`, newest-first or oldest-first.
- **Prerequisites:** Preview contains applications with distinct valid `appliedAt` values.
- **Given:** Employer is viewing the candidate list.
- **When:** Employer activates the sort control.
- **Then:** The preview alternates between descending and ascending application date order.
- **Expected result:** The sort order is visible in the row sequence; no ranking or relevance sort is implied.
- **Related issue/specification:** CM-065 #65; `CandidateManagementDashboard`.
- **Verification method:** Browser/manual check against fixture dates in both sort directions.
- **Evidence:** Source sorts ISO date strings in both directions; browser execution pending.

### AC-CR-005 — Candidate list is empty or filters return no matches

- **Role:** Employer
- **Type:** Boundary
- **Scenario status:** Draft
- **Implementation status:** Mock/preview has distinct empty-list and no-filter-results messages; API empty response behavior is not documented.
- **Prerequisites:** Either the list contains no records, or active search/filters match none.
- **Given:** Employer opens the list with zero applications, or applies criteria that return zero preview records.
- **When:** The list is rendered.
- **Then:** The preview distinguishes “No applicants yet” from “No applicants match these filters” and does not render pagination for an empty result.
- **Expected result:** Empty data is not presented as a loading or error state.
- **Related issue/specification:** CM-065 #65; `CandidateManagementDashboard`; application API contract pending.
- **Verification method:** Component/browser check with an empty fixture and a nonmatching filter.
- **Evidence:** Both preview branches exist in source; API empty-state contract and execution pending.

### AC-CR-006 — Employer views candidate profile and application details

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview profile dialog; candidate profile, CV, and application APIs are not evidenced in the current API delivery guide.
- **Prerequisites:** Candidate list contains a selected preview record with profile, skills, experience, education, resume label, application date, and status history.
- **Given:** Employer selects a candidate from the list.
- **When:** The candidate detail dialog opens.
- **Then:** The dialog shows the selected fixture's available profile and application fields, skills, experience, education, resume preview, current status, and history; closing the dialog changes no candidate data.
- **Expected result:** Displayed fields correspond to the selected local fixture. The resume preview is explicitly sample content, not a stored/downloaded CV.
- **Related issue/specification:** CM-065 #65; `CandidateDetailDialog`; `docs/recruitment-data-design.md` Application, StudentProfile and CV models.
- **Verification method:** Browser/manual check of selected record, displayed sections, resume-preview label, and close behavior.
- **Evidence:** Dialog uses mock fixture fields and identifies sample resume content; browser execution pending.

### AC-CR-007 — Missing profile fields or invalid application data are handled

- **Role:** Employer
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Preview fixtures are populated; API response nullability and required candidate-review fields are not specified by an implemented application API.
- **Prerequisites:** The requirement owner defines which profile/application fields may be absent and the desired display/validation behavior.
- **Given:** An application has a missing profile field, malformed date, or unavailable CV reference.
- **When:** Employer opens the candidate details.
- **Then:** The system's fallback, omission, or error behavior follows the approved data contract; this document does not invent placeholder values or reject rules.
- **Expected result:** Define nullability and safe rendering expectations before approving this scenario.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-data-design.md`; `CandidateDetailDialog`; application API contract pending.
- **Verification method:** Approve response schema first, then add API/component tests for absent and malformed fields.
- **Evidence:** Schema has StudentProfile/CV models, but no review API response contract; confirmation pending.

### AC-CR-008 — Non-owner or non-Employer cannot read an application or private CV

- **Role:** Employer (non-owner), Student, or Admin
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** Application-specific API authorization is not evidenced. Ownership requirements are documented; Employer candidate UI uses preview data and is not an authorization boundary.
- **Prerequisites:** Application belongs to a different Employer's company, or caller is not the owning Employer; private CV is attached.
- **Given:** A caller requests application/profile/CV content outside an explicitly authorized policy.
- **When:** The integrated API resolves the requested resource.
- **Then:** Application access is restricted to an Employer whose company owns the job; CV access follows an explicit private-document policy and must not be inferred from role alone.
- **Expected result:** No cross-company application or private CV content is disclosed. Exact status code and Admin access policy require an API contract.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-state-transitions.md` ownership rules; `docs/authorization.md` private CV policy.
- **Verification method:** API authorization tests with owner, other Employer, Student, Admin, and anonymous callers after routes exist.
- **Evidence:** General ownership/privacy guidance exists; application-specific route guards and tests were not found.

### AC-CR-009 — Opening a submitted application moves it to reviewing

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** State transition is specified (`SUBMITTED → REVIEWING`); current UI performs only local mock updates; API implementation is not evidenced.
- **Prerequisites:** Employer owns the job and application is `SUBMITTED`.
- **Given:** Employer opens and reviews the application profile/CV.
- **When:** The application is marked as under review.
- **Then:** An integrated implementation changes status to `REVIEWING` only for the owning Employer and records the documented status-history/audit data.
- **Expected result:** The current preview's `New → Reviewing` action is local state and must not be reported as persisted.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-state-transitions.md` Application Lifecycle; `CandidateManagementPage.updateStatus`.
- **Verification method:** API owner-scope/transition/history test and browser state/feedback check after integration; separately verify preview behavior.
- **Evidence:** State rule and preview action exist; no application API implementation found.

### AC-CR-010 — Employer shortlists an eligible application

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** `SUBMITTED/REVIEWING → SHORTLISTED` is specified; UI has a local preview action; API integration is pending.
- **Prerequisites:** Employer owns the job; application is `SUBMITTED` or `REVIEWING`.
- **Given:** The application is in an eligible source status.
- **When:** Employer selects the shortlist action.
- **Then:** An integrated implementation transitions it to `SHORTLISTED`, appends status history, and follows the documented shortlist notification behavior.
- **Expected result:** No scoring threshold is implied; the decision is a human Employer action. The current “Shortlist candidate” control changes only preview state.
- **Related issue/specification:** CM-065 #65; WBS #26/#74/#75/#89/#109; `docs/recruitment-state-transitions.md`; `CandidateDetailDialog`.
- **Verification method:** API transition/ownership/history/notification tests and browser flow after integration.
- **Evidence:** State and notification rules are documented; only preview UI action exists in frontend.

### AC-CR-011 — Creating an interview invitation advances an eligible application

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Interview state transition is specified as a side effect of invitation creation; interview/application API routes are not evidenced in the current API delivery guide.
- **Prerequisites:** Employer owns the job; application is `SHORTLISTED` or `INTERVIEW`; interview details satisfy the approved interview contract.
- **Given:** Employer has selected an eligible applicant for an interview.
- **When:** Employer creates an interview invitation.
- **Then:** Under the state specification, the application becomes/remains `INTERVIEW` and an invitation is created; required schedule, duration, location/meeting details, notification, and failure behavior must follow the approved interview contract.
- **Expected result:** The preview's “Schedule interview” action only changes its local candidate status; it does not create an interview or send an invitation.
- **Related issue/specification:** CM-065 #65; WBS #27/#62/#76/#90/#91; `docs/recruitment-state-transitions.md`; `CandidateDetailDialog`.
- **Verification method:** Interview API contract and integration tests, then browser verification; preview check must be labeled local-only.
- **Evidence:** Interview transition/invariants are specified, but delivered interview endpoints were not found in the current API guide.

### AC-CR-012 — Employer accepts a candidate after interview

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** `INTERVIEW → ACCEPTED` is specified; preview offers acceptance for its local `Interview` status; API implementation is not evidenced.
- **Prerequisites:** Employer owns the job; application is `INTERVIEW` and any pending-interview effects are defined by the contract.
- **Given:** Employer has completed the interview decision.
- **When:** Employer accepts the candidate.
- **Then:** An integrated implementation records `ACCEPTED` as terminal and applies the documented handling for remaining pending interviews.
- **Expected result:** The preview acceptance changes local status only and must not imply an offer or persisted hiring decision.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-state-transitions.md`; `CandidateDetailDialog`.
- **Verification method:** API transition/history/side-effect tests and browser verification after integration.
- **Evidence:** State design and preview control exist; API route and execution evidence pending.

### AC-CR-013 — Employer rejects an eligible application with optional feedback

- **Role:** Employer
- **Type:** Positive
- **Scenario status:** Needs confirmation
- **Implementation status:** State specification permits rejection from `SUBMITTED`, `REVIEWING`, `SHORTLISTED`, or `INTERVIEW` with optional feedback; preview permits rejection only from its `Interview` state; no application API is evidenced.
- **Prerequisites:** Employer owns the job; product confirms allowed rejection stages and feedback/notification requirements.
- **Given:** An application is in a stage approved for rejection.
- **When:** Employer confirms rejection and supplies feedback if appropriate.
- **Then:** Integrated behavior records terminal `REJECTED`, status history, and documented notification; preview only changes local state after its confirmation dialog.
- **Expected result:** The current UI's narrower action availability is not treated as the complete backend rule; rejection timing and feedback visibility need reconciliation.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-state-transitions.md`; `CandidateDetailDialog`.
- **Verification method:** Confirm product policy; then API tests across each permitted source state and browser confirmation/feedback checks.
- **Evidence:** State document and preview are inconsistent in action availability; confirmation and API implementation pending.

### AC-CR-014 — Invalid, terminal, or stale application transitions do not mutate data

- **Role:** Employer
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** Terminal states and transition rules are specified; application API transition validation and conditional writes are not evidenced.
- **Prerequisites:** Application is terminal (`ACCEPTED`, `REJECTED`, or `WITHDRAWN`), transition is disallowed, or another actor changes state before submission.
- **Given:** The requested transition is not allowed from the current persisted state.
- **When:** Employer attempts the action or submits a stale decision.
- **Then:** The integrated system rejects the transition and leaves current status/history unchanged; exact error code and retry behavior remain subject to the API contract.
- **Expected result:** No UI success feedback or local list mutation occurs for a rejected server action.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-state-transitions.md`; application API contract pending.
- **Verification method:** Transition matrix and concurrent-update API tests once the application service exists.
- **Evidence:** State rules identify terminal statuses; no API implementation/tests found.

### AC-CR-015 — Candidate matching or ranking has an agreed, reproducible score

- **Role:** Employer
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Prisma `JobMatch` stores score-related fields and WBS references candidate ranking; no Employer candidate-ranking endpoint, algorithm contract, or frontend ranking control is evidenced.
- **Prerequisites:** Product/AI owners approve score meaning, inputs, model/version, ordering, missing-data handling, and explainability requirements.
- **Given:** Matching results exist for a job and candidate under an approved scoring contract.
- **When:** Employer requests or views ranked candidates.
- **Then:** Ordering and displayed score/explanation follow the versioned contract and do not fabricate scores for missing or stale inputs.
- **Expected result:** No ranking result or threshold is asserted until the algorithm and API contract are approved.
- **Related issue/specification:** CM-065 #65; WBS #74/#109; `docs/recruitment-data-design.md` JobMatch; `docs/wbs-issue-map.json`.
- **Verification method:** Approve scoring contract, then deterministic service tests and browser output verification.
- **Evidence:** Schema has JobMatch fields/indexes; no ranking endpoint/UI evidence found; confirmation pending.

### AC-CR-016 — Removing an application from a shortlist follows an approved rule

- **Role:** Employer
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Shortlisting is described as a status transition; no reverse transition or dedicated remove-from-shortlist action is specified or implemented in the preview.
- **Prerequisites:** Product defines whether shortlist removal reverts status, records history, or is disallowed after interview creation.
- **Given:** An application is `SHORTLISTED` or has progressed beyond that state.
- **When:** Employer requests removal from the shortlist.
- **Then:** Expected behavior is pending product decision; do not invent a reverse status transition.
- **Expected result:** No acceptance claim is made until the allowed transition and downstream interview effects are defined.
- **Related issue/specification:** CM-065 #65; WBS #74/#75/#89; `docs/recruitment-state-transitions.md`; `CandidateDetailDialog`.
- **Verification method:** Product decision followed by state-transition tests and browser action test if supported.
- **Evidence:** State table contains no shortlist-removal transition; preview has no remove action.

### AC-CR-017 — Candidate-review notes are saved only within the preview

- **Role:** Employer
- **Type:** Boundary
- **Scenario status:** Draft
- **Implementation status:** Mock/preview local state; no notes API or persistence contract is evidenced.
- **Prerequisites:** Employer has opened a candidate preview; note is nonblank and within the UI's 1200-character input limit.
- **Given:** Employer enters a private note in the candidate details.
- **When:** Employer saves the note.
- **Then:** The preview updates its local record and displays preview-only feedback; blank/whitespace notes are rejected in the dialog.
- **Expected result:** Reloading or using another session is not guaranteed to retain the note; do not describe the note as persisted or access-controlled backend data.
- **Related issue/specification:** CM-065 #65; `CandidateDetailDialog.saveNotes`; `CandidateManagementPage.saveNotes`.
- **Verification method:** Browser/manual check for blank input, valid input, character limit, local feedback, and refresh behavior.
- **Evidence:** Frontend trims and checks nonblank text, limits textarea to 1200, and saves in component state; browser execution pending.

### AC-CR-018 — Candidate-review API/system failure is surfaced without false success

- **Role:** Employer
- **Type:** Negative
- **Scenario status:** Needs confirmation
- **Implementation status:** No candidate-review API is evidenced; preview actions are synchronous local state and cannot establish network failure behavior.
- **Prerequisites:** An application API contract defines errors for list, profile, transition, note, and interview operations.
- **Given:** A candidate-review request fails due to authorization, validation, conflict, or service unavailability.
- **When:** Employer loads or updates an application.
- **Then:** The client reports an actionable error, preserves the last confirmed server state and entered input where applicable, and does not show success or mutate data as if the request succeeded.
- **Expected result:** Error codes, retryability, and user-facing messages must be mapped from the future API contract.
- **Related issue/specification:** CM-065 #65; `docs/recruitment-api.md`; application/interview API contract pending.
- **Verification method:** Agree API error envelope, then service/client tests and browser tests for 401/403/validation/conflict/5xx cases.
- **Evidence:** API guide states application/interview APIs are not delivered in this slice; failure behavior unverified.

## 7. Account Management scenarios (Commit 4)

These scenarios reflect the Admin UI and API/source tree present on the CM-065 branch. The account list and its actions use local mock state. The API has authentication/session routes and an `AccountStatus` model, but no Admin account-list or account-status-management controller/service was found. Do not treat session enforcement for suspended users as an Admin lock/unlock API.

### AC-AM-001 — Admin views the account list and account details

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: Admin page receives local fixture users; details dialog shows name, email, role, status, registration date, and location. No Admin account-list/details API is evidenced.
- **Prerequisites:** Admin workspace is open with preview fixture accounts.
- **Given:** The Users section contains account fixtures.
- **When:** Admin views a user row and opens its details.
- **Then:** The list/detail content corresponds to the selected fixture, and closing details does not change it.
- **Expected result:** The UI preview is distinguishable from server-backed account records.
- **Related issue/specification:** CM-065 #65; WBS #29/#77/#94; `UserManagementPage`; `AdminWorkspacePage`; `AccountStatus` in Prisma.
- **Verification method:** Browser/manual check of list fields, selected detail fields, and close behavior; API integration check when a contract exists.
- **Evidence:** Page receives `mockAdminUsers` from AdminWorkspacePage; no account-management API module exists in `apps/api/src`.

### AC-AM-002 — Admin searches accounts by name or email

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: client-side search over fixture name and email.
- **Prerequisites:** Preview includes accounts with distinct names and emails.
- **Given:** Admin is on the Users section.
- **When:** Admin enters a full or partial name/email query.
- **Then:** The preview shows accounts whose combined name/email matches the trimmed query without case sensitivity and updates the result count.
- **Expected result:** Search operates on the local fixture list only; pagination or server search is not implied.
- **Related issue/specification:** CM-065 #65; WBS #29/#77/#94; `UserManagementPage`.
- **Verification method:** Browser checks for name, email, case variation, whitespace, and no results.
- **Evidence:** `UserManagementPage` filters `${name} ${email}` with trimmed lowercase query; execution pending.

### AC-AM-003 — Admin filters accounts by role and account status

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: role and local status filters.
- **Prerequisites:** Fixtures contain more than one role and status.
- **Given:** Admin is viewing the Users section.
- **When:** Admin selects a role, status, or both.
- **Then:** The preview shows only accounts matching all selected criteria and reports the filtered count.
- **Expected result:** The preview statuses `Active`, `Pending`, and `Suspended` are not silently treated as API response values; Prisma enum values are `ACTIVE`, `PENDING_VERIFICATION`, and `SUSPENDED`.
- **Related issue/specification:** CM-065 #65; WBS #29/#77/#94; `UserManagementPage`; Prisma `AccountStatus` and `UserRole`.
- **Verification method:** Browser checks for each filter and combined filters; map API enum values only after contract approval.
- **Evidence:** UI filters fixtures; Prisma contains role/status enums; account-list API is absent.

### AC-AM-004 — Admin suspends an active account in the preview

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: active fixture opens a confirmation dialog; confirm updates local status to `Suspended` and adds local activity/notice. The dialog has no reason field; no backend action is evidenced. Current success copy says the account “is now suspended” without identifying the preview boundary.
- **Prerequisites:** Selected fixture has status `Active`.
- **Given:** Admin selects Suspend for an active account.
- **When:** Admin confirms the action.
- **Then:** Local workspace state marks the fixture `Suspended` and shows preview feedback; cancel leaves it unchanged.
- **Expected result:** This interaction does not claim that the persisted account, sessions, or access have changed.
- **Related issue/specification:** CM-065 #65; `UserManagementPage`; `AdminActionDialog`; `AdminWorkspacePage.updateUserStatus`; Prisma `AccountStatus`.
- **Verification method:** Browser/manual confirm/cancel checks and API tests after an approved management endpoint exists.
- **Evidence:** State update is local in AdminWorkspacePage; suspended-session denial is separately implemented in `SessionService`.

### AC-AM-005 — Admin reactivates a suspended account in the preview

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: selecting Unlock on a suspended fixture directly changes local status to `Active`, without a confirmation dialog or reason; no backend action is evidenced. Current success copy does not identify the preview boundary.
- **Prerequisites:** Selected fixture has status `Suspended`.
- **Given:** Admin selects Unlock for a suspended account.
- **When:** The preview action runs.
- **Then:** The local fixture status becomes `Active` and the workspace displays local feedback.
- **Expected result:** Confirmation requirements, audit trail, session restoration, and persisted status behavior are not established by this UI action.
- **Related issue/specification:** CM-065 #65; `UserManagementPage`; `AdminWorkspacePage.updateUserStatus`; Prisma `AccountStatus`.
- **Verification method:** Preview browser check; backend behavior requires an approved API contract and tests.
- **Evidence:** Suspended-row handler calls status update directly; no Admin account endpoint found.

### AC-AM-006 — Admin activates a pending account in the preview

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Mock/preview button says Activate for `Pending` and directly sets local status to `Active`; the meaning of Pending versus `PENDING_VERIFICATION` and whether Admin may bypass verification are not defined.
- **Prerequisites:** Product defines whether pending verification can be overridden by an Admin and which prerequisites apply.
- **Given:** A fixture is labeled `Pending`.
- **When:** Admin selects Activate.
- **Then:** The expected authorization, email-verification and account-state outcome remains pending policy confirmation; do not infer that activation bypass is valid.
- **Expected result:** UI label is documented as preview behavior only until lifecycle policy is agreed.
- **Related issue/specification:** CM-065 #65; `UserManagementPage`; Prisma `AccountStatus`; `docs/api-contracts.md` authentication account-state rules.
- **Verification method:** Confirm product/security policy, then add API state/authorization tests and browser flow.
- **Evidence:** Local handler changes the fixture; auth contract separately requires active, verified accounts for login; no Admin activation API exists.

### AC-AM-007 — Required reason, validation, and lock/unlock policy are defined before action acceptance

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** No reason contract exists for account actions. Current suspend dialog requests no reason; unlock/activate has no dialog. No endpoint/DTO validation exists.
- **Prerequisites:** Requirement owner approves which actions require a reason, its length/visibility, and whether the same rule applies to suspension, reactivation, and activation.
- **Given:** Admin attempts an account status action with a missing, blank, or invalid reason.
- **When:** The approved account-management flow validates the request.
- **Then:** Expected validation response and whether the action is blocked are defined by the approved contract, not assumed from unrelated company/report dialog behavior.
- **Expected result:** CM-065 does not assert an undocumented reason requirement or code.
- **Related issue/specification:** CM-065 #65; WBS #29/#77/#94; `UserManagementPage`; `AdminActionDialog`; API contract pending.
- **Verification method:** Approve action/reason policy, then DTO/service boundary tests and UI validation tests.
- **Evidence:** Existing AdminActionDialog is used without `requireReason` for account suspension; no account action DTO/service found.

### AC-AM-008 — Non-Admin or unauthenticated caller cannot manage accounts

- **Role:** Employer, Student, or unauthenticated user
- **Type:** Negative
- **Scenario status:** Needs confirmation
- **Implementation status:** Admin workspace has frontend role protection in the current source; no account-management endpoint exists to establish API authorization for list/actions.
- **Prerequisites:** Caller session is Employer/Student or absent; Admin account-management route/API policy is defined.
- **Given:** A non-Admin or anonymous caller attempts to read or change accounts.
- **When:** Workspace routing and, if present, the API authorize the request.
- **Then:** The route guard behavior is verified separately from API authorization; expected API status/body cannot be asserted without an account endpoint contract.
- **Expected result:** Hiding the Admin menu or frontend route is not considered server-side authorization evidence.
- **Related issue/specification:** CM-065 #65; WBS #29/#77/#94; `RoleProtectedLayout`; `docs/authorization.md`.
- **Verification method:** Protected-layout tests plus API tests for role and anonymous callers after the management routes exist.
- **Evidence:** Frontend role layout exists; API tree contains no Admin user-management controller/service.

### AC-AM-009 — Unknown account, repeated action, and stale status are handled safely

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Needs confirmation
- **Implementation status:** Preview only updates a fixture found by ID and does not report a missing account; there is no persisted account-action endpoint or concurrency contract.
- **Prerequisites:** Account is absent, already has the target status, or changed after Admin loaded the list.
- **Given:** Admin submits a status action against an unknown or stale account.
- **When:** The operation is processed.
- **Then:** Product/API contract must define not-found, invalid-transition, idempotency, and stale-write outcomes; no error code or success behavior is assumed here.
- **Expected result:** A failed action must not be presented as a successful persisted update.
- **Related issue/specification:** CM-065 #65; WBS #29/#77/#94; Prisma `User`; account-management API contract pending.
- **Verification method:** Once defined, service tests for unknown IDs, duplicate actions, stale state, unchanged status, and side effects.
- **Evidence:** Prisma has User/status fields; no Admin management service or tests found.

### AC-AM-010 — Account action failure does not falsely update access or report success

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** No account-management network action exists in the UI; account status changes in AdminWorkspacePage are synchronous local preview updates whose success copy is not labeled preview. Authentication does reject suspended accounts with `ACCOUNT_SUSPENDED` on session checks.
- **Prerequisites:** An approved account-management API exists and returns an authorization, validation, conflict, or service error.
- **Given:** An account status operation fails.
- **When:** The client receives the failure.
- **Then:** The UI preserves the last confirmed server status, explains the error, and does not show server success; session-access behavior follows the existing auth contract independently.
- **Expected result:** Current mock success notice must be labeled preview, and cannot validate failure handling for a future API.
- **Related issue/specification:** CM-065 #65; `AdminWorkspacePage`; `docs/api-contracts.md`; `SessionService`; Prisma `AuthSession`.
- **Verification method:** Client/service tests for agreed 401/403/validation/conflict/5xx contract and session check for suspended user.
- **Evidence:** `SessionService` rejects suspended accounts; no account action API or failure-handling path found.

## 8. Report Management scenarios (Commit 4)

The Report Management components and mock report fixtures present in this branch are documented as preview behavior only. Prisma contains a `Report` model, but no report controller/service, report status enum, or report-history model/route was found. Do not attribute these behaviors to a CM-078 merge or claim persisted triage/analytics.

### AC-RM-001 — Admin views report fixtures and report details

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: local report fixtures; details dialog shows target, reporter/contact, submitted date, status, details, and local history. The list does not display a report ID, and no report API is evidenced.
- **Prerequisites:** Reports section is open with preview fixtures.
- **Given:** Admin opens the reports list and selects a report.
- **When:** The details dialog is displayed.
- **Then:** The dialog displays fields from the selected fixture; closing without an action does not change local status/history.
- **Expected result:** A displayed report is a sample fixture, not a server-fetched case.
- **Related issue/specification:** CM-065 #65; WBS #29/#78/#94/#95; `ReportManagementPage`; Prisma `Report`.
- **Verification method:** Browser/manual check of selected fixture, available fields, and close behavior.
- **Evidence:** Page uses report props from `mockAdminReports`; no report API module found.

### AC-RM-002 — Admin searches reports in the preview

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: client-side search over reporter name, target label, and reason.
- **Prerequisites:** Fixtures have distinct reporter, target, and reason values.
- **Given:** Admin is viewing the Reports section.
- **When:** Admin enters a full or partial query.
- **Then:** Matching fixtures are shown case-insensitively after trimming and the result count is updated.
- **Expected result:** Search does not currently cover reporter email, report details, or a server query.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`.
- **Verification method:** Browser checks for reporter, target, reason, case/whitespace variants, and no matches.
- **Evidence:** Filter expression searches reporter, targetLabel, and reason only; execution pending.

### AC-RM-003 — Admin filters reports by status

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview status filter over local `Open`, `Reviewing`, `Resolved`, and `Dismissed` values; backend `Report.status` is an unconstrained string.
- **Prerequisites:** Fixtures contain reports in multiple preview statuses.
- **Given:** Admin selects a status filter.
- **When:** The report list is recalculated.
- **Then:** Only fixtures with that exact preview status remain and the result count reflects them.
- **Expected result:** Preview status labels are not treated as an approved persisted enum or API filter contract.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`; Prisma `Report.status`.
- **Verification method:** Browser checks each status and verifies matching rows/count; contract review before API assertions.
- **Evidence:** Local filter and fixtures exist; schema status is `String` with default `OPEN`, without a report API.

### AC-RM-004 — Admin starts review of an open report

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: Open → Reviewing after confirmation; a blank optional review note is replaced with a fixed preview note; local history is prepended. The parent success notice is not labeled as preview.
- **Prerequisites:** Selected fixture is `Open`.
- **Given:** Admin opens an Open report and chooses Mark reviewing.
- **When:** Admin confirms the action.
- **Then:** Local report status becomes Reviewing and local history receives the action note/date; cancellation leaves both unchanged.
- **Expected result:** No server assignment, reviewer identity, audit event, or persisted timestamp is implied.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`; `AdminActionDialog`; `AdminWorkspacePage.updateReportStatus`.
- **Verification method:** Preview browser confirm/cancel checks and history inspection; API tests only after report action contract exists.
- **Evidence:** Component updates local state and inserts history; no report operation endpoint found.

### AC-RM-005 — Admin resolves a reviewing report with a valid note

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: Reviewing → Resolved; dialog requires a trimmed note of at least 10 characters, max 500; local history and dashboard preview update. Parent success copy is not labeled as preview.
- **Prerequisites:** Selected fixture is Reviewing; note satisfies current UI dialog validation.
- **Given:** Admin has reviewed a report and selected Resolve.
- **When:** Admin confirms with a valid note.
- **Then:** Local status changes to Resolved, history is prepended, list metrics/dashboard inputs update, and preview feedback is shown.
- **Expected result:** The UI validation limit is a frontend rule only; Prisma has `resolvedAt` but no report action API/history contract.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`; `AdminActionDialog`; `AdminWorkspacePage.updateReportStatus`; Prisma `Report`.
- **Verification method:** Preview UI boundary tests for trimmed lengths and verify status/history/count changes; confirm API contract separately.
- **Evidence:** Dialog checks nonblank with >=10 trimmed chars and maxLength 500; parent updates local state; no report service/history model found.

### AC-RM-006 — Admin dismisses a reviewing report with a valid note

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: Reviewing → Dismissed using the same required-note dialog validation as resolution. Parent success copy is not labeled as preview.
- **Prerequisites:** Selected fixture is Reviewing; dismissal note satisfies the current UI rule.
- **Given:** Admin determines that the report should be dismissed.
- **When:** Admin confirms Dismiss with a valid note.
- **Then:** Local status and history update to Dismissed and preview feedback appears; cancel leaves the fixture unchanged.
- **Expected result:** Dismissed status and note are not persisted to the server; the distinction from Resolved needs an approved report contract.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`; `AdminActionDialog`; `AdminWorkspacePage.updateReportStatus`.
- **Verification method:** Preview confirm/cancel checks and validation boundary checks; API tests after contract approval.
- **Evidence:** Local action path and required-note UI exist; Prisma does not define Dismissed or a report history entity.

### AC-RM-007 — Report action is canceled without changing status or history

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Draft
- **Implementation status:** Mock/preview confirmation dialogs expose Cancel; expected local behavior can be checked without an API.
- **Prerequisites:** A report action dialog is open for an Open or Reviewing fixture.
- **Given:** Admin has not confirmed the action.
- **When:** Admin cancels/closes the confirmation dialog.
- **Then:** The report retains its prior status and history; no action success notice is produced.
- **Expected result:** Cancel must not call the local status-change callback.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`; `AdminActionDialog`.
- **Verification method:** Component/browser test for cancel and unchanged parent state.
- **Evidence:** Cancel invokes dialog close callback; execution evidence pending.

### AC-RM-008 — Terminal or unsupported report status does not expose an unapproved action

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Preview shows status actions only for Open and Reviewing; backend has no report status enum or transition service.
- **Prerequisites:** A report is Resolved, Dismissed, or has an unknown persisted status.
- **Given:** Admin opens a terminal or unsupported report status.
- **When:** The details dialog renders available actions.
- **Then:** Current preview exposes no transition buttons for Resolved/Dismissed. Behavior for unknown API statuses and reopen/retriage policy remains undefined.
- **Expected result:** Do not infer a reopen transition or accepted status list from fixture types.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`; Prisma `Report.status`; report API contract pending.
- **Verification method:** Browser check of terminal preview; define and test API state machine before integration.
- **Evidence:** Component conditionally renders actions for Open/Reviewing only; persisted transition contract absent.

### AC-RM-009 — Report reason/note validation follows the approved contract

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Preview requires 10–500 characters for Resolved/Dismissed notes and allows an optional review note; no report API DTO or persistence validation exists.
- **Prerequisites:** Requirement owner approves whether note is required per action, minimum/maximum length, and reason visibility.
- **Given:** Admin submits a blank, whitespace-only, too-short, or over-limit note.
- **When:** The action dialog validates input.
- **Then:** Current preview blocks required notes shorter than 10 trimmed characters and textarea input is capped at 500; API acceptance behavior is pending contract approval.
- **Expected result:** Do not treat UI-only validation as server validation or approved policy.
- **Related issue/specification:** CM-065 #65; `AdminActionDialog`; report API contract pending.
- **Verification method:** Preview tests at trimmed lengths 0/9/10/500 and approved API DTO/service tests after implementation.
- **Evidence:** UI uses trim and minimum check and textarea maxLength 500; no report DTO/service exists.

### AC-RM-010 — Report history is displayed as local preview data

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview history entries are displayed in the details dialog and prepended on local state changes; no report-history database model/API is evidenced.
- **Prerequisites:** Fixture has one or more history entries or Admin performs a preview action.
- **Given:** Admin opens report details.
- **When:** The handling history is rendered after a local action.
- **Then:** Entries display fixture/action status, date, and note in the local order; no authenticated actor or persistent audit trail is claimed.
- **Expected result:** Distinguish mock history from Prisma `AuditLog` and from a future report-specific audit contract.
- **Related issue/specification:** CM-065 #65; `ReportManagementPage`; `AdminWorkspacePage.updateReportStatus`; Prisma `Report` and `AuditLog`.
- **Verification method:** Preview component test for initial entries and appended local action; API/audit test after contract exists.
- **Evidence:** Local `history` field is part of frontend `AdminReport`; Prisma Report has no relation/history table.

### AC-RM-011 — Report status counts and Admin dashboard values derive from preview data

- **Role:** Admin
- **Type:** Positive
- **Scenario status:** Draft
- **Implementation status:** Mock/preview: Reports page counts Open/Reviewing/Resolved/Dismissed; Admin Dashboard derives reported-job count from unresolved Job-target fixtures and recent activity from local state. No analytics API is evidenced.
- **Prerequisites:** Report fixtures have varied target types/statuses.
- **Given:** Admin opens Reports or the Admin Dashboard.
- **When:** The screens calculate their summary values.
- **Then:** Counts reflect the current local report array; after a confirmed preview action the relevant counts update from the same parent state. Admin Dashboard “Reported jobs” excludes resolved/dismissed and non-Job targets.
- **Expected result:** These are fixture-derived previews, not production analytics or time-series metrics.
- **Related issue/specification:** CM-065 #65; WBS #29/#78/#94/#95; `ReportManagementPage`; `AdminDashboard`; `AdminWorkspacePage`.
- **Verification method:** Component/unit tests with varied fixtures and status changes; browser check after action.
- **Evidence:** Values are computed from props and parent state; no dashboard/report metrics endpoint found.

### AC-RM-012 — Non-Admin or unauthenticated caller cannot access report operations

- **Role:** Employer, Student, or unauthenticated user
- **Type:** Negative
- **Scenario status:** Needs confirmation
- **Implementation status:** Frontend Admin workspace role protection exists; no report API route exists to verify server authorization or response codes.
- **Prerequisites:** Caller is not an authorized Admin; report route/API policy is defined.
- **Given:** Non-Admin or anonymous caller attempts to list or modify reports directly.
- **When:** Frontend route guard and API authorization evaluate access.
- **Then:** Verify frontend guard separately; the expected server response, data non-disclosure, and status code remain pending until a report endpoint contract exists.
- **Expected result:** Client-side navigation/guard does not substitute for backend authorization.
- **Related issue/specification:** CM-065 #65; WBS #29/#78/#94/#95; `RoleProtectedLayout`; `docs/authorization.md`.
- **Verification method:** Protected-layout test plus API tests for Admin, non-Admin, and anonymous callers after report routes exist.
- **Evidence:** Preview route uses Admin workspace; no report controller/service found in API source.

### AC-RM-013 — Missing, malformed, or unknown report data has an agreed fallback

- **Role:** Admin
- **Type:** Boundary
- **Scenario status:** Needs confirmation
- **Implementation status:** Preview type requires populated report and history fields; backend Report uses free-form targetType/status strings and has no response DTO contract.
- **Prerequisites:** Product/API owners define valid target types, statuses, required reporter/target fields, date format, and history nullability.
- **Given:** A report response omits a field, has an unknown target/status, malformed date, or empty history.
- **When:** Admin list/details/dashboard render the record.
- **Then:** Expected fallback, exclusion, or error behavior follows the approved response contract; this scenario does not invent defaults.
- **Expected result:** No crash, fabricated history, or silently misclassified analytics after the contract is defined.
- **Related issue/specification:** CM-065 #65; Prisma `Report`; frontend `AdminReport`; report API contract pending.
- **Verification method:** Approve schema and test null/malformed/unknown values at API, utility, and browser levels.
- **Evidence:** Prisma targetType/status are strings; no report response DTO or endpoint found.

### AC-RM-014 — Report API failure does not falsely confirm triage or analytics

- **Role:** Admin
- **Type:** Negative
- **Scenario status:** Needs confirmation
- **Implementation status:** Report screen actions and metrics use synchronous local mock state; no report API or network error path is evidenced. `AdminWorkspacePage` accepts generic `loading`/`loadError` props, but no report request is wired to them.
- **Prerequisites:** Report-list/action/analytics API contract exists and a request returns an authorization, validation, conflict, or service error.
- **Given:** A report request fails.
- **When:** Admin loads the queue, changes status, or refreshes analytics.
- **Then:** The client preserves the last confirmed server data, differentiates empty from error, and does not show persisted success or metrics derived from an uncommitted action.
- **Expected result:** Error codes, retry behavior, and consistency rules await API contract; mock behavior is not evidence.
- **Related issue/specification:** CM-065 #65; WBS #78/#94/#95; `ReportManagementPage`; report API contract pending.
- **Verification method:** Agree error/consistency contract then test 401/403/validation/conflict/5xx and browser loading/empty/error/success states.
- **Evidence:** No report controller/service/DTO or report error-handling client found.

## 9. Traceability table

This matrix links each drafted scenario to its requirement and evidence source. Related issue numbers are traceability leads from the repository WBS map, not proof that their exact acceptance criteria were reviewed or approved. All scenarios below remain **Draft** unless marked **Needs confirmation**; none has execution evidence from this documentation change.

| Business Area        | Requirement (initial coverage target)                                                      | Scenario ID | Related Issue / specification                                                                     | Implementation Status (repository evidence)                                                                                                     | Verification Method                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Company Verification | Admin lists and searches companies                                                         | `AC-CV-001` | CM-065 #65; WBS #69/#84; `AdminCompaniesController.findAll`; `QueryCompaniesDto`                  | API implemented; frontend list is mock/preview; integration pending                                                                             | Controller/service tests; API query tests; browser list/filter check after integration                                    |
| Company Verification | Admin reviews the selected company details                                                 | `AC-CV-002` | CM-065 #65; `AdminCompaniesController.findAll`; `EmployerManagementPage`                          | Frontend detail dialog is preview; API list returns company records; dedicated Admin detail route is not documented                             | Browser detail-content check; confirm required review fields with business owner                                          |
| Company Verification | Admin approves a pending company                                                           | `AC-CV-003` | CM-065 #65; WBS #69/#84; `VerifyCompanyDto`; company transition table                             | API transition implemented; frontend action is preview; integration pending                                                                     | `CompaniesService` tests; API authorization/transition check; browser status and notification check after integration     |
| Company Verification | Admin rejects a pending company with a valid reason                                        | `AC-CV-004` | CM-065 #65; `VerifyCompanyDto`; `CompaniesService.adminVerify`                                    | API implemented; UI preview; integration pending                                                                                                | Service validation tests and API request with reason                                                                      |
| Company Verification | Empty, short, or too-long rejection reason is rejected                                     | `AC-CV-005` | CM-065 #65; `VerifyCompanyDto`; `CompaniesService.adminVerify`                                    | API min/max constraints documented in code; frontend preview validation exists, end-to-end pending                                              | DTO/service boundary tests (9/10/1000/1001 trimmed characters)                                                            |
| Company Verification | Repeat or otherwise disallowed verification transition is rejected without changing status | `AC-CV-006` | CM-065 #65; `canTransitionCompanyVerification`; `CompaniesService.adminVerify`                    | API transition guard implemented; frontend does not call API                                                                                    | Transition/service tests; verify unchanged status and no duplicate side effects                                           |
| Company Verification | Admin can revoke or re-verify only through supported transitions                           | `AC-CV-007` | CM-065 #65; `recruitment-state-transitions.md`; `recruitment-api.md`                              | API supports `VERIFIED → REJECTED` and `REJECTED → VERIFIED`; frontend integration pending                                                      | Transition tests; confirm revocation policy and reason requirements with owner                                            |
| Company Verification | Employer cannot access Admin company list or verification action                           | `AC-CV-008` | CM-065 #65; `AdminCompaniesController`; authorization guide                                       | API route is ADMIN-guarded; frontend role UI is not API authorization evidence                                                                  | API tests with EMPLOYER token expect 403                                                                                  |
| Company Verification | Anonymous caller cannot access Admin company routes                                        | `AC-CV-009` | CM-065 #65; `AdminCompaniesController`; authorization guide                                       | API route uses `AuthGuard`; frontend role UI is not API authorization evidence                                                                  | API requests without a session expect 401                                                                                 |
| Company Verification | Company profile without a tax code follows an agreed verification prerequisite             | `AC-CV-010` | CM-065 #65; `CreateCompanyDto`; company state transition specification                            | **Needs confirmation:** DTO makes taxCode optional, while state transition specification says valid taxCode is required                         | Confirm product rule; then add DTO/service boundary test. Do not assert an outcome yet                                    |
| Company Verification | Invalid company profile fields are rejected under DTO constraints                          | `AC-CV-011` | CM-065 #65; `CreateCompanyDto`; `UpdateCompanyDto`                                                | API DTO constraints implemented; profile UI remains preview                                                                                     | DTO/API tests for name and taxCode boundaries and invalid types                                                           |
| Company Verification | Unknown company ID returns not found                                                       | `AC-CV-012` | CM-065 #65; `CompaniesService.adminVerify`; Admin controller                                      | API 404 `COMPANY_NOT_FOUND` documented; frontend integration pending                                                                            | Service/API test using unknown company ID                                                                                 |
| Company Verification | Unexpected verification failure is not shown as success                                    | `AC-CV-013` | CM-065 #65; `CompaniesService.adminVerify`; API error docs                                        | **Needs confirmation:** feature-specific unexpected error envelope and UI retry/message behavior are not specified                              | Agree safe failure behavior; controlled service failure test                                                              |
| Company Verification | Missing or unsupported verification status is rejected                                     | `AC-CV-014` | CM-065 #65; `VerifyCompanyDto`; app `ValidationPipe`                                              | DTO allows only `VERIFIED`/`REJECTED`; UI remains preview                                                                                       | API tests for missing and unsupported status values                                                                       |
| Job Moderation       | Admin lists pending jobs with search, status, company, and pagination filters              | `AC-JM-001` | CM-065 #65; WBS #72/#86; `AdminJobsController.findAll`; `QueryAdminJobsDto`                       | API implemented; Admin UI filters are mock/preview; integration pending                                                                         | Controller/service tests; query boundaries; browser filters after integration                                             |
| Job Moderation       | Admin reviews a selected listing and its available details                                 | `AC-JM-002` | CM-065 #65; `AdminJobsController.findAll`; `JobModerationPage`                                    | Preview detail dialog exists; Admin API list includes job/company/category/skills; separate detail route not documented                         | Browser verifies displayed fields; reconcile required moderation checklist with policy                                    |
| Job Moderation       | Admin approves a pending-approval job                                                      | `AC-JM-003` | CM-065 #65; WBS #72/#86; `ModerateJobDto`; `canTransitionJob`                                     | API supports `PENDING_APPROVAL → PUBLISHED`; UI action is preview; integration pending                                                          | Job service/transition tests; API response and publication state check                                                    |
| Job Moderation       | Admin rejects a pending-approval job with a valid reason                                   | `AC-JM-004` | CM-065 #65; `ModerateJobDto`; `JobsService.adminModerate`                                         | API implemented; UI preview; integration pending                                                                                                | Service tests with reason and persisted status; notification evidence if required                                         |
| Job Moderation       | Rejection reason is required and bounded                                                   | `AC-JM-005` | CM-065 #65; `ModerateJobDto`; `JobsService.adminModerate`                                         | API trims reason, requires at least 10 characters for REJECTED, and limits it to 1000; UI preview                                               | DTO/service boundary tests (9/10/1000/1001 trimmed characters)                                                            |
| Job Moderation       | Admin closes or rejects an already published job as an allowed moderation outcome          | `AC-JM-006` | CM-065 #65; `recruitment-api.md`; `canTransitionJob`                                              | API allows `PUBLISHED → CLOSED` and `PUBLISHED → REJECTED`; rejection requires a reason. UI preview status choices differ.                      | Transition/service tests; confirm policy for closing versus rejecting a published listing                                 |
| Job Moderation       | Admin action from an unsupported source state is rejected without mutation                 | `AC-JM-007` | CM-065 #65; `canTransitionJob`; `JobsService.adminModerate`                                       | API rejects invalid transitions; UI preview actions currently use separate local statuses                                                       | API transition tests for DRAFT, REJECTED, and CLOSED; assert no state or side-effect update                               |
| Job Moderation       | “Flag listing” is treated as preview-only until an API status/contract is agreed           | `AC-JM-008` | CM-065 #65; `JobModerationPage`; `ModerateJobDto`; `JobStatus`                                    | UI has `Flagged` preview state; moderation DTO accepts only PUBLISHED, REJECTED, CLOSED. **API behavior pending confirmation/not implemented.** | Verify preview label; confirm whether Flagged is a real business state before adding an API acceptance criterion          |
| Job Moderation       | Employer cannot list or moderate jobs through Admin-only routes                            | `AC-JM-009` | CM-065 #65; `AdminJobsController`; authorization guide                                            | API routes are ADMIN-guarded; frontend preview is not access control                                                                            | API requests with Employer token expect 403                                                                               |
| Job Moderation       | Anonymous caller cannot use Admin job routes                                               | `AC-JM-010` | CM-065 #65; `AdminJobsController`; authorization guide                                            | API routes use `AuthGuard`; frontend preview is not access control                                                                              | API requests without a session expect 401                                                                                 |
| Job Moderation       | Invalid/missing status or unsupported DTO values are rejected                              | `AC-JM-011` | CM-065 #65; `ModerateJobDto`; `QueryAdminJobsDto`                                                 | DTO validation is implemented; exact validation response envelope is framework-level                                                            | API tests for missing/invalid status, bad enum, invalid page/pageSize/companyId and unknown fields per app ValidationPipe |
| Job Moderation       | Unknown job and concurrent stale moderation do not produce success                         | `AC-JM-012` | CM-065 #65; `JobsService.adminModerate`; `recruitment.database.mjs`                               | Not-found and conditional state update are implemented; generic infrastructure failure UX remains unspecified                                   | Service/database race test; unknown-ID test; assert no mutation or duplicate side effect                                  |
| Job Moderation       | Moderation follows an approved content-policy rubric                                       | `AC-JM-013` | CM-065 #65; state-transition spec; approved content policy if available                           | **Needs confirmation:** API accepts decisions, but the reviewed documents do not define an objective violation rubric                           | Policy owner approves rubric and examples before scenario approval                                                        |
| Candidate Review     | Employer lists only applications for jobs owned by its company                             | `AC-CR-001` | CM-065 #65; WBS #26/#75/#89; `recruitment-state-transitions.md`; `authorization.md`               | Frontend list is mock; owner-scoped application API is not evidenced                                                                            | API integration with two company owners; browser verification after integration                                           |
| Candidate Review     | Search applicants by name in the preview                                                   | `AC-CR-002` | CM-065 #65; `CandidateManagementDashboard`                                                        | Name-only client-side search on fixtures; no API integration                                                                                    | Browser checks for case, whitespace, partial and no-match queries                                                         |
| Candidate Review     | Filter by job position and application status                                              | `AC-CR-003` | CM-065 #65; `CandidateManagementDashboard`; `ApplicationStatus` design                            | Position/status filters operate on preview fixture labels                                                                                       | Browser checks for individual and combined filters and result count                                                       |
| Candidate Review     | Sort applicants by application date                                                        | `AC-CR-004` | CM-065 #65; `CandidateManagementDashboard`                                                        | Local sort by applied date, newest/oldest                                                                                                       | Compare preview order to fixture dates                                                                                    |
| Candidate Review     | Distinguish an empty list from filters with no matches                                     | `AC-CR-005` | CM-065 #65; `CandidateManagementDashboard`; application API contract pending                      | Preview has distinct empty and no-results messages; API empty response is unspecified                                                           | Empty fixture and no-match browser checks                                                                                 |
| Candidate Review     | View selected candidate profile, application, resume preview and status history            | `AC-CR-006` | CM-065 #65; `CandidateDetailDialog`; `recruitment-data-design.md`                                 | Detail is fixture-based; resume is sample content; no profile/application API integration                                                       | Verify selected fixture fields, history, sample-resume label and dialog behavior                                          |
| Candidate Review     | Handle missing or invalid candidate/application fields                                     | `AC-CR-007` | CM-065 #65; `recruitment-data-design.md`; application API contract pending                        | **Needs confirmation:** response nullability and required review fields have no implemented API contract                                        | Approve schema/fallback rules, then test absent and malformed values                                                      |
| Candidate Review     | Deny non-owner or unauthorized access to applications/private CVs                          | `AC-CR-008` | CM-065 #65; `recruitment-state-transitions.md`; `authorization.md`                                | Ownership/privacy principles documented; application-specific guards/routes not evidenced                                                       | API tests for owner, other Employer, Student, Admin and anonymous after routes exist                                      |
| Candidate Review     | Mark a submitted application as reviewing                                                  | `AC-CR-009` | CM-065 #65; `recruitment-state-transitions.md`; `CandidateManagementPage`                         | Transition specified; preview `New → Reviewing` is local only; no application API evidenced                                                     | API ownership/transition/history tests and separate preview browser check                                                 |
| Candidate Review     | Shortlist an eligible submitted or reviewing application                                   | `AC-CR-010` | CM-065 #65; WBS #26/#74/#75/#89/#109; `recruitment-state-transitions.md`; `CandidateDetailDialog` | Transition specified; UI changes mock state; API integration pending                                                                            | API transition/history/notification tests and browser check after integration                                             |
| Candidate Review     | Create an interview invitation for an eligible application                                 | `AC-CR-011` | CM-065 #65; WBS #27/#62/#76/#90/#91; `recruitment-state-transitions.md`; `CandidateDetailDialog`  | Interview transition designed; preview “Schedule interview” only changes local state; interview API not evidenced                               | Confirm API contract; then integration and browser invitation tests                                                       |
| Candidate Review     | Accept an application after interview                                                      | `AC-CR-012` | CM-065 #65; `recruitment-state-transitions.md`; `CandidateDetailDialog`                           | State transition specified; preview local update only; no application API evidenced                                                             | API tests for terminal state, history, pending-interview effects and browser check after integration                      |
| Candidate Review     | Reject an eligible application with optional feedback                                      | `AC-CR-013` | CM-065 #65; `recruitment-state-transitions.md`; `CandidateDetailDialog`                           | **Needs confirmation:** state spec permits multiple source states, preview permits rejection only from Interview; API absent                    | Reconcile product policy and test each allowed source state after API contract                                            |
| Candidate Review     | Reject invalid, terminal or stale application transitions without mutation                 | `AC-CR-014` | CM-065 #65; `recruitment-state-transitions.md`; application API contract pending                  | Terminal states specified; API validation/conditional writes not evidenced                                                                      | Transition-matrix and concurrent-update tests once service exists                                                         |
| Candidate Review     | Display ranking only under a reproducible approved scoring contract                        | `AC-CR-015` | CM-065 #65; WBS #74/#109; `recruitment-data-design.md` JobMatch; `wbs-issue-map.json`             | **Needs confirmation:** schema stores match scores; no ranking endpoint, algorithm contract or UI control evidenced                             | Approve scoring inputs/version/explanation, then deterministic service/browser tests                                      |
| Candidate Review     | Remove an application from shortlist under an approved transition rule                     | `AC-CR-016` | CM-065 #65; WBS #74/#75/#89; `recruitment-state-transitions.md`; `CandidateDetailDialog`          | **Needs confirmation:** no reverse transition or preview action is specified                                                                    | Decide status/history/interview effects before adding transition and UI tests                                             |
| Candidate Review     | Save candidate-review notes in preview only                                                | `AC-CR-017` | CM-065 #65; `CandidateDetailDialog.saveNotes`; `CandidateManagementPage.saveNotes`                | Local state only; nonblank validation and 1200-character input limit; no notes API evidenced                                                    | Browser check blank/valid note, preview feedback and reload behavior                                                      |
| Candidate Review     | Surface application API failures without false success                                     | `AC-CR-018` | CM-065 #65; `recruitment-api.md`; application/interview API contract pending                      | **Needs confirmation:** no review API or network failure contract; synchronous preview cannot verify failures                                   | Agree error envelope then test 401/403/validation/conflict/5xx and preservation of confirmed state/input                  |
| Account Management   | View accounts and details                                                                  | `AC-AM-001` | CM-065 #65; WBS #29/#77/#94; `UserManagementPage`; Prisma `User`                                  | Fixture list/details only; no Admin account API                                                                                                 | Browser check of list fields, selected record and close behavior                                                          |
| Account Management   | Search accounts by name/email                                                              | `AC-AM-002` | CM-065 #65; `UserManagementPage`                                                                  | Client-side fixture search                                                                                                                      | Browser checks for name/email, case, whitespace and no result                                                             |
| Account Management   | Filter accounts by role/status                                                             | `AC-AM-003` | CM-065 #65; `UserManagementPage`; Prisma `UserRole`/`AccountStatus`                               | Fixture filters; UI status labels differ from Prisma enum names                                                                                 | Browser filter checks; approve API-to-UI status mapping                                                                   |
| Account Management   | Suspend active account in preview                                                          | `AC-AM-004` | CM-065 #65; `UserManagementPage`; `AdminActionDialog`; `AdminWorkspacePage.updateUserStatus`      | Local status/notice/activity update only; confirmation has no reason field; no persisted action API                                             | Browser confirm/cancel check; API tests when contract exists                                                              |
| Account Management   | Reactivate suspended account in preview                                                    | `AC-AM-005` | CM-065 #65; `UserManagementPage`; `AdminWorkspacePage.updateUserStatus`                           | Direct local status change, no confirmation/reason; backend behavior absent                                                                     | Browser preview check; approve backend policy/API first                                                                   |
| Account Management   | Activate pending account                                                                   | `AC-AM-006` | CM-065 #65; `UserManagementPage`; Prisma `AccountStatus`; `api-contracts.md`                      | **Needs confirmation:** preview directly activates; verification bypass policy is undefined                                                     | Security/product decision, then API and browser tests                                                                     |
| Account Management   | Define required reason and action validation                                               | `AC-AM-007` | CM-065 #65; `UserManagementPage`; `AdminActionDialog`; WBS #77                                    | **Needs confirmation:** no account reason DTO/contract; UI does not request a reason                                                            | Approve policy then boundary tests for UI/DTO/service                                                                     |
| Account Management   | Enforce Admin-only account access                                                          | `AC-AM-008` | CM-065 #65; WBS #29/#77/#94; `RoleProtectedLayout`; `authorization.md`                            | Frontend guard exists; no account API to verify server authorization                                                                            | Protected-layout tests and API authorization tests after route exists                                                     |
| Account Management   | Handle unknown, duplicate, or stale status operation                                       | `AC-AM-009` | CM-065 #65; WBS #77; Prisma `User`; account API contract pending                                  | Preview has no missing/stale action response; no Admin action service                                                                           | Future service tests for not-found, idempotency, stale writes and unchanged state                                         |
| Account Management   | Surface failures without false account/session success                                     | `AC-AM-010` | CM-065 #65; `AdminWorkspacePage`; `SessionService`; `api-contracts.md`                            | UI action is local; auth denies suspended accounts separately with `ACCOUNT_SUSPENDED`; no management API                                       | Future 401/403/validation/conflict/5xx tests and suspended-session test                                                   |
| Report Management    | View report fixtures and details                                                           | `AC-RM-001` | CM-065 #65; WBS #29/#78/#94/#95; `ReportManagementPage`; Prisma `Report`                          | Local fixture list/details; ID not displayed; no report API                                                                                     | Browser check selected record, fields and close behavior                                                                  |
| Report Management    | Search reports                                                                             | `AC-RM-002` | CM-065 #65; `ReportManagementPage`                                                                | Local search over reporter, target label, and reason only                                                                                       | Browser query checks including fields intentionally not searched                                                          |
| Report Management    | Filter reports by status                                                                   | `AC-RM-003` | CM-065 #65; `ReportManagementPage`; Prisma `Report.status`                                        | Fixture status filter; DB status is free-form String                                                                                            | Browser status/count checks; define persisted enum before API integration                                                 |
| Report Management    | Start review and record local handling history                                             | `AC-RM-004` | CM-065 #65; `ReportManagementPage`; `AdminActionDialog`; `AdminWorkspacePage.updateReportStatus`  | Open → Reviewing in local preview; optional note gets preview fallback; local history only                                                      | Browser confirm/cancel/history checks                                                                                     |
| Report Management    | Resolve report with a valid note                                                           | `AC-RM-005` | CM-065 #65; `ReportManagementPage`; `AdminActionDialog`; Prisma `Report`                          | Reviewing → Resolved in local preview; UI requires 10–500 chars; no API/history persistence                                                     | Preview note boundaries and status/history/count check; approve backend contract                                          |
| Report Management    | Dismiss report with a valid note                                                           | `AC-RM-006` | CM-065 #65; `ReportManagementPage`; `AdminActionDialog`; Prisma `Report`                          | Reviewing → Dismissed in preview; same UI note check; Dismissed absent from Prisma contract                                                     | Preview confirm/cancel checks; approve persisted status contract                                                          |
| Report Management    | Cancel report action without state/history mutation                                        | `AC-RM-007` | CM-065 #65; `ReportManagementPage`; `AdminActionDialog`                                           | Cancel closes preview dialog; no API action                                                                                                     | Component/browser assertion that status/history stay unchanged                                                            |
| Report Management    | Handle terminal/unsupported status                                                         | `AC-RM-008` | CM-065 #65; `ReportManagementPage`; Prisma `Report.status`                                        | Preview hides actions outside Open/Reviewing; backend transition rules absent                                                                   | Verify terminal preview and define API state machine                                                                      |
| Report Management    | Validate required notes according to approved contract                                     | `AC-RM-009` | CM-065 #65; `AdminActionDialog`; report API contract pending                                      | UI requires >=10 trimmed characters and max 500 for close actions; not backend validation                                                       | Preview boundary tests and future DTO/service tests                                                                       |
| Report Management    | Display handling history as preview-only data                                              | `AC-RM-010` | CM-065 #65; `AdminReport`; `AdminWorkspacePage.updateReportStatus`; Prisma `Report`/`AuditLog`    | Frontend local history; no ReportHistory model/endpoint; no actor attribution                                                                   | Check fixture and local action history; audit tests after design                                                          |
| Report Management    | Derive report counts and dashboard values from preview data                                | `AC-RM-011` | CM-065 #65; WBS #78/#94/#95; `ReportManagementPage`; `AdminDashboard`; `AdminWorkspacePage`       | Status counts and reported-job metric derive from local props; no analytics endpoint                                                            | Component tests with varied fixtures and after local status changes                                                       |
| Report Management    | Enforce Admin-only report access                                                           | `AC-RM-012` | CM-065 #65; WBS #78/#94/#95; `RoleProtectedLayout`; `authorization.md`                            | Frontend role guard exists; report API authorization cannot be tested because route absent                                                      | Protected-layout checks; API tests after report endpoint exists                                                           |
| Report Management    | Handle missing, malformed, or unknown report data                                          | `AC-RM-013` | CM-065 #65; frontend `AdminReport`; Prisma `Report`; report API contract pending                  | **Needs confirmation:** UI expects complete fixture fields; backend fields are free-form and response DTO absent                                | Approve schema and test null/malformed/unknown values                                                                     |
| Report Management    | Surface report API errors without false triage/analytics success                           | `AC-RM-014` | CM-065 #65; WBS #78/#94/#95; `ReportManagementPage`; report API contract pending                  | Synchronous local preview only; no API/error path found                                                                                         | Future tests for 401/403/validation/conflict/5xx and preserved server state                                               |

## 10. Validation and failure matrix

This matrix summarizes validation evidenced by source code separately from preview-only checks and unapproved rules. A design/schema entry is not evidence of a delivered endpoint. Scenario IDs refer to the detailed drafts above; all remain unapproved until reviewed by the requirement owner.

| Business area        | Validation/failure case                           | Evidence-based rule or current limit                                                                                                                                                                            | Scenario IDs                                                    | Coverage status                                          |
| -------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| Company Verification | Required/format/length of company profile         | `CreateCompanyDto` trims `name` and requires 2–255 characters; optional `taxCode`, if present, is 6–50 chars. State spec says tax code is required to submit for verification, so prerequisite is inconsistent. | `AC-CV-010`, `AC-CV-011`                                        | Partial; product/API rule needs reconciliation           |
| Company Verification | Rejection reason                                  | API DTO trims and caps reason at 1000; service requires at least 10 characters when rejecting.                                                                                                                  | `AC-CV-004`, `AC-CV-005`                                        | Implemented API; UI preview only                         |
| Company Verification | Enum/transition/resource errors                   | Only `VERIFIED`/`REJECTED` are valid request targets; invalid transition, missing company, authentication, and authorization have API paths.                                                                    | `AC-CV-006`, `AC-CV-008`, `AC-CV-009`, `AC-CV-012`, `AC-CV-014` | Implemented API; execution evidence per scenario pending |
| Company Verification | Unexpected service failure                        | UI/API integration and client recovery behavior are not established by the current preview.                                                                                                                     | `AC-CV-013`                                                     | Needs confirmation                                       |
| Job Moderation       | Query validation                                  | Admin query supports page ≥1, pageSize 1–100, JobStatus enum, UUID companyId, and trimmed search.                                                                                                               | `AC-JM-001`, `AC-JM-011`                                        | Implemented API; preview filters not integrated          |
| Job Moderation       | Target status/reason                              | DTO accepts `PUBLISHED`, `REJECTED`, or `CLOSED`; reason is optional and capped at 1000, but service requires 10 trimmed characters for rejection.                                                              | `AC-JM-004`, `AC-JM-005`, `AC-JM-011`                           | Implemented API; UI preview states differ                |
| Job Moderation       | Invalid transition/duplicate or stale write       | Service checks documented source/target transition and conditionally writes to reject stale moderation before side effects.                                                                                     | `AC-JM-006`, `AC-JM-007`, `AC-JM-012`                           | Implemented API; UI preview transitions differ           |
| Job Moderation       | Missing content-policy criteria                   | Request validation does not define the substantive policy test for rejecting/closing a listing.                                                                                                                 | `AC-JM-013`                                                     | Needs confirmation                                       |
| Candidate Review     | Required/malformed application/profile fields     | Prisma models required application IDs/status and related profile entities, but there is no delivered review DTO/response contract defining nullable display fields or fallback behavior.                       | `AC-CR-007`, `AC-CR-018`                                        | Not implemented / needs contract                         |
| Candidate Review     | Status and ownership validation                   | State document defines allowed statuses and owner scope; application/interview API validation is not delivered. Preview labels and transitions do not prove persisted rules.                                    | `AC-CR-008`–`AC-CR-014`                                         | Documented design; API implementation pending            |
| Candidate Review     | Ranking/shortlist reversal                        | Score contract and shortlist-removal transition are not defined by an implemented endpoint or current preview control.                                                                                          | `AC-CR-015`, `AC-CR-016`                                        | Needs confirmation                                       |
| Candidate Review     | Internal note input                               | Preview rejects blank/whitespace notes and limits the textarea to 1200 characters; no persisted notes contract exists.                                                                                          | `AC-CR-017`                                                     | Mock/preview only                                        |
| Account Management   | Account filters/status values                     | UI filters `Active`, `Pending`, `Suspended`; Prisma defines `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`. No API mapping/DTO exists.                                                                           | `AC-AM-003`, `AC-AM-006`                                        | Mock/preview; mapping/policy pending                     |
| Account Management   | Reason/invalid status/unknown or duplicate action | Current Suspend dialog has no reason; unlock/activate runs immediately in local state. No account-action DTO, service, endpoint, or failure contract exists.                                                    | `AC-AM-005`–`AC-AM-009`                                         | Not implemented / needs confirmation                     |
| Account Management   | Authentication/session failure                    | Implemented auth returns `EMAIL_NOT_VERIFIED` for pending verification and `ACCOUNT_SUSPENDED` for suspended accounts; this is not an Admin status-management action.                                           | `AC-AM-006`, `AC-AM-010`                                        | Auth API implemented; Admin action pending               |
| Report Management    | Required note and length                          | Preview allows optional review note (uses a fixed fallback) and requires ≥10 trimmed characters for resolve/dismiss; textarea max is 500. No backend validation contract exists.                                | `AC-RM-004`–`AC-RM-009`                                         | Mock/preview; business/API rule pending                  |
| Report Management    | Status enum, missing fields, history              | Prisma `Report.status` and `targetType` are free-form strings; there is no report response DTO, status enum, or history model.                                                                                  | `AC-RM-003`, `AC-RM-008`–`AC-RM-010`, `AC-RM-013`               | Not implemented / needs contract                         |
| Report Management    | Authorization and system/API failure              | Report UI is under Admin workspace, but there is no report API to verify server authorization or errors. Workspace loading/error props are generic and are not connected to report requests.                    | `AC-RM-012`, `AC-RM-014`                                        | Frontend guard/visual props only; API behavior pending   |

## 11. Authorization matrix

“Backend confirmed” below means a route/guard or explicit delivered policy exists for the named operation. The Admin workspace `RoleProtectedLayout` is a client-side navigation guard and does not substitute for API authorization.

| Business area        | Employer                                                                                                                                                                                            | Admin                                                                                                                          | Student / anonymous                                                                                                                                           | Evidence and limitation                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Company Verification | Employer may access its own company profile routes; cannot call Admin verification routes (`403` when authenticated).                                                                               | Admin-only list and verification routes use `AuthGuard` + `RolesGuard` + `ADMIN`; anonymous is rejected by authentication.     | Not authorized for Admin routes; public company detail is a separate route.                                                                                   | `CompaniesController`, `AdminCompaniesController`, `CompaniesService`; `AC-CV-008`–`AC-CV-009`. Frontend screen remains mock. |
| Job Moderation       | Employer job routes require `EMPLOYER` and scope records to its company; cannot call Admin moderation routes.                                                                                       | Admin list/moderation routes use authentication and `ADMIN` role.                                                              | Not authorized for Admin moderation routes; public job read is separate.                                                                                      | `JobsController`, `AdminJobsController`, `JobsService`; `AC-JM-009`–`AC-JM-010`. Frontend screen remains mock.                |
| Candidate Review     | State spec assigns review actions to the Employer owning the job; no application API exists to enforce it. Employer access to private CVs is not granted by the current `OwnershipService` helpers. | No Admin application-review policy/API is established.                                                                         | State spec allows a Student to withdraw only their own eligible application; no application route exists. Anonymous behavior is not feature-contract-defined. | `recruitment-state-transitions.md`, `authorization.md`, `AC-CR-008`–`AC-CR-014`. All review UI is preview.                    |
| Account Management   | Admin workspace is role-protected in frontend; no backend account-management route exists to test Employer denial for list/actions.                                                                 | Frontend Admin workspace restriction exists; server permission for account-management operations is not implemented/evidenced. | Frontend route should deny wrong/absent sessions; backend operation status cannot be asserted without endpoint.                                               | `RoleProtectedLayout`, `roleAccess`, `AC-AM-008`; generic auth/roles do not create an account-management API.                 |
| Report Management    | Frontend Admin workspace restriction exists; no report API authorization to verify.                                                                                                                 | Frontend role guard only; server-side report permission contract/API absent.                                                   | Frontend route should deny wrong/absent sessions; backend response is undefined.                                                                              | `RoleProtectedLayout`, `authorization.md`, `AC-RM-012`; no report controller/service.                                         |

## 12. State-transition coverage

| Workflow             | Documented transition or state rule                                                                                                                                                                                      | Scenario coverage                                | Implementation/evidence status                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company Verification | `PENDING → VERIFIED`; `PENDING → REJECTED` with reason; `VERIFIED → REJECTED`; `REJECTED → VERIFIED`; Employer may resubmit `REJECTED → PENDING`.                                                                        | `AC-CV-003`–`AC-CV-007`, `AC-CV-010`             | Admin API implements the first four transitions; Employer resubmission appears in state/API design and company profile API. UI integration pending; tax-code prerequisite conflict remains.                                                                      |
| Job Moderation       | Admin: `PENDING_APPROVAL → PUBLISHED/REJECTED`; `PUBLISHED → CLOSED/REJECTED`; reject requires a reason.                                                                                                                 | `AC-JM-003`–`AC-JM-007`, `AC-JM-011`–`AC-JM-012` | Admin API and transition tests exist. Frontend mock labels/actions differ; policy rubric still needs approval.                                                                                                                                                   |
| Job Moderation       | `Flagged` preview label.                                                                                                                                                                                                 | `AC-JM-008`                                      | `Flagged` is not a `JobStatus` enum value or `ModerateJobDto` target; no API transition is asserted.                                                                                                                                                             |
| Candidate Review     | `SUBMITTED → REVIEWING`; `SUBMITTED/REVIEWING → SHORTLISTED`; invitation creation moves `SHORTLISTED → INTERVIEW`; `INTERVIEW → ACCEPTED`; active stages may become `REJECTED`; Student withdrawal has specified limits. | `AC-CR-009`–`AC-CR-014`                          | State design only; no application/interview routes found. Preview uses `New/Reviewing/Shortlisted/Interview/Accepted/Rejected`; mapping and transition coverage differ (notably rejection availability). Student withdrawal is outside these Employer scenarios. |
| Candidate Review     | AI matching is advisory; hiring decisions are human-controlled.                                                                                                                                                          | `AC-CR-010`, `AC-CR-012`, `AC-CR-015`            | State/API contract says scores do not automatically accept/reject. Employer ranking contract is not established; no ranking control/API found.                                                                                                                   |
| Account Management   | Prisma account statuses are `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`; suspended sessions are denied.                                                                                                                | `AC-AM-003`–`AC-AM-010`                          | Auth/session enforcement is implemented; Admin transitions, allowed source/target states, reasons, history, and reactivation semantics are not. Preview uses different labels and local actions.                                                                 |
| Report Management    | Preview labels/transitions: `Open → Reviewing → Resolved/Dismissed`; terminal controls are hidden.                                                                                                                       | `AC-RM-003`–`AC-RM-010`                          | Frontend local state only. Prisma report status is free-form string; no approved state machine, history persistence, actor attribution, or API exists.                                                                                                           |

## 13. Cross-workflow coverage

| Relationship                               | Evidence-based rule                                                                                                                                  | Scenario links                                    | Coverage / unresolved integration                                                                                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company Verification → Job Moderation      | Recruitment API delivery guide says a company's status must be `VERIFIED` before an Employer submits a job for approval.                             | `AC-CV-003`–`AC-CV-007`; `AC-JM-003`–`AC-JM-007`  | Separate company/job APIs are delivered, but current business screens are mock and no browser end-to-end flow proves that verification gates job submission. Also reconcile the tax-code prerequisite in `AC-CV-010`. |
| Job Management → Candidate Review          | Application state design requires a `PUBLISHED` job for submission; Employer application scope must follow job-company ownership.                    | `AC-CR-001`, `AC-CR-008`–`AC-CR-014`; `AC-JM-003` | Job APIs exist, but application/interview APIs do not. There is no integrated path proving a published job's applications appear only to its owning Employer.                                                         |
| Account Management → Authentication/access | Live auth checks current account/session; pending verification and suspended status have distinct login errors.                                      | `AC-AM-004`–`AC-AM-010`                           | Admin status controls only mutate mock state, so they do not suspend a real session or validate the session effect. A management API and audit/reason contract are needed.                                            |
| Report Management → Content moderation     | Report fixtures refer to Job/Account targets, but no delivered contract says resolving/dismissing a report changes or preserves the target resource. | `AC-RM-001`, `AC-RM-004`–`AC-RM-014`              | Triage status/history and dashboard counts are local preview. Target action, escalation, retention, cross-linking, and transaction behavior need a product/API decision.                                              |

## 14. Source documents and implementation evidence

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

## 15. Review and completion checklist

Before marking a scenario approved or verified:

- Confirm its business rule and related issue with the requirement owner.
- Confirm actor role, ownership scope, initial state, permitted transition, validation, and error outcome.
- Distinguish UI preview behavior from backend persistence and authorization.
- Select a reproducible verification method and retain evidence.
- Record any dependency that blocks API, integration, or browser verification.
- Review the full matrix for gaps across positive, negative, and boundary cases.
- For document changes, check scenario ID uniqueness, required fields, one traceability entry per scenario, and local Markdown links; run Prettier and `git diff --check`.

This framework itself does not make CM-065 or any related implementation issue Done. All five business areas now have draft scenarios, but requirement-owner approval and execution evidence remain pending. No Markdown-specific automated test harness is configured; the web Vitest suite targets application code, so document structure is checked with repeatable manual scripts rather than adding an unrelated test dependency or runner.
