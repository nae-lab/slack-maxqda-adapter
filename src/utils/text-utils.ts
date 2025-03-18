import { MessageElement, FileElement, SlackFile, toSlackFile } from "../types";
import {
  getUserName,
  getUserGroupName,
  generateSlackMessageUrl,
} from "../slack-client";
import { downloadSlackFile } from "../file-handler";

// キャッシュクラスの実装
class MentionCache {
  private static userCache: Map<string, Promise<string>> = new Map();
  private static groupCache: Map<string, Promise<string>> = new Map();

  static async getUserName(userId: string): Promise<string> {
    let cachedPromise = this.userCache.get(userId);
    if (!cachedPromise) {
      // キャッシュミス時は新しいPromiseを作成してキャッシュに格納
      cachedPromise = getUserName(userId);
      this.userCache.set(userId, cachedPromise);
    }
    return cachedPromise;
  }

  static async getGroupName(groupId: string): Promise<string> {
    let cachedPromise = this.groupCache.get(groupId);
    if (!cachedPromise) {
      // キャッシュミス時は新しいPromiseを作成してキャッシュに格納
      cachedPromise = getUserGroupName(groupId);
      this.groupCache.set(groupId, cachedPromise);
    }
    return cachedPromise;
  }
}

/**
 * Slackのメンション（<@U123456>や<!subteam^S123456|group>）をユーザー名やグループ名に置き換える
 *
 * @param text 処理するテキスト
 * @param useHtml HTMLタグを使用するかどうか（DOCXの場合はtrue、Markdownの場合はfalse）
 * @returns 置換後のテキスト
 */
export async function replaceMentionToUserName(
  text: string,
  useHtml: boolean = false
): Promise<string> {
  // ユーザーメンションの処理（<@U123456>形式）
  const userMentionRegex = /<@([A-Z0-9]+)>/g;
  const userMentions = text.match(userMentionRegex);

  if (userMentions) {
    // 全てのユーザー名の解決を並列で行う
    const userPromises = userMentions.map(async (mention) => {
      const userId = mention.replace(/<@|>/g, "");
      const userName = await MentionCache.getUserName(userId);
      return { mention, userName };
    });

    // 全てのユーザー名が解決されるのを待つ
    const resolvedUsers = await Promise.all(userPromises);

    // テキストの置換
    for (const { mention, userName } of resolvedUsers) {
      if (useHtml) {
        text = text.replace(
          mention,
          `<span class="underline">@${userName}</span>`
        );
      } else {
        text = text.replace(mention, `@${userName}`);
      }
    }
  }

  // ユーザーグループメンションの処理（<!subteam^S123456|group>形式）
  const groupMentionRegex = /<!subteam\^([A-Z0-9]+)\|[^>]*>/g;
  const groupMentions = text.match(groupMentionRegex);

  if (groupMentions) {
    // 全てのグループ名の解決を並列で行う
    const groupPromises = groupMentions.map(async (mention) => {
      const match = mention.match(/<!subteam\^([A-Z0-9]+)\|([^>]*)>/);
      if (match && match[1]) {
        const groupId = match[1];
        const displayName = match[2];
        const groupName = await MentionCache.getGroupName(groupId);
        return {
          mention,
          displayGroupName: groupName !== groupId ? groupName : displayName,
        };
      }
      return null;
    });

    // 全てのグループ名が解決されるのを待つ
    const resolvedGroups = (await Promise.all(groupPromises)).filter(
      (group): group is NonNullable<typeof group> => group !== null
    );

    // テキストの置換
    for (const { mention, displayGroupName } of resolvedGroups) {
      if (useHtml) {
        text = text.replace(
          mention,
          `<span class="underline">@${displayGroupName}</span>`
        );
      } else {
        text = text.replace(mention, `@${displayGroupName}`);
      }
    }
  }

  // ユーザーグループの直接メンション（@S123456形式）の処理
  const directGroupMentionRegex = /@(S[A-Z0-9]+)/g;
  const directGroupMentions = text.match(directGroupMentionRegex);

  if (directGroupMentions) {
    // 全ての直接グループメンションの解決を並列で行う
    const directGroupPromises = directGroupMentions.map(async (mention) => {
      const groupId = mention.substring(1); // @を除去
      const groupName = await MentionCache.getGroupName(groupId);
      return { mention, groupName };
    });

    // 全てのグループ名が解決されるのを待つ
    const resolvedDirectGroups = await Promise.all(directGroupPromises);

    // テキストの置換
    for (const { mention, groupName } of resolvedDirectGroups) {
      if (useHtml) {
        text = text.replace(
          mention,
          `<span class="underline">@${groupName}</span>`
        );
      } else {
        text = text.replace(mention, `@${groupName}`);
      }
    }
  }

  return text;
}

/**
 * メッセージからテキスト内容を抽出する
 *
 * @param message Slackメッセージ
 * @param processFullContent メッセージの完全な内容（テキストと添付ファイル）を処理するか
 * @param useObsidianFormat Obsidian形式を使用するか（Markdown出力用）
 * @returns 抽出されたテキスト
 */
export async function extractMessageText(
  message: MessageElement,
  processFullContent: boolean = true,
  useObsidianFormat: boolean = false
): Promise<string> {
  let messageText = message.text ?? "";

  // リッチテキストブロックからテキストを抽出
  if (!messageText && message.blocks && message.blocks.length > 0) {
    for (const block of message.blocks) {
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
  if (message.attachments && message.attachments.length > 0) {
    for (const attachment of message.attachments) {
      if (attachment.text) {
        messageText += "\n" + attachment.text;
      }
    }
  }

  // ファイル処理（オプション）
  if (processFullContent && message.files && Array.isArray(message.files)) {
    for (const file of message.files as FileElement[]) {
      try {
        // MessageFileからSlackFileへの変換
        const slackFile: SlackFile = toSlackFile(file);

        if (!slackFile.id) {
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
