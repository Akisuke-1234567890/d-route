# D Route v2.1.0-p23.7

## v2.1.0-p22.1 Planning Core DB Baseline recovery

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

## v2.1.0-p22.1

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


## v2.1.0-p22.1

Phase-first Planningへ設計変更。

- Route作成時に名前なしDefault Phaseを自動生成
- 既存Routeは最初のPhaseをDefault化し、PhaseがないRouteには自動追加
- 既存のPhase未設定DestinationをDefault Phaseへ移行
- Destinationは必ずPhaseへ所属
- PlacesをPhase単位のPlanning画面へ変更
- Phase追加 / Phase編集をPlacesへ統合
- Phaseは名前と開始時間（任意）を持つ
- Phase終了時間はUIでは扱わない
- Destination追加は対象Phaseから行う
- Destination編集でPhase変更可能
- RouteタブからPhase管理導線を削除
- Phase開始時間によるRoute優先表示は後続Patchで実装

Migration:
- `supabase/migrations/202607280002_default_phase_model.sql`


## v2.1.0-p22.2

Phase追加UIの実機不具合修正。

- Supabase/PostgRESTの実エラー内容を画面に表示できるよう修正
- Phase開始時間に「時刻を解除」を追加
- iPhoneのtime入力がモーダル幅を超える問題を修正
- Phase保存処理・DB構造はp22.1から変更なし
- DB変更なし


## v2.1.0-p22.3

- Phase開始時間のiPhone表示を左寄せへ修正
- p22.1 Default Phase migrationの再確認・Schema Cache reload用SQLを用意
- UI側のPhase保存ロジックはp22.2を維持


## v2.1.0-p22.5

- Destinationカードをコンパクト化
- 必須Destinationのみ★表示、任意はマークなし
- Destinationカードの「予定」表示を削除
- Destination保存成功Toastを削除
- Phaseの「編集」「＋目的地」を横並び化
- iPhoneのPhase開始時間を横・縦とも正常位置へ調整
- DB変更なし


## v2.1.0-p22.5.1

- p22.5で必須マークTSXに混入した不要なエスケープ文字を修正
- UI仕様・DB仕様の変更なし


## v2.1.0-p23

- Destinationの重要度と時間指定を独立
- 時間指定なしはPhase手動選択＋自由並び替え
- 時間ありは確定/目安＋開始時刻、終了時刻は任意
- 時間ありはPhase開始時間から所属Phaseを自動判定
- Phase内では時刻ありを時刻順、その下に時刻なしをorder_value順
- 時刻ありはドラッグ不可
- migration: `supabase/migrations/202607290001_destination_time_model.sql`

- 時刻からPhaseを決められない/不一致の項目は表示上の『例外管理』へ退避（DB上の所属は保持）


## v2.1.0-p23.1

- Destination時間選択を `なし / 確定 / 目安` の1段へ統合
- 重要度の大型選択を廃止し、小型の「★ 必須にする」へ変更
- 開始 / 終了時刻を縦配置し、iPhoneでの重なりを解消
- D Routeの時刻入力標準を5分刻みに統一
- Phase開始、Destination開始、Destination終了に5分刻みを適用
- DB変更なし


## v2.1.0-p23.2

- iPhone native time pickerを廃止し、時/分の選択式へ変更
- 分は00/05/10/.../55のみ選択可能
- Phase開始 / Destination開始 / Destination終了すべて5分刻みを強制
- 時間ありから「なし」へ戻すと開始/終了時刻を完全クリアし、Phase手動選択へ戻る
- 終了時刻のみ解除できる小ボタンを追加
- DB変更なし


## v2.1.0-p23.3

- Destinationの開始/終了時刻を横1列のコンパクト表示へ変更
- 開始/終了の見出しを小型化
- 終了時刻は任意のまま、設定後は×で解除可能
- 5分刻みルールはp23.2から継続
- DB変更なし


## v2.1.0-p23.4

- Destinationカード上段の時間表示と場所名の重なりを解消
- 場所名を時間バッジとは別行へ移動
- Add/Edit Placeモーダルを画面高超過時に内部スクロール可能へ修正
- 保存/キャンセル操作領域をスクロール末尾で操作しやすいようsticky化
- DB変更なし


## v2.1.0-p23.5

- Places全体上部に「＋ 目的地を追加」を追加
- 各Phase内の「＋目的地」は維持
- 時間指定カード右側の重複「時間」表示を削除
- 時間指定カードと編集ボタンの干渉を解消
- 時間ありDestinationをドラッグ不可の固定アンカーとして維持
- 時間なしDestinationは固定アンカーの前後を跨いで並び替え可能
- Phase内表示順はorder_valueを正として保存
- Add/Edit Placeモーダルへscroll classを正しく適用しiPhone内部スクロールを修正
- DB schema変更なし


## v2.1.0-p23.6

- Places上部の「＋ 目的地を追加」「＋ Phaseを追加」の色を統一
- Add/Edit Placeモーダルをヘッダー / スクロール本文 / フッターの3領域へ変更
- 追加 / 保存 / キャンセルをsticky overlayから通常フッターへ変更
- 操作ボタンが入力欄へ重なる不具合を修正
- DB変更なし


## v2.1.0-p23.7

- Phase追加/編集モーダルを画面中央付近へ配置
- Place追加/編集の保存・キャンセルを固定フッターから廃止
- Place追加/編集の保存・キャンセルはフォーム末尾に配置し、スクロールすると表示される仕様へ変更
- Place本文の内部スクロールは維持
- DB変更なし
