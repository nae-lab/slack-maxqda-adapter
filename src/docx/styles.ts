import {
  AlignmentType,
  HeadingLevel,
  TabStopPosition,
  TabStopType,
} from "docx";

// Define color constants to match Slack's UI
const colors = {
  // Main text and UI colors
  primaryText: "1D1C1D", // Main text color
  secondaryText: "616061", // Secondary text like timestamps
  linkBlue: "0576B9", // Link color
  borderColor: "DDDDDD", // Light gray for borders
  hoverBg: "F8F8F8", // Light hover background
  separatorLine: "DDDDDD", // Separator/divider line color

  // Message-specific colors
  blockquoteBorder: "DDDDDD", // Border for blockquotes
  codeBg: "F8F8F8", // Code block background

  // Reaction colors
  reactionBg: "F8F8F8", // Reaction background
  reactionBorder: "DDDDDD", // Reaction border
};

// Font settings
const fonts = {
  primary: "Lato, Arial, sans-serif",
  monospace: "Monaco, Menlo, Consolas, Courier New, monospace",
};

// Spacing and sizes (in TWIPs - twentieth of a point)
export const styles = {
  // Font sizes
  fontSize: {
    normal: 15 * 2, // 15px -> 30 half-points
    small: 13 * 2, // 13px -> 26 half-points
    tiny: 12 * 2, // 12px -> 24 half-points
    heading: 16 * 2, // 16px -> 32 half-points
    code: 13 * 2, // 13px -> 26 half-points
  },

  // Spacing
  lineSpacing: 240, // Default line spacing (1.0)
  paragraphSpacing: 120, // Space between paragraphs

  // Indentation
  indent: 720, // Standard indent (1/2 inch = 720 TWIPs)
  threadIndent: 720, // Thread indent amount
  blockquoteIndent: 720, // Blockquote indent

  // Color definitions
  colors,

  // Font definitions
  fonts,

  // Special positioning
  alignment: {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
  },

  // Heading styles
  heading: {
    level: HeadingLevel.HEADING_1,
    spacing: {
      before: 480, // Space before heading
      after: 240, // Space after heading
    },
  },

  // Image settings
  image: {
    maxWidth: 500, // Maximum image width
  },

  // Special formatting
  tabStops: [
    {
      type: TabStopType.RIGHT,
      position: TabStopPosition.MAX,
    },
  ],

  // Reaction styling
  reaction: {
    spacing: 60, // Spacing between reactions
    padding: 120, // Padding inside reaction bubble
  },
};

// Export document style definitions for use with createStyles
export const documentStyles = {
  default: {
    document: {
      run: {
        font: fonts.primary,
        size: styles.fontSize.normal,
        color: colors.primaryText,
      },
      paragraph: {
        spacing: {
          line: styles.lineSpacing,
          before: 0,
          after: styles.paragraphSpacing,
        },
      },
    },
  },

  paragraphStyles: [
    {
      id: "SlackUsername",
      name: "Slack Username",
      basedOn: "Normal",
      run: {
        bold: true,
        size: styles.fontSize.normal,
        color: colors.primaryText,
      },
    },
    {
      id: "SlackTimestamp",
      name: "Slack Timestamp",
      basedOn: "Normal",
      run: {
        size: styles.fontSize.small,
        color: colors.secondaryText,
      },
    },
    {
      id: "SlackMessage",
      name: "Slack Message",
      basedOn: "Normal",
      run: {
        size: styles.fontSize.normal,
      },
      paragraph: {
        spacing: {
          line: styles.lineSpacing,
        },
      },
    },
    {
      id: "SlackCodeBlock",
      name: "Slack Code Block",
      basedOn: "Normal",
      run: {
        font: fonts.monospace,
        size: styles.fontSize.code,
      },
      paragraph: {
        shading: {
          type: "solid",
          fill: colors.codeBg,
        },
        border: {
          top: {
            style: "single",
            size: 1,
            color: colors.borderColor,
          },
          bottom: {
            style: "single",
            size: 1,
            color: colors.borderColor,
          },
          left: {
            style: "single",
            size: 1,
            color: colors.borderColor,
          },
          right: {
            style: "single",
            size: 1,
            color: colors.borderColor,
          },
        },
        indent: {
          left: styles.indent,
        },
      },
    },
    {
      id: "SlackBlockquote",
      name: "Slack Blockquote",
      basedOn: "Normal",
      paragraph: {
        indent: {
          left: styles.blockquoteIndent,
        },
        border: {
          left: {
            style: "single",
            size: 4,
            color: colors.blockquoteBorder,
          },
        },
      },
    },
    {
      id: "MAXQDATag",
      name: "MAXQDA Tag",
      basedOn: "Normal",
      run: {
        color: "4A86E8", // Blue color for MAXQDA tags
      },
    },
  ],
};
