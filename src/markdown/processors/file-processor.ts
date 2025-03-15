import { MessageFile } from "../../types";
import {
  processSlackFile,
  getObsidianImagePath,
  isImageFile,
  getRelativePath,
} from "../../utils/file-utils";

// Process files attached to a message
export async function processMessageFiles(
  files: MessageFile[],
  channelName: string,
  indentLevel: number = 0,
  markdownFilePath: string
): Promise<string> {
  let markdownContent = "";
  const indentStr = "> ".repeat(indentLevel);

  for (const file of files) {
    const result = await processSlackFile(file, channelName);

    if (result.error || !result.path) {
      console.error("Failed to process file", file.id, result.error);
      markdownContent += `${indentStr}❌ Failed to process file: ${
        file.name || "unknown"
      }\n\n`;
      continue;
    }

    const { path: filePath, isPermalink } = result;

    if (isImageFile(file.mimetype)) {
      // For images, use relative path
      if (!isPermalink) {
        // If it's a local file, use relative path
        const relativePath = getRelativePath(markdownFilePath, filePath);
        markdownContent += `${indentStr}![${
          file.name || "image"
        }](${relativePath})\n\n`;
      } else {
        // If it's a remote image, use standard markdown with absolute URL
        markdownContent += `${indentStr}![${
          file.name || "image"
        }](${filePath})\n\n`;
      }
    } else {
      // For non-image files, create a link with relative path
      const linkPath = !isPermalink
        ? getRelativePath(markdownFilePath, filePath)
        : filePath;
      markdownContent += `${indentStr}📎 [${
        file.name || "file"
      }](${linkPath})\n\n`;
    }
  }

  return markdownContent;
}
