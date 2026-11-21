# CareerMatch AI web frontend

React 19, TypeScript, Vite, Tailwind CSS 4, and Lucide React frontend for the CareerMatch AI application.

## Pages and workspace roles

- `/` or `/index.html` — public landing page.
- `/employer.html` — Employer company profile and job management; requires the `EMPLOYER` role.
- `/candidates.html` — Employer candidate search, review, and application status management; requires the `EMPLOYER` role.
- `/admin.html` — Admin dashboard, users, employers, job moderation, and reports; requires the `ADMIN` role.

Employer navigation links between `/employer.html` and `/candidates.html`. Admin sections are selected within `/admin.html`; they are not separate routes. The Vite dev server serves these HTML entry points directly (default: `http://localhost:5173`).

## Authentication and protected workspaces

Each Employer/Admin HTML entry wraps its workspace in `RoleProtectedLayout`. The layout starts in a loading state and does not render restricted page content until the session check succeeds. `workspaceSession.ts` sends `POST /auth/refresh` with browser credentials, then uses the returned short-lived access token in memory to request `GET /auth/me`. The role returned by the current backend identity response determines workspace access; role values from a URL or local storage are not used.

- A missing or expired session (`401`) shows the unauthenticated state. There is no login UI in this frontend; the user must establish a session using the supported authentication flow.
- A permission response (`403`) or a verified role mismatch shows the forbidden state.
- Network errors, unsuccessful unexpected responses, and malformed session responses fail closed and show the workspace unavailable state with a retry action.

Set `VITE_API_URL` to the API base URL, including `/api/v1` if needed. When it is unset, the frontend uses `/api/v1`. The Vite development server proxies `/api/v1` to `http://localhost:3000`; configure the API host or proxy for other environments. The API must allow the frontend origin and credentials according to the backend session configuration.

The browser guard controls workspace presentation and navigation only. It does not replace authorization: backend endpoints must independently verify the session, role, ownership, and permissions for every protected operation.

## Run and verify

From the repository root:

```sh
pnpm --filter web dev
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web build
```

On Windows, use `pnpm.cmd` as the command prefix. Tests use Vitest. There is currently no browser E2E or React DOM test environment configured.

## Source layout

- `src/App.tsx` and `src/main.tsx` — landing page and common application styles.
- `src/employer.tsx`, `src/candidates.tsx`, `src/admin.tsx` — protected workspace entry points.
- `src/components/ui/` — shared Button, Card, PageHeader, and StatusBadge components.
- `src/components/layout/` — shared employer workspace layout.
- `src/features/auth/` — session refresh and current-user lookup used by protected workspaces.
- `src/features/navigation/` — workspace role checks, active-link matching, and protected layout.
- `src/features/employer/` — company profile, jobs, candidates, and mock data.
- `src/features/employer/job-management/` — Employer job-list API, response validation, status/action rules, and pagination helpers.
- `src/features/admin/` — admin dashboard and moderation pages with mock data.

## Data and integration status

Employer job list and close actions call the backend; company profile, candidate, and admin business screens still use local mock data and frontend state. There is no login UI or browser end-to-end coverage yet. The workspace session request verifies identity for presentation; server-side authorization remains mandatory for protected data and actions.

## Employer Job Management (CM-071)

The Employer workspace at `/employer.html` loads job postings from the signed-in Employer's company. It displays backend status, title, location, work mode, category, last updated time, and application count. The details dialog shows the description and skill list returned by the API. Loading, empty, filtered-empty, and recoverable error states are distinct.

### API and status rules

- `GET /api/v1/jobs/my?page=&pageSize=&search=&status=` lists only the current Employer's jobs. The UI requests paginated `{ data, meta }` responses with a page size of 20. Search is by title and status filtering uses the backend `JobStatus` enum. Previous/Next follows `meta`; out-of-range pages are clamped after a filtered result changes the page count.
- Employer actions are displayed by status and call the existing backend endpoints only after confirmation:

  | Backend status     | Employer action in this list  | Endpoint                                                                                                                   | Result                                                  |
  | ------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
  | `DRAFT`            | Submit for approval           | `POST /api/v1/jobs/:id/submit-approval`                                                                                    | `PENDING_APPROVAL`; backend requires a verified company |
  | `DRAFT`            | Delete draft                  | `DELETE /api/v1/jobs/:id`                                                                                                  | Draft is deleted                                        |
  | `PENDING_APPROVAL` | Withdraw to draft             | `POST /api/v1/jobs/:id/withdraw`                                                                                           | `DRAFT`                                                 |
  | `PUBLISHED`        | Close job                     | `POST /api/v1/jobs/:id/close`                                                                                              | `CLOSED`                                                |
  | `REJECTED`         | No editor action in this list | Backend supports draft editing via `PATCH /api/v1/jobs/:id`, but the persisted CM-070 editor is not present on this branch |
  | `CLOSED`           | No Employer action            | Backend does not allow direct reopen                                                                                       |

  Mutation success is shown only after a successful backend response. The list is refreshed while retaining the current search/status query; if refresh fails, the returned server state is retained locally and the notice identifies the refresh failure. Submit, withdraw, delete, and close are not mock actions.

- The API requires an Employer session. The frontend reuses the HttpOnly refresh-cookie flow and sends the short-lived access token as a Bearer token. Backend checks remain authoritative for Employer role and company ownership.
- Backend enforces Employer role and company ownership for every mutation. State-transition errors, authorization/session errors, missing jobs, server errors, malformed responses, and network failures show safe messages. A `COMPANY_NOT_VERIFIED` response on submission explains the verification prerequisite.

CM-070's persisted Job Draft editor is not part of this branch's base because its feature branch was not merged into `develop` at implementation time. This list does not claim to create or edit jobs. Company Profile editing remains preview-only on this screen.

### Manual verification checklist

With a backend and an authenticated Employer account:

1. Open `/employer.html` and verify that the list uses the current Employer's API response; compare titles, statuses, locations, work modes, categories, update dates, and application counts.
2. Search a title and combine it with each status filter. Confirm the results and total/page metadata update.
3. Move through multiple pages, confirm Previous/Next disable at boundaries, then apply a filter while on a later page and confirm the page resets or clamps to a valid result.
4. Open and close a job details dialog using its controls and Escape; confirm the list query remains unchanged.
5. For a Draft job, cancel submission/deletion confirmations and verify no mutation occurs. Confirm submission with a verified company, then verify it becomes Pending approval; try an unverified company and confirm the backend error is shown. Confirm deleting a Draft removes it from the list.
6. For a Pending approval job, confirm withdraw and verify it returns to Draft. For a Published job, cancel/confirm close and verify the response status and filtered list update.
7. Try a stale or inaccessible job and simulate 401/403, 404, 400, 5xx, malformed response, and network errors. Verify there is no false success and Retry works.
8. Review the layout at mobile, tablet, and desktop widths and operate search, filter, pagination, details, and action confirmations with the keyboard.

Automated checks cover pure status/action/query helpers and API request/response handling. They do not render React components. The manual steps above have not been run as browser E2E; visual responsive behavior, keyboard interaction, and live Employer ownership/session flows remain unverified in a browser.
