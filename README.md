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
- Saves docx files in `out` directory
- When imported into MAXQDA, the docx file is split by date and senders are coded.

## Usage Example

```sh
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
```

This script retrieves messages over a multi-month date range and converts them to .docx.

Import the resulting file into MAXQDA as "Structured Text".

