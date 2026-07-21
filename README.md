# D Route v2.0.1

Route作成機能。React + TypeScript + Vite、PWA、Supabase Magic Link認証に加え、Route一覧取得・作成モーダル・routesテーブルへの保存を実装しています。

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

## Scope

この版ではRoute詳細、Planning、Today、Route編集、参加者、Realtimeは未実装です。　
