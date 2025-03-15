import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sharp from "sharp";
import {
  getImageDimensions,
  getMappedImageType,
  ensureCompatibleImage,
} from "../../src/docx/image-utils";

// モック設定
vi.mock("sharp", () => {
  const mockToBuffer = vi
    .fn()
    .mockResolvedValue(Buffer.from("mock image data"));
  const mockResize = vi.fn().mockReturnValue({ toBuffer: mockToBuffer });
  const mockPng = vi.fn().mockReturnValue({ resize: mockResize });
  const mockToBuffer2 = vi
    .fn()
    .mockResolvedValue(Buffer.from("mock fallback data"));
  const mockToFormat = vi.fn().mockReturnValue({ toBuffer: mockToBuffer2 });

  return {
    default: vi.fn().mockImplementation(() => ({
      metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
      png: mockPng,
      resize: mockResize,
      toFormat: mockToFormat,
      toBuffer: mockToBuffer2,
    })),
  };
});

describe("image-utils", () => {
  const mockImageBuffer = Buffer.from("test image data");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getImageDimensions", () => {
    it("should return image dimensions for valid images", async () => {
      // モックのセットアップ
      const mockMetadata = vi
        .fn()
        .mockResolvedValue({ width: 800, height: 600 });
      const mockInstance = { metadata: mockMetadata };

      // Sharpモジュールのモックを設定
      (sharp as any).mockImplementation(() => mockInstance);

      const result = await getImageDimensions(
        mockImageBuffer,
        "image/png",
        500
      );

      expect(result).toEqual({
        width: 800,
        height: 600,
        scaledWidth: 500,
        scaledHeight: 375, // アスペクト比を保ちながらスケールダウン
      });
      expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
    });

    it("should set default dimensions for audio files when metadata fails", async () => {
      // メタデータの取得に失敗
      const mockMetadata = vi
        .fn()
        .mockRejectedValue(new Error("Failed to get metadata"));
      const mockInstance = { metadata: mockMetadata };

      // Sharpモジュールのモックを設定
      (sharp as any).mockImplementation(() => mockInstance);

      const result = await getImageDimensions(
        mockImageBuffer,
        "audio/mp3",
        500
      );

      expect(result).toEqual({
        width: 300,
        height: 60,
        scaledWidth: 300,
        scaledHeight: 60,
      });
    });

    it("should set default dimensions for video files when metadata fails", async () => {
      // メタデータの取得に失敗
      const mockMetadata = vi
        .fn()
        .mockRejectedValue(new Error("Failed to get metadata"));
      const mockInstance = { metadata: mockMetadata };

      // Sharpモジュールのモックを設定
      (sharp as any).mockImplementation(() => mockInstance);

      const result = await getImageDimensions(
        mockImageBuffer,
        "video/mp4",
        500
      );

      expect(result).toEqual({
        width: 400,
        height: 225,
        scaledWidth: 400,
        scaledHeight: 225,
      });
    });

    it("should set generic default dimensions for other file types when metadata fails", async () => {
      // メタデータの取得に失敗
      const mockMetadata = vi
        .fn()
        .mockRejectedValue(new Error("Failed to get metadata"));
      const mockInstance = { metadata: mockMetadata };

      // Sharpモジュールのモックを設定
      (sharp as any).mockImplementation(() => mockInstance);

      const result = await getImageDimensions(
        mockImageBuffer,
        "application/pdf",
        500
      );

      expect(result).toEqual({
        width: 400,
        height: 300,
        scaledWidth: 400,
        scaledHeight: 300,
      });
    });
  });

  describe("getMappedImageType", () => {
    it("should map jpeg to jpg", () => {
      expect(getMappedImageType("jpeg")).toBe("jpg");
    });

    it("should return matching type for supported formats", () => {
      expect(getMappedImageType("png")).toBe("png");
      expect(getMappedImageType("gif")).toBe("gif");
      expect(getMappedImageType("bmp")).toBe("bmp");
    });

    it("should default to png for unsupported formats", () => {
      expect(getMappedImageType("webp")).toBe("png");
      expect(getMappedImageType("tiff")).toBe("png");
    });
  });

  describe("ensureCompatibleImage", () => {
    it("should convert image to PNG format with appropriate dimensions", async () => {
      // モックのセットアップ
      const mockToBuffer = vi
        .fn()
        .mockResolvedValue(Buffer.from("converted png data"));
      const mockResize = vi.fn().mockReturnValue({ toBuffer: mockToBuffer });
      const mockPng = vi.fn().mockReturnValue({ resize: mockResize });
      const mockMetadata = vi
        .fn()
        .mockResolvedValue({ width: 800, height: 600 });
      const mockInstance = {
        metadata: mockMetadata,
        png: mockPng,
      };

      // Sharpモジュールのモックを設定
      (sharp as any).mockImplementation(() => mockInstance);

      // 実際の関数を呼び出す
      const result = await ensureCompatibleImage(mockImageBuffer, "image/jpeg");

      // 実装が返す型に合わせて検証
      expect(result.type).toBe("png");
      expect(mockPng).toHaveBeenCalled();
      expect(mockResize).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        fit: "inside",
        withoutEnlargement: true,
      });
      expect(mockToBuffer).toHaveBeenCalled();
    });

    it("should handle large images by limiting dimensions", async () => {
      // 大きな画像のメタデータをモック
      const mockToBuffer = vi
        .fn()
        .mockResolvedValue(Buffer.from("converted png data"));
      const mockResize = vi.fn().mockReturnValue({ toBuffer: mockToBuffer });
      const mockPng = vi.fn().mockReturnValue({ resize: mockResize });
      const mockMetadata = vi
        .fn()
        .mockResolvedValue({ width: 2000, height: 1500 });
      const mockInstance = {
        metadata: mockMetadata,
        png: mockPng,
      };

      // Sharpモジュールのモックを設定
      (sharp as any).mockImplementation(() => mockInstance);

      // 実際の関数を呼び出す
      await ensureCompatibleImage(mockImageBuffer, "image/jpeg");

      // 期待値チェック
      expect(mockResize).toHaveBeenCalledWith({
        width: 1000, // 最大幅に制限
        height: 1000, // 最大高さに制限
        fit: "inside",
        withoutEnlargement: true,
      });
    });

    it("should handle errors and return original buffer with proper type", async () => {
      // 変換が失敗するケース
      const mockToBuffer1 = vi
        .fn()
        .mockRejectedValue(new Error("Conversion failed"));
      const mockResize = vi.fn().mockReturnValue({ toBuffer: mockToBuffer1 });
      const mockPng = vi.fn().mockReturnValue({ resize: mockResize });
      const mockMetadata = vi
        .fn()
        .mockResolvedValue({ width: 800, height: 600 });

      const mockInstance = {
        metadata: mockMetadata,
        png: mockPng,
      };

      // モックの振る舞いを設定 - エラーを発生させる
      (sharp as any).mockImplementation(() => mockInstance);

      // 実際の関数を呼び出す
      const result = await ensureCompatibleImage(mockImageBuffer, "image/png");

      // 結果の確認 - エラー時はオリジナルのバッファとmimeタイプから変換された型を返す
      expect(result.type).toBe("png");
      expect(result.buffer).toBe(mockImageBuffer);
    });

    it("should return original buffer if all conversions fail", async () => {
      // 両方の変換が失敗する場合
      const mockToBuffer1 = vi
        .fn()
        .mockRejectedValue(new Error("Primary conversion failed"));
      const mockResize = vi.fn().mockReturnValue({ toBuffer: mockToBuffer1 });
      const mockPng = vi.fn().mockReturnValue({ resize: mockResize });
      const mockMetadata = vi
        .fn()
        .mockResolvedValue({ width: 800, height: 600 });

      const mockInstance = {
        metadata: mockMetadata,
        png: mockPng,
      };

      // モックの振る舞いを設定 - エラーを発生させる
      (sharp as any).mockImplementation(() => mockInstance);

      // 実際の関数を呼び出す
      const result = await ensureCompatibleImage(mockImageBuffer, "image/png");

      // 原型のバッファと元のMIMEタイプから導出された型が返されることを確認
      expect(result.buffer).toBe(mockImageBuffer);
      expect(result.type).toBe("png"); // png はデフォルト値
    });
  });
});
