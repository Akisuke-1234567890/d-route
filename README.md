# D Route v2.1.0-p22

Current baseline: v2.1.0-p22

## v2.1.0-p22 Planning Core DB Baseline recovery

- p14でD Route SQL RunnerからSupabaseへ適用済みだったPlanning Core migrationをGitHubへ復元。
- `public.phases` / `public.destinations` の定義、index、RLS、DestinationとPhaseのRoute整合性Trigger、`updated_at` / `version` 自動更新Triggerを履歴として再収録。
- 現在のSupabase DBへ新しいschema変更は行わない。p21ではSQL Runner実行不要。
- 復元migration: `supabase/migrations/202607280001_planning_core_foundation.sql`
- Planning権限は現段階ではRoute Ownerのみ。
- 次工程はPhase CRUD。将来の並び順ルールは「時刻あり=時刻順で固定、時刻なし=自由並び替え・Phase間移動可能」を前提とする。


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

## Current

Destination並び替えを実装。Placesカード右端の6点ハンドルを短く長押しするとカードが浮き、指の上下移動へ追従する。リスト側は移動位置に合わせて入れ替わり、指を離した後にorder_valueをSupabaseへ1回保存する。


### v2.1.0-p20.7 Stable bidirectional drag

- Dragged Place card follows the finger as a floating overlay.
- Keeps the captured card DOM in its original position during the gesture to avoid iOS Safari pointer-capture cancellation when moving top to bottom.
- Calculates the destination from pointer Y position and commits the list reorder only on pointer release.
- Stronger elevation, shadow, scale and brightness make the held card visibly float above the list.

### v2.1.0-p20.4 Stable finger-follow reorder
- 掴んだカードをfixed overlayとして指へ追従
- 元カードはplaceholder化してレイアウト位置を維持
- Pointer Captureを長押し前から確保し、再描画時のイベント取りこぼしを抑制
- pointerup / pointercancel / lostpointercaptureで必ずドラッグ状態を解除
- ドラッグ状態を解除してからSupabase保存を開始し、通信状態と操作状態を分離
- DB schema変更なし

### v2.1.0-p20.3 Destination reorder UX
Placesの目的地カード右端に6点ドラッグハンドルを表示します。ハンドルを短く長押ししてから上下に移動すると並び替えでき、指を離した時にorder_valueを保存します。ドラッグ中はカードを浮かせ、移動先を視覚的に強調します。

## v2.1.0-p22

Phase Planningの最初のUI実装。

- Route内にPhase管理画面 `/routes/:routeId/phases` を追加
- `public.phases` の一覧取得
- Phase名 / メモの追加
- 新規Phaseは `order_value` 1000刻みで末尾へ追加
- PhaseごとのDestination件数を表示
- Phase未設定Destinationがある場合に件数を案内
- Phaseは任意で、DestinationをRoute直下に置く設計を維持
- Phase編集 / 削除 / 並び替え / Phase間Destination移動は後続Patch
- DB変更なし。p14 Planning Core migrationをそのまま利用
