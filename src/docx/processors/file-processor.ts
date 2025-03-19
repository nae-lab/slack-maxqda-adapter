import { Paragraph } from "docx";
import { FileElement, toSlackFile } from "../../types";
import { downloadSlackFile } from "../../file-handler";
import {
  createFileLinkParagraph,
  createImageTitleParagraph,
  createImageParagraph,
} from "../paragraph-formatters";
import { getImageDimensions, ensureCompatibleImage } from "../image-utils";
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
  } = {}
): Promise<void> {
  const { indent = {}, channelName = "" } = options;

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
        await processImageFile(paragraphs, file, channelName, indent);
      } else {
        // その他の添付ファイルの処理
        paragraphs.push(
          createFileLinkParagraph(
            file.filetype?.toUpperCase() || "File",
            file.name || file.title || "Unknown",
            file.permalink || "",
            indent
          )
        );
      }
    } catch (error) {
      console.error("Error processing file:", error);
    }
  }
}

// 画像ファイルを処理する関数
async function processImageFile(
  paragraphs: Paragraph[],
  file: FileElement,
  channelName: string = "",
  indent: Record<string, any> = {}
): Promise<void> {
  try {
    // Slackファイルをダウンロード
    const slackFile = toSlackFile(file);
    const filePath = await downloadSlackFile(slackFile, channelName);

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

    // 画像サイズを取得
    const dimensions = await getImageDimensions(
      compatibleImage.buffer,
      compatibleImage.type
    );

    // 画像を追加
    paragraphs.push(
      createImageParagraph(
        compatibleImage.buffer,
        dimensions.width,
        dimensions.height,
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
