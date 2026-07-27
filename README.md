# D Route v2.1.0-p06

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


## v2.1.0-p06 Scope

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
