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

This first delivery establishes the format, identifiers, status vocabulary, and traceability table. It does not decide unconfirmed business rules or claim that a mock frontend action is persisted by the API. Detailed scenarios, approval, and execution evidence are to be added in later CM-065 commits.

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

## 4. Traceability table

This is the initial coverage map, not a complete set of acceptance criteria. The `AC-…` ranges reserve IDs; `TBD` means detailed scenario IDs have not yet been assigned. Related issue numbers are traceability leads from the repository WBS map, not proof that their exact acceptance criteria were reviewed or approved.

| Business Area        | Requirement (initial coverage target)                                                                             | Scenario ID        | Related Issue / specification                                                                                                                                                                               | Implementation Status (repository evidence)                                                                                                                                            | Verification Method                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Company Verification | Employer profile submission/review and authorized Admin decision, including invalid or rejected cases             | `AC-CV-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #15/#69/#84; [recruitment API](../recruitment-api.md); [state transitions](../recruitment-state-transitions.md)        | Frontend uses local preview state. Company verification API is documented as implemented; frontend/API integration is not established by the frontend code.                            | Review approved rule and DTO; API integration tests for role, validation and transitions; browser test for Employer/Admin flow after integration.            |
| Job Moderation       | Admin reviews a submitted listing and makes an allowed decision with required feedback where specified            | `AC-JM-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #17/#72/#86; [recruitment API](../recruitment-api.md); [state transitions](../recruitment-state-transitions.md)        | Frontend moderation actions use mock state. Admin job moderation API is documented as implemented; end-to-end integration is not established.                                          | Contract/transition tests; API authorization and validation tests; browser verification of decision, feedback and visible state.                             |
| Candidate Review     | Employer reviews an application and moves it through only approved application outcomes                           | `AC-CR-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #26/#75/#89; [state transitions](../recruitment-state-transitions.md); [API integration contract](../api-contracts.md) | Employer candidate screen uses mock data. Application schema/state specification exists; a matching API implementation is not confirmed by the current recruitment API delivery guide. | Confirm the application API contract first; then test owner scoping, transitions/history and browser feedback. Preview-only checks must be labeled as such.  |
| Account Management   | Admin searches accounts and performs approved account status actions with authorization and reason/feedback rules | `AC-AM-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #29/#77/#94; [authorization guide](../authorization.md)                                                                | Admin user screen is present, but uses frontend mock state. No Admin account-management API action is evidenced in the current feature API documentation.                              | Confirm allowed statuses, reasons and API contract; test Admin/forbidden access, validation, persistence and failure behavior when supported.                |
| Report Management    | User report is triaged by an authorized Admin under an agreed status workflow, with handling history              | `AC-RM-001…` — TBD | [CM-065 #65](https://github.com/quangnguyen16325/careermatch-ai/issues/65); WBS refs #29/#78/#94/#95; [API integration contract](../api-contracts.md)                                                       | Admin report screen and actions use frontend preview state. A Report data model exists, but an implemented report-management API is not evidenced in the current API delivery guide.   | Confirm report submission/moderation contract; test state transitions, authorization, history and failures at API level, then verify the Admin browser flow. |

## 5. Source documents and implementation evidence

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

## 6. Review and completion checklist

Before marking a scenario approved or verified:

- Confirm its business rule and related issue with the requirement owner.
- Confirm actor role, ownership scope, initial state, permitted transition, validation, and error outcome.
- Distinguish UI preview behavior from backend persistence and authorization.
- Select a reproducible verification method and retain evidence.
- Record any dependency that blocks API, integration, or browser verification.
- Review the full matrix for gaps across positive, negative, and boundary cases.

This framework itself does not make CM-065 or any related implementation issue Done. Detailed scenarios and their review/evidence remain for subsequent commits.
