# D Route v2.1.0-p10

Dream Routeの実地テストを踏まえて再設計した、React + TypeScript + Vite版のD Routeです。

この版では、アプリ起動後に利用するRouteを選ぶ **Home（Route launcher）** を新設計へ更新しました。HomeではBottom Navigationを表示せず、Routeの選択と新規作成に役割を絞っています。

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` にSupabase URLとAnon Keyを設定してください。Magic LinkのRedirect URLには、ローカルURLとGitHub Pages公開URLを登録します。

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```


## v2.1.0-p10 Scope

- Route / Places / Chat / Members / Menu の画面切り替えにフェードアウト→フェードインを追加
- 140msずつの短い遷移で操作感を損なわず、瞬間的な切り替わりを緩和
- OSの「視差効果を減らす」設定ではアニメーションを無効化
- DB変更なし（Supabase migration追加なし）

## v2.1.0-p03 Scope

- 正式採用した「RouteがDを描く」新ロゴへブランドマークを更新
- ターコイズ → ブルー → 紫のRouteグラデーションと4つのノードを採用
- PWAアイコン／maskableアイコン／Apple Touch Iconを新ロゴへ統一
- アプリ背景をネイビー〜紫を軸にしたグラデーションへ調整
- DB変更なし（Supabase migration追加なし）

## v2.1.0-p02 Scope

- HomeをRoute選択画面として再構成
- ヘッダーにD Route、説明文、Route作成ボタンを配置
- Routeカード全体をタップ領域化
- Routeがある場合の作成導線を右上の＋ボタンへ一本化
- Routeが0件の場合のみ「最初のRouteを作る」を表示
- Route名を20文字までに制限
- HomeではBottom Navigationを非表示

現在のDB取得項目にはRoute利用日と参加人数がないため、この版のカードでは正確に取得できる「最終更新日」のみ表示します。利用日・参加人数はDatabase Baselineとデータモデル整備後に追加します。


## v2.1.0-p10 Scope

- LINE公式など外部導線からアカウント作成画面を直接開ける入口を追加
- `?flow=signup` または `?mode=signup` で未ログイン時に `/start` を初期表示
- ログイン済みユーザーは従来どおりアカウント状態に応じてD Routeへ遷移
- p07のロゴ・アイコン・画面遷移仕様は維持
- DB変更なし


## v2.1.0-p10 Scope

- Route管理画面にRoute削除機能を接続
- 削除操作はRoute作成者（owner）のみに表示
- 削除前にRoute名を含む確認ダイアログを表示
- Supabase RPC側でもownerを検証し、参加メンバーからの削除を拒否
- 物理DELETEではなく既存のdeleted_atを使ったsoft delete
- 削除完了後はRoute一覧へ戻り、削除済みRouteは一覧・詳細から除外
- Database Baselineとして削除RPC migrationを追加


## v2.1.0-p10 Scope

- Route削除確認モーダルをスマホ画面中央へ配置
- 下部ナビより前面に表示して重なりを防止
- 短い画面ではモーダル内をスクロール可能にして見切れを防止
- スマホ幅では削除／キャンセルを縦配置
- DB変更なし
