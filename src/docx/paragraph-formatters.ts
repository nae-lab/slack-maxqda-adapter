import {
  BorderStyle,
  ExternalHyperlink,
  ImageRun,
  Paragraph,
  ParagraphChild,
  TextRun,
} from "docx";
import { styles } from "./styles";
import { Reaction } from "../types";
import { getUserName } from "../slack-client";
import { getMappedImageType } from "./image-utils";

// Helper for creating plain text runs
export function plainTextRun(text: string, options = {}) {
  return new TextRun({
    text,
    ...options,
  });
}

// Helper for creating bold text runs
export function boldTextRun(text: string, options = {}) {
  return new TextRun({
    text,
    bold: true,
    ...options,
  });
}

// Helper for creating hyperlinks
export function hyperlinkRun(text: string, link: string, options = {}) {
  return new ExternalHyperlink({
    children: [
      new TextRun({
        text,
        color: styles.colors.linkBlue,
        ...options,
      }),
    ],
    link,
  });
}

// Create a separator paragraph
export function createSeparatorParagraph(options = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text: "─".repeat(40),
        color: styles.colors.separatorLine,
      }),
    ],
    spacing: {
      before: 240,
      after: 240,
    },
    ...options,
  });
}

// Create a MAXQDA speaker tag paragraph (preserved exactly as is)
export function createSpeakerParagraph(username: string, options = {}) {
  return new Paragraph({
    children: [new TextRun({ text: `#SPEAKER ${username}` })],
    spacing: {
      before: 240,
      after: 120,
    },
    style: "MAXQDATag",
    ...options,
  });
}

// Create a username and timestamp paragraph with hyperlink
export function createUsernameTimestampParagraph(
  username: string,
  timestamp: Date,
  url: string,
  options = {}
) {
  const formattedTime = timestamp.toLocaleString();

  return new Paragraph({
    children: [
      boldTextRun(username, { size: styles.fontSize.normal }),
      plainTextRun(" "),
      hyperlinkRun(formattedTime, url, {
        size: styles.fontSize.small,
        color: styles.colors.secondaryText,
      }),
    ],
    spacing: {
      before: 120,
      after: 120,
    },
    ...options,
  });
}

// Create a text paragraph with formatting support
export function createTextParagraph(text: string, options = {}) {
  // Handle basic Markdown formatting
  const formattedText = formatMarkdownText(text);

  return new Paragraph({
    children: formattedText,
    spacing: {
      after: 120,
    },
    ...options,
  });
}

// Helper function to parse basic markdown
function formatMarkdownText(text: string): ParagraphChild[] {
  const result: ParagraphChild[] = [];

  // Simple regex patterns for markdown
  const boldPattern = /\*\*(.*?)\*\*|__(.*?)__/g;
  const italicPattern = /\*(.*?)\*|_(.*?)_/g;
  const codePattern = /`(.*?)`/g;
  const linkPattern = /\[(.*?)\]\((.*?)\)/g;

  // Process the string for different patterns
  let lastIndex = 0;
  let match;

  // Function to process a segment of text with formatting
  const processSegment = (segment: string) => {
    // Check for bold
    segment = segment.replace(boldPattern, (_, g1, g2) => {
      const content = g1 || g2;
      result.push(boldTextRun(content));
      return "";
    });

    // Check for italics
    segment = segment.replace(italicPattern, (_, g1, g2) => {
      const content = g1 || g2;
      result.push(new TextRun({ text: content, italics: true }));
      return "";
    });

    // Check for inline code
    segment = segment.replace(codePattern, (_, g1) => {
      result.push(
        new TextRun({
          text: g1,
          font: styles.fonts.monospace,
          size: styles.fontSize.code,
        })
      );
      return "";
    });

    // Check for links
    segment = segment.replace(linkPattern, (_, text, url) => {
      result.push(hyperlinkRun(text, url));
      return "";
    });

    // Add any remaining text
    if (segment) {
      result.push(plainTextRun(segment));
    }
  };

  // Process the entire text
  processSegment(text);

  return result;
}

// Create a file link paragraph
export function createFileLinkParagraph(
  fileType: string,
  fileName: string,
  link: string,
  options = {}
) {
  return new Paragraph({
    children: [plainTextRun(`${fileType}: `), hyperlinkRun(fileName, link)],
    spacing: {
      before: 120,
      after: 120,
    },
    ...options,
  });
}

// Create an image title paragraph
export function createImageTitleParagraph(title: string, options = {}) {
  return new Paragraph({
    children: [plainTextRun(title || "")],
    spacing: {
      before: 120,
      after: 60,
    },
    ...options,
  });
}

// Create an image paragraph
export function createImageParagraph(
  imageBuffer: Buffer,
  width: number,
  height: number,
  imageType: string,
  options = {}
) {
  return new Paragraph({
    children: [
      new ImageRun({
        data: imageBuffer,
        transformation: {
          width,
          height,
        },
        type: getMappedImageType(imageType),
      }),
    ],
    spacing: {
      before: 120,
      after: 240,
    },
    ...options,
  });
}

// Create an error paragraph
export function createErrorParagraph(text: string, options = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        color: "FF0000", // Red color for errors
        italics: true,
      }),
    ],
    spacing: {
      before: 120,
      after: 120,
    },
    ...options,
  });
}

// Create a MAXQDA end speaker tag paragraph (preserved exactly as is)
export function createEndSpeakerParagraph(options = {}) {
  return new Paragraph({
    children: [new TextRun({ text: "#ENDSPEAKER" })],
    spacing: {
      before: 120,
      after: 240,
    },
    style: "MAXQDATag",
    ...options,
  });
}

// Create code block paragraphs
export function createCodeBlockParagraphs(code: string, options = {}) {
  const codeLines = code.split("\n");
  const paragraphs: Paragraph[] = [];

  // Add top border paragraph
  paragraphs.push(
    new Paragraph({
      children: [],
      border: {
        top: {
          color: styles.colors.borderColor,
          style: BorderStyle.SINGLE,
          size: 1,
        },
        left: {
          color: styles.colors.borderColor,
          style: BorderStyle.SINGLE,
          size: 1,
        },
        right: {
          color: styles.colors.borderColor,
          style: BorderStyle.SINGLE,
          size: 1,
        },
      },
      shading: {
        type: "solid",
        fill: styles.colors.codeBg,
      },
      ...options,
    })
  );

  // Add code content
  for (const line of codeLines) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            font: styles.fonts.monospace,
            size: styles.fontSize.code,
          }),
        ],
        border: {
          left: {
            color: styles.colors.borderColor,
            style: BorderStyle.SINGLE,
            size: 1,
          },
          right: {
            color: styles.colors.borderColor,
            style: BorderStyle.SINGLE,
            size: 1,
          },
        },
        shading: {
          type: "solid",
          fill: styles.colors.codeBg,
        },
        ...options,
      })
    );
  }

  // Add bottom border paragraph
  paragraphs.push(
    new Paragraph({
      children: [],
      border: {
        bottom: {
          color: styles.colors.borderColor,
          style: BorderStyle.SINGLE,
          size: 1,
        },
        left: {
          color: styles.colors.borderColor,
          style: BorderStyle.SINGLE,
          size: 1,
        },
        right: {
          color: styles.colors.borderColor,
          style: BorderStyle.SINGLE,
          size: 1,
        },
      },
      shading: {
        type: "solid",
        fill: styles.colors.codeBg,
      },
      ...options,
    })
  );

  return paragraphs;
}

// Create blockquote paragraphs
export function createBlockquoteParagraph(text: string, options = {}) {
  return new Paragraph({
    children: formatMarkdownText(text),
    border: {
      left: {
        color: styles.colors.blockquoteBorder,
        style: BorderStyle.SINGLE,
        size: 4,
      },
    },
    indent: {
      left: styles.blockquoteIndent,
    },
    spacing: {
      before: 120,
      after: 120,
    },
    ...options,
  });
}

// Create reaction paragraphs
export async function createReactionParagraphs(
  reactions: Reaction[],
  options = {}
): Promise<Paragraph[]> {
  if (!reactions.length) return [];

  const paragraphs: Paragraph[] = [];
  const reactionRuns: TextRun[] = [];

  for (const reaction of reactions) {
    const emoji = `:${reaction.name}:`;
    const users = reaction.users
      ? await Promise.all(reaction.users.map((uid) => getUserName(uid)))
      : [];
    const formattedUsers = users.join(", ");

    reactionRuns.push(
      new TextRun({
        text: `${emoji} ${reaction.count || users.length}`,
        size: styles.fontSize.small,
      })
    );
    reactionRuns.push(
      new TextRun({ text: " | ", size: styles.fontSize.small })
    );
  }

  // Remove the last separator
  if (reactionRuns.length > 0) {
    reactionRuns.pop();
    paragraphs.push(
      new Paragraph({
        children: reactionRuns,
        spacing: {
          before: 120,
          after: 120,
        },
        ...options,
      })
    );
  }

  return paragraphs;
}

// Create page break paragraph
export function createPageBreakParagraph() {
  return new Paragraph({
    children: [new TextRun({ text: "", break: 1 })],
  });
}

// Create date heading paragraph (with MAXQDA #TEXT tag)
export function createDateHeadingParagraph(date: string) {
  return new Paragraph({
    children: [new TextRun({ text: `#TEXT ${date}`, bold: true })],
    spacing: {
      before: 480,
      after: 240,
    },
    style: "MAXQDATag",
  });
}
