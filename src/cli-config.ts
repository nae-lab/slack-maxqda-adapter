import dotenv from "dotenv";
import { WebClient } from "@slack/web-api";
import path from "path";

// Load environment variables
dotenv.config({
  override: true,
});

// Slack configuration
const token = process.env.SLACK_API_TOKEN;
export const slackClient = new WebClient(token);

// Base output directories
export const getBaseOutputDir = () => {
  return path.join(process.cwd(), "out");
};

// Get channel-specific output directory
export const getChannelOutputDir = (channelName: string) => {
  return path.join(getBaseOutputDir(), channelName);
};

// Get files directory for a specific channel
export const getFilesDir = (channelName: string = "") => {
  return channelName
    ? path.join(getChannelOutputDir(channelName), "files")
    : path.join(getBaseOutputDir(), "files");
};

// Ensure directory exists
export const ensureDirectoryExists = (dirPath: string) => {
  const fs = require("fs");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};
