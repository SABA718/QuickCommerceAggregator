# Security configuration

Keep all values in `.env.example` out of browser bundles and source control. Generate Redis, session and internal-service secrets independently with `openssl rand -hex 32`. Production requires HTTPS and a server-only Supabase `sb_secret_` key or legacy `service_role` JWT; Supabase verifies that credential on every database request. Rotating `SESSION_SECRET` invalidates sessions and outstanding OTPs.

Production sessions use the `__Host-dd_session` cookie with Secure, HttpOnly, SameSite=Lax and Path=/, without Domain. Development uses `dd_session` over local HTTP. OTPs are HMAC hashed and expire in Redis; attempts and single use are enforced atomically. Login rotates the current session; logout revokes it. Redis must remain private and persistent; authentication and rate limits fail closed on dependency failure. Use `rediss://` with TLS for Redis outside the private container network.

The Compose topology is Caddy → nginx → API. `TRUST_PROXY=2` is valid only with that private, fixed chain. Run the API with `TRUST_PROXY=0` when exposed directly. Never expose backend/Redis/AI container ports or add an untrusted path around those proxies. Caddy must overwrite client forwarding headers. Browser writes require the exact configured FRONTEND_URL origin and JSON. Search also rejects cross-origin browser requests because authenticated cache misses invoke paid services.

Apply SQL migrations in order using a database administrator, after backing up and inspecting legacy data:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/001_initial.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/002_security_constraints.sql
```

Migration 002 also validates pre-existing rows for missing or blank keys, invalid prices (including PostgreSQL NaN), and excessive field lengths. A failure rolls back; repair the reported legacy data explicitly before retrying. Both catalog tables enable RLS and revoke browser roles' grants; only the server uses service-role access. `verify.sql` is for a disposable test database, not production.

Provider credentials are optional only while their features are disabled: Textbee for SMS, Apify for live prices, Groq for recipes, Gemini for language/list parsing. Missing provider credentials produce service-unavailable errors. SUPABASE_URL, SUPABASE_KEY, REDIS_URL, SESSION_SECRET and FRONTEND_URL are required by the API; the AI service additionally requires AI_SERVICE_TOKEN. Configure the same AI token on both services. Live account verification remains a launch prerequisite.
