# Supabase source management

D Route v2 keeps database/auth changes under `supabase/` so GitHub is the source of truth for migrations and Edge Functions.

## Current alpha.5 addition

- `migrations/202607260001_v2_auth_profiles.sql`: additive v2 authentication profile layer.
- `functions/login-with-id/index.ts`: server-side login ID resolver + Supabase password sign-in.
- `config.toml`: marks the login function as callable before a user session exists.

## Database Baseline

Before v2 moves from alpha to production migration work, export the current production schema (tables, indexes, RLS policies, triggers, functions) into the repository as the Database Baseline. Do not invent/recreate existing production definitions from app code alone. The alpha.5 migration is intentionally additive so it can be reviewed independently without rewriting current Route tables.

Recommended workflow:

1. Capture the current Supabase production schema as baseline SQL.
2. Commit the baseline before or alongside the first production v2 database rollout.
3. Apply subsequent changes only through ordered migration files.
4. Keep Edge Function source in this directory and deploy from the repository rather than editing production-only code in the dashboard.
