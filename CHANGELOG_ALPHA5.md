# v2.0.0-alpha.5

- Added `user_profiles` v2 identity profile layer with RLS.
- Backfills existing Supabase Auth users as `legacy` without changing their user IDs.
- Added one-time existing-user v2 credential setup.
- Added new-user email verification → account setup flow.
- Added login ID + password sign-in via server-side Edge Function lookup.
- Added email-based ID/password recovery flow.
- Keeps Supabase session persistence for low-friction repeat PWA launches.
- Added migration and Edge Function source under `supabase/` for repository-managed database/auth changes.
