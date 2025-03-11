import { Paragraph } from "docx";
import {
  createTextParagraph,
  createCodeBlockParagraphs,
  createBlockquoteParagraph,
} from "../paragraph-formatters";

export async function processMessageText(
  messageText: string,
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  const codeBlockRegex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(messageText)) !== null) {
    const textBefore = messageText.substring(lastIndex, match.index).trim();
    if (textBefore) {
      await processTextWithBlockquotes(textBefore, paragraphs, indent);
    }

    paragraphs.push(...createCodeBlockParagraphs(match[1], indent));
    lastIndex = match.index + match[0].length;
  }

  const textAfter = messageText.substring(lastIndex).trim();
  if (textAfter) {
    await processTextWithBlockquotes(textAfter, paragraphs, indent);
  }
}

export async function processTextWithBlockquotes(
  text: string,
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  const lines = text.split("\n");
  let currentBlockquote: string[] = [];
  let currentText: string[] = [];

  for (const line of lines) {
    const blockquoteMatch = line.match(/^>\s(.*)/);

    if (blockquoteMatch) {
      if (currentText.length > 0) {
        paragraphs.push(createTextParagraph(currentText.join("\n"), indent));
        currentText = [];
      }
      currentBlockquote.push(blockquoteMatch[1]);
    } else {
      if (currentBlockquote.length > 0) {
        paragraphs.push(
          createBlockquoteParagraph(currentBlockquote.join("\n"), indent)
        );
        currentBlockquote = [];
      }

      if (line.trim()) {
        currentText.push(line);
      } else if (currentText.length > 0) {
        paragraphs.push(createTextParagraph(currentText.join("\n"), indent));
        currentText = [];
      }
    }
  }

  if (currentBlockquote.length > 0) {
    paragraphs.push(
      createBlockquoteParagraph(currentBlockquote.join("\n"), indent)
    );
  }
  if (currentText.length > 0) {
    paragraphs.push(createTextParagraph(currentText.join("\n"), indent));
  }
}
