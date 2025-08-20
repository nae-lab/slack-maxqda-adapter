import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { SlackFile, LogCallback } from "./types";
import { ProgressManager } from "./progress-manager";
import { File as SharedPublicFile } from "@slack/web-api/dist/types/response/FilesSharedPublicURLResponse";
import { getSlackToken } from "./slack-client";
import { formatDateForFilename, getFileTimestampFromSlack } from "./utils/date-utils";

import { ensureDirectoryExists } from "./utils/directory-utils";

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
export async function downloadSlackFile(
  file: SlackFile,
  channelName: string = "",
  outputDir?: string,
  progressManager?: ProgressManager,
  onLog?: LogCallback,
  fileCounter?: { processed: number; increment: () => void }
): Promise<string> {
  // Use provided outputDir, or default to "./files" 
  const baseOutputDir = outputDir || "./files";
  const finalOutputDir = baseOutputDir;
  
  ensureDirectoryExists(finalOutputDir);

  // Generate a human-readable filename with format: YYYY-MM-DD_fileId_originalName
  const fileDate = file.created 
    ? formatDateForFilename(file.created)
    : new Date().toISOString().split('T')[0]; // Fallback to today's date
  
  const sanitizedName = file.name?.replace(/[\/\\?%*:|"<>]/g, "_") || "unnamed";
  const safeFileName = `${fileDate}_${file.id}_${sanitizedName}`;
  const outputPath = path.join(finalOutputDir, safeFileName);

  // Get the Slack token from environment or parameter
  const slackToken = getSlackToken();
  if (!slackToken) {
    console.error("No Slack token available for file download");
    return file.permalink || "";
  }

  // Report progress through file counter (will trigger progress manager)
  // Don't report here - let the file counter handle it after successful download

  // Attempt private URL download
  let downloadSuccess = false;
  for (const url of [file.url_private_download, file.url_private].filter(
    Boolean
  ) as string[]) {
    try {
      if (onLog) {
        onLog({ timestamp: new Date(), level: 'info', message: `Trying private download from: ${url}` });
      }
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
      await new Promise<void>((resolve, reject) => {
        writer.on("finish", () => resolve());
        writer.on("error", reject);
      });
      
      if (onLog) {
        onLog({ timestamp: new Date(), level: 'success', message: `Successfully downloaded file to ${outputPath}` });
      }
      console.log(`Successfully downloaded file to ${outputPath}`);
      
      // Set file timestamps to preserve original metadata
      try {
        const originalTimestamp = getFileTimestampFromSlack(file);
        if (originalTimestamp) {
          await fs.promises.utimes(outputPath, originalTimestamp, originalTimestamp);
          if (onLog) {
            onLog({ timestamp: new Date(), level: 'info', message: `Set file timestamp to original creation date: ${originalTimestamp.toISOString()}` });
          }
        }
      } catch (timestampError) {
        if (onLog) {
          onLog({ timestamp: new Date(), level: 'warning', message: `Failed to set file timestamp: ${(timestampError as Error).message}` });
        }
        console.warn(`Failed to set file timestamp: ${(timestampError as Error).message}`);
      }
      
      // Increment file counter to update progress
      if (fileCounter) {
        fileCounter.increment();
      }
      
      downloadSuccess = true;
      break;
    } catch (err: any) {
      const errorMsg = `Private download failed using ${url}: ${(err as Error).message}`;
      if (onLog) {
        onLog({ timestamp: new Date(), level: 'warning', message: errorMsg });
      }
      console.error(errorMsg);
      // Try next URL if this one fails
    }
  }

  // ダウンロードが成功した場合はローカルパスを返す
  if (downloadSuccess) {
    return outputPath;
  }
  
  // ダウンロードが失敗した場合はパーマリンクを返す
  return file.permalink || `https://slack.com/files/${file.id}`;
}
