import {
  Paragraph,
  TextRun,
  ExternalHyperlink,
  ImageRun,
  HeadingLevel,
  PageBreak,
} from "docx";
import { styles } from "./styles";
import uEmojiParser from "universal-emoji-parser";
import axios from "axios";
import { getMappedImageType } from "./image-utils";
import { processUrls } from "./url-utils";

// Create separator paragraph
export function createSeparatorParagraph(indent = {}): Paragraph {
  return new Paragraph({
    border: {
      bottom: styles.separator,
    },
    spacing: {
      before: 200,
      after: 200,
    },
    indent,
  });
}

// Create page break paragraph
export function createPageBreakParagraph(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

// Create date heading paragraph with #TEXT tag for MAXQDA
export function createDateHeadingParagraph(date: string): Paragraph {
  return new Paragraph({
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
  });
}

// Create speaker tag paragraph
export function createSpeakerParagraph(
  username: string,
  indent = {}
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `#SPEAKER ${username}`,
        ...styles.username,
      }),
    ],
    indent,
  });
}

// Create end speaker tag paragraph
export function createEndSpeakerParagraph(indent = {}): Paragraph {
  return new Paragraph({
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
  });
}

// Create username and timestamp paragraph
export function createUsernameTimestampParagraph(
  username: string,
  timestamp: Date,
  messageUrl: string,
  indent = {}
): Paragraph {
  return new Paragraph({
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
  });
}

// Create text paragraph with URL processing
export function createTextParagraph(text: string, indent = {}): Paragraph {
  return new Paragraph({
    children: processUrls(text),
    indent,
  });
}

// Create file link paragraph
export function createFileLinkParagraph(
  fileType: string,
  fileName: string,
  fileUrl: string,
  indent = {}
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${fileType}: `,
        ...styles.messageText,
        bold: fileType !== "File",
      }),
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: fileName || "unnamed file",
            style: "Hyperlink",
            ...styles.fileLink,
          }),
        ],
        link: fileUrl,
      }),
    ],
    spacing: {
      before: 120,
      after: 120,
    },
    indent,
  });
}

// Create image title paragraph
export function createImageTitleParagraph(
  fileName: string,
  indent = {}
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `Image: ${fileName || "unnamed image"}`,
        ...styles.messageText,
        italics: true,
      }),
    ],
    spacing: {
      before: 120,
    },
    indent,
  });
}

// Create image paragraph
export function createImageParagraph(
  data: Buffer,
  width: number,
  height: number,
  type: "jpg" | "png" | "gif" | "bmp",
  indent = {}
): Paragraph {
  // For debugging, log the image details
  console.log(
    `Creating image paragraph: type=${type}, size=${data.length} bytes, dimensions=${width}x${height}`
  );

  // Return a paragraph with an ImageRun
  return new Paragraph({
    children: [
      new ImageRun({
        data,
        transformation: {
          width,
          height,
        },
        type,
      }),
    ],
    ...indent,
  });
}

// Create error message paragraph
export function createErrorParagraph(message: string, indent = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: message,
        ...styles.messageText,
        color: "FF0000",
      }),
    ],
    indent,
  });
}

// Process and create reaction paragraphs
export async function createReactionParagraphs(
  reactions: any[],
  indent = {}
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < reactions.length; i++) {
    const reaction = reactions[i];
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
        const urlExtension = reaction.url.split(".").pop()?.toLowerCase() || "";
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
        console.error(`Failed to download emoji image: ${reaction.url}`, error);
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
        reaction.users.map(
          async (userId: string) =>
            await import("../slack-client").then((mod) =>
              mod.getUserName(userId)
            )
        )
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

  return paragraphs;
}
