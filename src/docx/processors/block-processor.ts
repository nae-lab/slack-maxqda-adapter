import { Paragraph } from "docx";
import { getUserName, getUserGroupName } from "../../slack-client";
import { styles } from "../styles";
import {
  Block,
  PurpleType,
  PurpleElement,
  RichTextElement,
  Accessory,
  BlockType,
} from "../../types";
import { AccessoryType } from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import {
  createSeparatorParagraph,
  createImageTitleParagraph,
  createFileLinkParagraph,
  createErrorParagraph,
  createTextParagraphs,
  createCodeBlockParagraphs,
  createBlockquoteParagraphs,
  createImageParagraph,
} from "../paragraph-formatters";
import { processMessageText } from "./text-processor";
import { ensureCompatibleImage } from "../image-utils";

export async function processMessageBlocks(
  blocks: Block[],
  paragraphs: Paragraph[],
  indent: Record<string, any> = {}
): Promise<void> {
  for (const block of blocks) {
    await processBlock(block, paragraphs, indent);
  }
}

async function processBlock(
  block: Block,
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
  block: Block,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.text && typeof block.text === "object") {
    await processMessageText(block.text.text || "", paragraphs, indent);
  } else if (block.text && typeof block.text === "string") {
    await processMessageText(block.text, paragraphs, indent);
  } else if (block.elements && Array.isArray(block.elements)) {
    // sectionブロックのelementsからテキストを抽出
    let extractedText = "";

    for (const accessory of block.elements) {
      // Accessoryからテキストを抽出するには、個々のelementsを処理する必要がある
      if (accessory.elements && Array.isArray(accessory.elements)) {
        // Accessory.elementsはRichTextElement[]として定義されている
        for (const richTextElement of accessory.elements) {
          // RichTextElement.elementsはPurpleElement[]として定義されている
          if (
            richTextElement.elements &&
            Array.isArray(richTextElement.elements)
          ) {
            for (const element of richTextElement.elements) {
              if (element.type === PurpleType.Text) {
                extractedText += element.text || "";
              } else if (element.type === PurpleType.Link) {
                extractedText += `[${element.text || element.url || "link"}](${
                  element.url
                })`;
              }
            }
          }
        }
      }
    }

    if (extractedText) {
      await processMessageText(extractedText || "", paragraphs, indent);
    }
  }
  if (block.fields && block.fields.length > 0) {
    for (const field of block.fields) {
      if (field && field.text) {
        await processMessageText(field.text || "", paragraphs, indent);
      }
    }
  }
}

async function processRichTextElement(
  element: RichTextElement,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (!element.type) return;

  switch (element.type) {
    case AccessoryType.RichTextSection:
      await processRichTextSection(element, paragraphs, indent);
      break;

    case AccessoryType.RichTextPreformatted:
      await processRichTextPreformatted(element, paragraphs, indent);
      break;

    case AccessoryType.RichTextQuote:
      await processRichTextQuote(element, paragraphs, indent);
      break;

    case AccessoryType.RichTextList:
      await processRichTextList(element, paragraphs, indent);
      break;
  }
}

async function processRichTextSection(
  element: RichTextElement,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  let sectionText = "";

  if (element.elements) {
    // RichTextElement.elementsはPurpleElement[]
    for (const textElement of element.elements as PurpleElement[]) {
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

async function formatTextElement(element: PurpleElement): Promise<string> {
  if (!element.type) return "";

  switch (element.type) {
    case PurpleType.Text:
      return element.text || "";
    case PurpleType.Link:
      return `[${element.text || element.url || "link"}](${element.url})`;
    case PurpleType.User:
      const userName = element.user_id
        ? await getUserName(element.user_id)
        : "user";
      return `@${userName}`;
    case PurpleType.Usergroup:
      const groupName = element.usergroup_id
        ? await getUserGroupName(element.usergroup_id)
        : "group";
      return `@${groupName}`;
    case PurpleType.Emoji:
      return `:${element.name}:`;
    case PurpleType.Channel:
      return `#${element.channel_id || "channel"}`;
    default:
      console.warn(`Unhandled text element type: ${element.type}`);
      return "";
  }
}

async function processRichTextBlock(
  block: Block,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.text && typeof block.text === "object") {
    await processMessageText(block.text.text || "", paragraphs, indent);
  } else if (block.text && typeof block.text === "string") {
    await processMessageText(block.text, paragraphs, indent);
  } else if (block.elements && Array.isArray(block.elements)) {
    // 各要素のタイプに応じて処理
    for (const accessory of block.elements) {
      // PurpleBlock.elementsはAccessory[]
      // 型の互換性のためにキャスト
      await processRichTextElement(
        accessory as unknown as RichTextElement,
        paragraphs,
        indent
      );
    }
  }
}

async function processImageBlock(
  block: Block,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.title && block.title.text) {
    paragraphs.push(
      createImageTitleParagraph(block.title.text || "", { indent })
    );
  }

  try {
    if (block.image_url) {
      try {
        // 画像データを取得して埋め込み
        const { default: fetch } = await import("node-fetch");
        const response = await fetch(block.image_url);

        if (response.ok) {
          const imageBuffer = await response.buffer();
          const mimeType = response.headers.get("content-type") || "image/png";

          // 互換性のある画像形式に変換
          const compatibleImage = await ensureCompatibleImage(
            imageBuffer,
            mimeType,
            styles.image.maxWidth,
            styles.image.maxHeight
          );

          // 画像を追加
          paragraphs.push(
            createImageParagraph(
              compatibleImage.buffer,
              compatibleImage.width,
              compatibleImage.height,
              compatibleImage.type,
              { indent }
            )
          );
        } else {
          // 画像取得に失敗した場合はリンクを代わりに表示
          paragraphs.push(
            createFileLinkParagraph(
              "Image",
              block.alt_text || "Image",
              block.image_url,
              { indent }
            )
          );
        }
      } catch (fetchError) {
        console.error("Failed to fetch image:", fetchError);
        // エラー時はリンクを表示
        paragraphs.push(
          createFileLinkParagraph(
            "Image",
            block.alt_text || "Image",
            block.image_url,
            { indent }
          )
        );
      }
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
  block: Block,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.elements && block.elements.length > 0) {
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
  block: Block,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (block.text && typeof block.text === "object") {
    await processMessageText(block.text.text || "", paragraphs, indent);
  } else if (block.text && typeof block.text === "string") {
    await processMessageText(block.text, paragraphs, indent);
  } else if (block.elements && Array.isArray(block.elements)) {
    // elementsからテキストを抽出（デフォルト処理）
    let extractedText = "";

    for (const accessory of block.elements) {
      // Accessoryからテキストを抽出するには、個々のelementsを処理する必要がある
      if (accessory.elements && Array.isArray(accessory.elements)) {
        // Accessory.elementsはRichTextElement[]として定義されている
        for (const richTextElement of accessory.elements) {
          // RichTextElement.elementsはPurpleElement[]として定義されている
          if (
            richTextElement.elements &&
            Array.isArray(richTextElement.elements)
          ) {
            for (const element of richTextElement.elements) {
              if (element.type === PurpleType.Text) {
                extractedText += element.text || "";
              } else if (element.type === PurpleType.Link) {
                extractedText += `[${element.text || element.url || "link"}](${
                  element.url
                })`;
              } else if (element.type === PurpleType.Usergroup) {
                extractedText += `@${element.usergroup_id || "group"}`;
              }
            }
          }
        }
      }
    }

    if (extractedText) {
      await processMessageText(extractedText || "", paragraphs, indent);
    }
  }
}

async function processRichTextPreformatted(
  element: RichTextElement,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  let codeText = "";

  if (element.elements) {
    // RichTextElement.elementsはPurpleElement[]
    for (const textElement of element.elements as PurpleElement[]) {
      if (textElement.type === PurpleType.Text) {
        codeText += textElement.text || "";
      }
    }
  }

  if (codeText) {
    paragraphs.push(...createCodeBlockParagraphs(codeText, { indent }));
  }
}

async function processRichTextQuote(
  element: RichTextElement,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  let quoteText = "";

  if (element.elements) {
    // RichTextElement.elementsはPurpleElement[]
    for (const textElement of element.elements as PurpleElement[]) {
      quoteText += await formatTextElement(textElement);
    }
  }

  if (quoteText) {
    paragraphs.push(...createBlockquoteParagraphs(quoteText, { indent }));
  }
}

async function processRichTextList(
  list: RichTextElement,
  paragraphs: Paragraph[],
  indent: Record<string, any>
): Promise<void> {
  if (!list.elements) return;

  const isOrdered = list.style === "ordered";
  let counter = 1;

  // Slackのネストレベルを取得（デフォルトは0）
  const nestLevel = typeof list.indent === "number" ? list.indent : 0;

  // Slackのリスト要素はrich_text_sectionタイプ
  for (const item of list.elements) {
    // 比較の問題を修正：文字列で比較する
    if (
      item.type &&
      item.type.toString() === AccessoryType.RichTextSection.toString()
    ) {
      // 直接processListItemTextを呼び出す（フォーマットされたテキストを取得）
      const bulletChar = isOrdered ? `${counter}. ` : "• ";
      const content = await processTextElements(item as RichTextElement);

      if (content) {
        // ネストレベルに応じてインデントを増やす
        // 基本インデント + ネストレベルに応じた追加インデント
        // ネストが深くなるほどインデント量を増やす
        const baseIndent = indent.left || 0;
        const nestIndent = nestLevel * styles.indent * 1.5; // ネストレベルに応じて1.5倍のインデント
        const indentAmount = baseIndent + styles.indent + nestIndent;

        // 段落を追加
        paragraphs.push(
          ...createTextParagraphs(bulletChar + content, {
            indent: {
              left: indentAmount,
              // 順序付きリストの場合はハンギングインデントを大きくする
              hanging: isOrdered
                ? Math.min(360 + nestLevel * 60, 540)
                : Math.min(240 + nestLevel * 40, 360),
            },
          })
        );

        if (isOrdered) counter++;
      }
    }
  }
}

// 複数のテキスト要素を処理して結合する共通関数
async function processTextElements(element: RichTextElement): Promise<string> {
  let text = "";

  if (element.elements) {
    for (const textElement of element.elements as PurpleElement[]) {
      text += await formatTextElement(textElement);
    }
  }

  return text;
}
