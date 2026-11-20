# Company Profile frontend integration notes — CM-068

This note records the current API contract and the frontend gaps identified while preparing CM-068. It does not claim that the Employer Company Profile screen is integrated.

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

Validation and failures evidenced by current DTO/controller/service code include name length 2–255; optional tax code length 6–50; description max 5000; website/location max 255; `401 AUTHENTICATION_REQUIRED`, `403 FORBIDDEN`, `404 COMPANY_NOT_FOUND` (and missing employer profile on create), `409 COMPANY_ALREADY_EXISTS` or `TAX_CODE_EXISTS`, and update conflict `COMPANY_STATE_CHANGED`. API validation failures use the configured Nest validation response; consumers must tolerate the standard `message` string-array form as well as structured `{ code, message }` exceptions. Exact response envelopes should be confirmed from live Swagger/API behavior before integration assertions are finalized.

## Current frontend state and integration gaps

`EmployerCompanyJobsPage` initializes the profile from `mockCompanyProfile` and stores edits in React state. `CompanyProfileSection` reports “saved in this preview”; no Company Profile API request is made. Its current `CompanyProfile` form includes `logoUrl`, `coverUrl`, `contactEmail`, `phone`, `industry`, and `size`, which are not present in `CreateCompanyDto` or `UpdateCompanyDto`. Conversely, the backend includes `id`, `taxCode`, `verificationStatus`, and timestamps that the current UI model does not represent. The UI currently renders “Verification pending” as a fixed badge instead of deriving it from the backend status.

No file/image upload contract is present in the company DTOs. Do not silently discard unsupported form fields, fabricate backend values, or show a real saved/verified state. Coordinate field ownership and any contract change with the CM-015/API owner before implementing the UI integration.

The frontend workspace session currently refreshes the HttpOnly session and reads `/auth/me` to authorize a workspace, but it returns only the role to the layout; it does not expose an access token or a reusable authenticated API client. A later integration step must use the approved session flow without placing tokens in local storage or inventing a new endpoint. Backend guards remain the authority for company data and writes.

## Commit 1 foundation

`apps/web/src/features/employer/companyApi.ts` records frontend request/response types, the exact three verification states and labels, and a helper that preserves structured API errors and validation details. Its unit tests cover the status contract and error shapes. These helpers do not issue requests or change the current mock-driven UI; API wiring, validation presentation, failure UX, and integration/browser tests remain for later CM-068 commits.

## Sources

- `apps/api/src/companies/companies.controller.ts` and `admin-companies.controller.ts`
- `apps/api/src/companies/dto/create-company.dto.ts`, `update-company.dto.ts`, `verify-company.dto.ts`
- `apps/api/src/companies/companies.service.ts`
- `apps/api/prisma/schema.prisma` (`VerificationStatus`, `Company`)
- `docs/recruitment-api.md`, `docs/recruitment-state-transitions.md`, and `docs/authorization.md`
- `apps/web/src/features/employer/pages/EmployerCompanyJobsPage.tsx` and company profile components
