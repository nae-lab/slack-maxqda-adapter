import {
  replaceMentionToUserName,
  formatTimestamp,
  formatUrls,
  createMessageHeader,
} from "../../utils/text-utils";

// Process and format message text for markdown output
export async function processMessageText(
  text: string,
  indentLevel: number = 0
): Promise<string> {
  // Replace mentions with usernames
  text = await replaceMentionToUserName(text, false); // Markdown形式なのでfalse

  // Format URLs
  text = formatUrls(text);

  // Add indentation for thread replies
  const indentStr = "> ".repeat(indentLevel);
  text = text
    .split("\n")
    .map((line) => `${indentStr}${line}`)
    .join("\n");

  return text;
}

// Re-export common utilities for use in markdown formatter
export { formatTimestamp, createMessageHeader };
