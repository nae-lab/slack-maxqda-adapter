import { Paragraph } from "docx";
import * as fs from "fs";
import path from "path";
import { MessageFile, toSlackFile } from "../../types";
import { downloadSlackFile } from "../../file-handler";
import {
  createFileLinkParagraph,
  createErrorParagraph,
  createImageTitleParagraph,
  createImageParagraph,
} from "../paragraph-formatters";
import {
  getImageDimensions,
  getMappedImageType,
  ensureCompatibleImage,
} from "../image-utils";

// Ensure output directories exist
function ensureDirectoriesExist(): string {
  const filesDir = path.join(process.cwd(), "out", "files");
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  return filesDir;
}

// Helper function to determine file type label
function getFileTypeLabel(mimetype: string): string {
  if (mimetype.startsWith("audio/")) return "Audio file";
  if (mimetype.startsWith("video/")) return "Video file";
  if (mimetype.startsWith("image/")) return "Image file";

  const mainType = mimetype.split("/")[0];
  if (mainType && mainType !== "application") {
    return mainType.charAt(0).toUpperCase() + mainType.slice(1) + " file";
  }
  return "File";
}

export async function addFilesParagraphs(
  paragraphs: Paragraph[],
  files: MessageFile[],
  indent: Record<string, any> = {}
): Promise<void> {
  ensureDirectoriesExist();

  for (const file of files) {
    try {
      const slackFile = toSlackFile(file);
      if (!slackFile) continue;

      const fileResult = await downloadSlackFile(slackFile);
      const isPermalink = fileResult.startsWith("http");

      if (file.mimetype?.startsWith("image/")) {
        if (!isPermalink) {
          await processImageFile(paragraphs, file, fileResult, indent);
        } else {
          paragraphs.push(
            createFileLinkParagraph(
              "Image file",
              file.name || "image file",
              fileResult,
              indent
            )
          );
        }
      } else {
        paragraphs.push(
          createFileLinkParagraph(
            getFileTypeLabel(file.mimetype || ""),
            file.name || "unnamed file",
            fileResult,
            indent
          )
        );
      }
    } catch (error) {
      handleFileError(paragraphs, file, error, indent);
    }
  }
}

async function processImageFile(
  paragraphs: Paragraph[],
  file: MessageFile,
  filePath: string,
  indent: Record<string, any>
): Promise<void> {
  paragraphs.push(createImageTitleParagraph(file.name || "", indent));

  try {
    const imageData = fs.readFileSync(filePath);
    const isSvgPlaceholder = imageData
      .toString("utf8", 0, 100)
      .includes('<svg xmlns="http://www.w3.org/2000/svg"');

    if (isSvgPlaceholder) {
      handleSvgPlaceholder(paragraphs, file, indent);
      return;
    }

    await embedImage(paragraphs, file, imageData, indent);
  } catch (err) {
    handleFileError(paragraphs, file, err, indent);
  }
}

async function embedImage(
  paragraphs: Paragraph[],
  file: MessageFile,
  imageData: Buffer,
  indent: Record<string, any>
): Promise<void> {
  try {
    const fileExt = path
      .extname(file.name || "")
      .toLowerCase()
      .substring(1);
    const imageType = getMappedImageType(
      fileExt || file.mimetype?.split("/")[1] || "png"
    );
    const { scaledWidth, scaledHeight } = await getImageDimensions(
      imageData,
      file.mimetype || "image/png",
      500
    );

    paragraphs.push(
      createImageParagraph(
        imageData,
        scaledWidth,
        scaledHeight,
        imageType,
        indent
      )
    );
  } catch (error) {
    const { buffer: processedImageData, type: imageType } =
      await ensureCompatibleImage(imageData, file.mimetype || "image/png");
    const { scaledWidth, scaledHeight } = await getImageDimensions(
      processedImageData,
      file.mimetype || "image/png",
      500
    );

    paragraphs.push(
      createImageParagraph(
        processedImageData,
        scaledWidth,
        scaledHeight,
        imageType,
        indent
      )
    );
  }
}

function handleSvgPlaceholder(
  paragraphs: Paragraph[],
  file: MessageFile,
  indent: Record<string, any>
): void {
  paragraphs.push(
    createErrorParagraph(
      `[Unable to download image: ${file.name || "unnamed file"}]`,
      indent
    )
  );

  if (file.permalink) {
    paragraphs.push(
      createFileLinkParagraph(
        "Original image in Slack",
        file.name || "image file",
        file.permalink,
        indent
      )
    );
  }
}

function handleFileError(
  paragraphs: Paragraph[],
  file: MessageFile,
  error: unknown,
  indent: Record<string, any>
): void {
  paragraphs.push(
    createErrorParagraph(
      `[Error processing file: ${file.name || "unnamed file"} - ${
        error instanceof Error ? error.message : String(error)
      }]`,
      indent
    )
  );

  if (file.permalink) {
    paragraphs.push(
      createFileLinkParagraph(
        "Original file in Slack",
        file.name || "file",
        file.permalink,
        indent
      )
    );
  }
}
