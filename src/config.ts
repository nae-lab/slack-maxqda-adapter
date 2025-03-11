import dotenv from "dotenv";
import { WebClient } from "@slack/web-api";

// Load environment variables
dotenv.config({
  override: true,
});

// Slack configuration
const token = process.env.SLACK_API_TOKEN;
export const slackClient = new WebClient(token);

// File paths configuration
export const getFilesDir = () => {
  return process.cwd() + "/out/files";
};
