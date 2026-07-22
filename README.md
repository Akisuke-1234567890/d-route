# D Route v2.0.2

Route詳細画面の土台を追加したReact + TypeScript + Vite版です。Supabase Magic Link認証、Route一覧取得・作成に加えて、Routeカードから個別の詳細画面へ移動できるようになりました。

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

この版ではRoute詳細画面の器と、Today・Planning・Membersの準備中セクションまでを実装しています。各セクションの実機能、Route編集、参加者管理、Realtimeは今後実装します。
