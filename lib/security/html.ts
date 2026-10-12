/**
 * Escape text for Telegram's `parse_mode: "HTML"`.
 * Telegram only requires `&`, `<` and `>` to be escaped; quotes are escaped as well
 * so the output is also safe inside attribute values.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
