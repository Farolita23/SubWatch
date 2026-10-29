# SubWatch backend

Spring Boot 4 / Java 21 REST API: JWT auth (access 15 min + rotating refresh 7 days), subscriptions CRUD,
spending stats and a daily email reminder job.

## Run (dev, no Docker needed)

```bash
./mvnw spring-boot:run
```

- Profile `dev` is the default: H2 in MySQL mode, Flyway migrations, demo user `demo@subwatch.dev` / `Demo1234!` with 8 subscriptions.
- Swagger UI: http://localhost:8080/swagger-ui (OpenAPI JSON at `/v3/api-docs`, springdoc 3.0.x).
- Health: http://localhost:8080/actuator/health
- Emails go to SMTP `localhost:1025`. Start Mailpit to see them: `docker run -p 8025:8025 -p 1025:1025 axllent/mailpit` (UI at http://localhost:8025). Without it the job logs a failure and retries the next day.
- CORS allows `http://localhost:4200` (override with `CORS_ALLOWED_ORIGINS`, comma separated).

## Run everything with Docker

The full stack (MySQL + backend + frontend + Mailpit) lives in the repo root: see `../docker-compose.yml` and `../.env.example`.

```bash
cd ..
cp .env.example .env   # set JWT_SECRET (min 32 chars)
docker compose up --build
```

## Prod profile (`SPRING_PROFILES_ACTIVE=prod`)

Required env vars: `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `MAIL_HOST`. Optional: `DB_HOST`, `DB_PORT`, `DB_NAME`,
`MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_STARTTLS`, `CORS_ALLOWED_ORIGINS`, `SUBWATCH_DEMO_DATA_ENABLED`.
The app refuses to start if `JWT_SECRET` is missing or shorter than 32 bytes. In `dev` a random secret is generated at each startup when `JWT_SECRET` is unset (tokens do not survive restarts).
Demo data is seeded only when `SUBWATCH_DEMO_DATA_ENABLED=true` (default only in `dev`).

## Rate limiting

`POST /api/auth/login|register|refresh` are limited per client IP and endpoint (in memory, single instance): 10 requests per minute by default,
then `429` problem+json with `Retry-After`. Configure with `subwatch.rate-limit.enabled|max-requests|window`; disabled in tests.
Behind a reverse proxy the IP seen is the proxy's unless forwarded headers are configured.

## Tests

```bash
./mvnw test
```

Unit tests (spending normalization, billing date advance incl. month end and leap years) and MockMvc integration tests
(auth, CRUD, cross-user isolation, reminder idempotency) run on H2 in MySQL mode so Docker is not required.
Note: PRODUCT.md asks for Testcontainers with MySQL; that is deferred to a later phase.

## Technical decisions

- Stateless JWT (HS256, Nimbus via Spring Security resource server). Refresh tokens are opaque, stored as SHA-256 hashes,
  rotated on every use; reusing a revoked one revokes all of that user's tokens.
- Flyway migrations in `src/main/resources/db/migration`; Hibernate only validates the schema.
- Money is `DECIMAL(10,2)` / `BigDecimal`. Monthly cost is normalized in the backend (weekly x52/12, quarterly /3, yearly /12);
  rounding happens once per category, the global total is the sum of category totals, yearly = monthly x 12.
- `subscription.billing_anchor_day` remembers the chosen day of month so a charge on the 31st returns to the 31st after February.
- Reminder job: `@Scheduled` 08:00 Europe/Madrid. It first rolls overdue active dates forward, then emails active
  subscriptions billing within the next 3 days. A `reminder` row (UNIQUE subscription + billing date) is claimed before
  sending, so reruns never duplicate; FAILED rows are retried on later runs. Email sending is behind the `EmailService` interface (`SmtpEmailService`).
- Errors are RFC 7807 `application/problem+json`; validation errors include an `errors` map by field.

## Endpoints

`POST /api/auth/{register,login,refresh,logout}` (logout is public and idempotent, body `{refreshToken}`, always 204), `GET /api/users/me`,
`GET|POST /api/subscriptions`, `GET|PUT|DELETE /api/subscriptions/{id}`, `PATCH /api/subscriptions/{id}/status`,
`GET /api/subscriptions/upcoming?days=30`, `GET /api/stats/summary`, `GET /api/stats/by-category`, `GET /actuator/health`.
