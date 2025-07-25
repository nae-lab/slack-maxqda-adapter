import path from "path";
import { SlackExporterOptions, ExportOptions, ExportResult } from "./types";
import { initializeSlackClient } from "./config";
import {
  fetchChannelMessagesForDateRange,
  getChannelName,
  getAvailableChannels,
  getCustomEmoji,
} from "../slack-client";
import { exportToWordDocument } from "../docx-formatter";
import { exportToMarkdown } from "../markdown/markdown-formatter";
import { ensureDirectoryExists } from "../config";

// Store concurrency setting for formatters
let currentConcurrency = 4;

export class SlackExporter {
  private options: SlackExporterOptions;

  constructor(options: SlackExporterOptions) {
    this.options = {
      concurrency: 4,
      ...options,
    };

    // Initialize Slack client with the provided token
    initializeSlackClient(this.options.token);

    // Set concurrency for formatters
    currentConcurrency = this.options.concurrency || 4;
  }

  /**
   * Get current concurrency setting
   */
  static getConcurrency(): number {
    return currentConcurrency;
  }

  /**
   * Export messages from a Slack channel
   */
  async export(exportOptions: ExportOptions): Promise<ExportResult> {
    const { channelId, startDate, endDate, format, outputPath } = exportOptions;

    // Use startDate as endDate if not provided
    const actualEndDate = endDate || startDate;

    // Initialize custom emoji cache early to ensure it's available for processing
    await getCustomEmoji();

    // Get channel name
    const channelName = await getChannelName(channelId);

    // Fetch messages for date range
    const dateRangeResults = await fetchChannelMessagesForDateRange(
      channelId,
      startDate,
      actualEndDate
    );

    if (dateRangeResults.length === 0) {
      throw new Error("No messages found in the specified date range.");
    }

    // Ensure output directory exists
    ensureDirectoryExists(path.dirname(outputPath));

    // Export based on format
    let finalOutputPath: string;
    if (format === "md") {
      finalOutputPath = await exportToMarkdown(
        dateRangeResults,
        channelId,
        channelName,
        outputPath
      );
    } else {
      finalOutputPath = await exportToWordDocument(
        dateRangeResults,
        channelId,
        channelName,
        outputPath
      );
    }

    // Count total messages
    const messageCount = dateRangeResults.reduce(
      (total, day) => total + day.messages.length,
      0
    );

    return {
      filePath: finalOutputPath,
      channelName,
      messageCount,
      format,
    };
  }

  /**
   * Export messages from multiple channels
   */
  async exportMultiple(exports: ExportOptions[]): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const exportOption of exports) {
      const result = await this.export(exportOption);
      results.push(result);
    }

    return results;
  }

  /**
   * Get channel name by ID
   */
  async getChannelName(channelId: string): Promise<string> {
    return getChannelName(channelId);
  }

  /**
   * Get available channels
   */
  async getAvailableChannels(): Promise<
    Array<{ id: string; name: string; is_private: boolean }>
  > {
    return getAvailableChannels();
  }
}

/**
 * Convenience function to create a new SlackExporter instance
 */
export function createSlackExporter(
  options: SlackExporterOptions
): SlackExporter {
  return new SlackExporter(options);
}
