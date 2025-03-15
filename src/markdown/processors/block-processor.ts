import { Block, RichTextElement, PurpleElement } from "../../types";
import { processMessageText } from "./text-processor";

// Process Slack Block Kit blocks for markdown output
export async function processMessageBlocks(
  blocks: Block[],
  indentLevel: number = 0
): Promise<string> {
  let markdownContent = "";

  for (const block of blocks) {
    switch (block.type) {
      case "rich_text":
        markdownContent += await processRichTextBlock(block, indentLevel);
        break;
      case "section":
        if (block.text) {
          const textContent =
            typeof block.text === "object" ? block.text.text : block.text;
          const processedText = await processMessageText(
            textContent,
            indentLevel
          );
          markdownContent += processedText + "\n\n";
        }
        break;
      case "divider":
        markdownContent += "---\n\n";
        break;
      default:
        // For unsupported block types, try to extract text content
        if (block.text) {
          const textContent =
            typeof block.text === "object" ? block.text.text : block.text;
          const processedText = await processMessageText(
            textContent,
            indentLevel
          );
          markdownContent += processedText + "\n\n";
        }
    }
  }

  return markdownContent;
}

// Process rich text blocks
async function processRichTextBlock(
  block: Block,
  indentLevel: number
): Promise<string> {
  let text = "";

  for (const element of block.elements ?? []) {
    if (element.type === "rich_text_section") {
      text += await processRichTextSection(element);
    } else if (element.type === "rich_text_quote") {
      text += await processRichTextQuote(element, indentLevel);
    } else if (element.type === "rich_text_list") {
      text += await processRichTextList(element, indentLevel);
    }
  }

  return text ? (await processMessageText(text, indentLevel)) + "\n\n" : "";
}

// Process rich text sections
async function processRichTextSection(
  element: RichTextElement
): Promise<string> {
  let text = "";

  for (const item of element.elements ?? []) {
    const itemElement = item as PurpleElement;
    if (itemElement.text) {
      if (itemElement.style?.bold) {
        text += `**${itemElement.text}**`;
      } else if (itemElement.style?.italic) {
        text += `*${itemElement.text}*`;
      } else if (itemElement.style?.strike) {
        text += `~~${itemElement.text}~~`;
      } else if (itemElement.style?.code) {
        text += `\`${itemElement.text}\``;
      } else {
        text += itemElement.text;
      }
    }
  }

  return text;
}

// Process rich text quotes
async function processRichTextQuote(
  element: RichTextElement,
  indentLevel: number
): Promise<string> {
  const quoteText = await processRichTextSection(element);
  const indentStr = "> ".repeat(indentLevel + 1);
  return (
    quoteText
      .split("\n")
      .map((line) => `${indentStr}${line}`)
      .join("\n") + "\n\n"
  );
}

// Process rich text lists
async function processRichTextList(
  element: RichTextElement,
  indentLevel: number
): Promise<string> {
  let text = "\n";
  const indentStr = "  ".repeat(indentLevel);

  for (const item of element.elements ?? []) {
    if (item.type === "rich_text_list_item") {
      const itemText = await processRichTextSection(item);
      const bullet = element.style === "ordered" ? "1." : "-";
      text += `${indentStr}${bullet} ${itemText}\n`;
    }
  }

  return text + "\n";
}
