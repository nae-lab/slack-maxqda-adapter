import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { SlackFile } from "./types";
import { getSlackToken } from "./slack-client";
import { slackClient } from "./config";

// Ensure download directory exists
function ensureDownloadDirectory(directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Helper function to detect if content is HTML rather than an image
function isHtmlContent(buffer: Buffer): boolean {
  // Check for common HTML markers at the beginning of the file
  const start = buffer.toString("utf8", 0, 100).toLowerCase();
  return (
    start.includes("<!doctype html") ||
    start.includes("<html") ||
    start.includes("<!DOCTYPE html")
  );
}

// Download file from Slack
export async function downloadSlackFile(file: SlackFile): Promise<string> {
  const token = getSlackToken();
  const outputDir = path.join(process.cwd(), "files");
  ensureDownloadDirectory(outputDir);

  // Generate a unique filename
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${file.id}-${
    file.name?.replace(/[\/\\?%*:|"<>]/g, "_") || "unnamed"
  }`;
  const outputPath = path.join(outputDir, safeFileName);

  console.log(`Downloading file: ${file.name || "unnamed"} (${file.id})`);

  try {
    // Step 1: Make the file publicly accessible
    console.log(`Making file ${file.id} temporarily public...`);
    let sharedFile = file;

    try {
      const shareResponse = await slackClient.files.sharedPublicURL({
        file: file.id,
      });

      if (shareResponse.ok && shareResponse.file) {
        sharedFile = shareResponse.file as SlackFile;
        console.log(`File ${file.id} is now temporarily public`);
      } else {
        console.warn(
          `Could not make file ${file.id} public, using original URLs`
        );
      }
    } catch (shareError: any) {
      // Handle already public files
      if (shareError.data && shareError.data.error === "already_public") {
        console.log(`File ${file.id} was already public`);
      } else {
        console.warn(
          `Error making file ${file.id} public: ${shareError.message}`
        );
      }
    }

    // Step 2: Download the file
    let downloadSuccess = false;

    // Try download URLs in order of preference
    const downloadUrls = [
      sharedFile.url_private_download,
      sharedFile.url_private,
      sharedFile.permalink,
    ].filter(Boolean) as string[];

    for (const url of downloadUrls) {
      try {
        console.log(`Trying to download from: ${url}`);
        const headers: Record<string, string> = {};

        // Only add auth token for private URLs
        if (url.includes("slack.com") && !url.includes("pub_secret")) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await axios.get(url, {
          responseType: "arraybuffer",
          headers,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        // Check if the response is HTML instead of the expected file type
        const responseBuffer = Buffer.from(response.data);
        if (
          isHtmlContent(responseBuffer) &&
          file.mimetype?.startsWith("image/")
        ) {
          console.warn(
            `Received HTML instead of image from ${url}, trying next URL...`
          );
          continue;
        }

        // If all good, write the file
        fs.writeFileSync(outputPath, responseBuffer);
        console.log(`Successfully downloaded file to ${outputPath}`);
        downloadSuccess = true;
        break;
      } catch (downloadError) {
        console.warn(`Failed to download from ${url}: ${downloadError}`);
      }
    }

    // Step 3: Always try to revoke public access
    try {
      console.log(`Revoking public access for file ${file.id}...`);
      await slackClient.files.revokePublicURL({ file: file.id });
      console.log(`Successfully revoked public access for file ${file.id}`);
    } catch (revokeError: any) {
      console.warn(
        `Failed to revoke public access for file ${file.id}: ${revokeError.message}`
      );
      // Continue execution, this is not critical
    }

      if (downloadSuccess) {
        return outputPath;
      }

    throw new Error("All download attempts failed");
  } catch (error: any) {
    console.error(`Error downloading file ${file.id}: ${error}`);

    // Create a placeholder file since we couldn't download it
    try {
      console.log(`Creating placeholder for file ${file.id}`);
      const errorMessage = `Could not download file ${
        file.name || "unnamed"
      } (${file.id}).
Please check the original in Slack: ${file.permalink}`;

      // For images, create a placeholder image with error text
      if (file.mimetype?.startsWith("image/")) {
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200">
          <rect width="400" height="200" fill="#f0f0f0" />
          <text x="20" y="40" font-family="Arial" font-size="14" fill="red">Error: Could not download image</text>
          <text x="20" y="70" font-family="Arial" font-size="12">${
            file.name || "unnamed"
          }</text>
          <text x="20" y="100" font-family="Arial" font-size="12">Please check original in Slack</text>
          </svg>`;

        fs.writeFileSync(outputPath, svgContent);
      } else {
        fs.writeFileSync(outputPath, errorMessage);
      }

      console.log(`Created placeholder file at ${outputPath}`);
      return outputPath;
    } catch (placeholderError: any) {
      console.error(`Failed to create placeholder: ${placeholderError}`);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }
}
