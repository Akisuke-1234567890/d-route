# D Route v2.1.0-p19.1

Current baseline: v2.1.0-p19.1

## p19.1 Destination Delete Dialog UI Fix

- Destination削除確認画面を既存のRoute削除確認画面と同じレイアウトへ統一
- route-delete-backdrop / route-delete-modal を共用
- DELETE PLACEの色・見出し・説明文・ボタン配置をRoute削除と統一
- 削除ボタンは既存 route-danger-confirm-button を共用
- モバイル時の「削除 → キャンセル」の縦配置もRoute削除と同じ
- soft delete処理そのものはp19のまま変更なし
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destination並び替えを実装する。
