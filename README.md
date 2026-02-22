# Gamma Wave Booster Pro (GAS Edition)

## 概要
脳波誘導アプリ「ガンマ波ブースター」のGoogle Apps Script (GAS) 実装版です。
Web Audio APIによるバイノーラルビート生成と、YouTube IFrame APIによる環境音再生を組み合わせています。

## ファイル構成
- `Code.gs`: GASバックエンドスクリプト（HTML配信のみ）
- `index.html`: フロントエンド（React, Tailwind, Web Audio API, Application Logic）

## インストール手順（GASへのデプロイ）

1. **Google Apps Script プロジェクトの作成**
   - [script.google.com](https://script.google.com/) にアクセスし、「新しいプロジェクト」を作成します。

2. **コードの反映**
   - エディタ上の `コード.gs` (または `Code.gs`) に、このフォルダの `Code.gs` の内容をコピー＆ペーストします。
   - 「ファイル」>「HTML を追加」を選択し、ファイル名を `index` とします。
   - 作成された `index.html` に、このフォルダの `index.html` の内容をすべてコピー＆ペーストします。

3. **Firebase 設定（オプション）**
   - 設定のクラウド保存機能を使用するには、Firebaseプロジェクトが必要です。
   - [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成し、「ウェブアプリ」を追加します。
   - 表示される `firebaseConfig` オブジェクト（apiKeyなど）をコピーします。
   - `index.html` 内の `// --- Firebase Configuration Placeholder ---` の部分を、取得した設定値で書き換えます。
   - Firestore データベースを作成し、ルールを適切に設定します（テストモードなど）。
   - ※ 設定しない場合でも、ブラウザの `localStorage` を使用して設定は保存されます。

4. **デプロイ**
   - 右上の「デプロイ」>「新しいデプロイ」を選択。
   - 種類の選択: 「ウェブアプリ」。
   - 次のユーザーとして実行: 「自分」。
   - アクセスできるユーザー: 「全員」（または必要に応じて変更）。
   - 「デプロイ」をクリックし、発行されたURLにアクセスします。

## 注意事項
- YouTubeの自動再生ポリシーにより、初回はユーザー操作（「再生」ボタンのクリック）が必要です。
- スマホでバックグラウンド再生する場合、画面をロックするとAudioContextやYouTube再生が停止することがあります（OSの仕様）。
