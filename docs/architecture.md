# CareerMatch AI Architecture

## Design principles

- Start as a modular monolith for the core API to keep a student-sized team productive.
- Isolate AI behind a small FastAPI contract so models/providers can change independently.
- Use PostgreSQL as the source of truth and pgvector for embeddings when semantic matching is introduced.
- Use Redis for caching, queues, rate limits, and Socket.IO coordination.
- Treat AI scores as recommendations with evidence, never final hiring decisions.

## Bounded modules

- Identity: registration, verification, sessions, roles, password recovery.
- Students: student and career profiles, CVs, skills.
- Employers: companies and company verification.
- Jobs: job drafts, required skills, moderation, publication.
- Applications: apply, review, shortlist, interview, accept/reject, history.
- Matching: scores, matched and missing skills, recommendations.
- Notifications: event-driven in-app notifications and realtime delivery.
- Administration: users, companies, jobs, skills, reports, audit logs.

## Request flow

```text
React client -> NestJS API -> PostgreSQL
                         -> Redis / event queue -> Socket.IO
                         -> FastAPI AI service -> LLM / embeddings
```

The NestJS API performs authentication, authorization, validation, persistence, and workflow decisions. The AI service receives only the minimum data required and returns versioned structured output.

## MVP delivery order

1. Infrastructure, database design, authentication, role authorization.
2. Student profile, CV upload metadata, and secure file access.
3. Employer company profile, company verification, job creation, admin approval.
4. CV analysis and skill extraction with mock provider first.
5. Explainable job matching, recommendations, and skill gaps.
6. Applications, shortlist, interviews, and notifications.
7. Security hardening, analytics, tests, deployment, and documentation.

AI interview practice and advanced career roadmaps remain Phase 2 unless the MVP is stable.
