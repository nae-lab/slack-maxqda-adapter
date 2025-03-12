import uEmojiParser from "universal-emoji-parser";
// Import emoji data
import emojiData from "emoji-datasource/emoji.json";

// Helper function to convert unified string to actual emoji
export function unifiedToEmoji(unified: string): string {
  const codePoints = unified.split("-").map((cp) => parseInt(cp, 16));
  return String.fromCodePoint(...codePoints);
}

// Build a mapping from short name to Unicode emoji
export const emojiMap: Record<string, string> = {};
emojiData.forEach((emoji: any) => {
  emojiMap[emoji.short_name.toLowerCase()] = unifiedToEmoji(emoji.unified);
});

// Function to get emoji representation (for reuse)
export function getEmojiRepresentation(name: string): string {
  // Look up in emojiMap first, then fallback to uEmojiParser
  return (
    emojiMap[name.toLowerCase()] ||
    uEmojiParser.parseToUnicode(`:${name}:`) ||
    `:${name}:`
  );
}
