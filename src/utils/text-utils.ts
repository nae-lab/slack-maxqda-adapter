import { MessageElement, MessageFile, toSlackFile } from "../types";
import { getUserName, generateSlackMessageUrl } from "../slack-client";
import { downloadSlackFile } from "../file-handler";

/**
 * Slackのメンション（<@U123456>）をユーザー名に置き換える
 *
 * @param text 処理するテキスト
 * @param useHtml HTMLタグを使用するかどうか（DOCXの場合はtrue、Markdownの場合はfalse）
 * @returns 置換後のテキスト
 */
export async function replaceMentionToUserName(
  text: string,
  useHtml: boolean = false
): Promise<string> {
  const mentionRegex = /<@([A-Z0-9]+)>/g;
  const mentions = text.match(mentionRegex);

  if (mentions) {
    for (const mention of mentions) {
      const userId = mention.replace(/<@|>/g, "");
      const userName = await getUserName(userId);

      if (useHtml) {
        // DOCX用のHTML形式
        text = text.replace(
          mention,
          `<span class="underline">@${userName}</span>`
        );
      } else {
        // Markdown用のシンプルな形式
        text = text.replace(mention, `@${userName}`);
      }
    }
  }

  return text;
}

/**
 * メッセージからテキスト内容を抽出する
 *
 * @param message Slackメッセージ
 * @param includeFiles ファイル情報を含めるか
 * @param useObsidianFormat Obsidian形式を使用するか（Markdown出力用）
 * @returns 抽出されたテキスト
 */
export async function extractMessageText(
  message: MessageElement,
  includeFiles: boolean = true,
  useObsidianFormat: boolean = false
): Promise<string> {
  let messageText = message.text ?? "";

  // リッチテキストブロックからテキストを抽出
  if (!messageText) {
    for (const block of message.blocks ?? []) {
      if (block.type === "rich_text") {
        for (const element of block.elements ?? []) {
          if (element.type === "rich_text_section") {
            for (const text of element.elements ?? []) {
              messageText += (text as any).text ?? "";
            }
          }
        }
      }
    }
  }

  // 添付ファイルからテキストを抽出
  for (const attachment of message.attachments ?? []) {
    if (attachment.text) {
      messageText += "\n" + attachment.text;
    }
  }

  // ファイル処理（オプション）
  if (includeFiles && message.files && Array.isArray(message.files)) {
    for (const file of message.files as MessageFile[]) {
      try {
        const slackFile = toSlackFile(file);
        if (!slackFile) {
          console.warn("Skipping file without id:", file);
          continue;
        }

        const fileResult = await downloadSlackFile(slackFile);
        const isPermalink = fileResult.startsWith("http");

        if (file.mimetype?.startsWith("image/")) {
          if (!isPermalink) {
            // 画像ファイルのローカルパス
            if (useObsidianFormat) {
              // Obsidian形式（![[path]]）
              messageText += `\n\n![[${fileResult}]]`;
            } else {
              // 標準Markdown形式
              messageText += `\n\n![](${fileResult})`;
            }
          } else {
            // リモート画像へのリンク
            messageText += `\n\n[${file.name}](${fileResult})`;
          }
        } else {
          // 非画像ファイルへのリンク
          messageText += `\n\n[${file.name}](${fileResult})`;
        }
      } catch (error) {
        console.error("Failed to download file", file.id, error);
      }
    }
  }

  return messageText;
}

/**
 * タイムスタンプをフォーマットする
 *
 * @param timestamp UNIXタイムスタンプ（秒）
 * @returns フォーマットされた日時文字列
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * SlackのURL形式（<url|text>）をMarkdown形式に変換
 *
 * @param text 処理するテキスト
 * @returns 変換後のテキスト
 */
export function formatUrls(text: string): string {
  return text.replace(/<(.*?)\|(.*?)>/g, "[$2]($1)");
}

/**
 * メッセージへのURLを生成し、Markdown形式のヘッダーを作成
 *
 * @param username ユーザー名
 * @param timestamp タイムスタンプ
 * @param channelId チャンネルID
 * @param messageTs メッセージのタイムスタンプ
 * @param threadTs スレッドのタイムスタンプ
 * @param parentUserId 親メッセージのユーザーID
 * @returns フォーマットされたメッセージヘッダー
 */
export async function createMessageHeader(
  username: string,
  timestamp: number,
  channelId: string,
  messageTs: string,
  threadTs?: string,
  parentUserId?: string
): Promise<string> {
  const messageUrl = await generateSlackMessageUrl(
    channelId,
    messageTs,
    threadTs,
    parentUserId
  );

  return `**${username}** [${formatTimestamp(timestamp)}](${messageUrl})\n\n`;
}
