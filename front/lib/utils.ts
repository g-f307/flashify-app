import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata o nome do deck para exibição.
export function formatDocumentTitle(filePath: string, explicitTitle?: string | null): string {
  if (typeof explicitTitle === "string" && explicitTitle.trim().length > 0) {
    return explicitTitle;
  }

  if (!filePath) return "Deck sem título";

  // Remove o caminho do diretório (ex: 'uploads/')
  const fileName = filePath.split('/').pop() || filePath;

  // Remove a extensão do ficheiro
  let title = fileName.replace(/\.[^/.]+$/, "");

  // ▼▼▼ LINHA ADICIONADA PARA A CORREÇÃO ▼▼▼
  // Remove o prefixo do ID do utilizador (ex: '1_') do início do título
  title = title.replace(/^\d+_/g, '');

  // Substitui underscores por espaços
  return title.replace(/_/g, ' ');
}
