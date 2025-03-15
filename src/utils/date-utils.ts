/**
 * 日付をフォーマットする関数
 * @param date 日付オブジェクト
 * @returns YYYY-MM-DD HH:MM:SS 形式の文字列
 */
export function getFormattedDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * UNIXタイムスタンプをフォーマットする関数
 * @param timestamp UNIXタイムスタンプ（秒）
 * @returns YYYY-MM-DD HH:MM:SS 形式の文字列
 */
export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) return "Unknown time";
  const date = new Date(Number(timestamp) * 1000);
  return getFormattedDate(date);
}

/**
 * フォーマットされた日付文字列と元の日付オブジェクトを返す関数
 * @param timestamp UNIXタイムスタンプ（秒）
 * @returns オブジェクト {formatted: string, date: Date}
 */
export function getFormattedDateAndObject(timestamp: string): {
  formatted: string;
  date: Date;
} {
  const date = new Date(Number(timestamp) * 1000);
  return {
    formatted: getFormattedDate(date),
    date,
  };
}
