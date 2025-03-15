import { Document, Paragraph } from "docx";
import { Packer } from "docx";
import * as fs from "fs";
import path from "path";
import { MessageElement } from "./types";
import { retrieveThreadMessages } from "./slack-client";
import { createMessageParagraphs } from "./docx/message-formatter";
import {
  createDateHeadingParagraph,
  createPageBreakParagraph,
} from "./docx/paragraph-formatters";
import { ensureDirectoryExists } from "./config";

// Main export function to create a Word document from Slack messages
export async function exportToWordDocument(
  messagesByDate: { date: string; messages: MessageElement[] }[],
  channelId: string,
  channelName: string,
  outputPath: string
): Promise<string> {
  // Create a container for our document children
  const documentChildren: Paragraph[] = [];

  // Process each day's messages
  for (let i = 0; i < messagesByDate.length; i++) {
    const { date, messages } = messagesByDate[i];

    // Add page break between days (except for the first day)
    if (i > 0) {
      documentChildren.push(createPageBreakParagraph());
    }

    // Add date heading with #TEXT tag for MAXQDA
    documentChildren.push(createDateHeadingParagraph(date));

    // Process each message for the current day
    for (const message of messages) {
      // Add the message to the document
      const messageChildren = await createMessageParagraphs(
        message,
        channelId,
        0,
        channelName
      );
      documentChildren.push(...messageChildren);

      // Process thread messages if any
      if (message.reply_count) {
        const threadMessages = await retrieveThreadMessages(
          channelId,
          message.thread_ts ?? ""
        );

        for (let i = 1; i < threadMessages.length; i++) {
          // Skip the parent message (index 0)
          const threadChildren = await createMessageParagraphs(
            threadMessages[i],
            channelId,
            1,
            channelName
          );
          documentChildren.push(...threadChildren);
        }
      }
    }
  }

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: documentChildren,
      },
    ],
  });

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  ensureDirectoryExists(outDir);

  // Write the document to file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}
