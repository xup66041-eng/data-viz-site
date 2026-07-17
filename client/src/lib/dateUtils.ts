/**
 * 民國年度轉換工具函數
 */

/**
 * 將西元年度轉換為民國年度
 * @param year 西元年度
 * @returns 民國年度
 */
export function toROCYear(year: number): number {
  return year - 1911;
}

/**
 * 將民國年度轉換為西元年度
 * @param rocYear 民國年度
 * @returns 西元年度
 */
export function toWesternYear(rocYear: number): number {
  return rocYear + 1911;
}

/**
 * 格式化日期為「民國XXX (西元YYYY)」格式
 * @param date 日期對象或日期字符串
 * @returns 格式化後的日期字符串
 */
export function formatDateWithROC(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rocYear = toROCYear(year);
  return `民國${rocYear} (${year}年${month}月${day}日)`;
}

/**
 * 格式化日期為「民國XXX/MM/DD」格式（簡短版本）
 * @param date 日期對象或日期字符串
 * @returns 格式化後的日期字符串
 */
export function formatDateShortROC(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rocYear = toROCYear(year);
  return `民${rocYear}/${month}/${day}`;
}

/**
 * 格式化日期為「民國XXX (西元YYYY)」格式（僅年份）
 * @param date 日期對象或日期字符串
 * @returns 格式化後的年份字符串
 */
export function formatYearWithROC(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const rocYear = toROCYear(year);
  return `民${rocYear}(${year})`;
}
