# D Route v2.1.0-p19

Current baseline: v2.1.0-p19

## p19 Destination Soft Delete

- Edit Placeに「この目的地を削除」を追加
- 削除前にDestination名を含む確認ダイアログを表示
- public.destinations.deleted_at を使ったsoft delete
- p14で作成済みのOwner-only UPDATE RLSを利用
- 削除成功後はPlaces一覧から即時除外
- DB schema変更なし
- 物理DELETEは行わない

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destination並び替えを実装し、Destination基本CRUDを一区切りにする。
