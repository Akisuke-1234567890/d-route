# D Route v2.1.0-p20.2

Current baseline: v2.1.0-p20.2

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

## p20.2 Destination Reorder UX

- Placesカード右端は「⠿」ドラッグハンドル
- 押したまま上下へ移動して並び替え
- ドラッグ中のカードを浮かせ、他カードの位置変化をアニメーション表示
- 指を離した時だけorder_valueをSupabaseへ保存
- 保存成功時は「並び順を保存しました」を表示
- DB schema変更なし

## Next

Destination基本CRUDを一区切りとして実機確認後、Planning Core全体を正式設計と再照合する。
