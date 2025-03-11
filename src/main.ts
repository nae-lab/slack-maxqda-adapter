import dotenv from "dotenv";
dotenv.config({
  override: true,
});

import { args } from "./args";
import { fetchChannelMessagesForDateRange } from "./slack-client";
import { exportToWordDocument } from "./docx-formatter";
import * as fs from "fs";
import path from "path";

async function main() {
  // Ensure output directory exists
  const outDir = "out";
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Set end date equal to start date if not provided (single day)
  const startDate = args.startDate;
  const endDate = args.endDate || startDate;

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

  // Generate filename based on whether it's a single day or range
  const isSingleDay = startDate === endDate;
  const outputPath = path.join(
    outDir,
    isSingleDay
      ? `slack-log-${startDate}.docx`
      : `slack-log-${startDate}--${endDate}.docx`
  );

  // Create document with messages
  await exportToWordDocument(dateRangeResults, args.channelId, outputPath);

  // Output the path for scripts to use
  console.log(outputPath);
}

main();
