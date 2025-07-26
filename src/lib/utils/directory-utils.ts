import { existsSync, mkdirSync } from "fs";

/**
 * Ensure directory exists, creating it if it doesn't
 */
export const ensureDirectoryExists = (dirPath: string): string => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};