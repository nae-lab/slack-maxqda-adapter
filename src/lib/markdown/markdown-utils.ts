import path from "path";
import { ensureDirectoryExists } from "../utils/directory-utils";

/**
 * チャンネルディレクトリのパスを取得
 * @param outputDir 出力ディレクトリ
 * @param channelName チャンネル名
 * @returns チャンネルディレクトリのパス
 */
export function getChannelDirectoryPath(
  outputDir: string,
  channelName: string
): string {
  const channelDirPath = path.join(outputDir, channelName);
  ensureDirectoryExists(channelDirPath);
  return channelDirPath;
}

/**
 * スレッドディレクトリのパスを取得
 * @param channelDirPath チャンネルディレクトリのパス
 * @param timestamp メッセージのタイムスタンプ
 * @returns スレッドディレクトリのパス
 */
export function getThreadDirectoryPath(
  channelDirPath: string,
  timestamp: string
): string {
  const threadDirPath = path.join(
    channelDirPath,
    `thread_${timestamp.replace(".", "")}`
  );
  ensureDirectoryExists(threadDirPath);
  return threadDirPath;
}

/**
 * メッセージファイル名を取得
 * @param timestamp メッセージのタイムスタンプ
 * @returns メッセージファイル名
 */
export function getMessageFileName(timestamp: string): string {
  return `message_${timestamp.replace(".", "")}.md`;
}

/**
 * Obsidianで使用可能なファイル名に変換
 * @param name 元のファイル名
 * @returns Obsidianで使用可能なファイル名
 */
export function toObsidianSafeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_") // Windowsの禁止文字を置換
    .replace(/\s+/g, "_") // スペースをアンダースコアに置換
    .replace(/\.+/g, ".") // 複数のドットを1つに置換
    .replace(/[^\w.-]/g, "_"); // その他の特殊文字を置換
}
