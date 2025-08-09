import { Document, Paragraph } from "docx";
import { PromisePool } from "@supercharge/promise-pool";
import { Packer } from "docx";
import * as fs from "fs";
import path from "path";
import { MessageElement, LogCallback } from "./types";
import { ProgressManager } from "./progress-manager";
import { retrieveThreadMessages } from "./slack-client";
import { createMessageParagraphs } from "./docx/message-formatter";
import {
  createDateHeadingParagraph,
  createPageBreakParagraph,
} from "./docx/paragraph-formatters";
import { ensureDirectoryExists } from "./utils/directory-utils";

// Function to get concurrency setting (library only)
function getConcurrency(): number {
  const { SlackMaxqdaAdapter } = require("./slack-exporter");
  return SlackMaxqdaAdapter.getConcurrency();
}

// Main export function to create a Word document from Slack messages
export async function exportToWordDocument(
  messagesByDate: { date: string; messages: MessageElement[] }[],
  channelId: string,
  channelName: string,
  outputPath: string,
  progressManager?: ProgressManager,
  onLog?: LogCallback
): Promise<string> {
  const concurrency = getConcurrency();
  if (onLog) {
    onLog({ timestamp: new Date(), level: 'info', message: `メッセージ処理を開始します (並列度: ${concurrency})` });
  }

  // Count total files for progress tracking
  let totalFiles = 0;
  for (const day of messagesByDate) {
    for (const message of day.messages) {
      if (message.files) {
        totalFiles += message.files.length;
      }
      // Also count files in thread messages
      if (message.reply_count) {
        const threadMessages = await retrieveThreadMessages(
          channelId,
          message.thread_ts ?? ""
        );
        for (let i = 1; i < threadMessages.length; i++) {
          if (threadMessages[i].files) {
            totalFiles += threadMessages[i].files?.length || 0;
          }
        }
      }
    }
  }

  if (onLog) {
    onLog({ timestamp: new Date(), level: 'info', message: `Found ${totalFiles} files to download` });
  }

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  ensureDirectoryExists(outDir);
  
  // Create subdirectory for downloaded files named "files"
  const filesSubDir = path.join(outDir, "files");
  ensureDirectoryExists(filesSubDir);

  // Create a shared file counter for progress tracking
  const fileCounter = {
    processed: 0,
    increment() {
      this.processed++;
      if (progressManager && totalFiles > 0) {
        progressManager.reportFileDownloadProgress(this.processed, totalFiles);
      }
    }
  };

  // Process each day's messages in parallel
  const { results: dayResults } = await PromisePool.withConcurrency(concurrency)
    .for(messagesByDate.map((item, index) => ({ ...item, index, filesSubDir, fileCounter })))
    .process(async ({ date, messages, index, filesSubDir, fileCounter }) => {
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
          outDir,
          progressManager,
          onLog,
          fileCounter
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
              outDir,
              progressManager,
              onLog,
              fileCounter
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

  // Report writing stage now that all content (including files) is processed
  if (progressManager) {
    progressManager.reportProgress('writing', 0, 'Generating document...');
  }
  if (onLog) {
    onLog({ timestamp: new Date(), level: 'info', message: 'Generating DOCX document...' });
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

  if (progressManager) {
    progressManager.reportProgress('writing', 50, 'Writing document to file...');
  }

  // Write the document to file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  if (progressManager) {
    progressManager.reportProgress('writing', 100, 'Document written successfully');
  }
  if (onLog) {
    onLog({ timestamp: new Date(), level: 'success', message: `Document written to ${outputPath}` });
  }

  return outputPath;
}
