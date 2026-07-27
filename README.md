# D Route v2.1.0-p19.3

Current baseline: v2.1.0-p19.3

## p19.3 Modal Background Scroll Lock

- Route削除確認ダイアログ表示中は背面ページを固定
- Placeの追加・編集・削除確認中も背面ページを固定
- iOS向けにbodyをfixed化し、現在のスクロール位置を保持
- モーダルを閉じると元の位置へ復帰
- overscrollも抑制
- p19.2のEdit Place 1画面表示を維持
- p19.1のRoute / Place削除ダイアログ統一を維持
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destination並び替えを実装する。
