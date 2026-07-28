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
