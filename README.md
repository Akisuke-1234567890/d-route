# D Route v2.1.0-p16

Current baseline: v2.1.0-p16

## p16 Destination Edit

- Placesの各Destinationに「編集」を追加
- 目的地名、場所名、重要度、メモを編集可能
- Supabase public.destinations をUPDATE
- p14のOwner-only RLSを利用
- 更新後はPlaces一覧へ即時反映
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destinationのsoft delete、その後に並び替えを実装する。
