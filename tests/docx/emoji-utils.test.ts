import { describe, it, expect, vi } from "vitest";
import {
  unifiedToEmoji,
  getEmojiRepresentation,
  emojiMap,
} from "../../src/docx/emoji-utils";

// emoji-datasource/emoji.jsonをモック
vi.mock("emoji-datasource/emoji.json", () => {
  return {
    default: [
      {
        unified: "1F600",
        short_name: "grinning",
        short_names: ["grinning"],
        text: "",
        texts: [],
        category: "Smileys & Emotion",
        subcategory: "face-smiling",
        sort_order: 1,
        added_in: "6.0",
        has_img_apple: true,
        has_img_google: true,
        has_img_twitter: true,
        has_img_facebook: true,
        skin_variations: {},
      },
      {
        unified: "1F44D",
        short_name: "thumbsup",
        short_names: ["thumbsup", "+1", "thumbs_up"],
        text: "",
        texts: [],
        category: "People & Body",
        subcategory: "hand-fingers-closed",
        sort_order: 182,
        added_in: "6.0",
        has_img_apple: true,
        has_img_google: true,
        has_img_twitter: true,
        has_img_facebook: true,
        skin_variations: {
          "1F3FB": {
            unified: "1F44D-1F3FB",
            image: "1f44d-1f3fb.png",
            sheet_x: 14,
            sheet_y: 50,
            added_in: "8.0",
            has_img_apple: true,
            has_img_google: true,
            has_img_twitter: true,
            has_img_facebook: true,
          },
        },
      },
    ],
  };
});

// universal-emoji-parserのモック
vi.mock("universal-emoji-parser", () => {
  return {
    default: {
      parseToUnicode: (text: string) => {
        if (text === ":thumbsup:") return "👍";
        if (text === ":grinning:") return "😀";
        return text;
      },
    },
  };
});

describe("emoji-utils", () => {
  describe("unifiedToEmoji", () => {
    it("統一コードから絵文字に変換できること", () => {
      expect(unifiedToEmoji("1F600")).toBe("😀");
      expect(unifiedToEmoji("1F44D")).toBe("👍");
      expect(unifiedToEmoji("1F44D-1F3FB")).toBe("👍🏻");
    });
  });

  describe("emojiMap", () => {
    it("絵文字名からUnicode絵文字へのマッピングを含むこと", () => {
      expect(emojiMap).toBeDefined();
      expect(typeof emojiMap).toBe("object");
      expect(Object.keys(emojiMap).length).toBeGreaterThan(0);
    });
  });

  describe("getEmojiRepresentation", () => {
    it("絵文字名から絵文字表現を取得できること", () => {
      const result = getEmojiRepresentation("thumbsup");
      expect(result).toBe("👍");
    });

    it("存在しない絵文字名の場合、フォールバックすること", () => {
      const result = getEmojiRepresentation("not_an_emoji");
      expect(result).toBe(":not_an_emoji:");
    });
  });
});
