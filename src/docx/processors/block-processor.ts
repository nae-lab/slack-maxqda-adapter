import { Paragraph } from "docx";
import { getUserName } from "../../slack-client";
import { styles } from "../styles";
import {
  createSeparatorParagraph,
  createImageTitleParagraph,
  createFileLinkParagraph,
  createErrorParagraph,
  createTextParagraphs,
  createCodeBlockParagraphs,
  createBlockquoteParagraphs,
} from "../paragraph-formatters";
import { processMessageText } from "./text-processor";

export async function processMessageBlocks(
  blocks: any[],
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  for (const block of blocks) {
    await processBlock(block, paragraphs, indent);
  }
}

async function processBlock(
  block: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  switch (block.type) {
    case "section":
      await processSectionBlock(block, paragraphs, indent);
      break;

    case "rich_text":
      await processRichTextBlock(block, paragraphs, indent);
      break;

    case "divider":
      paragraphs.push(createSeparatorParagraph(indent));
      break;

    case "image":
      await processImageBlock(block, paragraphs, indent);
      break;

    case "context":
      await processContextBlock(block, paragraphs, indent);
      break;

    default:
      await processDefaultBlock(block, paragraphs, indent);
  }
}

async function processSectionBlock(
  block: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.text) {
    await processMessageText(block.text.text, paragraphs, indent);
  }

  if (block.fields?.length > 0) {
    for (const field of block.fields) {
      await processMessageText(field.text, paragraphs, indent);
    }
  }
}

async function processRichTextElement(
  element: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  switch (element.type) {
    case "rich_text_section":
      await processRichTextSection(element, paragraphs, indent);
      break;

    case "rich_text_preformatted":
      await processRichTextPreformatted(element, paragraphs, indent);
      break;

    case "rich_text_quote":
      await processRichTextQuote(element, paragraphs, indent);
      break;

    case "rich_text_list":
      await processRichTextList(element, paragraphs, indent);
      break;
  }
}

async function processRichTextSection(
  element: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  let sectionText = "";

  if (element.elements) {
    for (const textElement of element.elements) {
      sectionText += await formatTextElement(textElement);
    }
  }

  if (sectionText) {
    paragraphs.push(
      ...createTextParagraphs(sectionText, {
        indent,
      })
    );
  }
}

async function formatTextElement(element: any): Promise<string> {
  switch (element.type) {
    case "text":
      return element.text || "";
    case "link":
      return `[${element.text || element.url || "link"}](${element.url})`;
    case "user":
      const userName = element.user_id
        ? await getUserName(element.user_id)
        : "user";
      return `@${userName}`;
    case "emoji":
      return `:${element.name}:`;
    case "channel":
      return `#${element.channel_id || "channel"}`;
    default:
      return "";
  }
}

async function processRichTextBlock(
  block: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.elements) {
    for (const element of block.elements) {
      await processRichTextElement(element, paragraphs, indent);
    }
  }
}

async function processImageBlock(
  block: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.title) {
    paragraphs.push(createImageTitleParagraph(block.title.text, { indent }));
  }

  try {
    if (block.image_url) {
      paragraphs.push(
        createFileLinkParagraph(
          "Image",
          block.alt_text || "Image",
          block.image_url,
          { indent }
        )
      );
    }
  } catch (error) {
    paragraphs.push(
      createErrorParagraph(
        `[Error embedding image: ${block.alt_text || "image"}]`,
        { indent }
      )
    );
  }
}

async function processContextBlock(
  block: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.elements?.length > 0) {
    const contextTexts = block.elements
      .filter(
        (element: any) =>
          element.type === "plain_text" || element.type === "mrkdwn"
      )
      .map((element: any) => element.text);

    if (contextTexts.length > 0) {
      paragraphs.push(
        ...createTextParagraphs(contextTexts.join(" "), {
          indent,
          size: styles.fontSize.small,
          italics: true,
        })
      );
    }
  }
}

async function processDefaultBlock(
  block: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.text) {
    const text =
      typeof block.text === "string" ? block.text : block.text.text || "";
    await processMessageText(text, paragraphs, indent);
  }
}

async function processRichTextPreformatted(
  element: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  let codeText = "";

  if (element.elements) {
    for (const textElement of element.elements) {
      if (textElement.type === "text") {
        codeText += textElement.text || "";
      }
    }
  }

  if (codeText) {
    paragraphs.push(...createCodeBlockParagraphs(codeText, { indent }));
  }
}

async function processRichTextQuote(
  element: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  let quoteText = "";

  if (element.elements) {
    for (const textElement of element.elements) {
      if (textElement.type === "text") {
        quoteText += textElement.text || "";
      } else if (textElement.type === "link") {
        const linkText = textElement.text || textElement.url || "link";
        quoteText += `[${linkText}](${textElement.url})`;
      }
    }
  }

  if (quoteText) {
    paragraphs.push(...createBlockquoteParagraphs(quoteText, { indent }));
  }
}

async function processRichTextList(
  list: any,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (!list.elements) return;

  const isOrdered = list.style === "ordered";
  let counter = 1;

  for (const item of list.elements) {
    if (item.type === "rich_text_list_item") {
      await processListItem(item, isOrdered, counter, paragraphs, { indent });
      if (isOrdered) counter++;
    }
  }
}

async function processListItem(
  item: any,
  isOrdered: boolean,
  counter: number,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  let itemText = isOrdered ? `${counter}. ` : "• ";

  if (item.elements) {
    for (const element of item.elements) {
      if (element.type === "rich_text_section") {
        itemText += await processListItemText(element);
      }
    }
  }

  if (itemText) {
    paragraphs.push(
      ...createTextParagraphs(itemText, {
        ...indent,
        indent: {
          left: (indent.left || 0) + styles.indent,
          hanging: isOrdered ? 360 : 240,
        },
      })
    );
  }
}

async function processListItemText(element: any): Promise<string> {
  let text = "";

  if (element.elements) {
    for (const textElement of element.elements) {
      if (textElement.type === "text") {
        text += textElement.text || "";
      } else if (textElement.type === "link") {
        const linkText = textElement.text || textElement.url || "link";
        text += `[${linkText}](${textElement.url})`;
      }
    }
  }

  return text;
}
