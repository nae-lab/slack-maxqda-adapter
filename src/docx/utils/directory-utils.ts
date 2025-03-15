import * as fs from "fs";
import path from "path";

/**
 * ディレクトリ操作に関するユーティリティ関数を提供します
 * ファイル出力や保存のためのディレクトリ管理を行います
 */

/**
 * 出力ディレクトリが存在することを確認し、必要に応じて作成します
 * @returns 作成されたファイルディレクトリのパス
 */
export function ensureDirectoriesExist(): string {
  const filesDir = path.join(process.cwd(), "out", "files");
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  return filesDir;
}
