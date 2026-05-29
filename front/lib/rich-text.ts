export function normalizeRichTextValue(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function preserveSegments(
  value: string,
  pattern: RegExp,
  preserved: string[]
): string {
  return value.replace(pattern, (match) => {
    const token = `@@FLASHIFYPRESERVED${preserved.length}@@`;
    preserved.push(match);
    return token;
  });
}

function normalizeBrokenArrowCommands(value: string): string {
  return value
    // Corrige casos em que a IA removeu a barra do comando LaTeX
    // ou colou o comando entre os símbolos da expressão.
    .replace(
      /([A-Za-z0-9)\]])\s*(?:\\)?(?:Rightarrow|rightarrow|ightarrow)\s*([A-Za-z0-9(\[])/g,
      "$1 → $2"
    )
    .replace(
      /([A-Za-z0-9)\]])\s*(?:\\)?(?:Leftarrow|leftarrow|eftarrow)\s*([A-Za-z0-9(\[])/g,
      "$1 ← $2"
    )
    .replace(
      /([A-Za-z0-9)\]])\s*(?:\\)?(?:Leftrightarrow|leftrightarrow|eftrightarrow)\s*([A-Za-z0-9(\[])/g,
      "$1 ↔ $2"
    );
}

function normalizeFunctionImageNotation(value: string): string {
  return value
    .replace(/\blm\s*\(\s*([A-Za-z])\s*\)/g, "Im($1)")
    .replace(/\blm\s*\[\s*([A-Za-z])\s*\]/g, "Im($1)");
}

function emphasizePlainTextImageNotation(value: string): string {
  return value.replace(
    /\b(?:Im|lm)\s*\(\s*([A-Za-z])\s*\)/g,
    '<span class="math-operator">Im</span>($1)'
  );
}

export function normalizeFormulaLikeText(value: string): string {
  if (!value) return "";

  const preserved: string[] = [];
  let normalized = normalizeFunctionImageNotation(
    normalizeBrokenArrowCommands(value)
  )
    // Normaliza delimitadores LaTeX que o markdown tende a consumir
    // para formatos entendidos diretamente por remark-math.
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, expression) => `$$${expression}$$`)
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, expression) => `$${expression}$`);

  normalized = preserveSegments(normalized, /```[\s\S]*?```/g, preserved);
  normalized = preserveSegments(normalized, /<pre[\s\S]*?<\/pre>/gi, preserved);
  normalized = preserveSegments(normalized, /<code[\s\S]*?<\/code>/gi, preserved);
  normalized = preserveSegments(normalized, /\$\$[\s\S]*?\$\$/g, preserved);
  normalized = preserveSegments(normalized, /\$(?:\\.|[^$\\])+\$/g, preserved);
  normalized = emphasizePlainTextImageNotation(normalized);

  normalized = normalized
    .replace(/\\Rightarrow/g, "⇒")
    .replace(/\\Leftarrow/g, "⇐")
    .replace(/\\Leftrightarrow/g, "⇔")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\leftarrow/g, "←")
    .replace(/\\leftrightarrow/g, "↔")
    .replace(/\\to/g, "→")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\pm/g, "±")
    .replace(/\\neq/g, "≠")
    .replace(/\\geq/g, "≥")
    .replace(/\\leq/g, "≤")
    .replace(/\\approx/g, "≈")
    .replace(/<->/g, "↔")
    .replace(/->/g, "→");

  // Converte notação textual comum em sobrescrito/subscrito para casos
  // onde a IA não devolveu LaTeX delimitado, preservando segmentos técnicos.
  normalized = normalized.replace(
    /([A-Za-z0-9]+)\^(\d+|[A-Za-z](?:[A-Za-z0-9]*)?)/g,
    (_, base, exponent) => `${base}<sup>${exponent}</sup>`
  );

  normalized = normalized.replace(
    /([A-Za-z])_(\d+|[A-Za-z](?:[A-Za-z0-9]*)?)/g,
    (_, base, subscript) => `${base}<sub>${subscript}</sub>`
  );

  return normalized.replace(/@@FLASHIFYPRESERVED(\d+)@@/g, (_, index) => {
    return preserved[Number(index)] ?? "";
  });
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
