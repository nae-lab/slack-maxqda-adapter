# Slack Exporter

Export Slack messages to DOCX and Markdown formats.

日本語版 [README.ja.md](./README.ja.md)

```typescript
// Export multiple channels
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

## API Reference
const markdownResult = await exporter.export({
  channelId: 'C1234567890',
  startDate: '2024-04-01',
  format: 'md',
  outputPath: './output/channel-messages.md',
});

// Export multiple channels
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


## API Reference

### SlackMaxqdaAdapter Class

#### Constructor

```typescript
new SlackMaxqdaAdapter(options: SlackMaxqdaAdapterOptions)
```

**Options:**

- `token: string` - Slack API token (required)
- `concurrency?: number` - Number of concurrent processes (default: 4)

#### Methods

##### `export(options: ExportOptions): Promise<ExportResult>`

Export messages from a single channel.

**Options:**

- `channelId: string` - Channel ID to export
- `startDate: string` - Start date (YYYY-MM-DD)
- `endDate?: string` - End date (YYYY-MM-DD), defaults to startDate
- `format: 'docx' | 'md'` - Output format
- `outputPath: string` - Output file path

**Returns:** `ExportResult` with file path, channel name, message count, and format.

##### `exportMultiple(exports: ExportOptions[]): Promise<ExportResult[]>`

Export messages from multiple channels.

##### `getChannelName(channelId: string): Promise<string>`

Get channel name by ID.

### Types

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

## Getting Slack API Token

1. Visit [Slack API Applications](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Navigate to "OAuth & Permissions"
4. Add the following bot token scopes:
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
5. Install the app to your workspace
6. Copy the "Bot User OAuth Token"

## Getting Channel ID

### From Browser
1. Open Slack in your browser
2. Navigate to the target channel
3. The channel ID is in the URL: `https://workspace.slack.com/archives/C1234567890`

### From Slack App
1. Right-click on the channel name
2. Select "View channel details"
3. The channel ID is shown at the bottom

## Development

### Setup

```sh
git clone https://github.com/your-org/slack-maxqda-adapter.git
cd slack-maxqda-adapter
pnpm install
```

### Build

```sh
pnpm build
```

### Test

```sh
pnpm test
```

### Development with Watch Mode

```sh
pnpm build:watch
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Errors

1. **Channel not found**: Verify the channel ID and ensure the bot has access to the channel
2. **Invalid token**: Check that your Slack API token is correct and has the required scopes
3. **Rate limiting**: The tool automatically handles rate limits, but you may need to reduce concurrency for very large exports

