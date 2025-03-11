import uEmojiParser from "universal-emoji-parser";
import {
  MessageElement,
  Reaction,
  PurpleElement,
  toSlackFile,
  MessageFile,
} from "./types";
import { getUserName, retrieveThreadMessages } from "./slack-client";
import { downloadSlackFile } from "./file-handler";

export async function replaceMentionToUserName(text: string) {
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

export async function exportForMAXQDAPreprocessor(
  messages: MessageElement[],
  channelId: string,
  date: string
) {
  console.log(`#TEXT ${date}\n`);

  for (const message of messages) {
    const formattedMessage = await formatMessageForMAXQDAPreprocessor(
      message,
      channelId,
      0
    );
    console.log(formattedMessage);

    if (message.reply_count) {
      const threadMessages = await retrieveThreadMessages(
        channelId,
        message.thread_ts ?? ""
      );

      for (let i = 1; i < threadMessages.length; i++) {
        // 0番目は親メッセージなのでスキップ
        const formattedThreadMessage = await formatMessageForMAXQDAPreprocessor(
          threadMessages[i],
          channelId,
          1
        );
        console.log(formattedThreadMessage);
      }
    }
  }
}

export async function formatMessageForMAXQDAPreprocessor(
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

export async function formatMessageToMarkdown(
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

  let messageText = await extractMessageText(message);
  messageText = await replaceMentionToUserName(messageText);
  messageText = messageText.replace(/\n/g, `\n${indentStr}`);

  const formattedMessage = `${splitter}

${indentStr}**${username}** [${timestamp.toLocaleString()}](${messageUrl})

${indentStr}${messageText ?? ""}

${indentStr}${await formatReactionsToMarkdown(message.reactions ?? [])}

`;
  return formattedMessage;
}

export async function extractMessageText(
  message: MessageElement,
  includeFiles: boolean = true
): Promise<string> {
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
  }

  // Process attachments to include text
  for (const attachment of message.attachments ?? []) {
    if (attachment.text) {
      messageText += "\n" + attachment.text;
    }
  }

  // Process files from message.files array only if includeFiles is true
  // For DOCX export, we'll handle files separately, so we can skip this step
  if (includeFiles && message.files && Array.isArray(message.files)) {
    for (const file of message.files as MessageFile[]) {
      try {
        // Convert to SlackFile using the utility function
        const slackFile = toSlackFile(file);
        if (slackFile) {
          const fileResult = await downloadSlackFile(slackFile);

          // Check if we got back a permalink (starts with http) or a local file path
          const isPermalink = fileResult.startsWith("http");

          if (file.mimetype && file.mimetype.startsWith("image/")) {
            if (!isPermalink) {
              // If it's a local file path for an image, add it as markdown image
              messageText += "\n\n![](" + fileResult + ")";
            } else {
              // If it's a permalink for an image, add as a link
              messageText += "\n\n[" + file.name + "](" + fileResult + ")";
            }
          } else {
            // For non-image files, always use the permalink as link
            messageText += "\n\n[" + file.name + "](" + fileResult + ")";
          }
        } else {
          console.warn("Skipping file without id:", file);
        }
      } catch (error) {
        console.error("Failed to download file", file.id, error);
      }
    }
  }

  // Process URLs correctly
  // 1. Convert Slack pipe URLs first: <https://example.com|display text>
  messageText = messageText.replace(
    /<(https?:\/\/[^|]+)\|([^>]+)>/g,
    (_, url, displayText) => {
      // Use display text for the link text
      return displayText;
    }
  );

  // 2. Convert angle bracket URLs: <https://example.com>
  messageText = messageText.replace(/<(https?:\/\/[^>]+)>/g, (_, url) => {
    // Just keep the URL itself
    return url;
  });

  return messageText;
}

export async function formatReactionsToMarkdown(reactions: Reaction[]) {
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
