import dotenv from "dotenv";
dotenv.config({
  override: true,
});

import process from "process";
import { WebClient } from "@slack/web-api";
import * as emoji from "node-emoji";

import { args } from "./args";
import {
  ConversationsHistoryResponse,
  MessageElement,
} from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import { Reaction } from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";

// Replace 'YOUR_CHANNEL_ID' with the actual channel ID and 'YOUR_TOKEN' with your Slack API token
const token = process.env.SLACK_API_TOKEN;

const client = new WebClient(token);

async function retrieveMessages(
  channelId: string,
  oldest: number,
  latest: number,
  cursor?: string
): Promise<{
  messages: MessageElement[];
  result: ConversationsHistoryResponse;
}> {
  let messages: MessageElement[] = [];
  let result = await client.conversations.history({
    channel: channelId,
    oldest: oldest.toString(),
    latest: latest.toString(),
    limit: 1000,
    cursor: cursor,
  });

  if (result.ok && result.messages) {
    messages = result.messages;
  }

  return { messages, result };
}

async function getUserName(userId: string) {
  const userInfo = await client.users.info({
    user: userId,
  });
  return (
    userInfo.user?.profile?.real_name_normalized ||
    userInfo.user?.profile?.real_name ||
    userInfo.user?.real_name ||
    userInfo.user?.profile?.display_name
  );
}

async function fetchChannelMessages(channelId: string, date?: string) {
  try {
    // dateの指定があれば、その日付の朝4時0分から，その日付の翌日の朝3時59分までのメッセージを取得する
    const dateOldest = date ? new Date(date) : new Date();
    dateOldest.setHours(4, 0, 0, 0);
    const dateLatest = new Date(dateOldest);
    dateLatest.setDate(dateLatest.getDate() + 1);
    dateLatest.setHours(3, 59, 59, 999);

    let messages: MessageElement[] = [];

    let { messages: _messages, result: _result } = await retrieveMessages(
      channelId,
      dateOldest.getTime() / 1000,
      dateLatest.getTime() / 1000
    );
    messages = messages.concat(_messages);
    let result = _result;

    while (result.has_more) {
      const nextCursor = result.response_metadata?.next_cursor;
      if (!nextCursor) {
        break;
      }
      let { messages: _messages, result: _result } = await retrieveMessages(
        channelId,
        dateOldest.getTime() / 1000,
        dateLatest.getTime() / 1000,
        nextCursor
      );
      result = _result;
      messages = messages.concat(_messages);
    }

    return messages;
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function exportForMAXQDAPreprocessor(
  messages: MessageElement[],
  date: string
) {
  console.log(`#TEXT ${date}\n`);

  for (const message of messages) {
    const formattedMessage = await formatMessageForMAXQDAPreprocessor(
      message,
      args.channelId,
      0
    );
    console.log(formattedMessage);
  }
}

async function formatMessageForMAXQDAPreprocessor(
  message: MessageElement,
  channelId: string,
  indent: number
) {
  const username = message.user ? await getUserName(message.user) : "No Name";
  const splitter = "ー".repeat(40);

  const formattedMessage = `${splitter}
  
#SPEAKER ${username}

${await formatMessageToMarkdown(message, channelId, indent)}

#ENDSPEAKER
`;

  return formattedMessage;
}

async function formatMessageToMarkdown(
  message: MessageElement,
  channelId: string,
  indent: number
) {
  const indentStr = "\t|".repeat(indent);
  const username = message.user ? await getUserName(message.user) : "No Name";
  const timestamp = new Date(Number(message.ts) * 1000);

  const formattedMessage = `${indentStr}${username} [${timestamp.toLocaleTimeString()}](https://ut-naelab.slack.com/archives/${channelId}/p${message.ts?.replace(
    ".",
    ""
  )})

${indentStr}${message.text?.replace(/\n/g, `\n\n${indentStr}`) ?? ""}

${indentStr}${await formatReactionsToMarkdown(message.reactions ?? [])}

`;
  return formattedMessage;
}

async function formatReactionsToMarkdown(reactions: Reaction[]) {
  return Promise.all(
    reactions.map(async (reaction) => {
      const userInfo = reaction.users
        ? await Promise.all(
            reaction.users.map(async (userId) => {
              return (await getUserName(userId)) || "No Name";
            })
          )
        : "No Name";
      const reactionImage = reaction.url
        ? `![:${reaction.name}: reaction img](${reaction.url}){ width=20px }`
        : "";
      const emojiText =
        !reaction.url && reaction.name
          ? emoji.get(reaction.name) || `:${reaction.name}:`
          : `:${reaction.name}:`;
      return `${emojiText} ${reactionImage} ${userInfo}`;
    })
  );
}

async function main() {
  const messages = await fetchChannelMessages(args.channelId, args.date);
  if (messages) {
    await exportForMAXQDAPreprocessor(messages, args.date ?? "");
  }
}

main();
