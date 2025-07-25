import { Paragraph } from "docx";
import { MessageElement, FileElement, Block, LogCallback } from "../types";
import { ProgressManager } from "../progress-manager";
import { getUserName } from "../slack-client";
import { replaceMentionToUserName, extractMessageText } from "./text-utils";
import { generateSlackMessageUrl } from "../slack-client";
import { styles } from "./styles";
import {
  createSeparatorParagraph,
  createSpeakerParagraph,
  createUsernameTimestampParagraph,
  createEndSpeakerParagraph,
} from "./paragraph-formatters";
import {
  processMessageBlocks,
  processMessageText,
  addFilesParagraphs,
  createReactionParagraphs,
} from "./processors";

// Create all paragraphs for a message
export async function createMessageParagraphs(
  message: MessageElement,
  channelId: string,
  indentLevel: number,
  channelName: string = "",
  filesSubDir?: string,
  docxDir?: string,
  progressManager?: ProgressManager,
  onLog?: LogCallback,
  fileCounter?: { processed: number; increment: () => void }
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];
  const username = message.user ? await getUserName(message.user) : "No Name";
  const timestamp = new Date(Number(message.ts) * 1000);
  const indent =
    indentLevel > 0 ? { left: styles.threadIndent * indentLevel } : {};

  // Generate Slack message URL (for linking the timestamp)
  const messageUrl = await generateSlackMessageUrl(
    channelId,
    message.ts,
    message.thread_ts,
    message.parent_user_id
  );

  // Add separator
  paragraphs.push(createSeparatorParagraph({ indent }));

  // Add SPEAKER tag for MAXQDA
  paragraphs.push(createSpeakerParagraph(username || "No Name", { indent }));

  // Add username and timestamp with hyperlink
  paragraphs.push(
    createUsernameTimestampParagraph(
      username || "No Name",
      timestamp,
      messageUrl,
      { indent }
    )
  );

  // Process message blocks if available (Slack Block Kit)
  if (message.blocks && message.blocks.length > 0) {
    const blocksAfterConversion = message.blocks as Block[];
    await processMessageBlocks(blocksAfterConversion, paragraphs, indent);
  } else {
    // メッセージテキストを処理して追加
    let messageText = await extractMessageText(message, true);
    messageText = await replaceMentionToUserName(messageText);

    // Process the message text for markdown formatting
    await processMessageText(messageText, paragraphs, indent);
  }

  // Add files/images directly to the document
  if (message.files && Array.isArray(message.files)) {
    await addFilesParagraphs(paragraphs, message.files as FileElement[], {
      indent,
      channelName,
      filesSubDir,
      docxDir,
      progressManager,
      onLog,
      fileCounter,
    });
  }

  // Enhanced reactions implementation to display emojis and custom icons
  if (message.reactions && message.reactions.length > 0) {
    const reactionParagraphs = await createReactionParagraphs(
      message.reactions,
      { indent }
    );
    paragraphs.push(...reactionParagraphs);
  }

  // Add ENDSPEAKER tag for MAXQDA
  paragraphs.push(createEndSpeakerParagraph({ indent }));

  return paragraphs;
}
