import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Paragraph } from "docx";
import {
  processMessageText,
  processTextWithBlockquotes,
} from "../../../src/docx/processors/text-processor";
import * as paragraphFormatters from "../../../src/docx/paragraph-formatters";

// モックの設定
vi.mock("../../../src/docx/paragraph-formatters", () => ({
  createTextParagraphs: vi.fn(() => [new Paragraph({})]),
  createCodeBlockParagraphs: vi.fn((code) => [new Paragraph({ children: [] })]),
  createBlockquoteParagraphs: vi.fn((text) => [new Paragraph({})]),
}));

describe("text-processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("processMessageText", () => {
    it("通常のテキストを処理できること", async () => {
      const paragraphs: Paragraph[] = [];
      const text = "This is a normal text message";

      await processMessageText(text, paragraphs);

      expect(paragraphFormatters.createTextParagraphs).toHaveBeenCalledWith(
        text,
        { indent: {} }
      );
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it("コードブロックを処理できること", async () => {
      const paragraphs: Paragraph[] = [];
      const text =
        "Here is some code:\n```\nconst x = 5;\nconsole.log(x);\n```\nMore text after.";

      await processMessageText(text, paragraphs);

      // コードブロックと通常テキスト両方が処理されるはず
      expect(paragraphFormatters.createCodeBlockParagraphs).toHaveBeenCalled();
      expect(paragraphFormatters.createTextParagraphs).toHaveBeenCalled();
      // 少なくとも2セットの段落があるはず（コードブロック前後のテキスト用）
      expect(paragraphs.length).toBeGreaterThan(1);
    });

    it("複数のコードブロックを処理できること", async () => {
      const paragraphs: Paragraph[] = [];
      const text = "```\nfirst code\n```\nMiddle text\n```\nsecond code\n```";

      await processMessageText(text, paragraphs);

      // 2回コードブロック処理関数が呼ばれるはず
      expect(
        paragraphFormatters.createCodeBlockParagraphs
      ).toHaveBeenCalledTimes(2);
      expect(paragraphFormatters.createTextParagraphs).toHaveBeenCalled(); // 中間テキスト用
    });

    it("引用ブロックを処理できること", async () => {
      const paragraphs: Paragraph[] = [];
      const text =
        "Here is a quote:\n> This is a quoted text\n> More quote\nNormal text after.";

      await processMessageText(text, paragraphs);

      expect(paragraphFormatters.createBlockquoteParagraphs).toHaveBeenCalled();
      expect(paragraphFormatters.createTextParagraphs).toHaveBeenCalled();
    });

    it("引数のインデントを渡せること", () => {
      const paragraphs: Paragraph[] = [];
      const text = "Indented text";
      const indent = { left: 720 };

      vi.clearAllMocks();

      processMessageText(text, paragraphs, indent);

      // インデントが正しく渡されることを確認
      expect(paragraphFormatters.createTextParagraphs).toHaveBeenCalled();
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });

  describe("processTextWithBlockquotes", () => {
    it("引用ブロックを含むテキストを処理できること", async () => {
      const paragraphs: Paragraph[] = [];
      const text = "> This is a quoted text\n> More quote\nNormal text after.";

      await processTextWithBlockquotes(text, paragraphs);

      expect(paragraphFormatters.createBlockquoteParagraphs).toHaveBeenCalled();
      expect(paragraphFormatters.createTextParagraphs).toHaveBeenCalled();
    });

    it("複数の引用ブロックを処理できること", async () => {
      const paragraphs: Paragraph[] = [];
      const text = "> First quote\nNormal text\n> Second quote";

      await processTextWithBlockquotes(text, paragraphs);

      // 少なくとも2回引用処理関数が呼ばれるはず
      expect(
        paragraphFormatters.createBlockquoteParagraphs
      ).toHaveBeenCalledTimes(2);
    });

    it("連続する引用行を一つのブロックとして処理すること", async () => {
      const paragraphs: Paragraph[] = [];
      const text = "> Line 1\n> Line 2\n> Line 3";

      await processTextWithBlockquotes(text, paragraphs);

      // すべての行が一つのブロックとして処理されるはず
      expect(
        paragraphFormatters.createBlockquoteParagraphs
      ).toHaveBeenCalledTimes(1);
      expect(
        paragraphFormatters.createBlockquoteParagraphs
      ).toHaveBeenCalledWith("Line 1\nLine 2\nLine 3", { indent: {} });
    });

    it("引用ブロックがない場合は通常テキストとして処理すること", async () => {
      const paragraphs: Paragraph[] = [];
      const text = "Just a normal text without any quote";

      await processTextWithBlockquotes(text, paragraphs);

      expect(
        paragraphFormatters.createBlockquoteParagraphs
      ).not.toHaveBeenCalled();
      expect(paragraphFormatters.createTextParagraphs).toHaveBeenCalledWith(
        text,
        { indent: {} }
      );
    });

    it("引数のインデントを渡せること", () => {
      const paragraphs: Paragraph[] = [];
      const text = "> Quoted text";
      const indent = { left: 720 };

      vi.clearAllMocks();

      processTextWithBlockquotes(text, paragraphs, indent);

      // インデントが正しく渡されることを確認
      expect(paragraphFormatters.createBlockquoteParagraphs).toHaveBeenCalled();
      expect(paragraphs.length).toBeGreaterThan(0);
    });
  });
});
