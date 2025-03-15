import process from "process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export const args = yargs(hideBin(process.argv))
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
  })
  .parseSync();
