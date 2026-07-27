# D Route v2.1.0-p18

Current baseline: v2.1.0-p18

## p18 Add/Edit Place UI Unification

- Add Place / Edit Placeの入力UIを同じ見た目へ統一
- 重要度をselectではなく「必須 / 任意」の2択セグメントUIへ変更
- メモ欄を他入力と同じ角丸・境界線・背景へ統一
- 場所名 / メモの任意表示をラベル側へ整理
- 入力欄、補助テキスト、フォーカス表示を統一
- p17のPlacesカード配置修正は維持
- DB schema変更なし

## Current database migrations

- supabase/migrations/202607270001_route_owner_soft_delete.sql
- supabase/migrations/202607280001_planning_core_foundation.sql
