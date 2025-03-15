import {
  BorderStyle,
  ExternalHyperlink,
  ImageRun,
  Paragraph,
  ParagraphChild,
  TextRun,
  UnderlineType,
} from "docx";
import { styles } from "./styles";
import { getMappedImageType } from "./image-utils";
import { getEmojiRepresentation } from "./emoji-utils";

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
export function createTextParagraphs(text: string, options = {}): Paragraph[] {
  // Handle basic Markdown formatting
  const formattedText = formatMarkdownText(text, options);
  return formattedText;
}

// Helper function to parse basic markdown
function formatMarkdownText(text: string, options = {}): Paragraph[] {
  const result: Paragraph[] = [];

  // split text into lines
  const lines = text.split("\n");

  for (const line of lines) {
    const children = formatMarkdownLine(line);
    result.push(
      new Paragraph({
        children: [...children],
        spacing: {
          before: 120,
          after: 120,
        },
        ...options,
      })
    );
  }

  return result;
}

// Helper function to parse a single line of markdown
function formatMarkdownLine(text: string): ParagraphChild[] {
  const result: ParagraphChild[] = [];

  const combinedPattern = new RegExp(
    '(\\*\\*(.*?)\\*\\*|__(.*?)__)|(\\*(.*?)\\*|_(.*?)_)|(`(.*?)`)|(\\[(.*?)\\]\\((.*?)\\))|(<span class="underline">(.*?)<\\/span>)|(https?:\\/\\/[^\\s]+)|(:([\\w+-]+):)',
    "g"
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(plainTextRun(text.substring(lastIndex, match.index)));
    }
    // Bold
    if (match[1]) {
      // group 2 or 3 might have content
      const content = match[2] || match[3] || "";
      result.push(boldTextRun(content));
    }
    // Italic
    else if (match[4]) {
      const content = match[5] || match[6] || "";
      result.push(new TextRun({ text: content, italics: true }));
    }
    // Code
    else if (match[7]) {
      const content = match[8] || "";
      result.push(
        new TextRun({
          text: content,
          font: styles.fonts.monospace,
          size: styles.fontSize.code,
        })
      );
    }
    // Markdown link
    else if (match[9]) {
      const linkText = match[10] || "";
      const linkUrl = match[11] || "";
      result.push(hyperlinkRun(linkText, linkUrl));
    }
    // Underline span
    else if (match[12]) {
      const content = match[13] || "";
      result.push(
        new TextRun({
          text: content,
          underline: {
            type: UnderlineType.SINGLE,
          },
        })
      );
    }
    // Raw link
    else if (match[14]) {
      const rawUrl = match[14];
      result.push(hyperlinkRun(rawUrl, rawUrl));
    }
    // Emoji shortcode
    else if (match[15]) {
      const emojiName = match[16] || "";
      const emoji = getEmojiRepresentation(emojiName);
      result.push(plainTextRun(emoji));
    }
    lastIndex = combinedPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(plainTextRun(text.substring(lastIndex)));
  }

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
export function createBlockquoteParagraphs(
  text: string,
  options: { indent?: { left?: number } } = {}
): Paragraph[] {
  return formatMarkdownText(text, {
    border: {
      left: {
        color: styles.colors.blockquoteBorder,
        style: BorderStyle.SINGLE,
        size: 4,
      },
    },
    indent: {
      left: styles.blockquoteIndent + (options.indent?.left || 0),
    },
    spacing: {
      before: 120,
      after: 120,
    },
    ...options,
  });
}

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
