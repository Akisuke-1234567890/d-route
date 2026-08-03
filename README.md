## v2.1.0-p78.4

- p78.2でPhase削除UI撤去後に残った未定義`phaseDeleting`参照を削除
- GitHub ActionsのTypeScript build errorを修正
- p78.3のDestinationドラッグ終了修正を維持
- DB変更なし

## v2.1.0-p78.3

- Destination並び替え中に指を離しても浮遊カードが残るiOS不具合を修正
- windowレベルのpointerup / pointercancelでドラッグ終了を必ず回収
- ドラッグ中はPlacesのRoute切替スワイプを停止
- 画面切替・タブ離脱時にも浮遊レイヤーとplaceholderを確実に破棄
- DB変更なし

## v2.1.0-p78.2

- メインRouteの分岐・合流・離脱表示を1行中心のコンパクト表示へ変更
- 常時表示していた説明文とスワイプ案内を削除
- 接続種別・サブRoute名・移動矢印だけを表示
- 同じ目的地に複数の接続がある場合は横並び・折返しで省スペース表示
- DB変更なし

# D Route v2.1.0-p68.1

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


## v2.1.0-p30.2

- Today警告をコンパクト化
- 対象を表示と自動ジャンプを撤去
- 詳細確認はPlacesで確認へ集約
- DB変更なし


## v2.1.0-p30.3

- Today枠を撤去
- 予定超過・例外がある時だけ警告表示
- 問題0件なら警告エリア非表示
- 警告時のみPlacesで確認を表示
- DB変更なし


## v2.1.0-p31

- Current Phase見出しに前後Phase切替を追加
- 過去/未来PhaseをRoute上で手動表示可能
- 手動表示中もDestinationの完了操作が可能
- 手動表示時はVIEWING PHASEと現在Phaseへ戻るを表示
- 通常時のCurrent Phase自動判定は維持
- DB変更なし


## v2.1.0-p32

- ChatをlocalStorage prototypeからSupabase実データへ移行
- Route Chatの一覧 / 新規送信 / 投稿者 / 時刻 / 重要マークを実装
- Route画面の連絡欄は最新メッセージ1件をDBから表示
- 既読・通知・Realtimeは未実装
- 現在Route membership未実装のためRLSはRoute Owner限定
- migration: `supabase/migrations/202607300001_route_chat_baseline.sql`


## v2.1.0-p32.1

- Route画面Chatの空表示が1文字ずつ縦折り返しになるレイアウト不具合を修正
- 空表示を「まだ連絡はありません。 / 必要な連絡があればChatで共有できます。」の2行構成へ整理
- DB変更なし


## v2.1.0-p33

Chat UI / 操作仕上げ。

- 連続投稿を5分以内・同一投稿者でコンパクト表示
- 長文 / 改行 / URL等でも吹き出しが崩れにくい折返しへ変更
- textareaを内容に合わせて最大120pxまで自動拡張
- Enterで送信、Shift+Enterで改行（IME変換中は送信しない）
- 重要メッセージの視認性を強化
- 送信直後のローカル反映と最下部スクロールは維持
- DB変更なし


## v2.1.0-p33.1

- Chatメッセージ間隔を少し広げて視認性を改善
- 送信ボタン文字色を白へ統一
- 重要メッセージのmeta順を「重要 → 投稿者 → 時刻」へ変更
- 重要メッセージだけ吹き出し幅が広がる違和感を抑制
- DB変更なし


## v2.1.0-p33.2

- Routeの連絡を最新3件へ変更
- 文字を1段階小さく、本文1行省略でコンパクト化
- Phaseカード圧縮は地図導入後に判断
- DB変更なし


## v2.1.0-p33.3

- Route Chat上限を50文字へ変更
- DB CHECK制約も50文字へ変更


## v2.1.0-p34

- route_members基盤を追加
- 既存RouteのOwnerをリーダー/参加として自動登録
- 新規Route作成時もOwner memberを自動作成
- Members画面をprototype固定値からDB表示へ移行
- 招待/参加回答/Chat RLS拡張は次工程


## v2.1.0-p35

- OwnerがMembers画面からログインIDでユーザーを招待可能
- 招待されたユーザーはroute_membersへmember / unansweredで登録
- user_profilesの直接公開はせずSecurity Definer RPC経由で検索
- 自分自身への招待は拒否
- 参加/不参加回答、参加者側Route表示、Chat RLS拡張は次工程


## v2.1.0-p36

- 招待された本人がMembersで参加/不参加を回答可能
- 回答後も参加/不参加を変更可能
- Route memberは同じRouteのMembers一覧を閲覧可能
- Route一覧/詳細/Chat等の参加者開放は次工程


## v2.1.0-p37

- 招待済みRoute memberがRoute一覧で対象Routeを取得可能
- 未回答 / 参加 / 不参加のいずれでもRouteとMembersを閲覧可能
- RouteのPhase / Destinationをmember側から読み取り可能
- route_membersの自己参照RLSをSecurity Definer helperへ置換し再帰を回避
- Membersの「＋招待」はOwnerだけに表示
- Phase / Destinationの作成・編集などOwner write権限はまだ維持
- Chatのmember開放は次工程


## v2.1.0-p38

- Route Chatを参加中Route memberへ開放
- participating memberはChat閲覧・送信可能
- unanswered / declined memberはRouteとMembersのみ閲覧可能でChatは利用不可
- 送信者IDはauth.uid()一致を維持


## v2.1.0-p39

- participating memberがRoute画面からDestinationの完了 / 完了解除を操作可能
- 完了操作をSecurity Definer RPCへ移し、変更可能項目をcompleted_atだけに限定
- Phaseの前後切替 / 現在Phaseへ戻る操作は端末内表示なのでmemberでもそのまま利用可能
- Phase / Destinationの追加・編集・削除・並び替えなどRoute設計操作はOwner限定のまま
- 未回答 / 不参加memberは完了操作不可


## v2.1.0-p40

- RouteのDestinationカードへ「地図で開く」を追加
- location_nameがあるDestinationだけ地図導線を表示
- map_urlが保存済みならそれを優先し、未設定ならlocation_nameを地図検索へ渡す
- アプリ内ナビは持たず外部地図へ誘導するD Route方針
- 地図導線追加後もカード高さを抑えるため完了ボタンと横並び
- DB変更なし


## v2.1.0-p41

- Destinationカードに「ここへ向かう」を追加
- 外部Google Mapsへ現在地→Destinationの経路検索として渡す
- 出発地点は指定せず、地図側に現在地判定を任せる
- 「地図」は場所確認用として残す
- 「ここへ向かう / 地図 / 完了」を1列にまとめて縦幅を抑制
- DB変更なし


## v2.1.0-p42

- Destination操作の優先順位を再設計
- 「ここへ向かう」「地図を見る」を主操作として広く配置
- 「ここへ向かう」をオレンジ系アクセントへ変更
- 完了は右下の小型ピルボタンへ縮小し視覚優先度を下げた
- 3ボタン同幅を廃止してカード内の窮屈感を軽減
- DB変更なし


## v2.1.0-p43

- 完了操作をDestinationカード右上へ移動
- 「○ 完了 / ✓ 完了済み」がボタン兼ステータス表示
- 下段は「ここへ向かう / 地図を見る」の2操作だけに整理
- 地図を見るを青〜シアン系へ変更
- 完了済みカードの暗転をさらに強化
- DB変更なし


## v2.1.0-p44

- 必須マークを番号直下へ移動
- 右上を「○ 未完了 / ✓ 完了」に整理
- DB変更なし


## v2.1.0-p45

- 「ここへ向かう」に移動手段選択を追加
- 徒歩 / 公共交通 / 車をRoute画面で切替可能
- Google Mapsへtravelmodeを渡して経路検索
- 初期値は徒歩
- 選択はその端末内のRoute画面で共通
- DB変更なし


## v2.1.0-p46

- 「ここへ向かう」の挙動を変更
- Google Mapsをいきなりナビ開始せず、現在地→Destinationのルート確認画面で開く
- ルート確認後、Google Maps側の「開始」操作でナビを開始
- 徒歩 / 公共交通 / 車の選択はそのまま反映
- DB変更なし


## v2.1.0-p47

- 「ここへ向かう」を「ルートを見る」へ変更
- Destinationカードの「地図を見る」を削除
- 徒歩 / 公共交通 / 車 → ルートを見る、の1本の導線へ整理
- 「ルートを見る」はカード横幅を使う主ボタンへ変更
- Google Mapsではルート確認後にユーザーがナビ開始
- DB変更なし


## v2.1.0-p48

- MenuのRoute設定を実装
- OwnerがRoute名と説明を編集可能
- Route名60文字、説明200文字上限
- 他のMenu項目は未実装としてdisabled表示
- DBにroutes.descriptionを追加


## v2.1.0-p49

- Route一覧カードからRoute説明を確認可能に変更
- 説明があるRouteだけ「説明を見る」を表示
- 説明は小型モーダルで表示し、Route実行画面には載せない
- カード本体を押すと従来どおりRouteへ移動
- DB変更なし（p48のdescriptionを利用）


## v2.1.0-p50

- Route説明を別モーダル表示からカード内ブラインド表示へ変更
- 「説明を見る」でカード下部が展開し、同じ一覧画面内で確認可能
- 開いている状態では「説明を閉じる」へ切替
- 一度に開く説明は1Routeのみ
- DB変更なし


## v2.1.0-p51

- Menuの「共有・招待」を「メンバー・招待」へ整理
- メニュー項目からMembers画面へ移動可能
- 参加状況確認とログインID招待の既存機能へ導線を接続
- Route設定はOwnerのみ、メンバー・招待画面はRoute memberが閲覧可能
- テンプレート / 複製 / アーカイブは引き続き未実装
- DB変更なし


## v2.1.0-p52

- Menu内の「メンバー・招待」を削除
- 下部ナビのMembersと役割が重複するため導線を一本化
- 招待・参加状況確認はMembersタブから行う
- MenuはRoute設定、テンプレート、複製、アーカイブなど管理機能に限定
- DB変更なし


## v2.1.0-p53

- Menuの「Routeを複製」を実装
- 複製後のRoute名を確認・変更して作成可能
- Route説明、Phase、Destinationをコピー
- Destinationの場所・時間・必須/任意・並び順を維持
- 完了状態、Chat、招待済みMembersはコピーしない
- 複製後は新しいRouteを自動的に開く


## v2.1.0-p54

- 一般向け内蔵テンプレート6種類を実装
- ツーリング / 日帰りドライブ / 買い物・用事回り
- 旅行1日プラン / イベント参加 / ゴルフ・スポーツ
- Menuから選択して新規Routeを作成
- 場所・時間は作成後に編集


## v2.1.0-p55

- 一般テンプレートを4種類へ整理
- ツーリング / 日帰りドライブ / 旅行・お出かけ / イベント参加
- 買い物・用事回り、ゴルフ・スポーツを削除
- 時刻は固定せず、必要なDestinationだけ作成後に設定


## v2.1.0-p56

- Route選択画面のカードに左スワイプ操作を追加
- 最大まで左スワイプすると赤い削除ボタンを表示
- 削除ボタンを押すと最終確認ダイアログを表示
- キャンセル可能、削除完了後は一覧から即時除外
- スワイプ中のカード誤タップ・誤遷移を抑制
- 既存のdelete_owned_route RPCを利用するためDB変更なし


## v2.1.0-p57

- Routeカード右端の「›」をスワイプ操作のヒント「≪⋯」へ変更
- 赤い削除領域を通常時は完全に非表示
- カードを左へ動かし始めたときだけ削除領域を表示
- 最大左スワイプ、削除確認ダイアログ、削除処理はp56のまま維持
- DB変更なし


## v2.1.0-p58

- Route削除確認ダイアログを画面中央へ配置
- 表示時に背景フェードとダイアログのフェード・拡大アニメーションを追加
- キャンセル、背景タップ、削除完了時にフェード・縮小して閉じる
- 削除処理と確認内容は変更なし
- DB変更なし


## v2.1.0-p59

- Route一覧の赤い削除アクション左上・左下にも角丸を追加
- 削除領域全体を独立したカード状に調整
- スワイプ、確認ダイアログ、削除処理は変更なし
- DB変更なし


## v2.1.0-p60

- Routeのアーカイブ・復元を実装
- Menuの「完了・アーカイブ」を有効化
- Route一覧に「アーカイブを見る / 使用中を見る」の切替を追加
- アーカイブは削除ではなく、Phase・Destination・Chat・Membersを維持
- アーカイブ済みRouteはMenuから通常一覧へ復元可能


## v2.1.0-p61

- Route一覧の左スワイプ操作を2アクションへ統一
- 通常一覧は「アーカイブ / 削除」
- アーカイブ一覧は「復元 / 削除」
- アーカイブ・復元後は現在の一覧から即時除外
- Menuのアーカイブ操作は一覧へ一本化
- p60のDB RPCを利用するため追加SQLなし


## v2.1.0-p62

- 新規Route作成時に「空のRoute / テンプレートから」を選択可能
- テンプレートはツーリング、日帰りドライブ、旅行・お出かけ、イベント参加
- テンプレートを選ぶと同じ作成画面内でRoute名を確認・変更して作成
- Route設定画面からテンプレートを削除
- Route設定画面は名前・説明変更とRoute複製だけに整理
- Route設定画面内のアーカイブ・削除を廃止し、一覧左スワイプへ統一
- アーカイブ一覧取得時のstatus切替を修正
- DB変更なし


## v2.1.0-p64

- 新規Route作成時に説明（任意）を入力可能
- 空Route・テンプレート作成のどちらでも説明を設定可能
- 説明は200文字まで
- 作成後はRoute一覧の説明ブラインドへ即時反映
- Route設定から後で編集可能
- テンプレート説明未入力時は内蔵テンプレートの既定説明を使用


## v2.1.0-p65

- Route Chatに未読区切りと未読件数を追加
- 自分の送信メッセージへ既読人数を表示
- Routeごとの最終既読位置をメンバー単位で保存
- Chatメッセージと既読状態をRealtime同期


## v2.1.0-p66

- Route Chat入力欄の左側に現在地添付ボタンを追加
- 位置情報は送信時に1回だけ取得し、継続追跡は行わない
- 送信前に添付状態とGPS精度を表示し、添付解除・再取得が可能
- 位置付きメッセージは取得時刻・精度・「地図で開く」を表示
- 位置取得失敗時も文章だけで送信可能
- 写真添付・Realtime位置更新・位置履歴は実装しない


## v2.1.0-p73.1
Route切替を一般的なページ送り方向へ変更し、横スライド表示とRoute種類ラベルを追加。


### v2.1.0-p76

別行動の参加者設定をPlaces内へ統合し、Membersは招待・参加状況に専念する構成へ整理。


### v2.1.0-p78

メインRouteの目的地カードに、サブRouteの開始・合流・離脱を接続情報として表示します。接続表示をタップすると該当サブRouteへ切り替わり、サブRouteはメインと同じPhase / Destination編集画面で管理します。
