import { SlackExporter } from "slack-exporter";
import * as dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as path from "path";

// Load environment variables from .env file
dotenv.config({ override: true });

// Parse command line arguments similar to main.ts
const args = yargs(hideBin(process.argv))
  .options({
    channelId: {
      alias: "c",
      type: "string",
      description: "The ID of the channel to fetch messages from",
      demandOption: true,
    },
    startDate: {
      alias: "s",
      type: "string",
      description: "Start date to fetch messages from (YYYY-MM-DD)",
      demandOption: true,
    },
    endDate: {
      alias: "e",
      type: "string",
      description: "End date to fetch messages to (YYYY-MM-DD)",
    },
    format: {
      alias: "f",
      type: "string",
      description: "Output format (docx or md)",
      choices: ["docx", "md"],
      default: "docx",
    },
    concurrency: {
      alias: "p",
      type: "number",
      description: "Number of concurrent requests to Slack API",
      default: 4,
    },
  })
  .parseSync();

async function main() {
  // Initialize the SlackExporter with your Slack API token
  const exporter = new SlackExporter({
    token: process.env.SLACK_API_TOKEN || "your-slack-api-token",
    concurrency: args.concurrency,
  });

  try {
    // Set end date equal to start date if not provided (single day)
    const startDate = args.startDate;
    const endDate = args.endDate || startDate;

    // Obtain channel name from Slack API using channelId
    const channelName = await exporter.getChannelName(args.channelId);
    console.log(`Working with channel: ${channelName}`);

    // Generate filename including the channel name
    const isSingleDay = startDate === endDate;
    const extension = args.format === "md" ? "md" : "docx";
    const outputPath = path.join(
      "./output",
      isSingleDay
        ? `${channelName}_${startDate}.${extension}`
        : `${channelName}_${startDate}--${endDate}.${extension}`
    );

    // Export the channel using the package
    const result = await exporter.export({
      channelId: args.channelId,
      startDate: startDate,
      endDate: endDate,
      format: args.format as "docx" | "md",
      outputPath: outputPath,
    });

    if (result.messageCount === 0) {
      console.log("No messages found in the specified date range.");
      return;
    }

    // Output the path for scripts to use
    console.log(`Output file created: ${result.filePath}`);
  } catch (error) {
    console.error("Error in main process:", error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
