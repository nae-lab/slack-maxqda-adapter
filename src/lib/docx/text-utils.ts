import {
  replaceMentionToUserName as baseReplaceMention,
  extractMessageText as baseExtractText,
} from "../utils/text-utils";
import { MessageElement } from "../types";

// DOCX形式用にカスタマイズしたメンション処理
export async function replaceMentionToUserName(text: string): Promise<string> {
  const result = await baseReplaceMention(text, true); // DOCX形式ではHTMLを使用
  return result;
}

// DOCX形式用にカスタマイズしたテキスト抽出
export async function extractMessageText(
  message: MessageElement,
  processFullContent: boolean = true
): Promise<string> {
  const result = await baseExtractText(message, processFullContent, false); // DOCX形式ではObsidian形式を使用しない
  return result;
}
