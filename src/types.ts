import {
  MessageElement,
  Reaction,
} from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import { ConversationsHistoryResponse } from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import { PurpleElement } from "@slack/web-api/dist/types/response/ConversationsRepliesResponse";

export interface MessagesResult {
  messages: MessageElement[];
  result: ConversationsHistoryResponse;
}

export {
  MessageElement,
  Reaction,
  ConversationsHistoryResponse,
  PurpleElement,
};

// Block Kit関連の型定義
// より汎用的なBlock型定義（PurpleBlockを包含するように）
export interface Block {
  type: string | undefined;
  text?: {
    text: string;
    [key: string]: any;
  } | string | undefined;
  elements?: Array<any>;
  [key: string]: any;
}

// Block型をMessageElement内のblocksにも使えるようにする型変換関数
export function asBlocks(blocks: any[]): Block[] {
  return blocks as Block[];
}

export interface RichTextElement {
  type: string;
  elements?: Array<PurpleElement | any>;
  style?: string;
  [key: string]: any;
}

// Define a file type for Slack message files based on what's in MessageElement
export interface MessageFile {
  id?: string;
  name?: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  permalink?: string;
  url_private?: string;
  url_private_download?: string;
  mode?: string;
  [key: string]: any; // Allow other properties that may exist
}

// Interface for the file object expected by downloadSlackFile
export interface SlackFile {
  id: string;
  name?: string;
  title?: string;
  mimetype?: string;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
}

// Utility function to safely convert MessageFile to SlackFile
export function toSlackFile(file: MessageFile): SlackFile | null {
  if (!file.id) return null;

  return {
    id: file.id,
    name: file.name || "unnamed_file",
    mimetype: file.mimetype,
    url_private: file.url_private,
    url_private_download: file.url_private_download,
    permalink: file.permalink,
  };
}
export type Optional<T> = T | undefined;
