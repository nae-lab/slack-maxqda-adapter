import * as fs from "fs";
import path from "path";
import { MessageElement, Block } from "../types";
import {
  retrieveThreadMessages,
  getUserName,
  generateSlackMessageUrl,
} from "../slack-client";
import { ensureDirectoryExists } from "../utils/directory-utils";
import { formatTimestamp } from "../utils/date-utils";
import { processMessageText } from "./processors/text-processor";
import { processMessageBlocks } from "./processors/block-processor";
import { processMessageFiles } from "./processors/file-processor";
import { processMessageReactions } from "./processors/reaction-processor";

// Main export function to create a Markdown document from Slack messages
export async function exportToMarkdown(
  messagesByDate: { date: string; messages: MessageElement[] }[],
  channelId: string,
  channelName: string,
  outputPath: string
): Promise<string> {
  let markdownContent = "";

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  ensureDirectoryExists(outDir);
  
  // Create subdirectory for downloaded files named "files"
  const filesSubDir = path.join(outDir, "files");
  ensureDirectoryExists(filesSubDir);

  // Process each day's messages
  for (let i = 0; i < messagesByDate.length; i++) {
    const { date, messages } = messagesByDate[i];

    // Add date heading
    markdownContent += `# ${date}\n\n`;

    // Process each message for the current day
    for (const message of messages) {
      // Add the message to the document
      const messageContent = await createMessageMarkdown(
        message,
        channelId,
        0,
        channelName,
        outputPath
      );
      markdownContent += messageContent;

      // Process thread messages if any
      if (message.reply_count) {
        const threadMessages = await retrieveThreadMessages(
          channelId,
          message.thread_ts ?? ""
        );

        for (let i = 1; i < threadMessages.length; i++) {
          // Skip the parent message (index 0)
          const threadContent = await createMessageMarkdown(
            threadMessages[i],
            channelId,
            1,
            channelName,
            outputPath
          );
          markdownContent += threadContent;
        }
      }
    }

    // Add page separator between days (except for the last day)
    if (i < messagesByDate.length - 1) {
      markdownContent += "\n---\n\n";
    }
  }

  // Write the markdown content to file
  fs.writeFileSync(outputPath, markdownContent, "utf-8");

  return outputPath;
}

// Create markdown content for a single message
async function createMessageMarkdown(
  message: MessageElement,
  channelId: string,
  indentLevel: number,
  channelName: string = "",
  markdownOutputPath: string
): Promise<string> {
  let markdownContent = "";
  const username = message.user
    ? await getUserName(message.user)
    : "Unknown User";
  const formattedTimestamp = formatTimestamp(message.ts);
  const messageUrl = await generateSlackMessageUrl(
    channelId,
    message.ts,
    message.thread_ts || undefined,
    message.parent_user_id || undefined
  );

  // Add separator
  markdownContent += "---\n\n";

  // Add username and timestamp with hyperlink
  markdownContent += `### [${username} | ${formattedTimestamp}](${messageUrl})\n\n`;

  // Process message blocks if available (Slack Block Kit)
  if (message.blocks && message.blocks.length > 0) {
    markdownContent += await processMessageBlocks(
      message.blocks as Block[],
      indentLevel
    );
  } else if (message.text) {
    // Process regular message text
    markdownContent += await processMessageText(message.text, indentLevel);
  }

  // Process files if any
  if (message.files && Array.isArray(message.files)) {
    markdownContent += await processMessageFiles(
      message.files,
      channelName,
      indentLevel,
      markdownOutputPath
    );
  }

  // Process reactions if any
  if (message.reactions && message.reactions.length > 0) {
    markdownContent += await processMessageReactions(message.reactions);
  }

  return markdownContent;
}
