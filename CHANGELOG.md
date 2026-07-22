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
