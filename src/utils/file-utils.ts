import { FileElement, SlackFile, toSlackFile } from "../types";
import { downloadSlackFile } from "../file-handler";
import path from "path";
import * as fs from "fs";

/**
 * メッセージに添付されたファイルをダウンロードし、パスを取得する
 *
 * @param file Slackファイル情報
 * @param channelName チャンネル名
 * @returns ダウンロードされたファイルのパスまたはパーマリンク
 */
export async function processSlackFile(
  file: FileElement,
  channelName: string = ""
): Promise<{
  path: string;
  isPermalink: boolean;
  error?: Error;
}> {
  try {
    // FileElementからSlackFileへの変換
    const slackFile = toSlackFile(file);

    if (!slackFile.id) {
      throw new Error("Invalid file object without ID");
    }

    const fileResult = await downloadSlackFile(slackFile, channelName);
    const isPermalink = fileResult.startsWith("http");

    return {
      path: fileResult,
      isPermalink,
    };
  } catch (error) {
    console.error(`Error processing file: ${error}`);
    return {
      path: file.permalink || "",
      isPermalink: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * ファイルパスをObsidian互換の埋め込み画像パスに変換
 *
 * @param filePath ファイルパス
 * @returns Obsidian互換の相対パス
 */
export function getObsidianImagePath(filePath: string): string {
  if (filePath.startsWith("http")) {
    return filePath;
  }

  // プロジェクトのルートからの相対パスを取得
  return path.relative(process.cwd(), filePath);
}

/**
 * ファイルが画像かどうかを判定
 *
 * @param mimetype MIMEタイプ
 * @returns 画像ファイルならtrue
 */
export function isImageFile(mimetype?: string): boolean {
  return !!mimetype && mimetype.startsWith("image/");
}

/**
 * ファイルのバッファを読み込む
 *
 * @param filePath ファイルパス
 * @returns ファイルバッファ
 */
export function readFileAsBuffer(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
 * 2つのファイルパス間の相対パスを計算
 *
 * @param from 基準となるファイルパス（通常はマークダウンファイル）
 * @param to 対象となるファイルパス（通常は添付ファイル）
 * @returns 相対パス
 */
export function getRelativePath(from: string, to: string): string {
  if (to.startsWith("http")) {
    return to;
  }

  const fromDir = path.dirname(from);
  return path.relative(fromDir, to);
}
