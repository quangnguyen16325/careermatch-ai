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

## Employer Job Draft Editor (CM-070)

The Employer workspace includes a Job Draft editor for creating and updating drafts. The editor validates data before submitting, preserves entered values when an API request fails, and displays a success message only after the API confirms the save. Editing is available for jobs in `DRAFT` or `REJECTED` status; the backend changes an edited `REJECTED` job back to `DRAFT`. The server remains authoritative if a job status changes while the editor is open.

The current editor fields are title, description, location, work mode, career category, and skills. Backend validation requires a title of 3–255 characters and a description of 10–10,000 characters. Location is optional and limited to 255 characters. Work mode is optional (`ONSITE`, `HYBRID`, or `REMOTE`), and category is an optional UUID. Required skill IDs must be UUIDs with no duplicates. Each skill's `required` value is a boolean (defaults to `true` in the API), and weight is between 0.1 and 10 (defaults to `1`). Blank optional values are omitted on create and sent as `null` on update when the user clears them.

### Integrated API contract

Job endpoints require an Employer session and a Bearer access token. The frontend reuses the workspace session refresh flow; it does not store a token in local storage.

- `POST /api/v1/jobs` creates a `DRAFT`. The Employer profile and associated Company profile must exist. The response contains the created job, including category and skills.
- `GET /api/v1/jobs/my?page=&pageSize=&search=&status=` lists the current Employer's jobs using `{ data, meta }` pagination. The editor currently loads all pages for the workspace list.
- `GET /api/v1/jobs/my/:id` loads an Employer-owned job with category and skill relations for editing.
- `PATCH /api/v1/jobs/:id` updates an owned job only while it is `DRAFT` or `REJECTED`. A `CANNOT_EDIT_JOB` response is shown as a stale-status error; the Employer must reload before trying again.
- `GET /api/v1/skills?search=&limit=` searches the public Skill Catalog and returns an array of skill records. Search is debounced and in-flight requests are aborted when the query changes. Already selected skills remain separate from search results.

Career category IDs are supported by the Job API, but the category catalog is not connected to this editor yet; create mode therefore has no category choices. This issue does not implement publication, moderation, Company Profile editing, Candidate Management, or Skill Catalog administration. The Job API integration is real; the Company Profile panel on the Employer workspace still uses mock data in this frontend.

### Job Editor verification

Run the frontend tests with `pnpm --filter web test`. Focused suites include `job-editor/validation.test.ts`, `skillSelection.test.ts`, `skillCatalogApi.test.ts`, `jobApi.test.ts`, and `requestVersion.test.ts`. Typecheck, lint, and build commands are listed above.

Manual smoke check when an Employer session and Company Profile are available:

1. Open `/employer.html`, create a draft with minimum-length title and description, then verify it appears in Job Management.
2. Search for a catalog skill, add it, change Required/Optional and Weight, save, reopen the draft, and confirm the selection is restored.
3. Edit a draft, clear optional fields, save, and verify the cleared values remain empty after reload.
4. Try invalid title, description, location, category, skill ID, and weight values and confirm submission is blocked with a field error.
5. Simulate API/network failures and verify the form data remains available; reload after an ownership or status error.

These are manual steps, not browser E2E results. The current test setup uses Vitest without React DOM/browser automation, so visual responsiveness, keyboard interaction, real session/ownership behavior, and end-to-end API workflows have not been verified in a browser here.

## Source layout

- `src/App.tsx` and `src/main.tsx` — landing page and common application styles.
- `src/employer.tsx`, `src/candidates.tsx`, `src/admin.tsx` — protected workspace entry points.
- `src/components/ui/` — shared Button, Card, PageHeader, and StatusBadge components.
- `src/components/layout/` — shared employer workspace layout.
- `src/features/auth/` — session refresh and current-user lookup used by protected workspaces.
- `src/features/navigation/` — workspace role checks, active-link matching, and protected layout.
- `src/features/employer/` — company profile, jobs, candidates, and mock data.
- `src/features/admin/` — admin dashboard and moderation pages with mock data.

## Data and integration status

Job Draft create, read, update, Employer job listing, and Skill Catalog search use the API contracts described above. Other Employer, candidate, and admin business screens use local mock data and frontend state; their business actions are not persisted to backend APIs. The protected workspace shell also calls the authentication API endpoints described above. There is no login UI or browser end-to-end coverage yet. The workspace session request verifies identity for presentation; server-side authorization remains mandatory for protected data and actions.
