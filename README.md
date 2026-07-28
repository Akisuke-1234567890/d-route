# D Route v2.1.0-p20.1

Current baseline: v2.1.0-p20.1

## p19.5 Edit Place Balanced Modal Position

- Edit Placeを上下ほぼ均等の余白で中央配置
- p19.4の上寄せ配置を廃止
- 現在のフォームは1画面表示を維持
- 将来項目が増えた場合はモーダル内部のみスクロール
- 背景ページはp19.3のscroll lockを維持
- iPhone safe-areaを考慮
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destination並び替えを実装。Placesカード右端の「≡」ハンドルを押したまま上下へドラッグし、確定時にorder_valueをSupabaseへ保存する。
