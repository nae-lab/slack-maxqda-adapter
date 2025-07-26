/**
 * ファイルタイプに関するユーティリティ関数を提供します
 * ファイルのMIMEタイプに基づいた分類や表示名の生成に使用されます
 */

/**
 * MIMEタイプからファイルタイプのラベルを取得します
 * @param mimetype ファイルのMIMEタイプ
 * @returns 表示用のファイルタイプラベル
 */
export function getFileTypeLabel(mimetype: string): string {
  if (mimetype.startsWith("audio/")) return "Audio file";
  if (mimetype.startsWith("video/")) return "Video file";
  if (mimetype.startsWith("image/")) return "Image file";

  const mainType = mimetype.split("/")[0];
  if (mainType && mainType !== "application") {
    return mainType.charAt(0).toUpperCase() + mainType.slice(1) + " file";
  }
  return "File";
}

/**
 * ファイルが画像かどうかを判定します
 * @param mimetype ファイルのMIMEタイプ
 * @returns 画像ファイルの場合はtrue
 */
export function isImageFile(mimetype?: string): boolean {
  return mimetype?.startsWith("image/") || false;
}
