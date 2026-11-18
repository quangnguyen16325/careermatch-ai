# Email verification and password recovery — CM-043

Four POST routes are implemented under `/api/v1/auth`. Swagger `/docs` contains
their DTOs. No route returns an email token, creates a login session, or accepts
client-supplied account status/user IDs.

## Frontend integration

1. Register through `/register`; the account stays PENDING_VERIFICATION. Then call
   `/resend-verification` with `{ "email": "student@example.com" }`. Registration
   does not automatically send an email; this explicit request is also the resend flow.
2. The email link targets `/verify-email#token=...`. Read the token from the URL
   fragment, remove it using `history.replaceState`, and POST `{ "token": "..." }`
   to `/verify-email`. Success is bodyless 204; direct the user to sign in.
3. For forgotten passwords, POST the email to `/forgot-password`. The link targets
   `/reset-password#token=...`. Remove its fragment and POST
   `{ "token": "...", "newPassword": "replacement-password" }` to `/reset-password`.
   Success is 204; clear the frontend's access-token state and require a fresh login.

The frontend verification/reset pages are separate tasks and are not implemented
by this backend slice. Before those pages are ready, use Swagger to submit the
token copied from Mailpit. Do not put secrets in query strings, analytics, logs,
localStorage, or third-party page resources.

Valid email requests return 202 with only the documented generic message, including
for unknown, active/already-verified, pending or suspended accounts. They acknowledge
work acceptance, not mail delivery. Invalid DTOs return 400 VALIDATION_ERROR;
invalid/expired/used tokens return 400 INVALID_VERIFICATION_TOKEN or
INVALID_RESET_TOKEN. Malformed token syntax returns VALIDATION_ERROR. Passwords
must be 12–128 characters and are not trimmed. Suspended accounts cannot be
reactivated by verification or reset. Reset requires an ACTIVE, verified account.

## Local Docker test

```bash
docker compose up -d --build --wait --wait-timeout 180
```

Open Mailpit at `http://localhost:8025` to view locally captured email. No email
leaves the default local SMTP sink. Its UI and SMTP ports bind to localhost only;
messages are ephemeral and disappear when the container is recreated. Change
MAILPIT_PORT or SMTP_LOCAL_PORT if those host ports are already occupied.
The API container connects to `mailpit:1025`, independent of the host SMTP port.
For host development start Mailpit too (`docker compose up -d postgres redis mailpit`)
and use SMTP_HOST=localhost with SMTP_PORT equal to SMTP_LOCAL_PORT.

## Configuration

- AUTH_VERIFY_TTL defaults to 24h (maximum 48h); AUTH_RESET_TTL defaults to 30m
  (maximum 1h). Positive s/m/h/d values are validated before issuing tokens.
- AUTH_PUBLIC_WEB_URL is a trusted origin with no credentials/path/query/fragment.
  SMTP mode requires HTTPS. It never comes from the request Host header.
- MAIL_MODE=local permits plaintext only to mailpit/localhost/127.0.0.1; HTTP links
  are permitted only for localhost/127.0.0.1 in this explicit local mode.
- For a real SMTP provider, set MAIL_MODE=smtp, SMTP_DOCKER_HOST (SMTP_HOST for
  host development), SMTP_PORT, SMTP_FROM, SMTP_USER and SMTP_PASSWORD. Port 465
  uses implicit TLS; other ports require STARTTLS. Certificate validation stays on.
  SMTP connection/greeting/socket timeouts are bounded, with no transport debugging.
- Compose defaults are a development setup. External mail credentials, sender DNS
  and delivery to an actual mailbox have not been configured or validated here.

## Storage and concurrency

The additive AccountToken migration stores a purpose-bound SHA-256 digest of a
cryptographically random 32-byte token, never the raw token. Each token is bound
to the account's email at issuance and fails if the email has changed. User locking serializes
issuance/consumption. A shared database cooldown permits at most one issuance per
account/purpose/minute, and issuing a replacement invalidates older tokens.
Expiry, consumption and account eligibility are rechecked after acquiring the lock.
Exactly one concurrent token consumer can succeed; token consumption and account
activation/password change commit together. Reset invalidates all remaining reset
tokens and revokes all sessions in the same transaction, using the same User lock
as login. Live-session checks immediately reject old access/refresh credentials.

Public email requests return before account lookup or SMTP, so email delivery time
does not determine HTTP response time. Each process allows two background email
jobs and two reset password hashes; a separate bounded socket quota allows ten
recovery requests per minute. Capacity exhaustion returns 429 independently of
the requested account. These are local limits, not a distributed abuse defense.

Email jobs are bounded, in-process, best-effort work; process exit can lose pending
work. SMTP failure logs only a generic message, with no
email/token/provider exception. Users can retry after the cooldown. There is no
durable outbox/retry worker or delivery guarantee in this slice. Before public
rollout add durable delivery, monitoring, distributed/trusted-proxy rate limits
and token-retention cleanup; 202 must never be shown as confirmed delivery.

## Evidence

HTTP tests cover DTO validation, generic acknowledgment, no token/session output,
password preservation, safe errors and rate limits. Mail unit tests cover trusted
URLs and required TLS; asynchronous job tests cover bounded capacity/error redaction.
The integration test uses real PostgreSQL and Mailpit SMTP to verify links/digests,
cooldown, replacement/purpose/expiry/replay, concurrent consumption, activation,
password replacement and revocation of multiple live sessions. Run on a disposable
stack only; randomized records and captured fixture emails are removed afterward:

```bash
docker compose exec -T -e RECOVERY_TEST_DISPOSABLE=1 api node test/recovery.database.mjs
```

Implementation references: [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html),
[Nodemailer SMTP](https://nodemailer.com/smtp), and
[Mailpit Docker setup](https://mailpit.axllent.org/docs/install/docker/).
