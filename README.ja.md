# Slack to MAXQDA アダプター

English [README.md](./README.md).

## クイックスタート
```sh
git clone https://github.com/nae-lab/slack-maxqda-adapter.git
cd slack-maxqda-adapter
pnpm install
echo "SLACK_API_TOKEN=your_slack_api_token" > .env
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
```

## 詳細セットアップ手順

### 1. 必要なソフトウェアのインストール

#### Node.jsのインストール
1. [Node.jsの公式サイト](https://nodejs.org/)にアクセス
2. 「LTS」と書かれているバージョンをダウンロード
3. ダウンロードしたインストーラーを実行し、指示に従ってインストール

### 2. ターミナルの開き方

#### Windowsの場合
1. Windowsキー + R キーを押して「ファイル名を指定して実行」を開く
2. `cmd` と入力してEnterキーを押す
   - または、スタートメニューで「コマンドプロンプト」を検索

#### Macの場合
1. Command + スペースキーを押して「Spotlight検索」を開く
2. `ターミナル` と入力してEnterキーを押す
   - または、アプリケーション > ユーティリティ > ターミナル

### 3. プロジェクトのセットアップ
1. このリポジトリをダウンロード
   - [ZIPファイルをダウンロード](https://github.com/nae-lab/slack-maxqda-adapter/archive/refs/heads/main.zip)して解凍
   - または、ターミナルで以下のコマンドを実行：
     ```sh
     git clone https://github.com/nae-lab/slack-maxqda-adapter.git
     ```

2. ターミナルでプロジェクトフォルダに移動
   ```sh
   cd slack-maxqda-adapter
   ```

3. 依存関係のインストール
   ```sh
   pnpm install
   ```
   - エラーが出た場合は、以下のコマンドでpnpmをインストールしてから再試行：
     ```sh
     npm install -g pnpm
     ```

4. Slack APIトークンの設定
   - Windowsの場合：
     ```sh
     echo SLACK_API_TOKEN=your_slack_api_token > .env
     ```
   - Macの場合：
     ```sh
     echo "SLACK_API_TOKEN=your_slack_api_token" > .env
     ```
   - または、テキストエディタで`.env`ファイルを作成：
     1. プロジェクトフォルダ内に`.env`という名前の新規ファイルを作成
     2. 以下の内容を記入（`your_slack_api_token`を実際のトークンに置き換え）：
        ```
        SLACK_API_TOKEN=your_slack_api_token
        ```

### 4. 使用方法

#### 基本的な使い方
1. ターミナルでプロジェクトフォルダに移動（既に移動している場合は不要）
   ```sh
   cd slack-maxqda-adapter
   ```

2. 以下のコマンドを実行（パラメータは適宜変更）：
   ```sh
   pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
   ```

   パラメータの説明：
   - `-c CHANNEL_ID`: Slackチャンネルのチャンネルコード
   - `-s 2024-04-01`: エクスポート開始日（YYYY-MM-DD形式）
   - `-e 2025-03-11`: エクスポート終了日（YYYY-MM-DD形式）

## 必要なSlackトークンのスコープ

- `channels:history`
- `channels:read`
- `files:read`
- `groups:history`
- `remote_files:read`
- `team:read`
- `users:read`

## ツールの詳細
このツールは、指定されたチャンネルと日付範囲からSlackメッセージを取得します。主な機能：
- Slack APIを使用してメッセージを照会
- メッセージをDOCXまたはMarkdown形式で`out`ディレクトリに保存
- DOCXファイルをMAXQDAにインポートすると、日付ごとに分割され、送信者がコード化されます
- Markdownファイルは、ObsidianなどのMarkdownエディタで利用可能

## 使用例

```sh
# DOCX形式でエクスポート（デフォルト）
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11

# Markdown形式でエクスポート
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11 -f md
```

このスクリプトは数か月の日付範囲にわたるメッセージを取得し、指定された形式に変換します。

### 出力フォーマット

#### DOCX形式
- MAXQDAと互換性あり
- 生成されたファイルをMAXQDAに「構造化テキスト」としてインポート
- MAXQDA互換性のための特別なフォーマットを維持

#### Markdown形式
- ObsidianなどのMarkdownエディタと互換性あり
- 埋め込み画像やリンクにObsidianの構文を使用
- ノート取りやナレッジマネジメントのワークフローに最適
