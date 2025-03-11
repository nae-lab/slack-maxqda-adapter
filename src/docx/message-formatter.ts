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
  createCodeBlockParagraphs,
  createBlockquoteParagraph,
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

// Helper function to process message text and identify special formatting
async function processMessageText(
  messageText: string,
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  // Detect code blocks
  const codeBlockRegex = /```([\s\S]*?)```/g;

  // Split by code blocks first
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Process code blocks
  while ((match = codeBlockRegex.exec(messageText)) !== null) {
    // Add text before code block
    const textBefore = messageText.substring(lastIndex, match.index).trim();
    if (textBefore) {
      // Process any blockquotes in the text before
      await processTextWithBlockquotes(textBefore, paragraphs, indent);
    }

    // Add code block
    const codeContent = match[1];
    paragraphs.push(...createCodeBlockParagraphs(codeContent, indent));

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  const textAfter = messageText.substring(lastIndex).trim();
  if (textAfter) {
    await processTextWithBlockquotes(textAfter, paragraphs, indent);
  }
}

// Helper to process text with blockquotes
async function processTextWithBlockquotes(
  text: string,
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  // Split the text by line
  const lines = text.split("\n");
  let currentBlockquote: string[] = [];
  let currentText: string[] = [];

  // Process each line to group blockquotes and normal text
  for (const line of lines) {
    const blockquoteMatch = line.match(/^>\s(.*)/);

    if (blockquoteMatch) {
      // If we have accumulated text, flush it first
      if (currentText.length > 0) {
        const textContent = currentText.join("\n");
        paragraphs.push(createTextParagraph(textContent, indent));
        currentText = [];
      }

      // Add to current blockquote
      currentBlockquote.push(blockquoteMatch[1]);
    } else {
      // If we have accumulated blockquote, flush it first
      if (currentBlockquote.length > 0) {
        const blockquoteContent = currentBlockquote.join("\n");
        paragraphs.push(createBlockquoteParagraph(blockquoteContent, indent));
        currentBlockquote = [];
      }

      // Add to current text if the line is not empty
      if (line.trim()) {
        currentText.push(line);
      } else if (currentText.length > 0) {
        // Empty line - add paragraph break
        const textContent = currentText.join("\n");
        paragraphs.push(createTextParagraph(textContent, indent));
        currentText = [];
      }
    }
  }

  // Flush any remaining content
  if (currentBlockquote.length > 0) {
    const blockquoteContent = currentBlockquote.join("\n");
    paragraphs.push(createBlockquoteParagraph(blockquoteContent, indent));
  }

  if (currentText.length > 0) {
    const textContent = currentText.join("\n");
    paragraphs.push(createTextParagraph(textContent, indent));
  }
}

// Process Slack Block Kit blocks
async function processMessageBlocks(
  blocks: any[],
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  for (const block of blocks) {
    switch (block.type) {
      case "section":
        if (block.text) {
          // Process text with markdown formatting
          await processMessageText(block.text.text, paragraphs, indent);
        }

        // Process fields if any
        if (block.fields && block.fields.length > 0) {
          for (const field of block.fields) {
            await processMessageText(field.text, paragraphs, indent);
          }
        }
        break;

      case "rich_text":
        // Process rich text elements
        if (block.elements) {
          for (const element of block.elements) {
            await processRichTextElement(element, paragraphs, indent);
          }
        }
        break;

      case "divider":
        // Add a divider line
        paragraphs.push(createSeparatorParagraph(indent));
        break;

      case "image":
        // Add image title if available
        if (block.title) {
          paragraphs.push(createImageTitleParagraph(block.title.text, indent));
        }

        // Try to download and embed the image
        try {
          // If there's an image URL, try to process it
          if (block.image_url) {
            paragraphs.push(
              createFileLinkParagraph(
                "Image",
                block.alt_text || "Image",
                block.image_url,
                indent
              )
            );
          }
        } catch (error) {
          paragraphs.push(
            createErrorParagraph(
              `[Error embedding image: ${block.alt_text || "image"}]`,
              indent
            )
          );
        }
        break;

      case "context":
        // Process context elements
        if (block.elements && block.elements.length > 0) {
          const contextTexts: string[] = [];

          for (const element of block.elements) {
            if (element.type === "plain_text" || element.type === "mrkdwn") {
              contextTexts.push(element.text);
            }
          }

          if (contextTexts.length > 0) {
            // Add context text with smaller font and italics
            paragraphs.push(
              createTextParagraph(contextTexts.join(" "), {
                ...indent,
                size: styles.fontSize.small,
                italics: true,
              })
            );
          }
        }
        break;

      default:
        // For unhandled block types, try to extract text
        if (block.text) {
          const text =
            typeof block.text === "string" ? block.text : block.text.text || "";

          await processMessageText(text, paragraphs, indent);
        }
    }
  }
}

// Process rich text element
async function processRichTextElement(
  element: any,
  paragraphs: Paragraph[],
  indent = {}
): Promise<void> {
  switch (element.type) {
    case "rich_text_section":
      // Combine all text elements in the section
      let sectionText = "";

      if (element.elements) {
        for (const textElement of element.elements) {
          if (textElement.type === "text") {
            sectionText += textElement.text || "";
          } else if (textElement.type === "link") {
            // Fix for undefined link text - use URL as fallback
            const linkText = textElement.text || textElement.url || "link";
            sectionText += `[${linkText}](${textElement.url})`;
          } else if (textElement.type === "user") {
            const userName = textElement.user_id
              ? await getUserName(textElement.user_id)
              : "user";
            sectionText += `@${userName}`;
          } else if (textElement.type === "emoji") {
            sectionText += `:${textElement.name}:`;
          } else if (textElement.type === "channel") {
            sectionText += `#${textElement.channel_id || "channel"}`;
          }
        }
      }

      if (sectionText) {
        paragraphs.push(createTextParagraph(sectionText, indent));
      }
      break;

    case "rich_text_preformatted":
      // Handle preformatted text (code blocks)
      let codeText = "";

      if (element.elements) {
        for (const textElement of element.elements) {
          if (textElement.type === "text") {
            codeText += textElement.text || "";
          }
        }
      }

      if (codeText) {
        paragraphs.push(...createCodeBlockParagraphs(codeText, indent));
      }
      break;

    case "rich_text_quote":
      // Handle quote blocks
      let quoteText = "";

      if (element.elements) {
        for (const textElement of element.elements) {
          if (textElement.type === "text") {
            quoteText += textElement.text || "";
          } else if (textElement.type === "link") {
            // Fix for undefined link text in quotes
            const linkText = textElement.text || textElement.url || "link";
            quoteText += `[${linkText}](${textElement.url})`;
          }
        }
      }

      if (quoteText) {
        paragraphs.push(createBlockquoteParagraph(quoteText, indent));
      }
      break;

    case "rich_text_list":
      // Handle lists
      await processRichTextList(element, paragraphs, indent);
      break;
  }
}

// Process rich text lists
async function processRichTextList(
  list: any,
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  if (!list.elements) return;

  const isOrdered = list.style === "ordered";
  let counter = 1;

  for (const item of list.elements) {
    if (item.type === "rich_text_list_item") {
      let itemText = isOrdered ? `${counter}. ` : "• ";

      // Process item elements
      if (item.elements) {
        for (const element of item.elements) {
          if (element.type === "rich_text_section") {
            let sectionText = "";

            // Process section elements
            if (element.elements) {
              for (const textElement of element.elements) {
                if (textElement.type === "text") {
                  sectionText += textElement.text || "";
                } else if (textElement.type === "link") {
                  // Fix for undefined link text in list items
                  const linkText =
                    textElement.text || textElement.url || "link";
                  sectionText += `[${linkText}](${textElement.url})`;
                }
              }
            }

            itemText += sectionText;
          }
        }
      }

      // Add the list item
      if (itemText) {
        paragraphs.push(
          createTextParagraph(itemText, {
            ...indent,
            indent: {
              left: (indent.left || 0) + styles.indent,
              hanging: isOrdered ? 360 : 240, // Adjust hanging indent based on list type
            },
          })
        );
      }

      if (isOrdered) counter++;
    }
  }
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

// Helper function to add file paragraphs
async function addFilesParagraphs(
  paragraphs: Paragraph[],
  files: MessageFile[],
  indent: Record<string, any> = {}
): Promise<void> {
  // Ensure our debug directory exists
  ensureDirectoriesExist();

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
            await addImageParagraphs(paragraphs, file, fileResult, indent);
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
