# Slack to MAXQDA Adapter

日本語 [README.ja.md](./README.ja.md).

## Setup
- Install dependencies with:
  ```sh
  pnpm install
  ```
- Create a `.env` file in the project root with your Slack API token:
  ```
  SLACK_API_TOKEN=your_slack_api_token
  ```
- Ensure pandoc is installed on your system.

## Required Slack Token Scopes

- `channels:history`
- `channels:read`
- `files:read`
- `groups:history`
- `remote_files:read`
- `team:read`
- `users:read`


## Tool Details
This tool retrieves Slack messages from a specified channel and date range. It:
- Queries the Slack API for messages.
- Saves messages in either DOCX or Markdown format in the `out` directory
- When imported into MAXQDA, the docx file is split by date and senders are coded.
- Markdown files can be used with Obsidian or other Markdown editors.

## Usage Example

```sh
# Export as DOCX (default)
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11

# Export as Markdown
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11 -f md
```

This script retrieves messages over a multi-month date range and converts them to the specified format.

### Output Formats

#### DOCX Format
- Compatible with MAXQDA
- Import the resulting file into MAXQDA as "Structured Text"
- Maintains special formatting for MAXQDA compatibility

#### Markdown Format
- Compatible with Obsidian and other Markdown editors
- Uses Obsidian's syntax for embedded images and links
- Ideal for note-taking and knowledge management workflows

