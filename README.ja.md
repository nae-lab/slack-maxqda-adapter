
# Slackエクスポーター

SlackメッセージをDOCXおよびMarkdown形式でエクスポートします。

English [README.md](./README.md)


```typescript
// Markdown形式でエクスポート
const markdownResult = await exporter.export({
   channelId: 'C1234567890',
   startDate: '2024-04-01',
   format: 'md',
   outputPath: './output/channel-messages.md',
});

// 複数チャンネルのエクスポート
const multipleResults = await exporter.exportMultiple([
   {
      channelId: 'C1234567890',
      startDate: '2024-04-01',
      format: 'docx',
      outputPath: './output/channel1.docx',
   },
   {
      channelId: 'C0987654321',
      startDate: '2024-04-01',
      format: 'md',
      outputPath: './output/channel2.md',
   },
]);
```

## APIリファレンス

### SlackMaxqdaAdapter クラス

#### コンストラクタ

```typescript
new SlackMaxqdaAdapter(options: SlackMaxqdaAdapterOptions)
```

**オプション:**

- `token: string` - Slack APIトークン（必須）
- `concurrency?: number` - 並列処理数（デフォルト: 4）

#### メソッド

##### `export(options: ExportOptions): Promise<ExportResult>`

単一チャンネルのメッセージをエクスポートします。

**オプション:**

- `channelId: string` - エクスポート対象チャンネルID
- `startDate: string` - 開始日（YYYY-MM-DD）
- `endDate?: string` - 終了日（YYYY-MM-DD、省略時はstartDate）
- `format: 'docx' | 'md'` - 出力形式
- `outputPath: string` - 出力ファイルパス

**戻り値:** ファイルパス、チャンネル名、メッセージ数、形式を含む `ExportResult`

##### `exportMultiple(exports: ExportOptions[]): Promise<ExportResult[]>`

複数チャンネルのメッセージをエクスポートします。

##### `getChannelName(channelId: string): Promise<string>`

チャンネルIDからチャンネル名を取得します。

### 型定義

```typescript
interface SlackMaxqdaAdapterOptions {
   token: string;
   concurrency?: number;
}

interface ExportOptions {
   channelId: string;
   startDate: string;
   endDate?: string;
   format: 'docx' | 'md';
   outputPath: string;
}

interface ExportResult {
   filePath: string;
   channelName: string;
   messageCount: number;
   format: 'docx' | 'md';
}
```



## Slack APIトークンの取得

1. [Slack API Applications](https://api.slack.com/apps) にアクセス
2. 新しいアプリを作成するか既存のものを選択
3. 「OAuth & Permissions」に移動
4. 以下のbotトークンスコープを追加：
   - `channels:read`
   - `channels:history`
   - `groups:read`
   - `groups:history`
   - `im:read`
   - `im:history`
   - `mpim:read`
   - `mpim:history`
   - `users:read`
   - `files:read`
   - `emoji:read`
5. ワークスペースにアプリをインストール
6. 「Bot User OAuth Token」をコピー

## チャンネルIDの取得

### ブラウザから
1. ブラウザでSlackを開く
2. 対象チャンネルに移動
3. URLの最後の部分がチャンネルID：`https://workspace.slack.com/archives/C1234567890`

### Slackアプリから
1. チャンネル名を右クリック
2. 「チャンネルの詳細を表示」を選択
3. 一番下にチャンネルIDが表示される

## 開発

### セットアップ

```sh
git clone https://github.com/your-org/slack-maxqda-adapter.git
cd slack-maxqda-adapter
pnpm install
```

### ビルド

```sh
pnpm build
```

### テスト

```sh
pnpm test
```

### ウォッチモードでの開発

```sh
pnpm build:watch
```

## ライセンス

MIT

## コントリビュート

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更をコミット（`git commit -m 'Add some amazing feature'`）
4. ブランチをプッシュ（`git push origin feature/amazing-feature`）
5. プルリクエストを作成

## トラブルシューティング

### よくあるエラー

1. **Channel not found**: チャンネルIDが正しいか、Botがチャンネルにアクセスできるか確認してください
2. **Invalid token**: Slack APIトークンが正しいか、必要なスコープが付与されているか確認してください
3. **Rate limiting**: このツールは自動的にレート制限を処理しますが、大規模なエクスポート時は並列数を減らしてください
