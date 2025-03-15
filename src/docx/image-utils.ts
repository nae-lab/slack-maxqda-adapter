import sharp from "sharp";

// Helper function to get image dimensions and calculate aspect ratio
export async function getImageDimensions(
  imageBuffer: Buffer,
  mimeType: string,
  maxWidth: number = 500, // Default max width to prevent page overflow
  maxHeight: number = 350 // Default max height (約半ページの高さ)
): Promise<{
  width: number;
  height: number;
  scaledWidth: number;
  scaledHeight: number;
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
      // Use a smaller width for audio files
      width = 300;
      height = 60;
    } else if (mimeType && mimeType.startsWith("video/")) {
      // For video files, use 16:9 ratio
      width = 400;
      height = 225;
    } else {
      // Generic fallback for any other type
      width = 400;
      height = 300;
    }
  }

  // Calculate scaled dimensions to preserve aspect ratio
  let scaledWidth = width;
  let scaledHeight = height;
  const aspectRatio = width / height;

  // 幅と高さの両方に制限を適用する
  // まず幅の制限を適用
  if (width > maxWidth) {
    scaledWidth = maxWidth;
    scaledHeight = Math.round(maxWidth / aspectRatio);
  }

  // 次に高さの制限を適用（高さが制限を超える場合）
  if (scaledHeight > maxHeight) {
    scaledHeight = maxHeight;
    scaledWidth = Math.round(maxHeight * aspectRatio);
  }

  // 最終的なサイズがmaxWidthを超えないか確認（稀なケース）
  if (scaledWidth > maxWidth) {
    scaledWidth = maxWidth;
    scaledHeight = Math.round(maxWidth / aspectRatio);
  }

  return {
    width,
    height,
    scaledWidth,
    scaledHeight,
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
    // 解像度を変更せず、フォーマットのみ変換する
    const metadata = await sharp(imageBuffer).metadata();

    // PNGに変換するだけで、リサイズは行わない
    const processedBuffer = await sharp(imageBuffer)
      .png() // Always convert to PNG for compatibility
      .toBuffer();

    return {
      buffer: processedBuffer,
      type: "png", // Always use PNG for better compatibility
    };
  } catch (error) {
    console.error(`Failed to convert image: mimeType=${mimeType}`, error);

    // Try a more basic approach as fallback
    try {
      // Use a simpler conversion approach - フォーマット変換のみ
      const simpleBuffer = await sharp(imageBuffer).toFormat("png").toBuffer();

      return {
        buffer: simpleBuffer,
        type: "png",
      };
    } catch (secondError) {
      console.error("Failed even with fallback conversion:", secondError);
      // Return the original buffer as last resort
      return {
        buffer: imageBuffer,
        type: getMappedImageType(mimeType.split("/")[1] || ""),
      };
    }
  }
}
