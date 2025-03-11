import { Paragraph } from "docx";
import * as fs from "fs";
import path from "path";
import { MessageElement, MessageFile, toSlackFile } from "../types";
import { getUserName } from "../slack-client";
import { downloadSlackFile } from "../file-handler";
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
  createTextParagraph,
  createFileLinkParagraph,
  createImageTitleParagraph,
  createImageParagraph,
  createErrorParagraph,
  createEndSpeakerParagraph,
  createReactionParagraphs,
} from "./paragraph-formatters";

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

  // Process and add message text - make sure not to include markdown image references
  let messageText = await extractMessageText(message, false); // Skip file processing
  messageText = await replaceMentionToUserName(messageText);

  // Split message text into paragraphs and add each as a separate paragraph
  const textParagraphs = messageText.split("\n");
  for (const textParagraph of textParagraphs) {
    if (textParagraph.trim()) {
      paragraphs.push(createTextParagraph(textParagraph, indent));
    }
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
function ensureDirectoriesExist() {
  const filesDir = path.join(process.cwd(), "out", "files");
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
    console.log(`Created output directory: ${filesDir}`);
  }
  return filesDir;
}

// Helper function to add file paragraphs
async function addFilesParagraphs(
  paragraphs: Paragraph[],
  files: MessageFile[],
  indent = {}
): Promise<void> {
  // Ensure our debug directory exists
  const debugFilesDir = ensureDirectoriesExist();

  for (const file of files) {
    try {
      const slackFile = toSlackFile(file);
      if (slackFile) {
        // Download file or get permalink
        const fileResult = await downloadSlackFile(slackFile);

        // Check if we got back a permalink (starts with http) or a local file path
        const isPermalink = fileResult.startsWith("http");

        if (file.mimetype && file.mimetype.startsWith("image/")) {
          if (!isPermalink) {
            // This is a local file path for an image
            console.log(`Processing image: ${file.name}, path: ${fileResult}`);

            // Verify file exists
            if (!fs.existsSync(fileResult)) {
              console.error(`Downloaded file does not exist at: ${fileResult}`);
              throw new Error(`File not found: ${fileResult}`);
            }

            // Process the image
            await addImageParagraphs(
              paragraphs,
              file,
              fileResult,
              fileResult,
              indent
            );
          } else {
            // This is a permalink for an image - add a link
            paragraphs.push(
              createFileLinkParagraph(
                "Image file",
                file.name || "image file",
                fileResult,
                indent
              )
            );
          }
        } else {
          // For all other file types, always add as a link
          paragraphs.push(
            createFileLinkParagraph(
              getFileTypeLabel(file.mimetype || ""),
              file.name || "unnamed file",
              fileResult,
              indent
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to process file", file.id, error);
      paragraphs.push(
        createErrorParagraph(
          `[Error processing file: ${file.name || "unnamed file"}]`,
          indent
        )
      );

      // Add a permalink if available
      if (file.permalink) {
        paragraphs.push(
          createFileLinkParagraph(
            "Original file in Slack",
            file.name || "file",
            file.permalink,
            indent
          )
        );
      }
    }
  }
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
  debugFilePath: string,
  indent = {}
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
