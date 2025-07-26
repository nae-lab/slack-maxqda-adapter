import { Paragraph } from "docx";
import { FileElement, toSlackFile, LogCallback } from "../../types";
import { ProgressManager } from "../../progress-manager";
import { downloadSlackFile } from "../../file-handler";
import {
  createFileLinkParagraph,
  createImageTitleParagraph,
  createImageParagraph,
} from "../paragraph-formatters";
import { ensureCompatibleImage } from "../image-utils";
import { styles } from "../styles";
import * as fs from "fs";
import * as path from "path";

/**
 * メッセージ内のファイルを処理し、Docxドキュメントに段落を追加します
 * @param paragraphs 段落の配列
 * @param files 処理するファイルの配列
 * @param options 処理オプション
 */
export async function addFilesParagraphs(
  paragraphs: Paragraph[],
  files: FileElement[],
  options: {
    indent?: Record<string, any>;
    channelName?: string;
    filesSubDir?: string;
    docxDir?: string;
    progressManager?: ProgressManager;
    onLog?: LogCallback;
    fileCounter?: { processed: number; increment: () => void };
  } = {}
): Promise<void> {
  const { indent = {}, channelName = "", filesSubDir, docxDir, progressManager, onLog, fileCounter } = options;

  for (const file of files) {
    try {
      // FileElementからSlackFileへの変換
      const slackFile = toSlackFile(file);

      if (!slackFile.id) {
        console.warn("Skipping file without id");
        continue;
      }

      if (file.mimetype && file.mimetype.startsWith("image/")) {
        // 画像ファイルの処理
        await processImageFile(paragraphs, file, channelName, indent, filesSubDir, docxDir, progressManager, onLog, fileCounter);
      } else {
        // その他の添付ファイルの処理
        await processNonImageFile(paragraphs, file, channelName, indent, filesSubDir, docxDir, progressManager, onLog, fileCounter);
      }
    } catch (error) {
      console.error("Error processing file:", error);
    }
  }
}

// 非画像ファイルを処理する関数
async function processNonImageFile(
  paragraphs: Paragraph[],
  file: FileElement,
  channelName: string = "",
  indent: Record<string, any> = {},
  filesSubDir?: string,
  docxDir?: string,
  progressManager?: ProgressManager,
  onLog?: LogCallback,
  fileCounter?: { processed: number; increment: () => void }
): Promise<void> {
  try {
    // Slackファイルをダウンロード
    const slackFile = toSlackFile(file);
    const filePath = await downloadSlackFile(slackFile, channelName, filesSubDir, progressManager, onLog, fileCounter);

    // ローカルファイルの場合は相対パスリンクを作成、リモートの場合はそのまま
    let linkUrl = filePath;
    if (!filePath.startsWith("http") && docxDir) {
      // ローカルファイルの場合は相対パスを使用
      linkUrl = path.relative(docxDir, filePath);
    }

    paragraphs.push(
      createFileLinkParagraph(
        file.filetype?.toUpperCase() || "File",
        file.name || file.title || "Unknown",
        linkUrl,
        indent
      )
    );
  } catch (error) {
    console.error("Error processing non-image file:", error);
    // エラー時はパーマリンクを使用
    paragraphs.push(
      createFileLinkParagraph(
        file.filetype?.toUpperCase() || "File",
        file.name || file.title || "Unknown",
        file.permalink || "",
        indent
      )
    );
  }
}

// 画像ファイルを処理する関数
async function processImageFile(
  paragraphs: Paragraph[],
  file: FileElement,
  channelName: string = "",
  indent: Record<string, any> = {},
  filesSubDir?: string,
  docxDir?: string,
  progressManager?: ProgressManager,
  onLog?: LogCallback,
  fileCounter?: { processed: number; increment: () => void }
): Promise<void> {
  try {
    // Slackファイルをダウンロード
    const slackFile = toSlackFile(file);
    const filePath = await downloadSlackFile(slackFile, channelName, filesSubDir, progressManager, onLog, fileCounter);

    // 画像タイトルを追加
    if (file.title || file.name) {
      paragraphs.push(
        createImageTitleParagraph(file.title || file.name || "Image", indent)
      );
    }

    // リモートURLの場合はリンクを表示
    if (filePath.startsWith("http")) {
      paragraphs.push(
        createFileLinkParagraph("Image", file.name || "Image", filePath, indent)
      );
      return;
    }

    // ローカルファイルの場合は相対パスリンクも追加
    if (docxDir) {
      const linkUrl = path.relative(docxDir, filePath);
      paragraphs.push(
        createFileLinkParagraph("Image", file.name || "Image", linkUrl, indent)
      );
    }

    // ローカルファイルの場合は画像を埋め込み
    const imageBuffer = await fs.promises.readFile(filePath);
    const mimeType = file.mimetype || "image/png";

    // 互換性のある形式に変換
    const compatibleImage = await ensureCompatibleImage(
      imageBuffer,
      mimeType,
      styles.image.maxWidth,
      styles.image.maxHeight
    );

    // 画像を追加
    paragraphs.push(
      createImageParagraph(
        compatibleImage.buffer,
        compatibleImage.width,
        compatibleImage.height,
        compatibleImage.type,
        indent
      )
    );
  } catch (error) {
    console.error("Error processing image:", error);
    // エラー時はリンクを表示
    paragraphs.push(
      createFileLinkParagraph(
        "Image",
        file.name || "Image",
        file.permalink || "",
        indent
      )
    );
  }
}
