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
