import { describe, it, expect, vi } from "vitest";
import {
  plainTextRun,
  boldTextRun,
  hyperlinkRun,
  createSeparatorParagraph,
  createFileLinkParagraph,
  createImageTitleParagraph,
  createImageParagraph,
  createErrorParagraph,
} from "../../src/docx/paragraph-formatters";
import { TextRun, ExternalHyperlink, Paragraph } from "docx";
import { styles } from "../../src/docx/styles";

// ImageRunのモック
vi.mock("docx", async () => {
  const actual = await vi.importActual("docx");
  return {
    ...actual,
    ImageRun: vi.fn().mockImplementation((options) => ({
      ...options,
      type: "ImageRun",
      transformationMethod: "Buffer",
    })),
  };
});

// モック化するためのヘルパー関数
function mockTextRunProps(run: any): any {
  // TextRunのoptionsプロパティは内部的に格納されているため、
  // テスト用にアクセスする方法を提供
  return run.root.rootKey;
}

describe("paragraph-formatters", () => {
  describe("TextRun creators", () => {
    it("プレーンテキストのランを作成できること", () => {
      const text = "This is plain text";
      const result = plainTextRun(text);

      expect(result).toBeInstanceOf(TextRun);
    });

    it("カスタムオプション付きのプレーンテキストランを作成できること", () => {
      const text = "カスタムテキスト";
      const options = { color: "#FF0000", size: 24 };

      const run = plainTextRun(text, options);

      expect(run).toBeInstanceOf(TextRun);
      expect(run).toBeDefined();
    });

    it("太字テキストのランを作成できること", () => {
      const text = "This is bold text";
      const result = boldTextRun(text);

      expect(result).toBeInstanceOf(TextRun);
    });

    it("カスタムオプション付きの太字テキストランを作成できること", () => {
      const text = "カスタム太字テキスト";
      const options = { color: "#0000FF", size: 28 };

      const run = boldTextRun(text, options);

      expect(run).toBeInstanceOf(TextRun);
      expect(run).toBeDefined();
    });

    it("ハイパーリンクのランを作成できること", () => {
      const text = "Click here";
      const link = "https://example.com";
      const result = hyperlinkRun(text, link);

      expect(result).toBeInstanceOf(ExternalHyperlink);
    });
  });

  describe("段落作成機能", () => {
    it("区切り段落を作成できること", () => {
      const result = createSeparatorParagraph();

      expect(result).toBeInstanceOf(Paragraph);
    });

    it("ファイルリンクの段落を作成できること", () => {
      const fileType = "PDF";
      const fileName = "document.pdf";
      const link = "https://example.com/doc.pdf";

      const result = createFileLinkParagraph(fileType, fileName, link);

      expect(result).toBeInstanceOf(Paragraph);
    });

    it("画像タイトルの段落を作成できること", () => {
      const title = "Beautiful sunset";
      const result = createImageTitleParagraph(title);

      expect(result).toBeInstanceOf(Paragraph);
    });

    it("画像の段落を作成できること", () => {
      const imageBuffer = Buffer.from("test image data");
      const width = 500;
      const height = 300;
      const imageType = "png";

      const result = createImageParagraph(
        imageBuffer,
        width,
        height,
        imageType
      );

      expect(result).toBeInstanceOf(Paragraph);
    });

    it("エラーメッセージの段落を作成できること", () => {
      const errorText = "Failed to load image";
      const result = createErrorParagraph(errorText);

      expect(result).toBeInstanceOf(Paragraph);
    });
  });
});
