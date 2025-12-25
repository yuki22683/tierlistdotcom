/**
 * 数値を日本語形式でフォーマット
 * - 1万未満: そのまま表示（例: 9999）
 * - 1万以上10万未満: 小数点1桁付きで"万"表示（例: 8.1万）
 * - 10万以上: 整数で"万"表示（例: 1523万）
 */
export function formatNumber(num: number): string {
  if (num < 10000) {
    return num.toString()
  } else if (num < 100000) {
    return (num / 10000).toFixed(1) + '万'
  } else {
    return Math.floor(num / 10000) + '万'
  }
}
