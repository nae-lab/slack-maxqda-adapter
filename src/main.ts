import dotenv from "dotenv";
dotenv.config({
  override: true,
});

import process from "process";
import { WebClient } from "@slack/web-api";
import uEmojiParser from "universal-emoji-parser";

import { args } from "./args";
import {
  ConversationsHistoryResponse,
  MessageElement,
} from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import { Reaction } from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import { PurpleElement } from "@slack/web-api/dist/types/response/ConversationsRepliesResponse";

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

async function retrieveThreadMessages(
  channelId: string,
  threadTs: string
): Promise<MessageElement[]> {
  let messages: MessageElement[] = [];
  let result = await client.conversations.replies({
    channel: channelId,
    ts: threadTs,
    limit: 1000,
  });

  if (result.ok && result.messages) {
    messages = result.messages;
  }

  return messages;
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

async function replaceMenthionToUserName(text: string) {
  const mentionRegex = /<@([A-Z0-9]+)>/g;
  const mentions = text.match(mentionRegex);
  if (mentions) {
    for (const mention of mentions) {
      const userId = mention.replace(/<@|>/g, "");
      const userName = await getUserName(userId);
      text = text.replace(
        mention,
        `<span class="underline">@${userName}</span>`
      );
    }
  }
  return text;
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

    if (message.reply_count) {
      const threadMessages = await retrieveThreadMessages(
        args.channelId,
        message.thread_ts ?? ""
      );

      for (let i = 1; i < threadMessages.length; i++) {
        // 0番目は親メッセージなのでスキップ
        const formattedThreadMessage = await formatMessageForMAXQDAPreprocessor(
          threadMessages[i],
          args.channelId,
          1
        );
        console.log(formattedThreadMessage);
      }
    }
  }
}

async function formatMessageForMAXQDAPreprocessor(
  message: MessageElement,
  channelId: string,
  indent: number
) {
  const username = message.user ? await getUserName(message.user) : "No Name";

  const formattedMessage = `  
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
  const indentStr = "> ".repeat(indent);
  const splitter = "ー".repeat(40);
  const username = message.user ? await getUserName(message.user) : "No Name";
  const timestamp = new Date(Number(message.ts) * 1000);
  let messageUrl = `https://ut-naelab.slack.com/archives/${channelId}/p${message.ts?.replace(
    ".",
    ""
  )}`;
  if (message.parent_user_id) {
    // スレッドの場合
    messageUrl += `?thread_ts=${message.thread_ts}&cid=${channelId}`;
  }

  let messageText = message.text ?? "";

  if (!messageText) {
    for (const block of message.blocks ?? []) {
      if (block.type === "rich_text") {
        for (const element of block.elements ?? []) {
          if (element.type === "rich_text_section") {
            for (const text of element.elements ?? []) {
              messageText += (text as PurpleElement).text ?? "";
            }
          }
        }
      }
    }

    for (const attachment of message.attachments ?? []) {
      messageText += attachment.text;
    }
  }

  messageText = await replaceMenthionToUserName(messageText);
  messageText = messageText.replace(/\n/g, `\n${indentStr}`);

  const formattedMessage = `${splitter}

${indentStr}**${username}** [${timestamp.toLocaleTimeString()}](${messageUrl})

${indentStr}${messageText ?? ""}

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
          ? uEmojiParser.parseToUnicode(`:${reaction.name}:`) ||
            `:${reaction.name}:`
          : `:${reaction.name}:`;
      return `${emojiText} ${reactionImage} ${userInfo}`;
    })
  );
}

async function main() {
  const messages = await fetchChannelMessages(args.channelId, args.date);
  if (!messages || messages.length === 0) {
    // No messages to process, output nothing.
    return;
  }
  messages.reverse(); // 古いメッセージから出力するために逆順にする
  await exportForMAXQDAPreprocessor(messages, args.date ?? "");
}

main();
