# Slack to MAXQDA Adapter

日本語 [README.ja.md](./README.ja.md).

## Quick Start
```sh
git clone https://github.com/nae-lab/slack-maxqda-adapter.git
cd slack-maxqda-adapter
pnpm install
echo "SLACK_API_TOKEN=your_slack_api_token" > .env
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
```

## Detailed Setup Instructions

### 1. Install Required Software

#### Install Node.js
1. Visit [Node.js official website](https://nodejs.org/)
2. Download the version marked as "LTS"
3. Run the installer and follow the installation instructions

### 2. Opening Terminal

#### Windows
1. Press Windows key + R to open "Run"
2. Type `cmd` and press Enter
   - Or search for "Command Prompt" in the Start menu

#### Mac
1. Press Command + Space to open "Spotlight Search"
2. Type `terminal` and press Enter
   - Or navigate to Applications > Utilities > Terminal

### 3. Project Setup
1. Download this repository
   - [Download ZIP file](https://github.com/nae-lab/slack-maxqda-adapter/archive/refs/heads/main.zip) and extract
   - Or, run the following command in terminal:
     ```sh
     git clone https://github.com/nae-lab/slack-maxqda-adapter.git
     ```

2. Navigate to the project folder in Terminal
   ```sh
   cd slack-maxqda-adapter
   ```

3. Install dependencies
   ```sh
   pnpm install
   ```
   - If you get an error, install pnpm first and try again:
     ```sh
     npm install -g pnpm
     ```

4. Configure Slack API Token
   - For Windows:
     ```sh
     echo SLACK_API_TOKEN=your_slack_api_token > .env
     ```
   - For Mac:
     ```sh
     echo "SLACK_API_TOKEN=your_slack_api_token" > .env
     ```
   - Or create `.env` file using a text editor:
     1. Create a new file named `.env` in the project folder
     2. Add the following content (replace `your_slack_api_token` with your actual token):
        ```
        SLACK_API_TOKEN=your_slack_api_token
        ```

### 4. Usage

#### Basic Usage
1. Navigate to the project folder in terminal (skip if already there)
   ```sh
   cd slack-maxqda-adapter
   ```

2. Run the following command (modify parameters as needed):
   ```sh
   pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
   ```

   Parameter description:
   - `-c CHANNEL_ID`: Slack channel code
   - `-s 2024-04-01`: Export start date (YYYY-MM-DD format)
   - `-e 2025-03-11`: Export end date (YYYY-MM-DD format)

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

## Output Formats

#### DOCX Format
- Compatible with MAXQDA
- Import the resulting file into MAXQDA as "Structured Text"
- Maintains special formatting for MAXQDA compatibility

#### Markdown Format
- Compatible with Obsidian and other Markdown editors
- Uses Obsidian's syntax for embedded images and links
- Ideal for note-taking and knowledge management workflows

