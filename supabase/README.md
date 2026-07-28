# Supabase source management

D Route v2 keeps database/auth changes under `supabase/` so GitHub is the source of truth for migrations and Edge Functions.

## Current authentication additions

- `migrations/202607260001_v2_auth_profiles.sql`: additive v2 authentication profile layer.
- `functions/login-with-id/index.ts`: server-side login ID resolver + Supabase password sign-in.
- `config.toml`: marks the login function as callable before a user session exists.
- `migrations/202607260002_v2_profile_nickname.sql`: adds the authenticated nickname update RPC used by alpha.8 account settings.

## Database Baseline

Before v2 moves from alpha to production migration work, export the current production schema (tables, indexes, RLS policies, triggers, functions) into the repository as the Database Baseline. Do not invent/recreate existing production definitions from app code alone. The alpha.5 migration is intentionally additive so it can be reviewed independently without rewriting current Route tables.

Recommended workflow:

1. Capture the current Supabase production schema as baseline SQL.
2. Commit the baseline before or alongside the first production v2 database rollout.
3. Apply subsequent changes only through ordered migration files.
4. Keep Edge Function source in this directory and deploy from the repository rather than editing production-only code in the dashboard.

## Planning Core baseline

- `migrations/202607280001_planning_core_foundation.sql`: p14で2026-07-28にD Route SQL Runnerから適用済みのPlanning Core Foundation。
- `public.phases` / `public.destinations`、index、RLS、Destination→Phase Route整合性Trigger、Planning `updated_at` / `version` Triggerを定義。
- 後続スナップショットから欠落していたため、v2.1.0-p21で元のp14更新Artifactから復元。
- 現在のSupabase Projectではp21のために再実行しない。ライブDBにはすでに適用済み。新規環境ではmigration順に適用する。


## v2.1.0-p22.1 Default Phase model

Migration: `migrations/202607280002_default_phase_model.sql`

- `phases.is_default` を追加
- RouteごとにDefault Phaseを1件保証
- 既存の未所属DestinationをDefault Phaseへ移行
- `destinations.phase_id` をNOT NULL化
- 新規Route INSERT後にDefault Phaseを自動生成
- Phaseは開始時間のみUIで利用し、終了時間はPlanning UIでは利用しない


## v2.1.0-p23 Destination time model

Migration: `migrations/202607290001_destination_time_model.sql`
- time_type: none / fixed / approx
- start_time: 時間ありで必須
- end_time: 任意
