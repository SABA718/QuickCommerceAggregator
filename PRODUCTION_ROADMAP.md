# DealDock production roadmap

Audit date: 9 November 2026. Scope: all tracked source, configuration, dependency manifests, and generated crawler state. The initial scan found 157 matches for debugging, mocks, placeholders, credentials, handlers, and local addresses; findings below consolidate related occurrences.

Product inferred from the code: compare grocery offers across quick commerce providers and turn recipes or shopping lists into a comparison basket. Existing stack: React 19/Vite, Express 5, Supabase PostgreSQL, Redis, FastAPI, Apify, Groq, Gemini, and Textbee. Deployment assumption: Docker on a VPS with external Supabase and HTTPS termination. No production secrets or service accounts are configured in this workspace.

Status meanings: **Done** = implemented and checked; **In progress** = implementation/checks underway; **Launch prerequisite** = requires real infrastructure, credentials, or a provider contract. These prerequisites are not claimed as verified.

## Milestone 1 — audit and gap analysis

- **Done** — Inventory all source files, dependency manifests, API routes, UI interactions, and infrastructure files before edits; record findings here.
- **Done** — Identify Linux build failure: `App.jsx` imports `AiPage` but source filename is `Aipage.jsx`.
- **Done** — Identify inconsistent database sources: runtime uses `top_products`/`canonical_products` in Supabase while unused Prisma schema describes unrelated tables and Compose starts an unused local PostgreSQL.
- **Done** — Identify missing environment examples, migration history, root runbook, deployment images, CI, Python dependency manifests, backend scripts, and automated tests.

## Milestone 2 — core functionality

- **Done** — Remove AI interface mock totals, products, ratings, quantity options, and successful-looking fallback data on provider failure.
- **Done** — Share one configured API client; replace hardcoded localhost URLs and dead SuperTokens scaffolding.
- **Done** — Repair cart's missing `fetchLiveProduct` import; unify real search/cart/recipe offer lookup and persistence.
- **Done** — Enforce offer freshness consistently; prevent repeat paid scrapes for empty results; bound polling, scraper concurrency, provider requests, and failure retries.
- **Done** — Validate all public API bodies/query parameters and external provider responses; centralize safe API errors.
- **Done** — Use actual Supabase canonical products for normalization instead of ten mocked product names; connect internal AI service using configurable URL and authenticated calls.
- **Done** — Make grocery list parsing reachable from the UI; retain genuine recipe and merchant link functionality.
- **Done** — Resolve disconnected navigation, location selector, cart badge, and login state; add loading, empty, error, and retry states.
- **Launch prerequisite** — Validate Apify actor schema, coverage, product links, stock flags, and geographic scope with a real account. Existing integration provides no verified location input; do not advertise postcode-specific prices.
- **Launch prerequisite** — Merchant checkout is an outbound link. Vendor cart transfer, payments, ordering, and exact serving quantities have no provider integration in the source and are not represented as implemented.

## Milestone 3 — security and data

- **Done** — Replace random unpersisted login token with expiring, server-side Redis sessions and HttpOnly cookies; restore login and revoke logout.
- **Done** — Store hashed OTPs in Redis with expiry, resend cooldown, bounded attempts, atomic single use, and SMS delivery timeout; do not expose provider responses or phone numbers in logs.
- **Done** — Enforce server authentication for paid AI, cart actions, and cache-miss scraping; add distributed rate limiting for authentication, public search, and expensive writes.
- **Done** — Validate startup configuration, trusted origins, request sizes, CORS, security headers, proxy trust, and CSRF protection.
- **Done** — Remove hardcoded database password, generated crawler state, misleading unused schema, and destructive automatic seed behavior.
- **Done** — Add versioned SQL for runtime tables, positive prices, unique offer identities, search/freshness indexes, and RLS denying browser access.
- **Launch prerequisite** — Supply Supabase service-role credentials, Redis URL/password, session secret, frontend origin, and matching internal AI token via deployment secret settings. Configure Textbee for login; configure Apify, Groq, and Gemini for their respective features.
- **Launch prerequisite** — Back up and inspect any pre-existing Supabase tables before applying migrations; no remote database is available for inspecting historical data.

## Milestone 4 — observability and UX

- **Done** — Database/Redis readiness and application uptime endpoint; internal AI health check.
- **Done** — Structured redacted logs, request IDs, safe provider errors, bounded network deadlines, and graceful shutdown.
- **Done** — Prevent duplicate form submission; show actionable validation/API errors and mobile layouts without fabricated results.
- **Done** — SEO/OpenGraph metadata, custom not-found page and error boundary/server error page.

- **Done** — Generate an absolute OpenGraph image URL from the configured public domain at build time.
- **Launch prerequisite** — Verify social previews against the actual public domain after deployment.

## Milestone 5 — quality gates

- **Done** — Backend authentication, OTP replay/lockout, session revocation, unauthorized actions, request validation, search persistence, cart and dependency-failure tests.
- **Done** — Frontend API/auth, polling, error handling and genuine offer calculation tests; desktop/mobile browser smoke checks.
- **Done** — AI service validation, internal auth, catalog and provider failure tests.
- **Done** — Working lint, static type checking, tests and production build commands for all services; repeat after fixes.
- **Done** — Verify migration SQL and Redis atomic operations against real disposable services.
- **Launch prerequisite** — Perform live Textbee OTP, paid Apify search, Groq recipe, Gemini parsing, and Supabase integration smoke tests after credentials are configured. Test doubles verify contracts but do not establish provider readiness.

- **In progress** — Finish strict TypeScript migration. Remaining backend runtime files: `backend/server.js`, `backend/seedDatabase.js`, and all 13 `backend/src/*.js` modules (`app`, `auth`, `catalog`, `config`, `database`, `errors`, `integrations`, `logger`, `rateLimit`, `recipe`, `redis`, `scraperEngine`, `validation`). Remaining frontend runtime files: `mvp/src/App.jsx`, `components/{HeroSearchSection,Navbar,SearchResultsSection}.jsx`, and `pages/{Aipage,HomePage,LoginPage,OtpPage}.jsx`. Legacy JS remains under checkJs; fully migrated TypeScript files use strict checking. Test files and Vite configuration are outside this runtime inventory.

## Milestone 6 — deployment

- **Done** — Multistage runtime images, non-root service users, Docker ignore rules, private service network, persistent Redis, health checks, resource limits and same-origin frontend gateway.
- **Done** — Configure GitHub Actions lint/typecheck/test/build gates on push/PR, including database and Redis integration and image build checks.
- **Launch prerequisite** — Verify the GitHub Actions workflow on an authenticated push or pull request; the configured GitHub token is invalid.
- **Done** — Complete environment example and production runbook covering migrations, TLS, deploy, verification, backup, restore and rollback.
- **Launch prerequisite** — Provision a Hetzner Cloud VPS in Singapore, a real domain/DNS, TLS, Supabase and provider accounts, budgets, alerts, backup retention and deployment access. This workspace has no hosting credentials or Supabase secrets and its GitHub token is invalid; a public URL cannot yet be issued.

## Verification log

### Roadmap sync and strict TypeScript migration

- Migrated frontend `main`, `CategoryGrid`, `ErrorBoundary`, `LocationModal` and `LocationTrigger` to TypeScript with explicit props and DOM types. The strict TypeScript configuration now includes all application TypeScript files. The remaining runtime files are inventoried above; the migration is not complete and permissive checkJs is still required for them.
- Ran lint, typecheck and tests once per service: backend 25 tests including disposable Redis, frontend 15 tests, AI 31 tests; all passed. No Docker build was run. External production deployment, live providers, actual GitHub Actions execution, and social-preview verification still require infrastructure and credentials.


### Milestone 6 — release configuration complete; public launch blocked by missing infrastructure access

- Chosen hosting: Hetzner Cloud Docker VPS in Singapore, with external Supabase PostgreSQL, private Redis and AI/API containers, nginx frontend and Caddy TLS edge. Added root README Production Deployment Runbook, Docker images, Compose, complete `.env.example`, Caddy/nginx routing and CI validation.
- Verified Compose configuration with disposable values, Caddyfile syntax, three multi-stage image builds, and backend/AI startup failures with clear missing-variable logs. API/frontend/AI lint, static checks and 70 automated tests passed; one real Redis test was skipped in this release check and passed in Milestone 5. Frontend build emitted no warnings after fixing site metadata.
- Container smoke test exposed an nginx config permission error under its unprivileged user. Fixed the image file mode and rebuilt. Subsequent local frontend gateway requests returned 200 for `/`, `/health` and `/social-card.png`; `/health` used a disposable backend stub. nginx access/error logs showed startup and requests without a fatal error.
- Public deployment and a shareable URL remain blocked: no VPS/domain or configured Supabase/provider credentials are attached, and `gh auth status` reports an invalid GitHub token. This is an infrastructure prerequisite, not an unrun local code check. No remote environment was modified.


### Milestone 5 — quality gates

- Fixed the shopping-list flow to reopen sign-in if a session expires. Added frontend interaction coverage for authorization, double submission, partial baskets, provider errors and polling, plus backend coverage for the internal AI list contract and malformed responses.
- Added strict TypeScript checking for all current .ts/.tsx application files. Legacy JavaScript/JSX still uses permissive checkJs; full strict migration remains open.
- Frontend: 15 tests, lint, typecheck and production build passed. Backend: 25 tests, lint, typecheck and build passed, with Redis atomicity tested against a disposable Redis server. AI: 31 tests, Ruff, strict mypy and compilation passed. Total: 71 tests.
- Both migrations were applied twice and verified against disposable PostgreSQL 17 for RLS, constraints and upserts. Prior desktop/mobile browser smoke tests used mocked authentication; live-provider checks still require credentials.


### Milestone 4 — completed

- API and AI readiness checks now bound dependency waits to three seconds; stalled API database test returns 503 with dependency status. Structured logs, redaction and request IDs remain in place.
- Added a static nginx 500 page and accessible list-form error association; reviewed existing responsive layouts, forms, metadata, error boundary and not-found route.
- Frontend and backend lint, typecheck, build and tests passed; Python Ruff, strict mypy, compilation and 31 tests passed. Backend has 23 passing tests and one real-Redis test skipped this run (it passed in Milestone 3). Frontend has 11 passing tests.
- Chromium smoke tested list navigation and sign-in dialog at 375px and 1280px with mocked auth, with no horizontal overflow. Live providers, social previews and container deployment remain unverified.


### Milestone 3 — completed

- Verified Redis-backed expiring sessions, hashed OTPs, replay rejection, attempt lockout, session rotation/logout, server-side protected actions, distributed rate limits, request-size limits, CORS and security headers.
- Production cookies now use the Secure/HttpOnly `__Host-dd_session` name with no Domain. Added tests for rotation/revocation, cross-site and sibling-site search rejection, forwarded-IP spoofing, and Redis failure.
- Fixed Compose's two-proxy startup mismatch; validate production server-only Supabase credentials, HTTPS database origins, credential-free service URLs and independent internal/session secrets. Configuration rejects invalid URLs without leaking values.
- Added migration 002 to enforce valid offer keys and finite positive prices on pre-existing tables. Both migrations applied twice successfully on disposable PostgreSQL 17; constraints, upserts and RLS isolation passed. CI applies both in order.
- Added SECURITY.md with secret generation, rotation, proxy trust, feature credentials and migration instructions. Production credentials and legacy production-data inspection remain explicit launch prerequisites.
- Backend lint/typecheck/build and 23 tests passed, including real Redis atomicity checks. AI Ruff/strict mypy/compilation and 31 tests passed. Frontend lint/typecheck/build and 11 tests passed after removing delayed OTP autofocus that could interrupt code entry. Total: 65 passing tests.

### Milestone 2 — previous verification

Previous scope: the user's follow-up requested a single milestone but left its name as a template placeholder. Milestone 2 was selected and completed; existing security/deployment edits were retained. Milestone 6 and strict migration of legacy JavaScript remain open. Docker images, browser behavior, a production deployment runbook, and live providers are not claimed verified.

- Backend: lint, checkJs typecheck, 18 tests (including real Redis atomic OTP consumption/session/rate limiting), and build passed. Initial lint warnings and four type errors were fixed before repeating the failed checks.
- Frontend: lint, checkJs/TypeScript checking, 11 tests, and Vite production build passed. Includes API and offer-model tests plus login/OTP interaction tests. The shopping-list page is compiled and typechecked; browser smoke verification remains pending.
- AI service: Ruff, strict mypy, 31 tests, and Python bytecode compilation passed.
- Database: migration applied twice on disposable PostgreSQL 17; unique identities, positive prices, upserts, and RLS isolation passed.
- Runtime JavaScript uses checkJs with permissive implicit-any settings inherited from the scaffold modernization; whole-repository strict TypeScript migration remains open under Milestone 5. New shopping-list and API interfaces are explicitly typed.
- External Supabase/Textbee/Apify/Groq/Gemini verification requires real accounts and credentials. Tests use provider doubles except for the disposable PostgreSQL/Redis checks.


Initial baseline: no backend test suite (script exits 1), no typecheck scripts, no Python manifest/tests, and frontend has case-sensitive import failure. Milestone checks and final results will be recorded here as completed.
