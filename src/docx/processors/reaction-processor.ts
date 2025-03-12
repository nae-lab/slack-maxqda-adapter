import { ImageRun, Paragraph, TextRun } from "docx";
import axios from "axios";
import { Reaction } from "../../types";
import { getUserName } from "../../slack-client";
import { styles } from "../styles";
import { getMappedImageType } from "../image-utils";
import { getEmojiRepresentation } from "../emoji-utils";

export async function createReactionParagraphs(
  reactions: Reaction[],
  indent: Record<string, any> = {}
): Promise<Paragraph[]> {
  if (!reactions.length) return [];

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
      // Standard emoji: use the utility function
      const mappedEmoji = reaction.name
        ? getEmojiRepresentation(reaction.name)
        : "";
      reactionChildren.push(
        new TextRun({
          text: mappedEmoji || `:${reaction.name}:`,
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
        ...indent,
      })
    );
  }

  return paragraphs;
}
