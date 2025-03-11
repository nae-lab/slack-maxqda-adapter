import { TextRun, ExternalHyperlink } from "docx";
import { styles } from "./styles";

// Process URLs in text and convert them to hyperlinks
export function processUrls(text: string): (TextRun | ExternalHyperlink)[] {
  const result: (TextRun | ExternalHyperlink)[] = [];

  // Process text in chunks, looking for special URL patterns
  let remainingText = text;
  let currentPosition = 0;

  // Process all URLs in the text
  while (currentPosition < text.length) {
    // Check for angle bracket URLs: <https://example.com>
    const angleBracketMatch = /^<(https?:\/\/[^>]+)>/.exec(remainingText);
    if (angleBracketMatch) {
      // Add the URL as hyperlink
      const url = angleBracketMatch[1];
      result.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: url, style: "Hyperlink" })],
          link: url,
        })
      );

      // Move past this URL
      const matchLength = angleBracketMatch[0].length;
      currentPosition += matchLength;
      remainingText = text.substring(currentPosition);
      continue;
    }

    // Check for Slack pipe URLs: <https://example.com|display text>
    const slackUrlMatch = /^<(https?:\/\/[^|]+)\|([^>]+)>/.exec(remainingText);
    if (slackUrlMatch) {
      // Add the URL as hyperlink with display text
      const url = slackUrlMatch[1];
      const displayText = slackUrlMatch[2];
      result.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: displayText, style: "Hyperlink" })],
          link: url,
        })
      );

      // Move past this URL
      const matchLength = slackUrlMatch[0].length;
      currentPosition += matchLength;
      remainingText = text.substring(currentPosition);
      continue;
    }

    // Check for plain text URLs: https://example.com
    const plainUrlMatch = /^(https?:\/\/\S+)/.exec(remainingText);
    if (plainUrlMatch) {
      // Add the URL as hyperlink
      const url = plainUrlMatch[1];
      result.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: url, style: "Hyperlink" })],
          link: url,
        })
      );

      // Move past this URL
      const matchLength = plainUrlMatch[0].length;
      currentPosition += matchLength;
      remainingText = text.substring(currentPosition);
      continue;
    }

    // Find the next special URL pattern
    const nextUrlStart = Math.min(
      remainingText.indexOf("<http", 0) >= 0
        ? remainingText.indexOf("<http", 0)
        : Number.MAX_SAFE_INTEGER,
      remainingText.indexOf("http://", 0) >= 0
        ? remainingText.indexOf("http://", 0)
        : Number.MAX_SAFE_INTEGER,
      remainingText.indexOf("https://", 0) >= 0
        ? remainingText.indexOf("https://", 0)
        : Number.MAX_SAFE_INTEGER
    );

    if (nextUrlStart === Number.MAX_SAFE_INTEGER || nextUrlStart < 0) {
      // No more URLs, add the remaining text
      result.push(
        new TextRun({
          text: remainingText,
          size: styles.fontSize.normal,
          color: styles.colors.primaryText,
        })
      );
      break;
    } else {
      // Add text before the next URL
      if (nextUrlStart > 0) {
        result.push(
          new TextRun({
            text: remainingText.substring(0, nextUrlStart),
            size: styles.fontSize.normal,
            color: styles.colors.primaryText,
          })
        );
      }

      // Update position and remaining text
      currentPosition += nextUrlStart;
      remainingText = text.substring(currentPosition);
    }
  }

  return result;
}

// Generate Slack message URL for linking
export function generateSlackMessageUrl(
  channelId: string,
  messageTs?: string,
  threadTs?: string,
  parentUserId?: string
): string {
  // Handle case where messageTs is undefined
  if (!messageTs) {
    return `https://ut-naelab.slack.com/archives/${channelId}`;
  }

  let messageUrl = `https://ut-naelab.slack.com/archives/${channelId}/p${messageTs.replace(
    ".",
    ""
  )}`;

  if (parentUserId && threadTs) {
    // Add thread parameters for thread messages
    messageUrl += `?thread_ts=${threadTs}&cid=${channelId}`;
  }

  return messageUrl;
}
