# Slack to MAXQDA アダプター

English [README.md](./README.md).

## クイックスタート
```sh
git clone https://github.com/nae-lab/slack-maxqda-adapter.git  # リポジトリをダウンロード
cd slack-maxqda-adapter                                        # プロジェクトフォルダに移動
pnpm install                                                   # 必要なパッケージをインストール
echo "SLACK_API_TOKEN=your_slack_api_token" > .env            # Slack APIトークンを設定
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11          # エクスポートを実行
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
   - PowerShellを使用する場合は、「Windows PowerShell」を検索

#### Macの場合
1. Command + スペースキーを押して「Spotlight検索」を開く
2. `ターミナル` と入力してEnterキーを押す
   - または、アプリケーション > ユーティリティ > ターミナル

### 3. プロジェクトのセットアップ
1. このリポジトリをダウンロード（2つの方法があります）

   A. GitHubからZIPファイルをダウンロードする場合：
   1. [ZIPファイルをダウンロード](https://github.com/nae-lab/slack-maxqda-adapter/archive/refs/heads/main.zip)して解凍
      - 注意：解凍すると `slack-maxqda-adapter-main` というフォルダが作成されます
      - 以降のコマンドでは、このフォルダ名を使用してください：
        ```sh
        cd slack-maxqda-adapter-main
        ```
      - または、フォルダ名を変更してもOKです：
        ```sh
        mv slack-maxqda-adapter-main slack-maxqda-adapter  # フォルダ名を変更
        cd slack-maxqda-adapter                            # 変更後のフォルダに移動
        ```

   B. Gitコマンドを使用する場合：
   ```sh
   git clone https://github.com/nae-lab/slack-maxqda-adapter.git  # リポジトリをローカルにコピー
   cd slack-maxqda-adapter                                        # 作成されたフォルダに移動
   ```

2. 依存関係のインストール
   ```sh
   pnpm install  # プロジェクトの実行に必要なパッケージをインストール
   ```
   - エラーが出た場合は、以下のコマンドでpnpmをインストールしてから再試行：
     ```sh
     npm install -g pnpm  # pnpmをグローバルにインストール
     ```

3. Slack APIトークンの設定
   - "User OAuth Token"を取得する
   - トークンを取得するための手順：
     - Slackのワークスペースにログイン
     - ワークスペースの設定ページに移動
     - アプリケーションの設定ページに移動
     - OAuth & Permissions
     - 「Install App to Workspace」をクリック
     - 「User OAuth Token」をコピー

   - Windowsの場合：
     ```sh
     echo SLACK_API_TOKEN=your_slack_api_token > .env  # .envファイルを作成してトークンを書き込み
     ```
   - Macの場合：
     ```sh
     echo "SLACK_API_TOKEN=your_slack_api_token" > .env  # .envファイルを作成してトークンを書き込み
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
   cd slack-maxqda-adapter  # プロジェクトのフォルダに移動
   # または、ZIPからダウンロードした場合
   cd slack-maxqda-adapter-main
   ```

2. 以下のコマンドを実行（パラメータは適宜変更）：
   ```sh
   pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
   ```

   パラメータの説明：
   - `-c CHANNEL_ID`: Slackチャンネルのチャンネルコード（チャンネルのURLから取得可能）
      - チャンネルIDの取得方法：
        1. ブラウザでSlackを開く
        2. 対象のチャンネルを開く
        3. URLの最後の部分（`C`から始まるコード）がチャンネルID
           例：`https://workspace.slack.com/archives/C08A266KFDF` の場合、`C08A266KFDF`がチャンネルID
        - または、Slackアプリから：
          1. 左サイドバーのチャンネル名を右クリック
          2. 「チャンネルの詳細を表示」を選択
          3. 一番下にチャンネルIDが表示されます
   - `-s 2024-04-01`: エクスポート開始日（YYYY-MM-DD形式）
   - `-e 2025-03-11`: エクスポート終了日（YYYY-MM-DD形式）

   コマンドの動作：
   1. 指定されたSlackチャンネルに接続
   2. 指定された期間のメッセージを取得
   3. メッセージを指定された形式（デフォルトはDOCX）に変換
   4. `out`フォルダに結果を保存

## トラブルシューティング

### コマンドラインの基本操作について

コマンドラインの使い方に不慣れな方は、以下の公式ガイドをご参照ください：

- [Windowsでのコマンドプロンプトの使い方（Microsoft公式）](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/windows-commands)
- [Macでのターミナルの使い方（Apple公式）](https://support.apple.com/ja-jp/guide/terminal/welcome/mac)
- [コマンドラインの基本操作ガイド（DigitalOcean）](https://www.digitalocean.com/community/tutorials/how-to-use-cd-pwd-and-ls-to-explore-the-file-system-on-a-linux-server)

### よくあるエラーと対処方法

1. `command not found`
   - 原因：コマンドが見つからない（インストールされていない）
   - 対処：必要なソフトウェアのインストールを確認

2. `No such file or directory`
   - 原因：指定したファイルやディレクトリが存在しない
   - 対処：
     - パスが正しいか確認
     - ZIPからダウンロードした場合、フォルダ名が`slack-maxqda-adapter-main`になっているか確認

3. `Permission denied`
   - 原因：権限が不足している
   - 対処：必要に応じて管理者権限で実行

## 必要なSlackトークンのスコープ

- `channels:history`
- `channels:read`
- `im:read`
- `im:history`
- `mpim:read`
- `mpim:history`
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
