# Registration API — CM-040

`POST /api/v1/auth/register` is implemented for STUDENT and EMPLOYER. New accounts
stay PENDING_VERIFICATION and receive no token or cookie. After registration call
resend-verification explicitly; see [email verification/recovery](account-recovery.md)
and [login/sessions](sessions.md) for the complete backend integration flow.

Request and public User response follow the registration section of
[the integration contract](api-contracts.md). Swagger `/docs` describes this route.
Email is trimmed/lowercased, fullName is trimmed, passwords are preserved exactly.
Passwords accept 12–128 characters; fullName accepts 1–120; email is at most 254.
Unknown fields, ADMIN, invalid/missing types and out-of-range lengths return 400.

Persistence uses Prisma 7's PostgreSQL adapter and a nested User/profile create,
which is a single database transaction. A profile insert failure rolls back the
User. The normalized email unique constraint, not a pre-check, arbitrates racing
registrations; a P2002 conflict returns 409 EMAIL_ALREADY_EXISTS. Existing rows
that did not follow the normalization rule still need the audit noted in CM-037.

Only id, email, role, status, and emailVerified are returned. Errors have stable
codes, a server-generated requestId and no password, database detail, stack trace,
or hash. Validation details are currently an empty array; field-level detail is
future work. Responses use Cache-Control: no-store. Malformed JSON/body-size
errors raised before controller routing still use Nest's default error format.

Passwords use Node's asynchronous scrypt with N=131072, r=8, p=1, a random 16-byte
salt, a 64-byte derived key, and a version-identifying parameterized encoding.
The verification helper accepts only the supported parameter set and uses a
timing-safe key comparison. Password policy/cost changes need review and later
rehash handling; token digests must not reuse password-hashing logic.

The local registration guard permits 10 attempts per socket address per minute;
it ignores untrusted X-Forwarded-For. At most two scrypt jobs are active per process;
additional work returns 429 with Retry-After. The in-memory address map is bounded.
Limits reset on restart and are not shared across replicas. Through the current
Nginx proxy clients share its socket address, so the same quota is shared. A trusted
proxy policy and distributed limiter remain prerequisites for public deployment.

The database client initializes lazily so a liveness probe needs no database
connection. Registration needs a valid DATABASE_URL and a migrated database. Pool
connection timeout is five seconds; unexpected database errors return a safe 500.
No database schema or existing migration is modified by this feature.

## Verification

- Unit test: real hashing, unique salts, exact-password verification, wrong passwords,
  malformed encodings and disallowed hash parameters.
- HTTP tests: both roles, normalization, no private output, invalid input/privilege
  escalation, unique conflicts, safe database failure, bounded hashing with failure
  recovery, and socket-based rate limiting.
- Docker integration: actual PostgreSQL rows and hash verification for both profile
  types, concurrent duplicate email, and forced profile insert failure proving rollback.
  It creates randomized test records and a sentinel-only trigger, then cleans them up.
  Run only on a disposable stack with:

```bash
docker compose exec -T -e REGISTRATION_TEST_DISPOSABLE=1 api node test/registration.database.mjs
```

CI generates Prisma Client before typecheck/test/build. Generated code and `.env`
are not committed or copied from the host into Docker images. Existing AI/Docker
smoke checks remain enabled.

References: [Node crypto/scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)
and [Prisma exception handling](https://www.prisma.io/docs/orm/v7/prisma-client/debugging-and-troubleshooting/handling-exceptions-and-errors).
