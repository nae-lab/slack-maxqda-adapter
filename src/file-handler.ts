import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { SlackFile } from "./types";
import { File as SharedPublicFile } from "@slack/web-api/dist/types/response/FilesSharedPublicURLResponse";
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

// Helper function to construct public file URL from permalink_public
function constructFileUrl(sharedFile: SharedPublicFile): string | null {
  try {
    if (!sharedFile.permalink_public) return null;

    // Extract team ID and file ID from permalink
    // permalink_public format: https://slack-files.com/T0312P7H7MX-F08D4UL7T09-cb99f3a17c
    const matches = sharedFile.permalink_public.match(
      /slack-files\.com\/([^-]+)-([^-]+)-(.+)/
    );
    if (!matches || matches.length < 4) return null;

    const teamId = matches[1];
    const fileId = matches[2];
    const pubSecret = matches[3];

    // Process filename to exactly match Slack's format:
    // - Convert to lowercase
    // - Replace spaces with underscores
    // - Handle special characters
    let fileName = "";
    if (sharedFile.name) {
      fileName = sharedFile.name
        .toLowerCase() // Convert to lowercase
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .replace(/[^a-z0-9_.-]/g, ""); // Remove any other special chars
    } else {
      fileName = fileId;
    }

    // Construct the URL in the format:
    // https://files.slack.com/files-pri/${teamId}-${fileId}/${fileName}?pub_secret=${pubSecret}`;
    return `https://files.slack.com/files-pri/${teamId}-${fileId}/${fileName}?pub_secret=${pubSecret}`;
  } catch (e) {
    console.error("Error constructing file URL:", e);
    return null;
  }
}

// Download file from Slack
export async function downloadSlackFile(file: SlackFile): Promise<string> {
  // For non-image files, just return the permalink
  if (!file.mimetype?.startsWith("image/")) {
    console.log(
      `File ${file.id} (${
        file.name || "unnamed"
      }) is not an image, returning permalink`
    );
    return file.permalink || `https://slack.com/files/${file.id}`;
  }

  const token = getSlackToken();
  const outputDir = path.join(process.cwd(), "out/files");
  ensureDownloadDirectory(outputDir);

  // Generate a unique filename
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${file.id}-${
    file.name?.replace(/[\/\\?%*:|"<>]/g, "_") || "unnamed"
  }`;
  const outputPath = path.join(outputDir, safeFileName);

  console.log(`Downloading image: ${file.name || "unnamed"} (${file.id})`);

  try {
    // Step 1: Make the file publicly accessible
    console.log(`Making file ${file.id} temporarily public...`);
    let sharedFile: SharedPublicFile = file;

    try {
      const shareResponse = await slackClient.files.sharedPublicURL({
        file: file.id,
      });

      if (shareResponse.ok && shareResponse.file) {
        sharedFile = shareResponse.file;
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

    // Construct properly formatted public URL
    const publicFileUrl = constructFileUrl(sharedFile);

    // Try download URLs in order of preference
    const downloadUrls = [
      // Try the properly formatted public URL first if available
      publicFileUrl,
      sharedFile.url_private_download,
      sharedFile.url_private,
      sharedFile.permalink_public,
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

    // If download fails, return the permalink
    console.warn(
      `Failed to download image ${file.id}, returning permalink instead`
    );
    return file.permalink || `https://slack.com/files/${file.id}`;
  } catch (error: any) {
    console.error(`Error downloading file ${file.id}: ${error}`);

    // Return the permalink if any error occurs during download
    return file.permalink || `https://slack.com/files/${file.id}`;
  }
}
