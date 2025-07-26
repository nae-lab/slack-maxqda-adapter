#!/usr/bin/env node

// Register path mapping for runtime
import 'tsconfig-paths/register';

import dotenv from "dotenv";
dotenv.config({
  override: true,
});

import { args } from "./args";
import {
  fetchChannelMessagesForDateRange,
  getChannelName,
} from "./lib/slack-client";
import { initializeSlackClient } from "./lib/config";
import { exportToWordDocument } from "./lib/docx-formatter";
import { exportToMarkdown } from "./lib/markdown/markdown-formatter";
import path from "path";
import { getChannelOutputDir, ensureDirectoryExists } from "./cli-config";

async function main() {
  // Initialize Slack client with token from environment
  const token = process.env.SLACK_API_TOKEN;
  if (!token) {
    console.error("SLACK_API_TOKEN environment variable is required");
    process.exit(1);
  }
  initializeSlackClient(token);

  // Set end date equal to start date if not provided (single day)
  const startDate = args.startDate;
  const endDate = args.endDate || startDate;

  // Obtain channel name from Slack API using channelId
  const channelName = await getChannelName(args.channelId);
  console.log(`Working with channel: ${channelName}`);

  // Create channel-specific output directory
  const channelOutDir = ensureDirectoryExists(getChannelOutputDir(channelName));

  // Fetch messages for date range (works for single day too when startDate = endDate)
  const dateRangeResults = await fetchChannelMessagesForDateRange(
    args.channelId,
    startDate,
    endDate
  );

  if (dateRangeResults.length === 0) {
    console.log("No messages found in the specified date range.");
    return;
  }

  // Generate filename including the channel name and timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-MM-SS
  const isSingleDay = startDate === endDate;
  const extension = args.format === "md" ? "md" : "docx";
  const baseFileName = isSingleDay
    ? `${channelName}_${startDate}_${timestamp}`
    : `${channelName}_${startDate}--${endDate}_${timestamp}`;
  
  const outputPath = path.join(channelOutDir, `${baseFileName}.${extension}`);

  // Create document with messages based on format
  if (args.format === "md") {
    await exportToMarkdown(
      dateRangeResults,
      args.channelId,
      channelName,
      outputPath
    );
  } else {
    await exportToWordDocument(
      dateRangeResults,
      args.channelId,
      channelName,
      outputPath
    );
  }

  // Output the path for scripts to use
  console.log(`Output file created: ${outputPath}`);
}

main().catch((err) => {
  console.error("Error in main process:", err);
  process.exit(1);
});
