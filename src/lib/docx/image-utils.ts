import sharp from "sharp";

// Helper function to convert MIME types to valid docx image types
export function getMappedImageType(
  mimeSubtype: string
): "jpg" | "png" | "gif" | "bmp" {
  // Map common mime subtypes to their corresponding docx types
  const mimeTypeMap: Record<string, "jpg" | "png" | "gif" | "bmp"> = {
    jpeg: "jpg",
    jpg: "jpg",
    png: "png",
    gif: "gif",
    bmp: "bmp",
  };

  // Return the mapped type or default to png if not found
  return mimeTypeMap[mimeSubtype.toLowerCase()] || "png";
}

// Enhanced function to ensure image is in a compatible format while preserving aspect ratio
export async function ensureCompatibleImage(
  imageBuffer: Buffer,
  mimeType: string,
  maxWidth: number = 1000,
  maxHeight: number = 1000
): Promise<{
  buffer: Buffer;
  type: "jpg" | "png" | "gif" | "bmp";
  width: number;
  height: number;
}> {
  try {
    // 画像のメタデータを取得
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // アスペクト比を計算
    if (width > 0 && height > 0) {
      const aspectRatio = width / height;
      let newWidth = width;
      let newHeight = height;

      // サイズ制限を適用
      if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const scale = Math.min(widthRatio, heightRatio);

        newWidth = Math.round(width * scale);
        newHeight = Math.round(height * scale);
      }

      // リサイズと変換を実行
      const processedBuffer = await sharp(imageBuffer)
        .rotate() // 自動回転を適用
        .resize(newWidth * 3, newHeight * 3, {
          // 3倍の解像度でリサイズ
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({
          compressionLevel: 9, // 最高圧縮（処理は遅くなるが、ファイルサイズを最小化）
          quality: 90, // 90%の品質を維持
        })
        .toBuffer();

      return {
        buffer: processedBuffer,
        type: "png",
        width: newWidth, // DOCXでの表示サイズは元のまま
        height: newHeight,
      };
    }

    // サイズが取得できない場合は、PNGに変換するだけ
    const processedBuffer = await sharp(imageBuffer)
      .png({
        compressionLevel: 9,
      })
      .toBuffer();

    return {
      buffer: processedBuffer,
      type: "png",
      width: 400, // デフォルトサイズ
      height: 300,
    };
  } catch (error) {
    console.error(`Failed to convert image: mimeType=${mimeType}`, error);

    // エラー時のフォールバック処理
    try {
      const simpleBuffer = await sharp(imageBuffer)
        .toFormat("png", {
          compressionLevel: 9,
        })
        .toBuffer();

      return {
        buffer: simpleBuffer,
        type: "png",
        width: 400, // デフォルトサイズ
        height: 300,
      };
    } catch (secondError) {
      console.error("Failed even with fallback conversion:", secondError);
      return {
        buffer: imageBuffer,
        type: getMappedImageType(mimeType.split("/")[1] || ""),
        width: 400, // デフォルトサイズ
        height: 300,
      };
    }
  }
}
