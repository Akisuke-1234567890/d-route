## 2.1.0-p84.23 RC2 freeze

- P84.22までの安定状態をRC2として固定
- 招待参加導線は未実装のまま保留し、今回の機能変更はなし
- Route / Places / Chat / Members / Menu の既存挙動を維持
- バージョン・公開確認用ファイルのみ更新
- DB / Workflow変更なし

## 2.1.0-p84.22

- 招待されたRouteを開いた直後に参加回答を表示。
- 未回答の参加者はRoute名・説明を確認して、その場で「参加する / 参加しない」を選択可能。
- 不参加回答後もRoute画面から参加へ変更可能。
- 参加状態の判定が終わるまでDashboardを表示せず、管理画面のちらつきを防止。

# 2.1.0-p84.21 - RC1 Freeze

- P84.20.1までの画面遷移・固定下帯・サブRoute・UI修正をRC1として固定。
- 機能ロジック、DB、GitHub Workflowには追加変更なし。
- APP_VERSION / package version / deploy-versionを2.1.0-p84.21へ統一。

# D Route v2.1.0-p84.20.1

## Hotfix
- Route/Places/Chat/Members/MenuからRouteへ戻るローディング中も固定下帯を表示。
- ローディング中だけ下帯をフェード領域の外側へ描画し、画面本体のopacity切替に巻き込まれないよう修正。
- P84.20の長めのローディング、裏生成、フェード条件は維持。
- DB / Workflow変更なし。

# D Route v2.1.0-p84.20

- Chat / Members / Menu から Route へ戻る場合も、Places→Route と同じ準備ローディングを使用。
- Route画面はローディング幕の裏で生成し、最低表示時間・静止判定後にフェード表示。
- Route→Places の既存ローディング挙動は維持。
- DB / Workflow変更なし。

# D Route 2.1.0-p84.19

- RC final UI polish: workspace heading, menu card, modal control and bottom navigation spacing unified.
- Route / Places transition behavior is unchanged from p84.18.
- No database or workflow changes.

## v2.1.0-p84.18 RC stabilization

- P84.17.4のRoute / Places切替とローディング挙動を安定版として固定。
- APP_VERSION、deploy-version、package.json、package-lock.jsonのバージョン表記を統一。
- GitHub Workflow、DB、Route / Places遷移ロジックには追加変更なし。
- RC前の小差分整理として、ここから大きな仕様変更を止める。

# D Route v2.1.0-p84.17.4

- Routeへ戻る際、データ取得完了だけでなく画面レイアウトが安定するまでローディング表示を維持。
- Route画面はローディング幕の背面で生成し、完成後に約0.3秒でクロスフェード表示。
- Route側は最低0.9秒表示・レイアウト静止0.45秒を確認し、最大5秒で安全解除。
- Places側の既存切替挙動は維持。

# D Route v2.1.0-p84.17.3

- Route⇔Places切替時の共通ローディングが解除されず停止する問題を修正。
- 遷移先の監視処理を画面差し替え用effectから分離し、構築完了後に確実に表示。
- 3秒の安全タイムアウトは維持。

## v2.1.0-p84.17.2 Safe redeploy

- P84.17のRoute／Places切替ローディングを維持。
- Workflowファイルには触れず、通常のmain更新としてGitHub Actionsを再起動。
- 公開版のバージョン表示を2.1.0-p84.17.2へ更新。
- DB変更なし。

## v2.1.0-p84.17 Route / Places stable loading

- RouteとPlacesの相互切替だけに対象を限定し、共通ローディングを表示します。
- 遷移先は非表示のまま構築し、ページ内の読み込み表示が消えた後に2フレーム待って表示します。
- 3秒の安全タイムアウトを設け、通信失敗時に画面が隠れ続けることを防ぎます。
- Chat・Members・Menu、スクロール保持、各ページのimportには変更を加えていません。

## v2.1.0-p84.16 Transition rollback

- P84.14以降で追加した画面準備通知・共通ローディング制御を撤回。
- P84.15以降で追加したRoute／Placesスクロール位置保持を撤回。
- Route／Places／Chat／Members／Menuの画面切替をP84.13時点の安定した挙動へ復元。
- P84.15系Hotfixで生じたimport差分も撤回。
- P84.13までのUI・PWAメタ情報・サブRoute機能は維持。
- DB変更なし。

## v2.1.0-p84.13 PWA metadata consistency

- Browser・PWAのテーマ色を現在の共通キャンバス色へ統一。
- 旧「目的地を共有する」説明を「予定と行動プランを組み立てる」表現へ更新。
- Apple Touch Icon・PWAアイコンのキャッシュ番号を現行版へ更新。
- 機能・DB変更なし。

## v2.1.0-p84.12.1 Page count layout hotfix

- Route / Places切替欄のページ数を右上専用領域へ固定。
- Route名を全幅、担当メンバーを独立した下段へ配置。
- `2 / 2`が担当メンバー表示へ侵入して重なって見える問題を修正。
- DB変更なし。

## v2.1.0-p84.12 Stacked member labels

- Route切替欄とPlaces切替欄の担当メンバーを、色ドット＋氏名の1人1行表示へ変更。
- 複数名を横に詰め込まず、誰の色か分かる縦並び表示へ整理。
- 5人以上は表示上限を超えた人数を「＋N名」で省略。
- DB変更なし。

## v2.1.0-p84.11.3 Member label hard fix

- Route切替欄の担当名を複数の入れ子要素ではなく、1つのテキスト要素で描画する方式へ変更。
- 色ドットの右側へ `Aさん・Bさん` を単一行で表示し、CSS競合による重なりを根本回避。
- 長い名前は末尾省略を維持。
- DB変更なし。

## v2.1.0-p84.11.2 Member overlap hotfix

- Route切替欄の汎用 `span` CSSがメンバー名内部へ誤適用され、同一グリッド位置へ重なっていた問題を修正。
- ページ番号、Route名、担当メンバーを個別のグリッド領域へ分離。
- メンバー名内部の要素にはグリッド配置を適用せず、横並び・省略表示を維持。
- DB変更なし。

## v2.1.0-p84.11.1 Build hotfix

- Fixed the broken import block in `RouteDetailPage.tsx`.
- Restored the P84.11 shared member assignee display without changing behavior.
- Database changes: none.

## v2.1.0-p84.11 Shared member assignee display

- Route・Places・サブRoute詳細の担当メンバー表示を共通コンポーネントへ統一。
- メンバー名を文字列連結せず個別要素で描画し、文字重なり・潰れ・不自然な改行を修正。
- 担当色ドット、区切り、長い名前の省略表示を全画面で統一。
- 4人以上は表示領域を圧迫しないよう「他N名」に集約。
- DB変更なし。

# D Route Changelog

## 2.1.0-p84.10

### Fixed
- Route切替欄の担当メンバー名を文字列結合ではなく個別要素で描画し、日本語名の表示崩れを修正
- 担当メンバー名の文字サイズ・字間・表示幅を調整し、Aさん・Bさんのような短い名前を正しく読めるよう改善

# D Route Change Log

## 2.1.0-p84.9

- 旧 `/my-members` 導線をRoute一覧へ安全に戻す互換リダイレクトへ変更
- 固定下帯のない旧画面へ遷移してしまう経路を整理
- Route参加権限の判定前は管理者専用タブを表示しないよう改善
- 参加者が管理タブを一瞬見てしまうナビゲーションのちらつきを抑制

## 2.1.0-p84.8

- スプラッシュ画面のシアン・ブルー・パープル光を実機で認識できる濃さへ調整
- 光の配置・ロゴ・文字・背景色はP84.7のまま維持
- ぼかし範囲を調整し、単色の光が柔らかく見えるよう改善
- 画像素材・スモーク模様・粒子は追加せずCSSのみで実装

## 2.1.0-p84.7

- 起動直後のスプラッシュ画面をCSSのみでブラッシュアップ
- 既存の背景色・ロゴ・文字・読み込み表示は維持
- ロゴ周辺にシアン・ブルー・パープルの淡い単色光を追加
- Dream Route時代の均等な星屑ドット背景を撤去
- 画像素材を追加せず、軽量なradial-gradientで表現

## 2.1.0-p84.6

- Placesの予定カードをコンパクト化
- 予定名・時間・場所・担当表示の情報密度を整理
- 予定編集ボタンを小型の鉛筆アイコンへ統一
- 並び替えハンドルと操作列を小型化
- 長い説明・場所・予定名がカードを過度に広げないよう省略表示を追加

# D Route Changelog

## v2.1.0-p84.5

### 改善
- PlacesのPhaseカードをコンパクト化しました。
- Phase名・開始時間・予定件数を1行で確認できるようにしました。
- Phase編集を小型の鉛筆ボタンへ変更しました。
- 「＋予定」ボタンと空Phaseの追加欄を圧縮しました。
- 長いPhase名とメモは1行省略表示にしてレイアウト崩れを防ぎました。

## 2.1.0-p84.4 サブRoute UI整理

- サブRoute見出しを1行省略表示へ変更。
- 編集ボタンを小型の鉛筆アイコンへ変更。
- サブRoute編集から重複していた予定作成・編集UIを撤去し、予定管理をPlacesへ一本化。
- DB変更なし。

## v2.1.0-p84.3 サブRoute名称保存修正

- サブRoute編集で、メインRouteに時間付き予定がない場合でも名称変更を保存できるよう修正
- サブRoute本体の保存と担当メンバー設定の保存を分離
- 担当設定の保存に失敗しても、名称変更自体は確定して編集画面を閉じる
- 保存後にサブRoute一覧を再取得し、Route／Placesの表示名を即時同期
- DB変更なし

## 2.1.0-p84.2
- サブRoute名を現在のPlaces画面から直接編集できる導線を追加。
- サブRoute編集からサブRoute自体を削除可能。
- サブRouteでは最後のPhaseも削除可能にし、空状態からPhaseを再追加可能。
- メインRouteの最後のPhase削除禁止は維持。

## 2.1.0-p84.1 RC1 Phase fix

- 最後のPhase削除時にSupabaseの英語エラーとコードを表示せず、「最後のPhaseは削除できません。」へ変換。
- Phase追加・開始時刻編集後、開始時刻の早い順へ自動整列。時刻未設定は時刻設定済みPhaseの後へ配置。
- 同時刻は既存順を維持し、並び確定後にorder_valueを1000刻みで再採番。
- Phase削除後もorder_valueを再採番し、Route／Places間で順序を統一。
- DBスキーマ変更なし。

## 2.1.0-p84 RC1

- Route / Places / Chat / Members / Menuのページ外枠を`RouteWorkspacePage`へ共通化。
- HeaderとFooterを各画面から撤去し、共通フレーム側で一元管理。
- 固定下帯のための本文・Footer余白を共通化し、画面追加時のレイアウト差を防止。
- 既存機能、DB、ルーティング、モーダル処理には変更なし。

## 2.1.0-p83.4

- GlobalHeaderを共通コンポーネント化し、Route / Places / Chat / Members / Menuのヘッダー寸法と操作位置を統一。
- 固定下帯のレイアウトと本文下余白を共通化し、Workspace内の画面遷移でも下帯を維持。
- カードの角丸・枠線・影、編集モーダルの余白・ボタン高さを共通ルールへ整理。
- DB変更なし。

# D Route v2.1.0-p83.3

- Route設定とRoute複製モーダルを画面中央へ配置。
- Menuから重複していたMy Members入口を削除し、Membersは固定下帯から開く導線へ統一。
- Phase編集画面に「このPhaseを削除」を追加し、中央確認後に削除。予定は残存Phaseへ移動。

# D Route Changelog

## 2.1.0-p83.2

### Design fix
- Placesに残っていたページ固有の青紫背景を撤去しました。
- Route・Chat・Members・Menuと同じ共通キャンバスを、Places側の後読みCSSでも明示的に適用しました。
- Places本文・切替バッファ・Phase一覧の背景を透明化し、画面の土台色が二重にならないようにしました。
- 機能・DB・カードの意味色には変更ありません。

# 2.1.0-p83.1

- Route / Places / Chat / Members / Menu の画面背景を共通キャンバスへ統一。
- Chat にだけ存在していた全画面パネル背景と外枠を撤去。
- Dashboard と Route 一覧の独自ページグラデーションを共通背景へ置換。
- カード・完了・注意・削除・βなど、意味のある差別化色は維持。
- 共通ヘッダーと固定下部ナビの背景色を統一。

# D Route Changelog

## 2.1.0-p83 - Design System foundation

### Design
- 共通背景、カード、ボタン、モーダルのデザイントークンを追加。
- 同じ役割の画面・部品を同じ色、角丸、余白、影へ統一。
- 紫=主要操作、緑=完了、橙=注意、赤=削除、黄=βという意味カラーを固定。
- 必須項目は紫アクセント、任意・補助情報はニュートラル表示へ整理。
- アニメーション時間とイージングを共通化。

### Compatibility
- 機能、DB、RLS、Realtime設定に変更なし。
- 既存クラスを維持したCSS上書き方式のため、現行画面構造と互換。

## 2.1.0-p82

- v1.0候補向けのUI安定化パスを追加。
- iPhoneで入力欄をタップした際の意図しない自動拡大を全体で抑制。
- 固定下部ナビとモーダルにSafe Area余白を統一。
- キーボード操作時のフォーカス表示とタップ時のハイライト挙動を整理。
- スクロール境界の伝播を抑え、モーダル・一覧操作時の画面跳ねを軽減。
- package.json / package-lock.json / APP_VERSION の表記を同期。

## 2.1.0-p81.0
- サブRoute編集からMy Membersを複数選択して担当設定できるように追加
- 共有メンバー割り当てとは独立して保存

## 2.1.0-p80.3
- My Members一覧を1行のコンパクトカードへ変更。
- カード全体タップで編集を開く方式へ統一。
- iPhoneで入力欄フォーカス時に画面が拡大する問題を防止。
- 名前編集を中央の小型モーダルへ調整。

## v2.1.0-p79.8 Centered Places add menu

- Placesの「＋追加」選択メニューを画面下部のシート表示から中央モーダル表示へ変更。
- 選択肢、背景暗転、タップ処理はp79.7の仕様を維持。
- 小画面では左右余白と最大高さを調整し、内容が収まらない場合のみメニュー内部をスクロール。

# D Route v2.1.0-p79.4

- PlacesのメインRoute／サブRoute切替ジェスチャーだけを軽量化。
- スワイプ中はReact state更新ではなくDOMのtranslate3dをrequestAnimationFrameで直接更新。
- 指追従、切替判定、端の抵抗感、戻りアニメーションを改善。
- 下帯固定、Route画面、Destination編集・削除・並び替えには変更なし。
- DB変更なし。

# D Route v2.1.0-p79.3

- p78.9のRoute／Places内切替挙動へ復帰。
- p79.1で導入した下部ナビ固定だけを維持。
- p79.1〜p79.2の本文ダブルバッファ、追加フェード、追加スライドを撤去。
- Route／Places／Chat／Members／Menuの各ページから重複BottomNavを削除し、Workspace共通枠で一度だけ表示。
- DB変更なし。

## v2.1.0-p78.9

- Route切替時の重い暗転・filter演出を撤去
- Route画面とPlaces画面の本文を切替枠と同じtransformへ追従
- スワイプ中はGPU合成しやすいtranslate3dのみで移動
- 指を離した後は短い慣性移動で旧Routeを送り出し、新Routeを反対側から表示
- 再描画時の負荷を抑えるcontain / backface-visibilityを追加
- DB変更なし

## v2.1.0-p78.8

- Route切替時に横スライドへ短いフェードアウト／フェードイン演出を追加
- Route画面とPlaces画面で同じ演出へ統一
- 動きを減らす設定では演出を無効化
- DB変更なし

## v2.1.0-p78.7

- Route / Placesの切替枠をコンパクト化
- 切替枠を指追従する滑らかなスワイプへ統一
- Places見出しの説明文を削除
- 目的地 / Phase / 別行動の追加操作を「＋追加」へ統合
- 追加操作を下部アクションシートへ整理
- DB変更なし

## v2.1.0-p78.6

- Route画面とPlaces画面のRoute切替スワイプを上部切替枠だけに限定
- 本文・Destinationカード・並び替えハンドル上ではRoute切替を開始しない
- Destination単品削除、上下並び替え、縦スクロールとのジェスチャー競合を解消
- DB変更なし

## v2.1.0-p78.5

- Destinationカード操作中は親のRoute切替スワイプを完全に停止
- ドラッグハンドルのPointer操作をカード横スワイプから分離
- Destination上下並び替え中の指追従と画面端自動スクロールを改善
- Destination操作終了後にのみRoute切替を再有効化
- DB変更なし

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

- Phase全体の左スワイプ削除を撤去
- 各Destinationカード単位の左スワイプ削除へ変更
- Destinationスワイプ中はRouteカルーセルへイベントを渡さず、別Routeへ誤移動しないよう修正
- 赤い削除領域をDestinationカードの背面だけに表示
- 削除ボタンから既存の確認ダイアログを開く
- DB変更なし

## v2.1.0-p78.1

- メインRouteの分岐・合流・離脱表示を1行中心のコンパクト表示へ変更
- 常時表示していた説明文とスワイプ案内を削除
- 接続種別・サブRoute名・移動矢印だけを表示
- 同じ目的地に複数の接続がある場合は横並び・折返しで省スペース表示
- DB変更なし

## v2.1.0-p78

- PlacesとRoute閲覧画面のRoute切替UIを共通化
- Placesでも左スワイプで次、右スワイプで前のRouteへ切替
- Route種別・Route名・ページ数・ドット表示を統一
- メイン／サブRoute編集時の横スライド表示を追加
- DB変更なし

## v2.1.0-p78

- メインRouteの時刻付きDestinationカードへ分岐・再合流・途中合流・途中離脱の接続表示を追加
- 接続表示から該当サブRouteへ直接切替可能
- サブRouteの予定はメインと同じPhase / Destination表示を維持
- Places上部の重複した別行動一覧を簡略化
- DB変更なし

## v2.1.0-p76

- サブRouteをメインRouteと同じPhase / Destination構造へ統合する基盤を追加
- Places上部でメインRouteと各サブRouteを切替可能
- サブRouteでもPhase追加、目的地追加・編集・並び替えを共通UIで利用
- 既存の別行動予定を新しい共通Destinationへ移行
- 開始・合流・離脱アンカーは従来どおりメインRouteの時刻付きDestinationを参照

## v2.1.0-p75

- 参加者の別Route割り振りをRoute表示へ反映
- 参加者は割り振られた別Routeを最初に表示
- 割り振られたRouteへ「あなたのRoute」表示を追加
- メインRouteと他の別Routeも従来どおり切替可能
- DB変更なし

## v2.1.0-p74

- 別行動の参加者割り振りをPlacesの別行動編集へ移動
- 参加中メンバーをチェック式で選択可能
- 別の別行動に所属中のメンバーを選ぶと所属先を移動
- Members画面を招待・参加状況の管理だけに整理
- DB変更なし

## v2.1.0-p73.2

- Route切替を指追従型カルーセルへ変更
- 指の移動量に合わせて画面が横へ追従
- 距離とスワイプ速度の両方で切替を判定
- 閾値未満では滑らかに元位置へ復帰
- 先頭・末尾では抵抗を付けて行き止まりを表現
- DB変更なし

## v2.1.0-p73.1

- Route切替を左スワイプで次、右スワイプで前へ変更
- Route切替時に横スライドアニメーションを追加
- メインRoute・分岐Route・合流Route・離脱Routeの種類表示を追加
- 切替案内文を新しいスワイプ方向へ更新
- DB変更なし

## v2.1.0-p73

- Route画面にメインRoute / 別行動の横切替を追加
- 右スワイプで別行動、左スワイプで前のRouteへ戻る操作を追加
- ボタンとページドットからも切替可能
- 別行動の接続方法、開始・合流地点、予定一覧を表示
- 別行動の予定から外部地図を開ける導線を追加
- DB変更なし

## v2.1.0-p72

- 別行動ごとに専用の予定を追加・編集・削除できる基盤を追加
- Placesの別行動編集画面に予定一覧と入力欄を追加
- 別行動の予定はメインRouteのDestinationと分離して保存
- 右スワイプ表示は次工程

## v2.1.0-p71

- Placesの別行動カードから作成済み設定を再編集可能
- 別行動編集画面から別行動を削除可能
- 削除時は参加者の割り振りを解除し、別行動をアーカイブ
- メインRoute側に接続地点の概要表示を維持

## v2.1.0-p70.4

- Phaseカードの左スワイプ削除をRoute選択画面と同じ背面アクション方式へ統一
- 通常時は赤い削除領域を完全に非表示
- スワイプした1件だけ削除ボタンを表示
- Phaseカード本体を不透明化し、Destinationや操作ボタンへの赤い透け・重なりを解消
- DB変更なし

## v2.1.0-p70.3

- PlacesのPhaseカードを左スワイプで削除できるよう変更
- 削除前の確認と、目的地の移動先案内を維持
- 最後の1Phaseは削除不可
- Phase編集モーダル内の削除ボタンを撤去
- DB変更なし

## v2.1.0-p70.2

- Default Phase削除時に一意制約エラーとなる問題を修正
- Phase削除とDefault Phase切替をDB関数内の1トランザクションで実行
- 削除Phase内のDestinationは残存Phaseへ移動

## v2.1.0-p70.1

- 別行動設定画面の選択マークが大きく崩れる問題を修正
- 接続方法はカード全体をタップして選択する方式へ変更
- 別行動画面の内部用語と不自然な英語を分かりやすい日本語へ調整
- 『時刻付きDestination』を『メインの予定』など用途別の表現へ変更
- DB変更なし

## v2.1.0-p70

- Placesへ別Routeの追加・編集UIを追加
- 分岐して再合流、途中から合流、途中離脱の3接続形式を選択可能
- 接続先は時刻付きDestinationから選択
- Places上部に別Route要約カードを表示
- 右スワイプ表示と別Route内Destination編集は後続Patch
- DB変更なし（p69基盤を利用）

## v2.1.0-p69.1

- VersionBadgeが存在しないVERSION_LABELをimportしてビルド失敗する問題を修正
- APP_VERSIONへ統一
- DB変更なし

## v2.1.0-p69

- 分岐・途中合流・途中離脱を共通の「別Route」内部モデルへ統合
- 接続形式 `split_merge` / `join` / `leave` を追加
- 開始・終了アンカーは時刻付きのメインDestinationのみ指定可能
- 分岐再合流は開始と終了、途中合流は終了のみ、途中離脱は開始のみをDBで検証
- 既存p68 Branchは未設定ドラフトとして保持し、後から別Routeへ設定可能
- 右スワイプ表示とPlaces編集UIは後続Patchで実装

## v2.1.0-p68.3

- 新規Route作成モーダル全体を上下スクロール可能に修正
- テンプレート一覧の内側スクロールは維持
- iPhoneでRoute名・説明・作成ボタンまで移動できない問題を修正
- DB変更なし

## v2.1.0-p68.2

- route_membersの自己参照RLSをSecurity Definer helperへ置換し、再帰エラーを修正
- 既存RouteのOwner member行を安全に補完
- Members取得に失敗してもroutes.owner_user_idからRoute作成者を判定
- Route作成者はMembers一覧の状態にかかわらずBranchを先に作成可能
- 招待ボタンをRoute作成者のみに限定

## v2.1.0-p68.1

- Members本体とBranch情報の読み込みを分離
- Branch取得失敗時もMembers画面とメンバー一覧を表示継続
- 自分の権限判定をBranch取得から独立
- 管理者判定が成功すれば、参加者が未招待でもBranch作成欄を表示
- DB変更なし

## v2.1.0-p68

- Branch作成と参加者割り振りの内部基盤を追加
- 参加者は同時に1つのBranchへ所属
- 管理者がMembers画面からBranch作成・割り振り・全体Route復帰を操作可能
- Branchと割り振りはRoute参加者が閲覧可能
- DB migration追加

## v2.1.0-p67.1

- Route本体取得と参加者判定を分離
- route_members取得に失敗してもRoute詳細を表示継続
- p67適用後に「Routeを開けませんでした」となる問題を修正
- DB変更なし

## v2.1.0-p67

- 管理者と参加者でRoute表示を分離する表示基盤を追加
- 参加者画面を「現在・次・その次」の縦カード表示へ変更
- 参加者の下部ナビゲーションをRoute / Chatの2項目へ整理
- 管理者向け編集UIと内部Planning構造は維持
- DB変更なし

## v2.1.0-p66

- Route Chatへ送信時位置情報の添付を追加
- 位置取得は送信前の1回のみで、常時追跡は行わない
- 位置付きメッセージから外部地図を開けるように追加
- GPS精度表示と低精度時の確認を追加
- DB migration追加

## v2.1.0-p65

- Route Chatの既読管理を追加
- 未読区切り・未読件数・既読人数を表示
- Chatメッセージと既読状態のRealtime同期を追加
- DB migration追加

# v2.1.0-p64

- Destinationカード左側に完了チェックボタンを配置。
- 完了済みカードは薄く表示し、タイトルと説明の取り消し線を廃止。
- Destinationの完了操作ユーザーを `completed_by` に記録。
- Destination更新をSupabase Realtimeで参加メンバー間に同期。
- 完了解除時は `completed_at` と `completed_by` をクリア。

## v2.1.0-p63

- Route作成時の任意説明入力を追加
- テンプレート作成RPCへ説明引数を追加
- DB RPC更新

## v2.1.0-p62

- Route新規作成に空Route / テンプレート選択を追加
- Route設定からテンプレート・アーカイブ・削除を削除
- アーカイブ一覧取得を修正
- DB変更なし

## v2.1.0-p61

- 左スワイプをアーカイブ/復元＋削除の2操作へ変更
- Menuのアーカイブ操作を一覧へ統一
- DB変更なし

## v2.1.0-p60

- Routeアーカイブ・復元を実装
- Route一覧に表示切替を追加
- DB RPC追加

## v2.1.0-p59

- スワイプ削除アクションの左側にも角丸を追加
- DB変更なし

## v2.1.0-p58

- Route削除確認を画面中央へ変更
- 開閉アニメーションを追加
- DB変更なし

## v2.1.0-p57

- Routeカード右端を「≪⋯」へ変更
- 通常時に透けていた削除領域を完全非表示化
- DB変更なし

## v2.1.0-p56

- Routeカードの最大左スワイプ削除を実装
- 削除前の確認ダイアログを追加
- DB変更なし

## v2.1.0-p55

- 一般テンプレートを4種類へ整理
- DB RPC更新

## v2.1.0-p54

- 6種類の一般向け内蔵テンプレートを追加
- DB RPC追加

## v2.1.0-p53

- Route複製機能を実装
- Planningデータをリセット状態でコピー
- DB RPC追加

## v2.1.0-p52

- Menuから重複していたメンバー・招待項目を削除
- Membersタブへ導線を一本化
- DB変更なし

## v2.1.0-p51

- MenuからMembers / 招待画面への導線を有効化
- 共有・招待をメンバー・招待へ名称整理
- DB変更なし

## v2.1.0-p50

- Route説明をカード内アコーディオンへ変更
- 別ウィンドウ/モーダル表示を廃止
- DB変更なし

## v2.1.0-p49

- Route一覧に「説明を見る」を追加
- Route説明を一覧側のモーダルで確認可能に変更
- DB変更なし

## v2.1.0-p48

- Menu Route設定を実装
- routes.description追加

## v2.1.0-p47

- Route操作を「ルートを見る」1ボタンへ統合
- 地図を見るボタンを削除
- DB変更なし

## v2.1.0-p46

- 「ここへ向かう」をルート確認画面を開く挙動へ変更
- 自動ナビ開始を廃止
- DB変更なし

## v2.1.0-p45

- Route経路案内に徒歩 / 公共交通 / 車の切替を追加
- DB変更なし

## v2.1.0-p44

- 必須表示と完了状態UIを整理
- DB変更なし

## v2.1.0-p43

- 完了操作をカード右上へ移動
- 地図ボタンを青系へ変更
- 完了済みカードの暗転を強化
- DB変更なし

## v2.1.0-p42

- Route操作ボタンの優先順位とサイズを再設計
- 「ここへ向かう」を強調、完了をコンパクト化
- DB変更なし

## v2.1.0-p41

- Destinationに現在地からの経路案内「ここへ向かう」を追加
- DB変更なし

## v2.1.0-p40

- Destinationカードに外部地図導線を追加
- DB変更なし

## v2.1.0-p39

- participating memberへDestination完了操作を開放
- 完了更新を限定RPC化しRoute設計権限とは分離
- DB migration追加

## v2.1.0-p38

- Route Chatをparticipating memberへ開放
- DB RLS変更

## v2.1.0-p37

- Route member read access
- route_members SELECT RLSの再帰を回避
- Members招待ボタンをOwner限定表示
- Chat member accessは未変更

## v2.1.0-p36

- Member participation response
- Members select RLSをRoute memberへ拡張

## v2.1.0-p35

- Membersにlogin_id招待を追加
- Owner限定invite RPC追加

## v2.1.0-p34

- Members DB foundation
- OwnerをRoute memberとして自動登録

## v2.1.0-p33.3

- Route Chat投稿上限を50文字へ変更

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

## v2.1.0-p79.5 Places prepared Route reveal

- PlacesのメインRoute / サブRoute切替は上部のRoute切替枠だけを指追従させる
- Phase / Destination本文はスワイプ中に横移動させない
- 切替先のPlanningデータを先に取得し、準備完了後に本文を短くフェード＋微小スライド表示
- 画面構成が生成される途中を見せない
- Destination削除・並び替え・縦スクロール、下部ナビ固定には変更なし
- DB変更なし


## v2.1.0-p79.6 Places Route-matched switch

- PlacesのメインRoute / サブRoute切替を、正常に動作しているRoute画面の距離・速度判定と送り出しタイミングへ統一
- スワイプ中に動くのは上部のRoute切替枠だけとし、Phase / Destination本文は横移動させない
- サブRouteのPlanningデータを事前キャッシュし、切替確定時の取得待ちによる「パッと生成される」見え方を抑制
- 切替枠は現在表示を送り出した後、反対側の近位置から中央へ入るRoute画面と同じ動作
- p79.5のPlaces独自クロスフェード処理を撤去
- 下部ナビ固定、Destination削除・並び替え、Route閲覧画面には変更なし
- 改善しない場合はp79.3へ戻しやすい最小差分
- DB変更なし
## v2.1.0-p79.7 Places add menu tap recovery

- Placesの「＋追加」ボタンから追加メニューが開かない不具合を修正
- 追加メニュー本体を復元し、目的地・Phase・別行動／接続設定を選択可能にした
- 「＋追加」のタップをRoute切替ジェスチャーから分離
- p79.6のPlaces Route切替挙動と下部ナビ固定は変更なし
- DB変更なし


## 2.1.0-p79.9
- 軽い選択・確認モーダルを中央表示と短い拡大フェードへ統一。
- ＋追加、目的地削除確認、Routeアーカイブ確認へ同じ動きを適用。
- 入力項目の多い編集モーダルは従来レイアウトを維持。
