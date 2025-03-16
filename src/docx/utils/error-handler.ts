import { Paragraph } from "docx";
import { FileElement } from "../../types";
import { createFileLinkParagraph } from "../paragraph-formatters";

/**
 * エラー処理に関するユーティリティ関数を提供します
 * ファイル処理エラーを捕捉し、適切なフォールバック対応を行います
 */

/**
 * ファイル処理中のエラーを処理し、適切なフォールバック段落を追加します
 * @param paragraphs 段落の配列
 * @param file エラーが発生したファイル
 * @param error エラーオブジェクトまたはエラーメッセージ
 * @param fileType エラーメッセージに表示するファイルタイプ
 * @param indent インデントオプション
 */
export function handleFileProcessingError(
  paragraphs: Paragraph[],
  file: FileElement,
  error: unknown,
  fileType: string = "File",
  indent: Record<string, any> = {}
): void {
  console.error(`Error processing ${fileType.toLowerCase()}: ${error}`);
  paragraphs.push(
    createFileLinkParagraph(
      fileType,
      file.name || "Unknown",
      file.permalink || "",
      indent
    )
  );
}
