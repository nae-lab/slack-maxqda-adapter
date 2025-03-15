import { Reaction } from "../../types";
import { getUserName } from "../../slack-client";
import uEmojiParser from "universal-emoji-parser";

// Process reactions for a message
export async function processMessageReactions(
  reactions: Reaction[],
  indentLevel: number = 0
): Promise<string> {
  if (!reactions || reactions.length === 0) {
    return "";
  }

  const indentStr = "> ".repeat(indentLevel);
  let markdownContent = `${indentStr}**Reactions:**\n`;

  for (const reaction of reactions) {
    const formattedReaction = await formatReaction(reaction);
    markdownContent += `${indentStr}${formattedReaction}\n`;
  }

  return markdownContent + "\n";
}

// Format a single reaction
async function formatReaction(reaction: Reaction): Promise<string> {
  // Get usernames for the reaction
  const usernames = reaction.users
    ? await Promise.all(
        reaction.users.map(async (userId) => await getUserName(userId))
      )
    : [];

  // Format the emoji
  const emoji = formatEmoji(reaction);

  // Return formatted reaction with usernames
  return `${emoji} ${usernames.join(", ")}`;
}

// Format emoji for display
function formatEmoji(reaction: Reaction): string {
  if (reaction.url) {
    // Custom emoji with URL - use standard markdown image
    return `![${reaction.name}](${reaction.url})`;
  } else {
    // Standard emoji - use unicode
    return (
      uEmojiParser.parseToUnicode(`:${reaction.name}:`) || `:${reaction.name}:`
    );
  }
}
