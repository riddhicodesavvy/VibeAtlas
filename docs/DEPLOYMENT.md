# Deployment preparation

No cloud deployment or paid resources were created. There was no existing deployment configuration in the workspace, so deployment preparation does not imply authorization to publish a new public application.

## Verified local deployment
Build with `npm ci` and `npm run build`. Run `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`. FastAPI serves the built SPA and its assets as well as the API. Deep-link refresh falls back to the SPA except for `/api/` paths. Development uses Vite on 5173 with the API proxy to 8000.

## Free cloud target
Vercel Hobby supports personal non-commercial use and official FastAPI deployment. Use two projects only if a combined Vite/Python setup is not verified: a Vite frontend rooted at this repository, and a FastAPI backend rooted at a sanitized backend deployment directory. Set `VITE_API_BASE_URL` to the backend origin at frontend build time. Set backend `CORS_ORIGINS` to the exact frontend production origin. Do not use wildcard credentialed CORS.

The inference backend needs FastAPI, Pydantic, NumPy, httpx and python-dotenv, plus `backend/`, the small `data/*.json` files and `artifacts/`. Exclude `.env*`, `api.docx`, `.git`, `.venv`, `node_modules`, tests, raw metadata ZIP and all training packages/files. Explicitly configure the framework/entrypoint according to the chosen Vercel project. A cloud deployment must be tested rather than assumed from a local build.

Current official documentation: https://vercel.com/docs/frameworks/backend/fastapi and https://vercel.com/docs/functions/limitations . Standard Python function bundle maximum is currently 500 MB; Hobby Fluid Compute memory is 2 GB and maximum duration 300 seconds. Keep requests short despite that ceiling. No training or audio extraction belongs in a function.

Supabase Free currently includes a 500 MB database, may pause on low activity and has no included automatic backups. Before an assessment, check project availability and restore from an independently verified backup if needed. https://supabase.com/pricing and https://supabase.com/docs/guides/platform/free-project-pausing . Recheck provider quotas immediately before deployment; no free tier guarantees permanent uninterrupted service.

## Required deployment gates
1. Verify personal non-commercial Vercel eligibility and available quotas.
2. Inspect the intended Supabase project schema/RLS and existing records; run no candidate migration blindly.
3. Configure backend secrets in the host secret store, never public `VITE_` variables.
4. Add platform-level request throttling; the included rate limiter covers a single local worker only.
5. Build a minimized artifact; measure startup, bundle size and warm/cold latency.
6. Refresh Jamendo metadata/availability and preserve credits and source links.
7. Verify deployed deep links, CORS, playback, profile inference and model checksums.
8. Retain the previous application/model release for rollback. No database rollback may delete user records.

## Supabase setup
MCP OAuth authenticates an agent tool, not the runtime application. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` locally/server-side. Use `python -m scripts.supabase_preflight` for read-only endpoint checks. RLS and schema need authorized SQL inspection through `supabase/inspect.sql`.

The current project has been inspected and the initial migration applied to an empty public schema. The local runtime uses the configured publishable key and reports a connected Supabase catalogue. Baseline and live counts are recorded in `docs/supabase-baseline.json` and `docs/supabase-verification.json`. Anonymous REST reads return 200 for songs/attribution and 401 for the four private ML tables, as intended. No application table grants public writes. Private inference artifacts remain local files; public access policies are not needed for those database tables.

Supabase reports informational notices for four RLS-enabled tables without policies. This is deliberate deny-by-default behavior for internal ML records, not a reason to grant public access. See [the advisory explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Newly created indexes also produce [unused-index information](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index); retain them until representative usage supports a change.

The historical initial migration filename contains `candidate`; it refuses to run if expected tables already exist and must not be reapplied to this project. Future changes need additive compatibility migrations, with backup/restoration verification before modifying existing data. The current publication used the authenticated MCP connection. The alternative `scripts/publish_supabase.py` requires a local review JSON containing the matching `project_url` and true `schema_inspected`, `backup_verified`, `compatibility_verified`, `rls_verified` flags. That is a checklist, not automated proof. Only an operator who actually completed those checks may provide it. Publication performs no deletion or update to existing rows.
