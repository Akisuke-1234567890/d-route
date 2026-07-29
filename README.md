# D Route v2.1.0-p30.1

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


## v2.1.0-p23.7.1

- p23.7のJSX閉じタグ不整合を修正
- Phase追加/編集モーダルを中央配置
- Add/Edit Placeの保存・キャンセルをスクロール本文の末尾へ配置
- Edit Placeの削除ボタンもスクロール末尾に維持
- DB変更なし


## v2.1.0-p24

- Route画面のCURRENT PHASEをSupabase Planningデータへ接続
- Phase開始時刻から現在表示するPhaseを自動判定
- 次Phase開始までは直前Phaseを表示し、最初の時刻ありPhase開始前はRoute先頭Phaseを表示
- Current Phase内DestinationをPlacesのorder_value順で表示
- 確定/目安/時刻なし、必須表示をRouteカードへ反映
- 進行操作・完了処理は未実装（表示接続のみ）
- DB変更なし


## v2.1.0-p25

Route Progress baseline。

- Destinationに`completed_at`を追加
- Route画面で未完了 / 完了をワンタップで切替
- 完了操作は再タップで未完了へ戻せる
- 保存失敗時は表示を元へ戻しエラー表示
- Current Phaseに `完了数 / 全件数` を表示
- 全件完了時はPhase進捗バッジを完了表示
- Phase自体の完了状態はまだ保存しない
- migration: `supabase/migrations/202607290002_destination_progress.sql`


## v2.1.0-p25.1

- Phase編集画面からPhase削除
- 子Destinationは残存default Phase（default削除時は先頭Phase）へ移動
- default削除時は移動先を新defaultへ昇格
- 最後の1Phaseは削除不可
- soft delete
- DB schema変更なし


## v2.1.0-p25.1.1

- Phase削除で存在しない`phases.record_status`を参照していた不具合を修正
- Phase側のsoft deleteは`deleted_at`と`is_default`のみ更新
- Destination移動側の`record_status`条件は維持
- DB変更なし


## v2.1.0-p25.1.2

- Phase soft delete時のRLS 42501を修正
- Route Ownerは自分のRouteに属するsoft-deleted PhaseもRLS上SELECT可能に変更
- 通常アプリ表示は従来どおり`deleted_at is null`で除外するため、削除済みPhaseは画面に出ない
- Phase削除処理自体はp25.1.1を維持
- migration: `supabase/migrations/202607290003_phase_soft_delete_rls.sql`


## v2.1.0-p26

- Today Read Model追加（Current Phase / 未完了 / 次の時刻あり / 例外・要確認）
- 読み取り専用、DB変更なし


## v2.1.0-p27

- Todayの先頭未完了Destinationをその場で完了可能
- 完了保存は既存completed_at処理を再利用
- Todayの未完了件数 / Current Phase進捗 / Routeカードへ即時反映
- 例外・要確認がある場合はPlacesへの修正導線を表示
- 次の時刻ありは読み取り表示のまま
- DB変更なし


## v2.1.0-p27.1

- Today内のDestination完了ボタンを削除
- Destinationの完了操作は上部のDestinationカードへ一本化
- TodayのCurrent Phase進捗、未完了、次の時刻あり、例外・要確認は維持
- 例外・要確認からPlacesへの修正導線は維持
- DB変更なし


## v2.1.0-p28

NOW / NEXT baseline。

- NOW = Current Phase内の先頭未完了Destination
- NEXT = Current Phase内の次の未完了Destination
- Planningのorder_value順をそのまま利用
- NOW / NEXTをタップすると該当Destinationカードへ移動
- Phase表示時は完了済み先頭ではなくNOWカードへ自動フォーカス
- 全件完了時はNOWにPhase完了状態を表示
- 時刻によるNEXT追い越しルールはまだ入れない
- DB変更なし


## v2.1.0-p28.1

- NOW / NEXT表示を撤去
- Current Phase内の未完了・時刻ありDestinationを最優先
- 現在時刻以前の未完了があれば時刻順で優先
- それがなければ次に来る時刻ありを優先
- 完了後は次の時刻ありへ自動フォーカス
- 時刻ありが全て完了したら時間なしをPlanning順で優先
- 1分ごとの時計更新で優先対象を再判定
- カードの並び自体は変更しない
- DB変更なし


## v2.1.0-p29

- 時刻あり未完了を予定前 / 今の予定 / 予定超過で表示
- Todayに予定超過件数を追加
- 例外・要確認とは別管理
- p28.1優先フォーカス維持
- DB変更なし


## v2.1.0-p30

- Todayの予定超過 / 例外・要確認から先頭対象Destinationへ直接移動
- 別Phase対象はPhase切替後にカード表示
- 通常の完了操作は追加しない
- DB変更なし


## v2.1.0-p30.1

- p30のbuild error `setManualPhaseId`未定義を修正
- Todayから別Phaseの対象へ移動するためのmanual Phase stateを追加
- 別Phaseを表示中は「現在Phaseへ戻る」を表示
- 通常時は従来どおり時刻からCurrent Phaseを自動判定
- DB変更なし
