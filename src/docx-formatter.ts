import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  BorderStyle,
  convertInchesToTwip,
  PageBreak,
  ExternalHyperlink,
} from "docx";
import { Packer } from "docx";
import * as fs from "fs";
import path from "path";
import { MessageElement, toSlackFile, MessageFile } from "./types";
import { getUserName, retrieveThreadMessages } from "./slack-client";
import { downloadSlackFile } from "./file-handler";
import {
  replaceMentionToUserName,
  formatReactionsToMarkdown,
  extractMessageText,
} from "./message-formatter";
import uEmojiParser from "universal-emoji-parser";
import axios from "axios";

// Document style configuration - can be easily modified for future styling needs
const styles = {
  dateHeading: {
    size: 36, // 18pt
    bold: true,
    color: "000000",
  },
  username: {
    size: 28, // 14pt
    bold: true,
    color: "000080", // Navy blue
  },
  timestamp: {
    size: 24, // 12pt
    color: "808080", // Gray
    italics: true,
  },
  messageText: {
    size: 24, // 12pt
    color: "000000",
  },
  reactionText: {
    size: 20, // 10pt
    color: "606060",
    italics: true,
  },
  threadIndent: convertInchesToTwip(0.5), // 0.5 inch indent for thread replies
  separator: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "CCCCCC",
    space: 1,
  },
};

// Helper function to convert MIME types to valid docx image types
function getMappedImageType(
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

// Fixed URL processing function
function processUrls(text: string): (TextRun | ExternalHyperlink)[] {
  const result: (TextRun | ExternalHyperlink)[] = [];

  // Process text in chunks, looking for special URL patterns
  let remainingText = text;
  let currentPosition = 0;

  // Process all URLs in the text
  while (currentPosition < text.length) {
    // Check for angle bracket URLs: <https://example.com>
    const angleBracketMatch = /^<(https?:\/\/[^>]+)>/.exec(remainingText);
    if (angleBracketMatch) {
      // Add the URL as hyperlink
      const url = angleBracketMatch[1];
      result.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: url, style: "Hyperlink" })],
          link: url,
        })
      );

      // Move past this URL
      const matchLength = angleBracketMatch[0].length;
      currentPosition += matchLength;
      remainingText = text.substring(currentPosition);
      continue;
    }

    // Check for Slack pipe URLs: <https://example.com|display text>
    const slackUrlMatch = /^<(https?:\/\/[^|]+)\|([^>]+)>/.exec(remainingText);
    if (slackUrlMatch) {
      // Add the URL as hyperlink with display text
      const url = slackUrlMatch[1];
      const displayText = slackUrlMatch[2];
      result.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: displayText, style: "Hyperlink" })],
          link: url,
        })
      );

      // Move past this URL
      const matchLength = slackUrlMatch[0].length;
      currentPosition += matchLength;
      remainingText = text.substring(currentPosition);
      continue;
    }

    // Check for plain text URLs: https://example.com
    const plainUrlMatch = /^(https?:\/\/\S+)/.exec(remainingText);
    if (plainUrlMatch) {
      // Add the URL as hyperlink
      const url = plainUrlMatch[1];
      result.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: url, style: "Hyperlink" })],
          link: url,
        })
      );

      // Move past this URL
      const matchLength = plainUrlMatch[0].length;
      currentPosition += matchLength;
      remainingText = text.substring(currentPosition);
      continue;
    }

    // Find the next special URL pattern
    const nextUrlStart = Math.min(
      remainingText.indexOf("<http", 0) >= 0
        ? remainingText.indexOf("<http", 0)
        : Number.MAX_SAFE_INTEGER,
      remainingText.indexOf("http://", 0) >= 0
        ? remainingText.indexOf("http://", 0)
        : Number.MAX_SAFE_INTEGER,
      remainingText.indexOf("https://", 0) >= 0
        ? remainingText.indexOf("https://", 0)
        : Number.MAX_SAFE_INTEGER
    );

    if (nextUrlStart === Number.MAX_SAFE_INTEGER || nextUrlStart < 0) {
      // No more URLs, add the remaining text
      result.push(
        new TextRun({
          text: remainingText,
          ...styles.messageText,
        })
      );
      break;
    } else {
      // Add text before the next URL
      if (nextUrlStart > 0) {
        result.push(
          new TextRun({
            text: remainingText.substring(0, nextUrlStart),
            ...styles.messageText,
          })
        );
      }

      // Update position and remaining text
      currentPosition += nextUrlStart;
      remainingText = text.substring(currentPosition);
    }
  }

  return result;
}

export async function exportToWordDocument(
  messagesByDate: { date: string; messages: MessageElement[] }[],
  channelId: string,
  outputPath: string
): Promise<string> {
  // Create a container for our document children
  const documentChildren: Paragraph[] = [];

  // Process each day's messages
  for (let i = 0; i < messagesByDate.length; i++) {
    const { date, messages } = messagesByDate[i];

    // Add page break between days (except for the first day)
    if (i > 0) {
      documentChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    // Add date heading with #TEXT tag for MAXQDA
    documentChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: `#TEXT ${date}`,
            ...styles.dateHeading,
          }),
        ],
        spacing: {
          after: 200,
        },
      })
    );

    // Process each message for the current day
    for (const message of messages) {
      // Add the message to the document
      const messageChildren = await createMessageParagraphs(
        message,
        channelId,
        0
      );
      documentChildren.push(...messageChildren);

      // Process thread messages if any
      if (message.reply_count) {
        const threadMessages = await retrieveThreadMessages(
          channelId,
          message.thread_ts ?? ""
        );

        for (let i = 1; i < threadMessages.length; i++) {
          // Skip the parent message (index 0)
          const threadChildren = await createMessageParagraphs(
            threadMessages[i],
            channelId,
            1
          );
          documentChildren.push(...threadChildren);
        }
      }
    }
  }

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: documentChildren,
      },
    ],
  });

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Write the document to file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

async function createMessageParagraphs(
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
  let messageUrl = `https://ut-naelab.slack.com/archives/${channelId}/p${message.ts?.replace(
    ".",
    ""
  )}`;
  if (message.parent_user_id) {
    // Add thread parameters for thread messages
    messageUrl += `?thread_ts=${message.thread_ts}&cid=${channelId}`;
  }

  // Add separator
  paragraphs.push(
    new Paragraph({
      border: {
        bottom: styles.separator,
      },
      spacing: {
        before: 200,
        after: 200,
      },
      indent,
    })
  );

  // Add SPEAKER tag for MAXQDA
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `#SPEAKER ${username}`,
          ...styles.username,
        }),
      ],
      indent,
    })
  );

  // Add username and timestamp with hyperlink
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${username} `,
          ...styles.username,
        }),
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: `${timestamp.toLocaleString()}`,
              ...styles.timestamp,
              style: "Hyperlink",
            }),
          ],
          link: messageUrl,
        }),
      ],
      spacing: {
        after: 120,
      },
      indent,
    })
  );

  // Process and add message text
  let messageText = await extractMessageText(message);
  messageText = await replaceMentionToUserName(messageText);

  // Split message text into paragraphs and add each as a separate paragraph
  const textParagraphs = messageText.split("\n");
  for (const textParagraph of textParagraphs) {
    if (textParagraph.trim()) {
      paragraphs.push(
        new Paragraph({
          children: processUrls(textParagraph),
          indent,
        })
      );
    }
  }

  // Add files/images directly to the document
  if (message.files && Array.isArray(message.files)) {
    for (const file of message.files as MessageFile[]) {
      try {
        const slackFile = toSlackFile(file);
        if (slackFile) {
          const localFilePath = await downloadSlackFile(slackFile);

          // Only add images directly, other files are mentioned as links
          if (file.mimetype && file.mimetype.startsWith("image/")) {
            try {
              const imageData = fs.readFileSync(
                path.join(process.cwd(), localFilePath.replace("./", ""))
              );

              // Add image with reasonable size
              const maxWidth = 400; // max width in points
              const width = Math.min(500, maxWidth);
              const aspectRatio = 1; // Default if we can't determine
              const height = width * aspectRatio;

              // Extract the MIME subtype and map it to a valid docx image type
              const mimeSubtype = file.mimetype.split("/")[1] || "";

              // Use a properly typed image type with as const assertion
              const imageType = getMappedImageType(mimeSubtype);

              // Fix for the ImageRun type issue - include required fields with proper typing
              paragraphs.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageData,
                      transformation: {
                        width,
                        height,
                      },
                      type: imageType,
                    }),
                  ],
                  spacing: {
                    before: 120,
                    after: 120,
                  },
                  indent,
                })
              );
            } catch (err) {
              console.error(`Error adding image: ${err}`);
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `[Image: ${file.name || "unnamed file"}]`,
                      ...styles.messageText,
                    }),
                  ],
                  indent,
                })
              );
            }
          } else {
            // For non-image files
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[File: ${file.name || "unnamed file"}]`,
                    ...styles.messageText,
                  }),
                ],
                indent,
              })
            );
          }
        }
      } catch (error) {
        console.error("Failed to process file", file.id, error);
      }
    }
  }

  // Enhanced reactions implementation to display emojis and custom icons
  if (message.reactions && message.reactions.length > 0) {
    for (let i = 0; i < message.reactions.length; i++) {
      const reaction = message.reactions[i];
      const reactionChildren: (TextRun | ImageRun)[] = [];
      const count = reaction.count || 0;

      // Add separator between reactions if not the first one
      if (i > 0) {
        reactionChildren.push(
          new TextRun({
            text: " | ",
            ...styles.reactionText,
          })
        );
      }

      // Add emoji as Unicode character or custom emoji image
      if (reaction.url) {
        // This is a custom emoji with an image URL
        try {
          // Download the emoji image
          const response = await axios.get(reaction.url, {
            responseType: "arraybuffer",
          });
          const imageBuffer = Buffer.from(response.data);

          // Determine image type from URL
          const urlExtension =
            reaction.url.split(".").pop()?.toLowerCase() || "";
          const imageType = getMappedImageType(urlExtension);

          // Add the image run
          reactionChildren.push(
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 16,
                height: 16,
              },
              type: imageType,
            })
          );
        } catch (error) {
          console.error(
            `Failed to download emoji image: ${reaction.url}`,
            error
          );
          // Fallback to text
          reactionChildren.push(
            new TextRun({
              text: `:${reaction.name}:`,
              ...styles.reactionText,
            })
          );
        }
      } else {
        // Standard emoji - try to convert to Unicode
        const emojiUnicode = uEmojiParser.parseToUnicode(`:${reaction.name}:`);
        reactionChildren.push(
          new TextRun({
            text: emojiUnicode || `:${reaction.name}:`,
            ...styles.reactionText,
          })
        );
      }

      // Add count after the emoji
      reactionChildren.push(
        new TextRun({
          text: ` ${count}`,
          ...styles.reactionText,
        })
      );

      // Add users who reacted, if available
      if (reaction.users && reaction.users.length > 0) {
        const userNames = await Promise.all(
          reaction.users.map(async (userId) => await getUserName(userId))
        );

        reactionChildren.push(
          new TextRun({
            text: ` (${userNames.join(", ")})`,
            ...styles.reactionText,
          })
        );
      }

      // Add this reaction as a paragraph
      paragraphs.push(
        new Paragraph({
          children: reactionChildren,
          spacing: {
            before: i === 0 ? 120 : 40,
          },
          indent,
        })
      );
    }
  }

  // Add ENDSPEAKER tag for MAXQDA
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "#ENDSPEAKER",
          ...styles.username,
        }),
      ],
      spacing: {
        after: 200,
      },
      indent,
    })
  );

  return paragraphs;
}
