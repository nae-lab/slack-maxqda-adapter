import fs from "fs";
import path from "path";
import axios from "axios";
import { slackClient } from "./config";
import { getFilesDir } from "./config";
import { SlackFile } from "./types";

// Helper to download a Slack file via public share API
export async function downloadSlackFile(file: SlackFile): Promise<string> {
  try {
    // Share the file to obtain a public URL (needed for permissions)
    const shareRes = await slackClient.files.sharedPublicURL({ file: file.id });
    if (!shareRes.ok || !shareRes.file) {
      throw new Error("Failed to share file publicly");
    }

    // Use url_private_download to get binary data.
    if (!file.url_private_download) {
      throw new Error("Download URL not available for file " + file.id);
    }

    const downloadUrl: string = file.url_private_download;
    const filesDir = getFilesDir();

    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    const ext = path.extname(file.name) || ".dat";
    const fileName = Date.now() + "_" + Math.floor(Math.random() * 10000) + ext;
    const filePath = path.join(filesDir, fileName);

    const response = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      headers: { Authorization: `Bearer ${process.env.SLACK_API_TOKEN}` },
    });

    fs.writeFileSync(filePath, response.data);

    // Revoke the public share
    await slackClient.files.revokePublicURL({ file: file.id });

    // Return the local path relative to out directory
    return `./files/${fileName}`;
  } catch (error: any) {
    if (error.data && error.data.error === "already_public") {
      console.warn(`File already public: ${file.id}. Ignoring error.`);
      return file.url_private_download || file.url_private || "";
    }
    if (error.data && error.data.error === "file_not_found") {
      console.warn(`File not found: ${file.id}. Falling back to remote URL.`);
      return file.url_private_download || file.url_private || "";
    }
    throw error;
  }
}
