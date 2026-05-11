export function normalizeRichTextValue(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export function normalizeEditorHtml(html: string): string {
  const normalized = html
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/<div><br><\/div>/gi, "<p><br></p>")
    .replace(/<div>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/<p>\s*<\/p>/gi, "<p><br></p>")
    .trim();

  return isRichTextEmpty(normalized) ? "" : normalized;
}

export function stripRichText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1 ")
    .replace(/\*\*([^*]+)\*\*/g, "$1 ")
    .replace(/\*([^*]+)\*/g, "$1 ")
    .replace(/`([^`]+)`/g, "$1 ")
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1 ")
    .replace(/\\\((.*?)\\\)/g, "$1 ")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichTextEmpty(value: string): boolean {
  const withoutTags = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<p[^>]*>/gi, " ")
    .replace(/&nbsp;/gi, " ");

  return stripRichText(withoutTags).length === 0;
}

export function richTextPreview(value: string, maxLength = 120): string {
  const plainText = stripRichText(value);
  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength - 1).trimEnd()}…`;
}
