import sharp from "sharp";

// Helper function to get image dimensions and calculate aspect ratio
export async function getImageDimensions(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{
  width: number;
  height: number;
}> {
  let width = 0;
  let height = 0;

  // Only try to get dimensions if it's an image
  if (mimeType && mimeType.startsWith("image/")) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      if (metadata.width && metadata.height) {
        width = metadata.width;
        height = metadata.height;
      }
    } catch (error) {
      console.error("Failed to get image dimensions:", error);
    }
  }

  // Default fallback dimensions - different defaults based on content type
  if (width === 0 || height === 0) {
    if (mimeType && mimeType.startsWith("audio/")) {
      width = 300;
      height = 60;
    } else if (mimeType && mimeType.startsWith("video/")) {
      width = 400;
      height = 225;
    } else {
      width = 400;
      height = 300;
    }
  }

  return {
    width,
    height,
  };
}

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
): Promise<{ buffer: Buffer; type: "jpg" | "png" | "gif" | "bmp" }> {
  try {
    // 画像のメタデータを取得
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    console.log(
      `[DEBUG] ensureCompatibleImage - Original size: ${width}x${height}`
    );

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

      console.log(
        `[DEBUG] ensureCompatibleImage - New size: ${newWidth}x${newHeight}`
      );

      // リサイズと変換を実行
      const processedBuffer = await sharp(imageBuffer)
        .resize(newWidth, newHeight, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();

      return {
        buffer: processedBuffer,
        type: "png",
      };
    }

    // サイズが取得できない場合は、PNGに変換するだけ
    console.log(
      "[DEBUG] ensureCompatibleImage - No size info, converting to PNG only"
    );
    const processedBuffer = await sharp(imageBuffer).png().toBuffer();

    return {
      buffer: processedBuffer,
      type: "png",
    };
  } catch (error) {
    console.error(`Failed to convert image: mimeType=${mimeType}`, error);

    // エラー時のフォールバック処理
    try {
      console.log("[DEBUG] ensureCompatibleImage - Trying fallback conversion");
      const simpleBuffer = await sharp(imageBuffer).toFormat("png").toBuffer();

      return {
        buffer: simpleBuffer,
        type: "png",
      };
    } catch (secondError) {
      console.error("Failed even with fallback conversion:", secondError);
      return {
        buffer: imageBuffer,
        type: getMappedImageType(mimeType.split("/")[1] || ""),
      };
    }
  }
}
