# D Route v2.1.0-p19.2

Current baseline: v2.1.0-p19.2

## p19.2 Edit Place Compact Layout

- Edit Placeをスクロール前提ではなく1画面に収まる方向へ圧縮
- タイトル周辺、入力欄、項目間余白、メモ欄の縦幅を縮小
- 小さい画面ではさらに縦幅を圧縮
- 操作順を「保存 → キャンセル → この目的地を削除」に変更
- 削除確認ダイアログはp19.1のRoute削除統一レイアウトを維持
- soft delete処理は変更なし
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destination並び替えを実装する。
