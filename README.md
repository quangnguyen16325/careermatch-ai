# CareerMatch AI

CareerMatch AI is an AI-assisted career and recruitment platform for students, employers, and administrators. The system analyses career profiles and job requirements, explains match scores and skill gaps, and leaves every hiring decision to people.

This repository is the shared starter codebase derived from the project charter. It focuses first on the mandatory MVP:

`Authentication -> Student profile -> CV upload -> AI analysis -> Skill extraction -> Job posting -> Admin approval -> Matching -> Recommendation -> Application -> Shortlist -> Interview -> Notification`

## Architecture

```text
apps/web          React + TypeScript + Tailwind CSS
apps/api          NestJS REST API + Prisma
services/ai       FastAPI AI boundary
PostgreSQL        Primary data store with pgvector
Redis             Cache, queues, and realtime coordination
```

The API is the system of record. The AI service returns structured analysis and recommendations; it must never accept or reject an applicant automatically.

## Prerequisites

- Node.js 24 LTS
- pnpm 11+
- Python 3.12+
- Docker with Docker Compose

## First run

To run the complete local stack with Docker only, see [Docker setup](docs/docker.md):

```bash
cp .env.example .env
docker compose up -d --build --wait --wait-timeout 180
```

Frontend is available at http://localhost:5173. PostgreSQL, Redis, migration, API,
and mock AI start in dependency order. The migration container exits successfully;
the other services remain running. The host-development workflow below is an
alternative when you need hot reload.

```bash
cp .env.example .env
pnpm install
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Run the AI service in a second terminal:

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8001
```

Local endpoints:

- Web: http://localhost:5173
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/docs
- AI service: http://localhost:8001/docs

## Commands

```bash
pnpm dev              # run web and API together
pnpm build            # build all Node workspaces
pnpm lint             # lint all Node workspaces
pnpm test             # run Node and Python tests
pnpm typecheck        # TypeScript checks
pnpm infra:up         # start PostgreSQL and Redis
pnpm infra:down       # stop local infrastructure
pnpm db:validate      # validate Prisma schema
```

## Repository conventions

- Branch from `develop` using `feat/<ticket>-short-name`, `fix/<ticket>-short-name`, or `docs/<ticket>-short-name`.
- Never commit `.env`, CV files, secrets, generated output, or local databases.
- Keep controllers thin; business rules belong in services/use cases.
- Validate all external input and return structured errors.
- Protect CVs and applicant data with role and ownership checks.
- Add tests and documentation as part of the feature Definition of Done.

See [docs/architecture.md](docs/architecture.md), [docs/development.md](docs/development.md), and [CONTRIBUTING.md](CONTRIBUTING.md) before implementing a module.

## Project documentation and task traceability

For parallel frontend/backend development, start with the
[API integration contract](docs/api-contracts.md). Proposed endpoints are explicitly
marked and must not be confused with the routes currently exposed in Swagger.

Read [the project baseline](docs/project-baseline.md) before starting a documentation
task. It links the team's existing Charter, WBS, reports, and risk register so that
completed analysis is reviewed and reused. The [WBS-to-Issue mapping](docs/wbs-issue-map.json)
covers all 28 source work packages and 112 tracked Issues. See the
[evidence reconciliation log](docs/evidence-reconciliation.md) for report claims
that still require verification against actual project records.
