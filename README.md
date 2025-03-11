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
- Saves daily messages as markdown files in the `out` directory.
- Concatenates all daily files into a single `slack-log.md` file.
- Converts the markdown file to a DOCX file using pandoc for import into MAXQDA.

## Usage Example

```sh
./fetch_messages.sh CHANNELID 2024-08-13 2024-09-05
```

This script retrieves messages for a multi-month range, concatenates the daily output into out/slack-log.md, and converts it to out/slack-log.docx using pandoc.

You would import the resulting `out/slack-log.docx` into MAXQDA using preprocessor feature.
