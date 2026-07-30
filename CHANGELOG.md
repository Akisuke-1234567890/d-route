## v2.1.0-p33.2

- Route Chatを最新3件のコンパクト表示へ変更
- DB変更なし

## v2.1.0-p33.1

- Chat間隔・送信文字色・重要meta順・吹き出し幅を調整
- DB変更なし

## v2.1.0-p33

- Chatの連続投稿、長文、入力欄、重要表示を調整
- DB変更なし

## v2.1.0-p32.1

- Route Chat空表示の文字折り返しレイアウトを修正
- DB変更なし

## v2.1.0-p32

- Route ChatをDB化
- 一覧/送信/重要マーク/Route最新1件を追加
- DB migration追加

## v2.1.0-p31

- Routeに前後Phase手動切替を追加
- 現在Phaseへ戻る導線を追加
- DB変更なし

## v2.1.0-p30.3

- Today枠を撤去し異常時のみ警告表示へ変更
- DB変更なし

## v2.1.0-p30.2

- Today警告をコンパクト化し対象ジャンプを撤去
- DB変更なし

## v2.1.0-p30.1

- p30のsetManualPhaseId未定義によるbuild failureを修正
- manual Phase表示と現在Phaseへ戻る導線を追加
- DB変更なし

## v2.1.0-p30

- Today注意項目から対象Destinationへ直接フォーカス
- DB変更なし

## v2.1.0-p29

- 時刻状態表示とToday予定超過を追加
- DB変更なし

## v2.1.0-p28.1

- NOW / NEXT表示を撤去
- 時刻あり未完了を優先するカード自動フォーカスへ変更
- DB変更なし

## v2.1.0-p28

- Current PhaseにNOW / NEXT表示を追加
- 先頭未完了をNOW、次の未完了をNEXTとしてPlanning順から自動判定
- Phase表示時にNOWカードへ自動フォーカス
- DB変更なし

## v2.1.0-p27.1

- Todayの重複していた完了操作を削除
- Todayは状況把握＋例外修正導線に整理
- DB変更なし

## v2.1.0-p27

- Todayから先頭未完了Destinationを完了可能にした
- 例外・要確認からPlacesへの修正導線を追加
- DB変更なし

## v2.1.0-p26

- Today Read Model追加
- DB変更なし

## v2.1.0-p25.1.2

- Phase soft delete時のRLS 42501を修正
- Owner SELECT policyをsoft delete互換へ調整
- DB migration追加

## v2.1.0-p25.1.1

- Phase削除時のPGRST204（phases.record_status不存在）を修正
- DB変更なし

## v2.1.0-p25.1

- Phase削除を追加
- Destination移動と最後のPhase保護を実装
- DB schema変更なし

## v2.1.0-p25

- Destination完了状態`completed_at`を追加
- Route画面から完了/未完了を切替可能にした
- Current Phaseの完了数を自動集計
- DB migration追加

## v2.1.0-p24

- Route CURRENT PHASEをPlanningデータへ接続
- 現在時刻によるPhase優先表示を実装
- Current PhaseのDestinationを実データ表示
- 進行操作は未実装
- DB変更なし

## v2.1.0-p23.7.1

- p23.7のJSX構造エラーを修正
- Phaseモーダル中央配置
- Add/Edit Place操作ボタンをスクロール末尾へ配置
- DB変更なし

## v2.1.0-p23.6

- Places上部の追加ボタン色を統一
- Add/Edit Placeモーダルの本文のみスクロールする構造へ変更
- 追加/保存/キャンセルの重なり・追従不具合を修正
- DB変更なし

## v2.1.0-p23.5

- Places全体の「＋ 目的地を追加」を追加
- 時間指定カードの編集ボタン重なりを修正
- 固定時間カードを跨ぐ時間なしDestinationの並び替えを実装
- Add/Edit Placeモーダルの内部スクロールclass適用漏れを修正
- DB schema変更なし

## v2.1.0-p23.4

- Destinationカードの時間/場所名重なりを修正
- Add/Edit Placeモーダルの内部スクロールを復旧
- モーダル下部操作領域をsticky化
- DB変更なし

## v2.1.0-p23.3

- Destination開始/終了時刻を横1列へコンパクト化
- 5分刻み選択を維持
- 終了時刻解除UIを小型化
- DB変更なし

## v2.1.0-p23.2

- 時刻入力を時/分select方式へ変更
- 分を5分刻みに完全固定
- 「なし」切替時に開始/終了時刻を確実にクリア
- Phase開始時刻にも同じ5分刻みUIを適用
- DB変更なし

## v2.1.0-p23.1

- 時間UIを `なし / 確定 / 目安` に簡略化
- 必須を小型トグル化
- 開始/終了時刻の重なりを修正
- Phase/Destinationの時刻入力を5分刻みに統一
- DB変更なし

## v2.1.0-p23

- Destination時間モデルを追加
- 重要度と時間を独立
- 時間ありのPhase自動判定・時刻順固定表示を追加
- DB migration追加

## v2.1.0-p22.5.1

- 必須マークTSXの構文エラーを修正
- UI仕様・DB変更なし

## v2.1.0-p22.5

- Destinationカードをコンパクト化
- 必須のみ★表示、任意はマークなし
- 「予定」バッジと保存成功Toastを削除
- Phase操作を横並び化
- iPhoneのPhase開始時間表示を縦中央へ修正
- DB変更なし

## v2.1.0-p22.3

- iPhoneのPhase開始時間表示を左寄せに修正
- Default Phase migrationの再適用・PostgREST Schema Cache再読込手順を追加

## v2.1.0-p22.2

- Phase追加失敗時にSupabase/PostgRESTの実エラー内容を表示
- Phase開始時間に「時刻を解除」を追加
- iPhoneでtime入力欄がモーダルからはみ出す問題を修正
- DB変更なし

## v2.1.0-p22.1

- Phase-first Planningへ設計変更
- Route作成時のDefault Phase自動生成を追加
- 既存DestinationをDefault Phaseへバックフィル
- `destinations.phase_id` を必須化
- PlacesをPhase単位表示へ変更
- Places内でPhase追加 / 編集を実装
- Destination追加 / 編集で所属Phaseを扱うよう変更
- Route画面のPhase管理導線を削除

Migration:
- `supabase/migrations/202607280002_default_phase_model.sql`

## v2.1.0-p22

- Phase一覧画面を追加
- Supabase `public.phases` のRoute別一覧取得を実装
- Phase追加（Phase名 / メモ）を実装
- Phase追加時の `order_value` 末尾採番を実装
- PhaseごとのDestination件数とPhase未設定Destination件数を表示
- Route画面からPhase管理への導線を追加
- DB migration変更なし

## v2.1.0-p21
- p14でSupabaseへ適用済みだった `202607280001_planning_core_foundation.sql` をリポジトリへ復元。
- `phases` / `destinations`、index、RLS、Route整合性Trigger、`updated_at` / `version` TriggerのGitHub管理を回復。
- ライブDBへの新規schema変更なし。D Route SQL Runner実行不要。
- README / supabase READMEへBaseline運用を反映。

## v2.1.0-p20.7
- Destination並び替え成功時の「並び順を保存しました」通知を削除。
- ドラッグ操作、保存処理、保存失敗時のエラー表示・順序復元はp20.6のまま維持。

# v2.1.0-p20.6

- Destinationドラッグ中、移動先を跨いだ時点で他カードが滑らかに詰めるライブ並び替え演出を追加。
- ドラッグ対象DOM自体は移動させず、p20.5のPointer安定化構造を維持。
- 指を離す前に入れ替え結果が視覚的に分かるよう改善。

# Changelog

## v2.1.0-p20.1
- p20のPlaces一覧で表示順番号に使用する`index`がmapコールバックで未定義だったビルドエラーを修正
- ドラッグ並び替え仕様・DB仕様はp20から変更なし
- APP_VERSION / README baselineをv2.1.0-p20.1へ更新

## v2.1.0-p20
- Placesカード右端の「≡」ハンドルを押したまま上下へドラッグしてDestinationを並び替え可能にした
- ドラッグ中は画面上だけ順序を更新し、指を離した時にorder_valueをSupabaseへ保存
- 再読込後も保存した順序を維持
- 並び替え中・保存中は重複操作を防止し、保存失敗時は元の順序へ戻す
- APP_VERSION / README baselineをv2.1.0-p20へ更新

## v2.1.0-p02

- Home一覧下部の「＋ 新しいRouteを作る」を削除
- Routeがある場合の新規作成導線を右上の＋ボタンへ一本化
- Routeが0件の場合は空状態の「最初のRouteを作る」を維持
- 不要になったHome作成ボタン用CSSを削除

## v2.0.5-p06

- Routeを開いた後だけ表示されるBottom Navigationを追加
- Route / Places / Chat / Members / Menuの5タブ構成を確立
- Places・Members・Menuを独立画面として追加
- Chat画面をRoute内ナビゲーションへ統合
- Route一覧ではBottom Navigationを表示しない構成を維持

# Changelog

## 2.0.4
- Planningをプレースホルダーから目的地・移動地点を区別するルート表示へ更新。
- 目的・イベントを大きなカード、駐車場などの移動地点をコンパクトな中継表示として差別化。
- 区間ごとの移動手段、所要時間、距離、道路設定のサンプル表示を追加。
- 車から徒歩へ切り替わる複合移動ルートを表示。
- 各区間からGoogleマップの外部ルートを開く導線を追加。
- 地点検索・地図調整・現在地・住所入力を想定した場所登録方針を表示。

## 2.0.3
- Route詳細のTodayカードを実用表示へ更新。
- 開発用サンプルを箱根ツーリングの現在地・目的地・同行人数・次の行動に統一。
- PlanningとMembersは次工程のプレースホルダーとして維持。

# Change Log

## 2.0.2
- RouteカードをタップしてRoute詳細画面へ移動できるように変更
- Route IDを使った個別Route取得処理を追加
- Route名と概要を表示する詳細画面のヘッダーを追加
- Today・Planning・Membersの準備中セクションを追加
- Route一覧へ戻る導線と読み込み・エラー表示を追加
- Routeカードのタップ状態と詳細画面用スタイルを追加
- バージョン表示を2.0.2へ更新

## 2.0.0-dev.1
- React + TypeScript + Vite基盤
- D Routeブランド、Design Token、App Shell
- PWA manifest / service worker基本設定
- Supabase ClientとEnvironment管理
- Splash、Magic Link Sign In、Session確認
- Route List Empty Shell
- Version表示、Vitest、ESLint、GitHub Pages deploy workflow

Migration: なし
Known issues: Supabase ProjectとRedirect URLは配布先で設定が必要。Route作成機能はdev.2予定。

## 2.0.1
- 「最初のRouteを作る」ボタンを有効化
- Route名入力モーダルを追加
- Route名必須バリデーションを追加
- Supabase routesテーブルへの作成処理を追加
- Route一覧の取得・再読み込み後の永続表示に対応
- 作成・一覧取得エラーのトースト表示を追加
- モバイル優先のガラス調モーダル／Routeカードを追加

## v2.1.0-p03

- D Route正式ロゴを「RouteそのものがDを描く」デザインへ更新
- BrandMarkをターコイズ／ブルー／紫のRouteと4ノード構成へ変更
- PWA icon、maskable icon、Apple Touch Iconを新ブランドへ統一
- 全体背景をネイビー〜紫のグラデーションへ調整
- APP_VERSIONをv2.1.0-p03へ同期
- DB変更なし

## v2.1.0-p20.3
- Destination並び替えUXをp20.1基準から再実装。
- ドラッグハンドルを6点グリップへ変更し、編集ボタンと視覚的に分離。
- 180ms長押し後に並び替えを開始し、掴んだカードを浮かせて強調。
- 移動先カードをハイライトし、ドロップ後に並び順を保存。
- p20.2で混入したCSSの文字列 `\\n` を除去し、既存文字色への影響を解消。

## v2.1.0-p20.4
- Destination並び替えを指追従型ドラッグへ変更。
- 長押し後、掴んだカードを浮いたoverlayとして指の上下移動へ追従。
- 元カードはplaceholderとして残し、移動先に合わせてリスト順だけを入れ替える構成へ変更。
- Pointer Captureを押下直後から保持し、2件の目的地を繰り返し往復させた際の操作不能を抑制。
- pointerup / pointercancel / lostpointercaptureの全終了経路でドラッグ状態を必ず初期化。
- DB保存はドラッグ終了後に1回だけ実行し、ドラッグ状態と通信状態を分離。
- DB schema変更なし。


## v2.1.0-p20.5

- Fixed top-to-bottom Destination drag being cancelled on iPhone by keeping the captured DOM node stationary until pointer release.
- Reorder target is now calculated from pointer Y position instead of moving the live list during the gesture.
- Increased floating-card depth with stronger shadow, scale, lift and surface contrast.
