import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Paragraph } from "docx";
import * as fileHandler from "../../../src/file-handler";
import { addFilesParagraphs } from "../../../src/docx/processors/file-processor";
import { getFileTypeLabel } from "../../../src/docx/utils/file-type-utils";

// モックの設定
vi.mock("fs");
vi.mock("path");
vi.mock("../../../src/file-handler", () => ({
  downloadSlackFile: vi.fn(),
}));

vi.mock("../../../src/docx/utils/directory-utils", () => ({
  ensureDirectoriesExist: vi.fn(),
}));

describe("file-processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getFileTypeLabel", () => {
    it('should return "Audio file" for audio mime types', () => {
      expect(getFileTypeLabel("audio/mp3")).toBe("Audio file");
      expect(getFileTypeLabel("audio/wav")).toBe("Audio file");
    });

    it('should return "Video file" for video mime types', () => {
      expect(getFileTypeLabel("video/mp4")).toBe("Video file");
      expect(getFileTypeLabel("video/quicktime")).toBe("Video file");
    });

    it('should return "Image file" for image mime types', () => {
      expect(getFileTypeLabel("image/png")).toBe("Image file");
      expect(getFileTypeLabel("image/jpeg")).toBe("Image file");
    });

    it("should return capitalized file type for other known mime types", () => {
      expect(getFileTypeLabel("text/plain")).toBe("Text file");
      expect(getFileTypeLabel("text/html")).toBe("Text file");
    });

    it('should return "File" for application or unknown mime types', () => {
      expect(getFileTypeLabel("application/pdf")).toBe("File");
      expect(getFileTypeLabel("application/zip")).toBe("File");
      expect(getFileTypeLabel("unknown/type")).toBe("Unknown file");
    });
  });

  describe("addFilesParagraphs", () => {
    it("should skip files with mode 'tombstone'", async () => {
      const files = [
        {
          id: "F12345",
          name: "deleted_file.txt",
          title: "Deleted File",
          mimetype: "text/plain",
          filetype: "text",
          pretty_type: "Plain Text",
          user: "U12345",
          mode: "tombstone",
          editable: false,
          is_external: false,
          external_type: "",
          size: 1024,
          url_private:
            "https://files.slack.com/files-pri/T12345-F12345/deleted_file.txt",
          url_private_download:
            "https://files.slack.com/files-pri/T12345-F12345/download/deleted_file.txt",
          permalink:
            "https://workspace.slack.com/files/U12345/F12345/deleted_file.txt",
          permalink_public: "",
          timestamp: 1234567890,
        },
      ];

      const paragraphs: Paragraph[] = [];
      await addFilesParagraphs(paragraphs, files, {});

      expect(paragraphs.length).toBe(0);
      expect(fileHandler.downloadSlackFile).not.toHaveBeenCalled();
    });
  });
});
