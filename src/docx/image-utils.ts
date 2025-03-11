import sharp from "sharp";

// Helper function to get image dimensions and calculate aspect ratio
export async function getImageDimensions(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ width: number; height: number }> {
  // Only try to get dimensions if it's an image
  if (mimeType && mimeType.startsWith("image/")) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      if (metadata.width && metadata.height) {
        return { width: metadata.width, height: metadata.height };
      }
    } catch (error) {
      console.error("Failed to get image dimensions:", error);
    }
  }

  // Default fallback dimensions - different defaults based on content type
  if (mimeType && mimeType.startsWith("audio/")) {
    // Use a smaller width for audio files
    return { width: 300, height: 60 };
  } else if (mimeType && mimeType.startsWith("video/")) {
    // For video files, use 16:9 ratio
    return { width: 400, height: 225 };
  }

  // Generic fallback for any other type
  return { width: 400, height: 300 };
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

// Enhanced function to ensure image is in a compatible format
export async function ensureCompatibleImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; type: "jpg" | "png" | "gif" | "bmp" }> {
  try {
    // Force convert to PNG for maximum compatibility
    const processedBuffer = await sharp(imageBuffer)
      .png() // Always convert to PNG for compatibility
      .resize({
        width: 1000, // Limit max width to prevent issues with large images
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    return {
      buffer: processedBuffer,
      type: "png", // Always use PNG for better compatibility
    };
  } catch (error) {
    console.error(`Failed to convert image: mimeType=${mimeType}`, error);

    // Try a more basic approach as fallback
    try {
      // Use a simpler conversion approach
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
