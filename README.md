# D Route v2.1.0-p14

Current baseline: v2.1.0-p14

## p14 Planning Core / Destination DB Foundation

Database:
- public.phases added
- public.destinations added
- RLS enabled for both tables
- current MVP permissions are Route owner only
- Destination Phase/Route consistency trigger added
- updated_at / version trigger added
- Planning indexes added

Frontend:
- Places no longer uses the hard-coded Ebina / Daikanzan sample data
- Places reads public.destinations from Supabase
- Loading / error / empty states added
- Existing Route / Places / Chat / Members / Menu bottom navigation remains unchanged
- Destination creation UI is intentionally not connected yet; it is the next implementation step

## Database migration

The p14 database migration must be stored in:

supabase/migrations/202607280001_planning_core_foundation.sql

The migration has already been applied to the current Supabase project through the D Route SQL Runner.

## Next

Connect the 「＋ 目的地を追加」 flow to destinations INSERT, then add edit / soft-delete / reorder.
