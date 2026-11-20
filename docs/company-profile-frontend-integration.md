# Company Profile frontend integration notes — CM-068

This note records the Company API contract and the current CM-068 frontend integration. It does not claim that backend authorization has been replaced by the UI guard or that live browser/API testing has been completed.

## Delivered Employer API contract

The API prefix is `/api/v1` (configurable for local frontend use with `VITE_API_URL`; the default frontend API base is `/api/v1`). The current company controller exposes:

| Method and path       | Role                     | Request                                                                                       | Successful response                                                                                  |
| --------------------- | ------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST /companies`     | Authenticated `EMPLOYER` | `CreateCompanyDto`: required `name`; optional `description`, `website`, `location`, `taxCode` | Created Company record                                                                               |
| `GET /companies/my`   | Authenticated `EMPLOYER` | No body                                                                                       | Current employer's linked Company record                                                             |
| `PATCH /companies/my` | Authenticated `EMPLOYER` | `UpdateCompanyDto`: optional fields; nullable `description`, `website`, `location`, `taxCode` | Updated Company record                                                                               |
| `GET /companies/:id`  | Public                   | Company ID                                                                                    | Public subset: `id`, `name`, `description`, `website`, `location`, `verificationStatus`, `createdAt` |

Employer routes use `AuthGuard` and `RolesGuard` with the `EMPLOYER` role. They identify the employer from the authenticated session; the caller does not submit an employer ID. Admin verification is a separate operation (`PATCH /admin/companies/:id/verify`) requiring `ADMIN`, with `VerifyCompanyDto`; it is not an Employer profile-edit endpoint.

The persisted `VerificationStatus` enum is exactly `PENDING`, `VERIFIED`, and `REJECTED`. Creating a company sets `PENDING`. Updating a `REJECTED` company resets it to `PENDING`; other statuses are retained. The Employer update response is the updated company record. The API DTOs and service currently allow `taxCode` to be omitted at creation, while the state-transition specification describes a tax-code prerequisite for verification; this discrepancy needs the CM-015/API owner’s decision before the UI promises a rule.


The controller returns the Company record directly (no response envelope is added by the controller). The frontend accepts a successful response only when required Company fields and the verification enum are present. A GET 404 means “no company yet” only when its body code is exactly `COMPANY_NOT_FOUND`; other 404s remain errors. The DTO/service also documents `EMPLOYER_PROFILE_NOT_FOUND`, `COMPANY_ALREADY_EXISTS`, `TAX_CODE_EXISTS`, and `COMPANY_STATE_CHANGED`.

## Current frontend integration

`EmployerCompanyJobsPage` now loads the company profile from `GET /companies/my`, creates through `POST /companies`, and updates through `PATCH /companies/my`. Loading, not-found, retry/error, and saving states are represented in the page. Only the explicit `COMPANY_NOT_FOUND` response creates the empty-profile state. Create/update success comes from a valid API response; failed writes retain form values and show normalized API errors. Jobs remain mock data and are unrelated to the company profile integration.

No file/image upload contract is present in the company DTOs. The editor omits logo, cover, contact email, phone, industry, and size rather than presenting them as persisted fields. Coordinate field ownership and any contract change with the CM-015/API owner.

The Company API client reuses the existing workspace auth flow: POST `/auth/refresh` with the HttpOnly cookie, then GET `/auth/me` with the returned Bearer token. The token is held only in the in-memory request result and is not stored in local storage. Company requests fail closed unless `/auth/me` identifies the user as `EMPLOYER`; company endpoints also enforce `AuthGuard` and `RolesGuard`. Backend guards remain the authority for company data and writes. A live Employer session/API was not available for browser end-to-end verification during this commit.

## Frontend validation and errors

`apps/web/src/features/employer/companyApi.ts` records frontend request/response types, the exact three verification states and labels, and helpers for API error normalization, DTO-based validation, and constructing create/update request payloads. Create requires a trimmed 2–255 character name; update permits an omitted name. Description is at most 5000 characters, website and location at most 255, and a supplied tax code must be 6–50 characters. The backend does not define URL or tax-code character-format rules, so the form does not invent them. Empty optional create values are omitted; nullable update values are sent as `null` to clear them.

Validation errors render in Vietnamese beside their fields and are connected with `aria-describedby`. Backend status/code and Nest validation message arrays are translated to a general message and known field errors; 401, 403, 404, known 409 conflicts, 5xx, malformed responses, and network failures have distinct failure handling. API-client tests cover request methods/paths, Bearer auth, role mismatch, recognized not-found behavior, response validation, nullable updates, and HTTP/network failures. These tests use mocked `fetch`; they do not establish live backend availability or replace browser end-to-end checks. Future work should add live/integration coverage when an Employer test session and reachable API are available.

## CM-068 manual verification checklist

Run the web app and API with an authenticated Employer test account. Use the app's configured API base (`VITE_API_URL`, default `/api/v1`). Verify these scenarios without using Admin or Student credentials to edit a profile:

- Open the Employer workspace with a company profile and confirm GET populates name, description, website, location, tax code, and the API verification status.
- Open it without a linked company and confirm only the structured `404 COMPANY_NOT_FOUND` response offers profile creation. A different 404, 401, 403, 5xx, malformed response, or network failure should show an error and retry action.
- Create a profile with only the required name, then with optional values. Confirm the form closes and the profile/status shown are backed by the successful POST and subsequent GET response.
- Edit and clear nullable fields; confirm the PATCH payload sends `null` for cleared optional fields and omits unsupported properties and verification status.
- Simulate/produce 400 validation, 401, 403, 409, 5xx, and offline failures. Confirm field/general errors appear, entered values remain, and no success state is shown.
- Confirm the pending, verified, and rejected copy is understandable without color; no rejection reason is shown because the Company model/API response has no rejection-reason field.
- Repeat the profile flow at desktop, tablet, and mobile widths. Check input/error wrapping, keyboard focus, disabled save/cancel while saving, retry, and success/error/loading announcements.

Do not claim these manual or browser scenarios as passed until run against a reachable API and a real test session.

## Automated verification for this branch

The `web` package defines these checks:

```powershell
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

For Commit 6, the installed local binaries were used because pnpm's environment attempted dependency-store management and required an unavailable interactive TTY:

- Typecheck: PASS (`tsc -b --pretty false`).
- Lint: PASS (`oxlint`, no errors or warnings).
- Unit tests: PASS (58 tests across 6 files).
- Production build: PASS (`vite build`, 1702 modules).
- `git diff --check`: PASS.

There is no DOM rendering/testing library configured in `apps/web`; loading/retry, dirty indicator, input retention, and accessibility behavior were reviewed from implementation but not exercised as rendered component tests. No browser runner, running backend, or authenticated Employer test session was available, so browser/E2E and live API checks are **BLOCKED / not verified**.

## Acceptance Criteria and Definition of Done review

| Item | Status | Evidence / remaining verification |
| --- | --- | --- |
| AC1: Company Profile GET/POST/PATCH integration, three statuses, field validation | **PARTIAL** | `companyApiClient.ts`, `EmployerCompanyJobsPage.tsx`, form and API-client tests cover the contract and fail-closed behavior. Live API and Employer browser session remain unverified. |
| AC2: Validation/failure handling, tests, documentation | **PARTIAL** | DTO-backed validation, error mapping, client/helper tests, and this guide are present. Rendered form behavior and real backend failure responses remain unverified. |
| DoD: acceptance criteria, integrations, quality checks, review, docs | **PARTIAL** | Local typecheck/lint/tests/build/diff checks pass and documentation is updated. Live API/browser verification and owner confirmation below remain. |

## Owner decisions and PR readiness

- **CM-015 owner confirmation required:** the state-transition documentation describes a tax-code prerequisite for verification while `CreateCompanyDto` and `UpdateCompanyDto` permit tax code to be omitted. The form intentionally follows the DTO and does not make it required.
- Confirm whether company verification rejection reasons should be persisted/exposed to the Employer. The current `Company` model has no rejection-reason field; this UI does not invent or display one.
- Confirm the live API base/proxy and provide a test Employer session so the manual list above can be run.

The frontend implementation is ready for review, but CM-068 should not be marked fully Done until the blocked live API/browser checks and owner decisions are resolved. A PR can be opened for code review with those limits stated; final acceptance remains conditional.

## Sources

- `apps/api/src/companies/companies.controller.ts` and `admin-companies.controller.ts`
- `apps/api/src/companies/dto/create-company.dto.ts`, `update-company.dto.ts`, `verify-company.dto.ts`
- `apps/api/src/companies/companies.service.ts`
- `apps/api/prisma/schema.prisma` (`VerificationStatus`, `Company`)
- `docs/recruitment-api.md`, `docs/recruitment-state-transitions.md`, and `docs/authorization.md`
- `apps/web/src/features/employer/pages/EmployerCompanyJobsPage.tsx` and company profile components
