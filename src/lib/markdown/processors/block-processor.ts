import {
  Block,
  PurpleType,
  PurpleElement,
  RichTextElement,
  Accessory,
} from "../../types";
import { AccessoryType } from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
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
            typeof block.text === "object" ? block.text.text || "" : block.text;
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
            typeof block.text === "object" ? block.text.text || "" : block.text;
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

  if (block.elements) {
    for (const accessory of block.elements) {
      // Blockのelementsは実際にはAccessory[]
      if (accessory.type) {
        if (accessory.type.toString() === AccessoryType.RichTextSection) {
          text += await processRichTextSection(
            accessory as unknown as RichTextElement
          );
        } else if (accessory.type.toString() === AccessoryType.RichTextQuote) {
          text += await processRichTextQuote(
            accessory as unknown as RichTextElement,
            indentLevel
          );
        } else if (accessory.type.toString() === AccessoryType.RichTextList) {
          text += await processRichTextList(
            accessory as unknown as RichTextElement,
            indentLevel
          );
        }
      }
    }
  }

  return text ? (await processMessageText(text, indentLevel)) + "\n\n" : "";
}

// Process rich text sections
async function processRichTextSection(
  element: RichTextElement
): Promise<string> {
  let text = "";

  if (element.elements) {
    for (const item of element.elements) {
      // RichTextElement.elementsはPurpleElement[]
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

  if (element.elements) {
    for (const item of element.elements) {
      // RichTextList内のelementsは、RichTextListItem型
      // 型チェックはtype属性の文字列値で行う
      if (item.type && item.type.toString() === "rich_text_list_item") {
        const listItemElement = item as unknown as RichTextElement;
        const itemText = await processRichTextSection(listItemElement);
        const bullet = element.style === "ordered" ? "1." : "-";
        text += `${indentStr}${bullet} ${itemText}\n`;
      }
    }
  }

  return text + "\n";
}
