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

## ツールの詳細
このツールは、指定したチャンネルおよび日付範囲のSlackメッセージを取得します。具体的には:
- Slack API を使用してメッセージを問い合わせます。
- 日ごとにメッセージを Markdown ファイルとして `out` ディレクトリに保存します。
- すべてのファイルを連結して `slack-log.md` を生成します。
- pandoc を用いて Markdown ファイルを DOCX に変換し、MAXQDA にインポートできる形式にします。

## 使用例

```sh
./fetch_messages.sh CHANNELID 2024-08-13 2024-09-05
```

このスクリプトは、複数月に渡る日付範囲のメッセージを取得し、日別の出力を連結して out/slack-log.md を生成、pandoc により out/slack-log.docx に変換します。

MAXQDA には、出来上がった `out/slack-log.docx` をプリプロセッサ機能でインポートしてください。
