# D Route v2.0.0-alpha.5 — Auth connection

alpha.5 connects the approved v2 account flow to Supabase Auth while preserving existing auth.users identities and Route ownership.

## What changes

- Existing signed-in users with no v2 login ID are sent to `/account/setup` once.
- Existing users keep the same Supabase user ID, Route ownership, Admin/member relationships, and verified email.
- New users start from `/start`, verify email with Supabase OTP, then set login ID / display name / password.
- Normal sign-in uses login ID + password through the `login-with-id` Edge Function.
- Recovery starts from the verified email address and reveals the login ID only after the recovery link establishes an authenticated session.
- Supabase session persistence remains enabled, so normal PWA launches skip credential entry while the refresh session is valid.

## Deployment order (important)

1. Apply `supabase/migrations/202607260001_v2_auth_profiles.sql` to the existing Supabase project.
2. Deploy `supabase/functions/login-with-id/index.ts` as a public login function. The included `supabase/config.toml` sets `verify_jwt = false` for this function because login begins before a user session exists.
3. Confirm the Edge Function has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` available as server-side environment variables/secrets. Never expose the service-role key in Vite/client environment variables.
4. In Supabase Auth URL configuration, allow the GitHub Pages base URL used by D Route. Registration/recovery return to the base URL with `?flow=setup` or `?flow=recovery`, avoiding a direct GitHub Pages deep-link dependency.
5. Deploy the web app.
6. While already signed in with the legacy account, open D Route. It should automatically show the v2 account setup screen once.

## Rollout safety

Do not deploy the alpha.5 web app before the migration and Edge Function are ready. The app intentionally requires `user_profiles` to decide whether an authenticated user has completed v2 migration.

No existing auth.users rows are recreated or deleted by this migration.
