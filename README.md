# D Route v2.1.0-p17

Current baseline: v2.1.0-p17

## p17 Places UI Fix

- Destinationカードの配置崩れを修正
- 番号 / ピン / 目的地情報 / 編集ボタンを横方向に整理
- 「予定」は目的地情報側へ移動
- Add Place / Edit Placeの重要度を「必須 / 任意」に簡略化
- 既存の want / information は編集時に「必須」扱いで表示
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql
