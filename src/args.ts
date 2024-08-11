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
    date: {
      alias: "d",
      type: "string",
      description: "The date to fetch messages from",
    },
  })
  .parseSync();
