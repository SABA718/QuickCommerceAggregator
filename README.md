# DealDock

DealDock compares grocery offers from quick commerce providers and turns a dish or pasted shopping list into an offer basket. React/Vite serves the UI; Express handles sessions, catalog, carts and provider calls; FastAPI handles catalog normalization and language parsing. Supabase PostgreSQL stores products; Redis stores short-lived sessions, OTPs and job locks.

## Development

Use Node 24 and Python 3.12. Install dependencies with `npm ci` in `backend/` and `mvp/`, and `python -m pip install -r ai-service/requirements-dev.txt` in a virtual environment. Copy `.env.example` to an ignored `.env` and provide local service values. The UI uses the Vite proxy for `/api`.

Quality gates:

```sh
(cd backend && npm run lint && npm run typecheck && npm test && npm run build)
(cd mvp && npm run lint && npm run typecheck && npm test && npm run build)
(cd ai-service && python -m ruff check . && python -m mypy main.py && python -m pytest && python -m compileall -q main.py)
```

## Production Deployment Runbook

**Hosting choice:** a Docker capable VPS in Singapore, with Hetzner Cloud as the default provider. The Compose stack needs one host, Docker Engine with the Compose plugin, a domain, and outbound HTTPS. Keep the host in the same region as the chosen Supabase project where possible. Caddy terminates TLS and routes to the frontend; Express, FastAPI and Redis stay on private Docker networks. Only ports 80/443 are published.

1. Provision a VPS with at least 2 vCPU, 4 GiB RAM, 30 GiB storage and Docker Engine/Compose. Point the domain's A/AAAA records to it. Allow inbound 80/443; restrict SSH to administrators. Configure automated VPS snapshots and alerting for uptime, disk and memory. This repository does not include hosting credentials.
2. Create a Supabase project. Inspect and back up any existing data. Apply migrations in order with an administrator database URL, using the Supabase SQL editor or:

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/001_initial.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/002_security_constraints.sql
   ```

   The second migration rejects invalid legacy rows and rolls back safely. Resolve such rows deliberately, then rerun. `backend/migrations/verify.sql` exercises constraints on a disposable database only. Record the migration files applied with each release.
3. Copy `.env.example` to `.env` on the VPS. Set `APP_DOMAIN`, `TLS_EMAIL`, `FRONTEND_URL=https://APP_DOMAIN`, `SUPABASE_URL`, a **server-only** `SUPABASE_KEY`, and `DATABASE_URL` for operator migrations. Generate independent 32-byte random `REDIS_PASSWORD`, `SESSION_SECRET` and `AI_SERVICE_TOKEN` using `openssl rand -hex 32`; keep `.env` mode 0600 and use a host secret manager for backups. Compose supplies `REDIS_URL`, `TRUST_PROXY=2` and `AI_SERVICE_URL` internally. `TEXTBEE_DEVICE_ID` and `TEXTBEE_API_KEY` enable OTP login; `APIFY_TOKEN` and `APIFY_ACTOR_ID` enable live prices; `GROQ_API_KEY` enables recipes; `GEMINI_API_KEY` enables translation and list parsing. `GROQ_MODEL` and `GEMINI_MODEL` select those services' models. Optional TTLs, log level, AI timeout and port settings are documented in `.env.example`. A missing optional provider returns a clear unavailable response.
4. On the VPS, clone the repository at the release revision. Verify `docker compose --env-file .env config -q`, then build and launch:

   ```sh
   docker compose --env-file .env build
   docker compose --env-file .env up -d
   docker compose --env-file .env ps
   docker compose --env-file .env logs --since=10m --tail=150 edge web backend ai redis
   ```

   The frontend build embeds `FRONTEND_URL` into the social preview URL. Rebuild the web image when the public domain changes. Caddy provisions the public certificate after DNS resolves and ports 80/443 are reachable.
5. Verify `https://APP_DOMAIN/`, `/health`, `/api/health`, `/list`, `/ai`, an unknown route, and the social-card image. `/health` must show database and Redis as `ok`; otherwise read the backend/AI/Redis logs. In a browser, request and verify an OTP, sign out, search a product, parse a list, generate a recipe, and confirm merchant links before promoting the site. Confirm prices and geographic coverage against the chosen Apify actor's real output. These live checks consume provider quota and require working credentials.
6. Set up external availability monitoring against `/health` and alert on 5xx responses. Review structured container logs by request ID; redact secrets before exporting them. Rotate credentials periodically. Rotating `SESSION_SECRET` logs out users and invalidates pending OTPs. Back up Supabase using its provider backup/export and the VPS Redis volume; test restores on a disposable project.

For rollback, redeploy the previous image tag or revision with `IMAGE_TAG` and `docker compose up -d`. Do not automatically reverse SQL migrations; restore a verified database backup when schema rollback is required. The GitHub workflow validates lint, type checks, tests, migration repeatability and image builds on every push and pull request. It does not publish images or deploy without a configured registry and host credentials.

See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for known launch prerequisites and [SECURITY.md](SECURITY.md) for session, proxy and secret handling.
