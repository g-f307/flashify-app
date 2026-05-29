declare module "katex/contrib/auto-render" {
  export type AutoRenderDelimiter = {
    left: string;
    right: string;
    display: boolean;
  };

  export type AutoRenderOptions = {
    delimiters?: AutoRenderDelimiter[];
    ignoredTags?: string[];
    throwOnError?: boolean;
  };

  export default function renderMathInElement(
    element: HTMLElement,
    options?: AutoRenderOptions
  ): void;
}
