import { Paragraph } from "docx";
import * as fs from "fs";
import path from "path";
import { MessageElement, MessageFile } from "../types";
import { getUserName } from "../slack-client";
import {
  replaceMentionToUserName,
  extractMessageText,
} from "../message-formatter";
import {
  getImageDimensions,
  getMappedImageType,
  ensureCompatibleImage,
} from "./image-utils";
import { generateSlackMessageUrl } from "./url-utils";
import { styles } from "./styles";
import {
  createSeparatorParagraph,
  createSpeakerParagraph,
  createUsernameTimestampParagraph,
  createFileLinkParagraph,
  createImageTitleParagraph,
  createImageParagraph,
  createErrorParagraph,
  createEndSpeakerParagraph,
} from "./paragraph-formatters";
import { processMessageBlocks } from "./processors/block-processor";
import { processMessageText } from "./processors/text-processor";
import { addFilesParagraphs } from "./processors/file-processor";
import { createReactionParagraphs } from "./processors/reaction-processor";

// Create all paragraphs for a message
export async function createMessageParagraphs(
  message: MessageElement,
  channelId: string,
  indentLevel: number
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];
  const username = message.user ? await getUserName(message.user) : "No Name";
  const timestamp = new Date(Number(message.ts) * 1000);
  const indent =
    indentLevel > 0 ? { left: styles.threadIndent * indentLevel } : {};

  // Generate Slack message URL (for linking the timestamp)
  const messageUrl = generateSlackMessageUrl(
    channelId,
    message.ts,
    message.thread_ts,
    message.parent_user_id
  );

  // Add separator
  paragraphs.push(createSeparatorParagraph(indent));

  // Add SPEAKER tag for MAXQDA
  paragraphs.push(createSpeakerParagraph(username || "No Name", indent));

  // Add username and timestamp with hyperlink
  paragraphs.push(
    createUsernameTimestampParagraph(
      username || "No Name",
      timestamp,
      messageUrl,
      indent
    )
  );

  // Process message blocks if available (Slack Block Kit)
  if (message.blocks && message.blocks.length > 0) {
    await processMessageBlocks(message.blocks, paragraphs, indent);
  } else {
    // Process and add message text - make sure not to include markdown image references
    let messageText = await extractMessageText(message, false); // Skip file processing
    messageText = await replaceMentionToUserName(messageText);

    // Process the message text for markdown formatting
    await processMessageText(messageText, paragraphs, indent);
  }

  // Add files/images directly to the document
  if (message.files && Array.isArray(message.files)) {
    await addFilesParagraphs(
      paragraphs,
      message.files as MessageFile[],
      indent
    );
  }

  // Enhanced reactions implementation to display emojis and custom icons
  if (message.reactions && message.reactions.length > 0) {
    const reactionParagraphs = await createReactionParagraphs(
      message.reactions,
      indent
    );
    paragraphs.push(...reactionParagraphs);
  }

  // Add ENDSPEAKER tag for MAXQDA
  paragraphs.push(createEndSpeakerParagraph(indent));

  return paragraphs;
}

// Helper function to ensure output directories exist
function ensureDirectoriesExist(): string {
  const filesDir = path.join(process.cwd(), "out", "files");
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
    console.log(`Created output directory: ${filesDir}`);
  }
  return filesDir;
}

// Helper function to determine file type label
function getFileTypeLabel(mimetype: string): string {
  if (mimetype.startsWith("audio/")) return "Audio file";
  if (mimetype.startsWith("video/")) return "Video file";
  if (mimetype.startsWith("image/")) return "Image file";

  // Try to extract a meaningful type
  const mainType = mimetype.split("/")[0];
  if (mainType && mainType !== "application") {
    return mainType.charAt(0).toUpperCase() + mainType.slice(1) + " file";
  }

  return "File";
}

// Helper function to add image paragraphs - now with aspect ratio preservation
async function addImageParagraphs(
  paragraphs: Paragraph[],
  file: MessageFile,
  filePath: string,
  indent: Record<string, any> = {}
): Promise<void> {
  // Add title paragraph for the image first
  paragraphs.push(createImageTitleParagraph(file.name || "", indent));

  try {
    console.log(`DEBUG: Loading image from ${filePath}`);

    // First try to validate that the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`DEBUG: File does not exist at path: ${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats for debugging
    const stats = fs.statSync(filePath);
    console.log(
      `DEBUG: File size: ${stats.size} bytes, last modified: ${stats.mtime}`
    );

    // Read the file for embedding
    const imageData = fs.readFileSync(filePath);
    console.log(`DEBUG: Successfully read ${imageData.length} bytes from file`);

    // Check if this is an SVG placeholder (meaning download failed)
    const isSvgPlaceholder = imageData
      .toString("utf8", 0, 100)
      .includes('<svg xmlns="http://www.w3.org/2000/svg"');

    if (isSvgPlaceholder) {
      console.log(`DEBUG: Detected SVG placeholder for failed download`);
      // Add a link to the original file instead of embedding the placeholder
      paragraphs.push(
        createErrorParagraph(
          `[Unable to download image: ${file.name || "unnamed file"}]`,
          indent
        )
      );

      // Add a link to the original file in Slack
      if (file.permalink) {
        paragraphs.push(
          createFileLinkParagraph(
            "Original image in Slack",
            file.name || "image file",
            file.permalink,
            indent
          )
        );
      }
      return;
    }

    // Try direct embedding
    try {
      // Attempt to detect the image type from the file extension
      const fileExt = path
        .extname(file.name || "")
        .toLowerCase()
        .substring(1);
      const imageType = getMappedImageType(
        fileExt || file.mimetype?.split("/")[1] || "png"
      );

      // Get image dimensions with aspect ratio preservation
      const maxPageWidth = 500; // Maximum width to prevent page overflow
      const { scaledWidth, scaledHeight } = await getImageDimensions(
        imageData,
        file.mimetype || "image/png",
        maxPageWidth
      );

      console.log(
        `DEBUG: Embedding image as ${imageType}, width=${scaledWidth}, height=${scaledHeight} (preserving aspect ratio)`
      );

      // Try embedding the raw image data with proper aspect ratio
      paragraphs.push(
        createImageParagraph(
          imageData,
          scaledWidth,
          scaledHeight,
          imageType,
          indent
        )
      );
      console.log(`DEBUG: Successfully created image paragraph`);
    } catch (embeddingErr) {
      console.error(`DEBUG: Error during direct embedding: ${embeddingErr}`);

      // Try with the image conversion approach
      console.log(`DEBUG: Trying with conversion...`);
      const { buffer: processedImageData, type: imageType } =
        await ensureCompatibleImage(imageData, file.mimetype || "image/png");

      // Get dimensions for the processed image
      const maxPageWidth = 500;
      const { scaledWidth, scaledHeight } = await getImageDimensions(
        processedImageData,
        file.mimetype || "image/png",
        maxPageWidth
      );

      console.log(
        `DEBUG: Conversion completed, embedding as ${imageType}, width=${scaledWidth}, height=${scaledHeight}`
      );
      paragraphs.push(
        createImageParagraph(
          processedImageData,
          scaledWidth,
          scaledHeight,
          imageType,
          indent
        )
      );
    }
  } catch (err: unknown) {
    console.error(`ERROR adding image: ${err}`);

    // In case of error, add an error paragraph
    paragraphs.push(
      createErrorParagraph(
        `[Unable to embed image: ${file.name || "unnamed file"} - Error: ${
          err instanceof Error ? err.message : String(err)
        }]`,
        indent
      )
    );

    // Also add a link to the file as fallback
    if (file.permalink) {
      paragraphs.push(
        createFileLinkParagraph(
          "Image file (link)",
          file.name || "image file",
          file.permalink,
          indent
        )
      );
    }
  }
}
