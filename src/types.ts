import {
  MessageElement,
  Reaction,
  PurpleBlock as Block,
  BlockType,
  PurpleElement,
  FluffyType,
  AccessoryElement as RichTextElement,
  FileElement,
  SlackFile as OriginalSlackFile,
  PurpleType,
  Accessory,
} from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import { ConversationsHistoryResponse } from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";

export interface MessagesResult {
  messages: MessageElement[];
  result: ConversationsHistoryResponse;
}

// カスタムのSlackFile型を定義（ファイルダウンロードに必要なプロパティ）
export interface SlackFile {
  id: string;
  url?: string;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
  name?: string;
  mimetype?: string;
}

export {
  MessageElement,
  Reaction,
  ConversationsHistoryResponse,
  PurpleElement,
  BlockType,
  PurpleType,
  FluffyType,
  Block,
  RichTextElement,
  FileElement,
  Accessory,
};

// FileElementからSlackFileへの変換関数
export function toSlackFile(file: FileElement): SlackFile {
  return {
    id: file.id || "",
    url: file.url_private,
    url_private: file.url_private,
    url_private_download: file.url_private_download,
    permalink: file.permalink,
    name: file.name,
    mimetype: file.mimetype,
  };
}

export type Optional<T> = T | undefined;
