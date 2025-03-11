import { BorderStyle, convertInchesToTwip } from "docx";

// Document style configuration - can be easily modified for future styling needs
export const styles = {
  dateHeading: {
    size: 36, // 18pt
    bold: true,
    color: "000000",
  },
  username: {
    size: 28, // 14pt
    bold: true,
    color: "000080", // Navy blue
  },
  timestamp: {
    size: 24, // 12pt
    color: "808080", // Gray
    italics: true,
  },
  messageText: {
    size: 24, // 12pt
    color: "000000",
  },
  reactionText: {
    size: 20, // 10pt
    color: "606060",
    italics: true,
  },
  fileLink: {
    size: 24, // 12pt
    color: "0000FF", // Blue
  },
  threadIndent: convertInchesToTwip(0.5), // 0.5 inch indent for thread replies
  separator: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: "CCCCCC",
    space: 1,
  },
};
