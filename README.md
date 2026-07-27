# D Route v2.1.0-p19.4

Current baseline: v2.1.0-p19.4

## p19.4 Edit Place Modal Position / Internal Scroll

- Edit Placeモーダルを従来より少し上へ配置
- 現在の短いフォームは1画面表示を維持
- 将来項目が増えて画面高を超えた場合はモーダル内部だけ縦スクロール
- 背景ページはp19.3のscroll lockを維持
- iPhone safe-areaを考慮
- overscrollをモーダル内部で抑制
- スクロールバーは控えめな表示
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql

## Next

Destination並び替えを実装する。
