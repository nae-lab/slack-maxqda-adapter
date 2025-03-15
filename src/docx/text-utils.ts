import {
  replaceMentionToUserName as baseReplaceMention,
  extractMessageText as baseExtractText,
} from "../utils/text-utils";
import { MessageElement } from "../types";

// DOCX形式用にカスタマイズしたメンション処理
export async function replaceMentionToUserName(text: string): Promise<string> {
  return baseReplaceMention(text, true); // DOCX形式ではHTMLを使用
}

// DOCX形式用にカスタマイズしたテキスト抽出
export async function extractMessageText(
  message: MessageElement,
  includeFiles: boolean = true
): Promise<string> {
  return baseExtractText(message, includeFiles, false); // DOCX形式ではObsidian形式を使用しない
}
