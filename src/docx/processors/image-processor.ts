import { Paragraph } from "docx";
import * as fs from "fs";
import path from "path";
import { MessageFile } from "../../types";
import { downloadSlackFile } from "../../file-handler";
import {
  createFileLinkParagraph,
  createImageTitleParagraph,
  createImageParagraph,
} from "../paragraph-formatters";
import { getImageDimensions, ensureCompatibleImage } from "../image-utils";
import { styles } from "../styles";
import { handleFileProcessingError } from "../utils";

/**
 * 画像ファイルを処理し、Docxドキュメントに適切な段落を追加します
 * @param paragraphs 段落の配列
 * @param file 処理する画像ファイル
 * @param channelName チャンネル名
 * @param indent インデントオプション
 */
export async function processImageFile(
  paragraphs: Paragraph[],
  file: MessageFile,
  channelName: string = "",
  indent: Record<string, any> = {}
): Promise<void> {
  let filePath: string;
  try {
    // ファイルIDが存在することを確認
    if (!file.id) {
      throw new Error("File ID is missing");
    }

    // Slackファイルオブジェクトを作成
    const slackFile = {
      id: file.id,
      name: file.name,
      permalink: file.permalink,
      url_private: file.url_private,
      url_private_download: file.url_private_download,
      mimetype: file.mimetype,
    };

    filePath = await downloadSlackFile(slackFile, channelName);
  } catch (err) {
    handleFileProcessingError(paragraphs, file, err, "Image", indent);
    return;
  }

  // パーマリンクしか取得できなかった場合はリンクを表示
  if (!filePath || !filePath.startsWith("/")) {
    paragraphs.push(
      createFileLinkParagraph(
        "Image",
        file.name || "Unknown",
        filePath || file.permalink || "",
        indent
      )
    );
    return;
  }

  // タイトルが利用可能な場合は追加
  if (file.title) {
    paragraphs.push(createImageTitleParagraph(file.title, indent));
  }

  try {
    // 画像の寸法を取得し、互換性のある形式を確保
    const imageBuffer = fs.readFileSync(filePath);
    const imageType = path.extname(filePath).substring(1);

    // 互換性のある画像形式に変換（フォーマット変換のみで解像度は変更しない）
    const compatibleImage = await ensureCompatibleImage(
      imageBuffer,
      imageType,
      styles.image.maxWidth,
      styles.image.maxHeight
    );

    // 画像の寸法を取得（表示サイズのみの調整で解像度は変更しない）
    const dimensions = await getImageDimensions(
      compatibleImage.buffer,
      compatibleImage.type,
      styles.image.maxWidth,
      styles.image.maxHeight
    );

    // 画像を追加（寸法はgetImageDimensionsで既に調整済み）
    paragraphs.push(
      createImageParagraph(
        compatibleImage.buffer,
        dimensions.scaledWidth,
        dimensions.scaledHeight,
        compatibleImage.type,
        indent
      )
    );
  } catch (err) {
    handleFileProcessingError(paragraphs, file, err, "Image", indent);
  }
}
