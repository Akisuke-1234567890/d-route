# D Route v2.1.0-p15

Current baseline: v2.1.0-p15

## p15 Destination Create

- Placesの「＋ 目的地を追加」を有効化
- 目的地名、場所名、重要度、メモを入力
- Supabase public.destinations へINSERT
- 登録後にPlaces一覧へ即時反映
- order_valueは既存末尾 + 1000 で採番
- p14で作成したOwner-only RLSをそのまま利用
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destinationの編集、soft delete、並び替えを順に実装する。
