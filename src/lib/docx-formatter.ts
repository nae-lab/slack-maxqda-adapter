import { Document, Paragraph } from "docx";
import { PromisePool } from "@supercharge/promise-pool";
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
import { ensureDirectoryExists } from "../cli-config";
import { args } from "../args";

// Function to get concurrency setting (library or args)
function getConcurrency(): number {
  try {
    // Try to use library setting first
    const { SlackMaxqdaAdapter } = require("./slack-exporter");
    return SlackMaxqdaAdapter.getConcurrency();
  } catch {
    // Fallback to args if library not available
    return args.concurrency;
  }
}

// Main export function to create a Word document from Slack messages
export async function exportToWordDocument(
  messagesByDate: { date: string; messages: MessageElement[] }[],
  channelId: string,
  channelName: string,
  outputPath: string
): Promise<string> {
  const concurrency = getConcurrency();
  console.log(`メッセージ処理を開始します (並列度: ${concurrency})`);

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  ensureDirectoryExists(outDir);
  
  // Create subdirectory for downloaded files (same name as output file without extension)
  const outputBaseName = path.basename(outputPath, path.extname(outputPath));
  const filesSubDir = path.join(outDir, outputBaseName);
  ensureDirectoryExists(filesSubDir);

  // Process each day's messages in parallel
  const { results: dayResults } = await PromisePool.withConcurrency(concurrency)
    .for(messagesByDate.map((item, index) => ({ ...item, index, filesSubDir })))
    .process(async ({ date, messages, index, filesSubDir }) => {
      const dayChildren: Paragraph[] = [];

      // Add page break between days (except for the first day)
      if (index > 0) {
        dayChildren.push(createPageBreakParagraph());
      }

      // Add date heading with #TEXT tag for MAXQDA
      dayChildren.push(createDateHeadingParagraph(date));

      // Process each message for the current day
      for (const message of messages) {
        // Add the message to the document
        const messageChildren = await createMessageParagraphs(
          message,
          channelId,
          0,
          channelName,
          filesSubDir,
          outDir
        );
        dayChildren.push(...messageChildren);

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
              channelName,
              filesSubDir,
              outDir
            );
            dayChildren.push(...threadChildren);
          }
        }
      }

      // 元の順序を維持するためにインデックスを含めて返す
      return {
        index,
        paragraphs: dayChildren,
      };
    });

  // 日付順にソートして結果をマージする
  const sortedResults = dayResults.sort((a, b) => a.index - b.index);
  const documentChildren: Paragraph[] = [];

  for (const result of sortedResults) {
    documentChildren.push(...result.paragraphs);
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

  // Write the document to file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}
