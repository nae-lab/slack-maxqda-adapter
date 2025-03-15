import dotenv from "dotenv";
dotenv.config({
  override: true,
});

import { args } from "./args";
import {
  fetchChannelMessagesForDateRange,
  getChannelName,
} from "./slack-client";
import { exportToWordDocument } from "./docx-formatter";
import { exportToMarkdown } from "./markdown/markdown-formatter";
import path from "path";
import { getChannelOutputDir, ensureDirectoryExists } from "./config";

async function main() {
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

  // Generate filename including the channel name
  const isSingleDay = startDate === endDate;
  const extension = args.format === "md" ? "md" : "docx";
  const outputPath = path.join(
    channelOutDir,
    isSingleDay
      ? `${channelName}_${startDate}.${extension}`
      : `${channelName}_${startDate}--${endDate}.${extension}`
  );

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
