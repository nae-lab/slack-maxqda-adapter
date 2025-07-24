// Re-export types from the main types file
export * from '../types';

// Library-specific types
export interface SlackExporterOptions {
  /** Slack API token */
  token: string;
  /** Number of concurrent processes for message processing */
  concurrency?: number;
}

export interface ExportOptions {
  /** Channel ID to export messages from */
  channelId: string;
  /** Start date for message export (YYYY-MM-DD) */
  startDate: string;
  /** End date for message export (YYYY-MM-DD). If not provided, uses startDate */
  endDate?: string;
  /** Output format */
  format: 'docx' | 'md';
  /** Output file path */
  outputPath: string;
}

export interface ExportResult {
  /** Path to the generated file */
  filePath: string;
  /** Channel name that was exported */
  channelName: string;
  /** Number of messages exported */
  messageCount: number;
  /** Export format used */
  format: 'docx' | 'md';
} 