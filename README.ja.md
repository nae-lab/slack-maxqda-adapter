# Slack to MAXQDA アダプター

English [README.md](./README.md).

## セットアップ
- 以下のコマンドで依存関係をインストールします：
  ```sh
  pnpm install
  ```
- プロジェクトのルートディレクトリに、Slack APIトークンを記載した`.env`ファイルを作成します：
  ```
  SLACK_API_TOKEN=your_slack_api_token
  ```
- pandocがシステムにインストールされていることを確認してください。

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
