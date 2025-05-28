# Slack to MAXQDA Adapter

日本語 [README.ja.md](./README.ja.md).

## Quick Start
```sh
git clone https://github.com/nae-lab/slack-maxqda-adapter.git  # Download repository
cd slack-maxqda-adapter                                        # Move to project folder
pnpm install                                                   # Install required packages
echo "SLACK_API_TOKEN=your_slack_api_token" > .env            # Configure Slack API token
pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11          # Run export
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
   - For PowerShell users, search for "Windows PowerShell"

#### Mac
1. Press Command + Space to open "Spotlight Search"
2. Type `terminal` and press Enter
   - Or navigate to Applications > Utilities > Terminal

### 3. Project Setup
1. Download this repository (two methods available)

   A. Download ZIP from GitHub:
   1. [Download ZIP file](https://github.com/nae-lab/slack-maxqda-adapter/archive/refs/heads/main.zip) and extract
      - Note: This creates a folder named `slack-maxqda-adapter-main`
      - Use this folder name in subsequent commands:
        ```sh
        cd slack-maxqda-adapter-main
        ```
      - Or rename the folder if preferred:
        ```sh
        mv slack-maxqda-adapter-main slack-maxqda-adapter  # Rename folder
        cd slack-maxqda-adapter                            # Move to renamed folder
        ```

   B. Using Git command:
   ```sh
   git clone https://github.com/nae-lab/slack-maxqda-adapter.git  # Clone repository locally
   cd slack-maxqda-adapter                                        # Move to created folder
   ```

2. Install dependencies
   ```sh
   pnpm install  # Install packages required for the project
   ```
   - If you get an error, install pnpm first and try again:
     ```sh
     npm install -g pnpm  # Install pnpm globally
     ```

3. Configure Slack API Token
   - For Windows:
     ```sh
     echo SLACK_API_TOKEN=your_slack_api_token > .env  # Create .env file and write token
     ```
   - For Mac:
     ```sh
     echo "SLACK_API_TOKEN=your_slack_api_token" > .env  # Create .env file and write token
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
   cd slack-maxqda-adapter  # Move to project folder
   # Or if downloaded via ZIP
   cd slack-maxqda-adapter-main
   ```

2. Run the following command (modify parameters as needed):
   ```sh
   pnpm main -c CHANNEL_ID -s 2024-04-01 -e 2025-03-11
   ```

   Parameter description:
   - `-c CHANNEL_ID`: Slack channel code (can be found in channel URL)
     - How to get Channel ID:
       1. Open Slack in your browser
       2. Open the target channel
       3. The last part of the URL (code starting with `C`) is the channel ID
          Example: For `https://workspace.slack.com/archives/C08A266KFDF`, the channel ID is `C08A266KFDF`
       - Or from Slack app:
         1. Right-click on the channel name in the left sidebar
         2. Select "View channel details"
         3. Channel ID is shown at the bottom
   - `-s 2024-04-01`: Export start date (YYYY-MM-DD format)
   - `-e 2025-03-11`: Export end date (YYYY-MM-DD format)

   Command behavior:
   1. Connects to specified Slack channel
   2. Retrieves messages for specified period
   3. Converts messages to specified format (DOCX by default)
   4. Saves results in `out` folder

## Troubleshooting

### Basic Command Line Operations

If you are new to command line operations, please refer to these official guides:

- [Using Command Prompt in Windows (Microsoft)](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)
- [Using Terminal on Mac (Apple)](https://support.apple.com/guide/terminal/welcome/mac)
- [Basic Command Line Operations Guide (DigitalOcean)](https://www.digitalocean.com/community/tutorials/how-to-use-cd-pwd-and-ls-to-explore-the-file-system-on-a-linux-server)

### Common Errors and Solutions

1. `command not found`
   - Cause: Command is not found (not installed)
   - Solution: Verify required software installation

2. `No such file or directory`
   - Cause: Specified file or directory does not exist
   - Solution:
     - Verify path is correct
     - If downloaded from ZIP, verify folder name is `slack-maxqda-adapter-main`

3. `Permission denied`
   - Cause: Insufficient permissions
   - Solution: Run with administrator privileges if needed

## Required Slack Token Scopes

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

