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
  const outputDir = path.join(process.cwd(), "out", "files");
  ensureDownloadDirectory(outputDir);

  // Generate a unique filename
  const timestamp = Date.now();
  const safeFileName = `${timestamp}-${file.id}-${
    file.name?.replace(/[\/\\?%*:|"<>]/g, "_") || "unnamed"
  }`;
  const outputPath = path.join(outputDir, safeFileName);

  // Get the Slack token from environment or parameter
  const slackToken = getSlackToken();
  if (!slackToken) {
    console.error("No Slack token available for file download");
    return file.permalink || "";
  }

  // Step 1: Attempt private URL download first
  let downloadSuccess = false;
  for (const url of [file.url_private_download, file.url_private].filter(
    Boolean
  ) as string[]) {
    try {
      console.log(`Trying private download from: ${url}`);
      const headers: Record<string, string> = {};
      // Add authorization for private URLs
      if (url.includes("slack.com")) {
        headers["Authorization"] = `Bearer ${slackToken}`;
      }
      const response = await axios({
        method: "GET",
        url,
        headers,
        responseType: "stream",
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      console.log(`Successfully downloaded file to ${outputPath}`);
      downloadSuccess = true;
      return outputPath;
    } catch (err: any) {
      console.error(
        `Private download failed using ${url}: ${(err as Error).message}`
      );
      // Try next URL if this one fails
    }
  }

  // Step 2: Private download failed, now try to make the file public
  let madePublic = false;
  let publicUrl: string | null = null;
  let sharedFile: SharedPublicFile = file as SharedPublicFile;

  try {
    console.log(`Attempting to make file ${file.id} temporarily public...`);
    const shareResponse = await slackClient.files.sharedPublicURL({
      file: file.id,
    });
    if (shareResponse.ok && shareResponse.file) {
      sharedFile = shareResponse.file;
      madePublic = true;
      publicUrl = constructFileUrl(sharedFile);
      console.log(`File ${file.id} is now temporarily public`);
    }
  } catch (shareError: any) {
    if (shareError.data && shareError.data.error === "already_public") {
      console.log(`File ${file.id} was already public`);
      madePublic = true;
      publicUrl = constructFileUrl(file as SharedPublicFile);
    } else if (
      shareError.data &&
      (shareError.data.error === "file_not_found" ||
        shareError.data.error === "not_allowed")
    ) {
      console.log(
        `Cannot make file ${file.id} public: ${shareError.data.error} - likely from Slack Connect`
      );
    } else {
      console.warn(
        `Error making file ${file.id} public: ${shareError.message}`
      );
    }
  }

  if (publicUrl) {
    try {
      console.log(`Trying public download from: ${publicUrl}`);
      const headers: Record<string, string> = {};
      // No auth header needed for public URL
      const response = await axios({
        method: "GET",
        url: publicUrl,
        headers,
        responseType: "stream",
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      console.log(`Successfully downloaded file to ${outputPath}`);
      downloadSuccess = true;
    } catch (err: any) {
      console.error(
        `Public download failed using ${publicUrl}: ${(err as Error).message}`
      );
    }
  }

  // Step 3: Always revoke public access if it was granted
  if (madePublic) {
    try {
      console.log(`Revoking public access for file ${file.id}...`);
      await slackClient.files.revokePublicURL({ file: file.id });
      console.log(`Successfully revoked public access for file ${file.id}`);
    } catch (revokeError: any) {
      console.warn(
        `Failed to revoke public access for file ${file.id}: ${revokeError.message}`
      );
    }
  }

  // Return the appropriate URL based on download success
  if (downloadSuccess) {
    return outputPath;
  }
  return file.permalink || `https://slack.com/files/${file.id}`;
}
