import dotenv from "dotenv";
dotenv.config({
  override: true,
});

import { args } from "./args";
import { fetchChannelMessages } from "./slack-client";
import { exportForMAXQDAPreprocessor } from "./message-formatter";

async function main() {
  const messages = await fetchChannelMessages(args.channelId, args.date);
  if (!messages || messages.length === 0) {
    // No messages to process, output nothing.
    return;
  }
  messages.reverse(); // 古いメッセージから出力するために逆順にする
  await exportForMAXQDAPreprocessor(messages, args.channelId, args.date ?? "");
}

main();
