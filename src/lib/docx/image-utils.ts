import sizeOf from "image-size";

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

// Function that preserves aspect ratio by reading actual image dimensions
// Uses pure JS image-size library to avoid electron build issues
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
    // Get actual image dimensions
    const dimensions = sizeOf(imageBuffer);
    const actualWidth = dimensions.width || maxWidth;
    const actualHeight = dimensions.height || maxHeight;

    // Calculate display size while preserving aspect ratio
    let displayWidth = actualWidth;
    let displayHeight = actualHeight;

    if (actualWidth > maxWidth || actualHeight > maxHeight) {
      const widthRatio = maxWidth / actualWidth;
      const heightRatio = maxHeight / actualHeight;
      const scale = Math.min(widthRatio, heightRatio);
      
      displayWidth = Math.round(actualWidth * scale);
      displayHeight = Math.round(actualHeight * scale);
    }

    return {
      buffer: imageBuffer,
      type: getMappedImageType(mimeType.split("/")[1] || ""),
      width: displayWidth,
      height: displayHeight,
    };
  } catch (error) {
    console.error(`Failed to read image dimensions: ${error}`);
    
    // Fallback to default dimensions
    return {
      buffer: imageBuffer,
      type: getMappedImageType(mimeType.split("/")[1] || ""),
      width: Math.min(400, maxWidth),
      height: Math.min(300, maxHeight),
    };
  }
}
