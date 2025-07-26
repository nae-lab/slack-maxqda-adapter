import path from "path";
import { SlackMaxqdaAdapterOptions, ExportOptions, ExportResult, ProgressCallback, LogCallback, LogEntry } from "./types";
import { initializeSlackClient } from "./config";
import { ProgressManager } from "./progress-manager";
import {
  fetchChannelMessagesForDateRange,
  getChannelName,
  getAvailableChannels,
  getCustomEmoji,
} from "./slack-client";
import { exportToWordDocument } from "./docx-formatter";
import { exportToMarkdown } from "./markdown/markdown-formatter";
import { ensureDirectoryExists } from "./utils/directory-utils";

// Store concurrency setting for formatters
let currentConcurrency = 4;

export class SlackMaxqdaAdapter {
  private options: SlackMaxqdaAdapterOptions;
  private onLog?: LogCallback;
  private progressManager: ProgressManager;

  constructor(options: SlackMaxqdaAdapterOptions) {
    this.options = {
      concurrency: 4,
      ...options,
    };
    this.onLog = options.onLog;
    
    // Initialize progress manager
    this.progressManager = new ProgressManager(options.onProgress);

    // Initialize Slack client with the provided token
    initializeSlackClient(this.options.token);

    // Set concurrency for formatters
    currentConcurrency = this.options.concurrency || 4;
  }

  private log(level: 'info' | 'success' | 'warning' | 'error', message: string) {
    if (this.onLog) {
      this.onLog({ timestamp: new Date(), level, message });
    }
  }

  /**
   * Get the progress manager instance for use in formatters
   */
  getProgressManager(): ProgressManager {
    return this.progressManager;
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

    // Reset progress manager for new export
    this.progressManager.reset();

    // Report initial progress
    this.progressManager.reportProgress('fetching', 0, 'Initializing export...');
    this.log('info', 'Starting Slack export...');

    // Initialize custom emoji cache early to ensure it's available for processing
    this.progressManager.reportProgress('fetching', 20, 'Loading custom emoji...');
    this.log('info', 'Loading custom emoji...');
    await getCustomEmoji();

    // Get channel name
    this.progressManager.reportProgress('fetching', 50, 'Getting channel information...');
    this.log('info', 'Getting channel information...');
    const channelName = await getChannelName(channelId);

    // Fetch messages for date range
    this.progressManager.reportProgress('fetching', 80, 'Fetching messages from Slack...');
    this.log('info', `Fetching all messages from ${startDate} to ${actualEndDate}...`);
    const dateRangeResults = await fetchChannelMessagesForDateRange(
      channelId,
      startDate,
      actualEndDate
    );

    if (dateRangeResults.length === 0) {
      throw new Error("No messages found in the specified date range.");
    }

    // Count total messages for progress tracking
    const messageCount = dateRangeResults.reduce(
      (total, day) => total + day.messages.length,
      0
    );

    this.progressManager.reportProgress('fetching', 100, `Retrieved ${messageCount} messages in total.`);
    this.log('success', `Retrieved ${messageCount} messages in total.`);

    // Processing phase: 10% - 30% (20% weight)
    this.progressManager.reportProgress('processing', 0, `Processing ${messageCount} messages...`, 0, messageCount);
    this.log('info', `メッセージ処理を開始します (並列度: ${this.options.concurrency})`);

    // Count files to download for more accurate progress tracking
    let totalFiles = 0;
    for (const dayResult of dateRangeResults) {
      for (const message of dayResult.messages) {
        if (message.files) {
          totalFiles += message.files.length;
        }
      }
    }

    // File downloading phase preparation
    if (totalFiles > 0) {
      this.progressManager.reportProgress('processing', 100, `Found ${totalFiles} files to download`);
      this.log('info', `Found ${totalFiles} files to download`);
    } else {
      this.progressManager.reportProgress('processing', 100, 'No files to download');
      this.log('info', 'No files to download');
    }

    // Ensure output directory exists
    ensureDirectoryExists(path.dirname(outputPath));

    // Export based on format (includes file downloading)
    // Note: Don't report 'writing' stage here as file downloads happen inside the formatter
    this.log('info', `Starting ${format.toUpperCase()} document generation...`);
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
        outputPath,
        this.progressManager,
        this.onLog?.bind(this)
      );
    }

    this.progressManager.reportProgress('complete', 100, 'Export completed successfully!');
    this.log('success', 'Export completed successfully!');

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
 * Convenience function to create a new SlackMaxqdaAdapter instance
 */
export function createSlackMaxqdaAdapter(
  options: SlackMaxqdaAdapterOptions
): SlackMaxqdaAdapter {
  return new SlackMaxqdaAdapter(options);
}
