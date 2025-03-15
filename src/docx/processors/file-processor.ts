import { Paragraph } from "docx";
import * as path from "path";
import { MessageFile } from "../../types";
import * as fs from "fs";
import {
  createFileLinkParagraph,
  createImageTitleParagraph,
  createImageParagraph,
  createErrorParagraph,
} from "../paragraph-formatters";
import {
  getImageDimensions,
  getMappedImageType,
  ensureCompatibleImage,
} from "../image-utils";
import {
  processSlackFile,
  isImageFile,
  readFileAsBuffer,
} from "../../utils/file-utils";
import { styles } from "../styles";

/**
 * メッセージ内のファイルを処理し、Docxドキュメントに段落を追加します
 * @param paragraphs 段落の配列
 * @param files 処理するファイルの配列
 * @param options 処理オプション
 */
export async function addFilesParagraphs(
  paragraphs: Paragraph[],
  files: MessageFile[],
  options: {
    indent?: any;
    channelName?: string;
  }
): Promise<void> {
  const { indent, channelName = "" } = options;

  for (const file of files) {
    const result = await processSlackFile(file, channelName);

    if (result.error || !result.path) {
      console.error("Failed to process file", file.id, result.error);
      paragraphs.push(
        createErrorParagraph(
          `Failed to process file: ${file.name || "unknown"}`
        )
      );
      continue;
    }

    const { path: filePath, isPermalink } = result;

    if (isImageFile(file.mimetype)) {
      // 画像タイトルを追加
      paragraphs.push(createImageTitleParagraph(file.name || "Image"));

      if (!isPermalink) {
        try {
          // 画像ファイルをバッファとして読み込む
          const imageBuffer = await readFileAsBuffer(filePath);
          const mimeType = file.mimetype || "image/png";

          // 画像の寸法を取得（表示サイズのみの調整で解像度は変更しない）
          const dimensions = await getImageDimensions(
            imageBuffer,
            mimeType,
            styles.image.maxWidth,
            styles.image.maxHeight
          );

          // 互換性のある画像形式に変換（フォーマット変換のみ行い、解像度は変更しない）
          const compatibleImage = await ensureCompatibleImage(
            imageBuffer,
            mimeType,
            styles.image.maxWidth,
            styles.image.maxHeight
          );

          paragraphs.push(
            createImageParagraph(
              compatibleImage.buffer,
              dimensions.scaledWidth,
              dimensions.scaledHeight,
              compatibleImage.type
            )
          );
        } catch (imageError) {
          console.error("Failed to process image", file.id, imageError);
          paragraphs.push(
            createErrorParagraph(
              `Failed to process image: ${file.name || "unknown"}`
            )
          );
        }
      } else {
        // リモート画像の場合はリンクを追加
        paragraphs.push(
          createFileLinkParagraph("Image", file.name || "Image", filePath)
        );
      }
    } else {
      // 非画像ファイルの場合は常にリンクを追加（パーマリンクが使用される）
      // file-handler.tsで非画像ファイルは常にパーマリンクを返すように修正しました
      paragraphs.push(
        createFileLinkParagraph("File", file.name || "File", filePath)
      );
    }
  }
}
