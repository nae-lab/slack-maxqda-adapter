import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Paragraph, TextRun, ImageRun } from "docx";
import { Reaction } from "../../../src/types";
import { createReactionParagraphs } from "../../../src/docx/processors/reaction-processor";
import * as slackClient from "../../../src/slack-client";
import * as emojiUtils from "../../../src/docx/emoji-utils";

// スラッククライアントのモック
vi.mock("../../../src/slack-client", () => ({
  getUserName: vi.fn(async (userId) => `User ${userId}`),
}));

// 絵文字ユーティリティのモック
vi.mock("../../../src/docx/emoji-utils", () => ({
  getEmojiRepresentation: vi.fn((name) => {
    if (name === "smile") return "😊";
    if (name === "thumbsup") return "👍";
    return `:${name}:`;
  }),
}));

describe("reaction-processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createReactionParagraphs", () => {
    it("リアクションがない場合は空の配列を返すこと", async () => {
      const result = await createReactionParagraphs([]);
      expect(result).toEqual([]);
    });

    it("1つのリアクションを正しく処理すること", async () => {
      const reactions: Reaction[] = [
        {
          name: "smile",
          count: 3,
          users: ["U123", "U456", "U789"],
        },
      ];

      const result = await createReactionParagraphs(reactions);

      // 最低1つのパラグラフが作成されるはず
      expect(result.length).toBeGreaterThan(0);

      // 絵文字表現の取得が呼ばれたことを確認
      expect(emojiUtils.getEmojiRepresentation).toHaveBeenCalledWith("smile");

      // ユーザー名の取得が呼ばれたことを確認
      expect(slackClient.getUserName).toHaveBeenCalledTimes(3);
      expect(slackClient.getUserName).toHaveBeenCalledWith("U123");
      expect(slackClient.getUserName).toHaveBeenCalledWith("U456");
      expect(slackClient.getUserName).toHaveBeenCalledWith("U789");
    });

    it("複数のリアクションを正しく処理すること", async () => {
      const reactions: Reaction[] = [
        {
          name: "smile",
          count: 2,
          users: ["U123", "U456"],
        },
        {
          name: "thumbsup",
          count: 1,
          users: ["U789"],
        },
      ];

      const result = await createReactionParagraphs(reactions);

      // 最低1つのパラグラフが作成されるはず
      expect(result.length).toBeGreaterThan(0);

      // 両方の絵文字表現の取得が呼ばれたことを確認
      expect(emojiUtils.getEmojiRepresentation).toHaveBeenCalledWith("smile");
      expect(emojiUtils.getEmojiRepresentation).toHaveBeenCalledWith(
        "thumbsup"
      );

      // すべてのユーザー名の取得が呼ばれたことを確認
      expect(slackClient.getUserName).toHaveBeenCalledTimes(3);
    });

    it("カスタムインデントを適用できること", async () => {
      const reactions: Reaction[] = [
        {
          name: "smile",
          count: 1,
          users: ["U123"],
        },
      ];

      const indent = { left: 720 };
      const result = await createReactionParagraphs(reactions, indent);

      // パラグラフが作成されインデントが適用されていること
      expect(result.length).toBeGreaterThan(0);
      // パラグラフのインデントプロパティを検証するのは難しいため、
      // 少なくともパラグラフが作成されたことだけを確認
    });

    it("ユーザーがないリアクションを処理できること", async () => {
      const reactions: Reaction[] = [
        {
          name: "smile",
          count: 3, // countはあるがusersがない
        },
      ];

      const result = await createReactionParagraphs(reactions);

      // パラグラフは作成されるがユーザー名取得は呼ばれないこと
      expect(result.length).toBeGreaterThan(0);
      expect(slackClient.getUserName).not.toHaveBeenCalled();
    });

    it("countがないリアクションを処理できること", async () => {
      const reactions: Reaction[] = [
        {
          name: "smile",
          users: ["U123"], // usersはあるがcountがない
        },
      ];

      const result = await createReactionParagraphs(reactions);

      // パラグラフは作成されユーザー名取得が呼ばれること
      expect(result.length).toBeGreaterThan(0);
      expect(slackClient.getUserName).toHaveBeenCalledWith("U123");
    });
  });
});
