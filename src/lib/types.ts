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
  created?: number;
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
    created: file.created,
  };
}

export type Optional<T> = T | undefined;

// Library-specific types
export interface SlackMaxqdaAdapterOptions {
  /** Slack API token */
  token: string;
  /** Number of concurrent processes for message processing */
  concurrency?: number;
  /** Progress callback function */
  onProgress?: ProgressCallback;
  /** Log callback function */
  onLog?: LogCallback;
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

export interface ProgressUpdate {
  /** Current step in the export process */
  stage: 'fetching' | 'processing' | 'downloading' | 'writing' | 'complete';
  /** Percentage progress (0-100) */
  progress: number;
  /** Human-readable description of current step */
  message: string;
  /** Current item being processed (optional) */
  current?: number;
  /** Total items to process (optional) */
  total?: number;
  /** Detailed progress for sub-operations (e.g., file downloads) */
  details?: {
    currentFile?: string;
    filesCompleted?: number;
    totalFiles?: number;
  };
}

export interface LogEntry {
  /** Timestamp of the log entry */
  timestamp: Date;
  /** Log level */
  level: 'info' | 'success' | 'warning' | 'error';
  /** Log message */
  message: string;
}

export type ProgressCallback = (update: ProgressUpdate) => void;
export type LogCallback = (entry: LogEntry) => void;
