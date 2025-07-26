import {
  MessageElement,
  Reaction,
  BlockType,
  PurpleElement,
  AccessoryElement as RichTextElement,
  FileElement,
  SlackFile as OriginalSlackFile,
  PurpleType,
  Accessory,
  AssistantAppThreadBlock,
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
  RichTextElement,
  FileElement,
  Accessory,
  AssistantAppThreadBlock as Block,
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

// Library-specific types
export interface SlackMaxqdaAdapterOptions {
  /** Slack API token */
  token: string;
  /** Number of concurrent processes for message processing */
  concurrency?: number;
}

export interface ExportOptions {
  /** Channel ID to export messages from */
  channelId: string;
  /** Start date for message export (YYYY-MM-DD) */
  startDate: string;
  /** End date for message export (YYYY-MM-DD). If not provided, uses startDate */
  endDate?: string;
  /** Output format */
  format: 'docx' | 'md';
  /** Output file path */
  outputPath: string;
}

export interface ExportResult {
  /** Path to the generated file */
  filePath: string;
  /** Channel name that was exported */
  channelName: string;
  /** Number of messages exported */
  messageCount: number;
  /** Export format used */
  format: 'docx' | 'md';
}
