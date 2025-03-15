import { Paragraph } from "docx";
import { MessageFile } from "../../types";
import { createFileLinkParagraph } from "../paragraph-formatters";

/**
 * 非画像ファイルを処理し、Docxドキュメントにリンク段落を追加します
 * @param paragraphs 段落の配列
 * @param file 処理するファイル
 * @param indent インデントオプション
 */
export function processNonImageFile(
  paragraphs: Paragraph[],
  file: MessageFile,
  indent: Record<string, any> = {}
): void {
  // 非画像ファイルの場合はリンクのみを追加
  paragraphs.push(
    createFileLinkParagraph(
      file.filetype?.toUpperCase() || "File",
      file.name || file.title || "Unknown",
      file.permalink || "",
      indent
    )
  );
}
