# Slack to MAXQDA アダプター

## セットアップ
- 依存関係をインストールするには、以下を実行してください:
  ```sh
  pnpm install
  ```
- プロジェクトルートに `.env` ファイルを作成し、Slack APIトークンを設定してください:
  ```
  SLACK_API_TOKEN=your_slack_api_token
  ```
- pandoc がシステムにインストールされていることを確認してください。

## 必要な Slack トークンスコープ

- `channels:history`
- `channels:read`
- `files:read`
- `groups:history`
- `remote_files:read`
- `team:read`
- `users:read`


## ツールの詳細
このツールは、指定したチャンネルおよび日付範囲のSlackメッセージを取得します。具体的には:
- Slack API を使用してメッセージを問い合わせます。
- `out` ディレクトリに docx ファイルを保存します。
- docx ファイルをMAXQDAにインポートすると、日付ごとに分割され、送信者がコード化された状態でインポートされます。

## 使用例

```sh
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
```

このスクリプトは、複数月に渡る日付範囲のメッセージを取得し、.docx に変換します。

MAXQDA には、出来上がったファイルを「構造化されたテキスト」としてインポートしてください。
