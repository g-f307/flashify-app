"use client";

import { useEffect, useMemo, useState } from "react";
import { Expand, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PDFJS_CDN_VERSION = "4.10.38";
const PDF_THUMBNAIL_SCALE = 0.7;
const PDF_EXPANDED_SCALE = 1.8;

type PdfPagePreview = {
  page_number: number;
  preview_text: string;
  has_text: boolean;
};

interface PdfPagePickerProps {
  file: File;
  fileName: string;
  totalPages: number;
  pages: PdfPagePreview[];
  selectedPages: number[] | null;
  onSelectedPagesChange: (pages: number[] | null) => void;
}

export function PdfPagePicker({
  file,
  fileName,
  totalPages,
  pages,
  selectedPages,
  onSelectedPagesChange,
}: PdfPagePickerProps) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [expandedPageUrls, setExpandedPageUrls] = useState<Record<number, string>>({});
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [expandedPageNumber, setExpandedPageNumber] = useState<number | null>(null);
  const [isRenderingExpandedPage, setIsRenderingExpandedPage] = useState(false);

  const allPageNumbers = useMemo(
    () => pages.map((page) => page.page_number),
    [pages],
  );

  const selectedSet = useMemo(() => {
    return new Set(selectedPages ?? allPageNumbers);
  }, [allPageNumbers, selectedPages]);
  const selectedCount = selectedSet.size;
  const expandedPage = pages.find((page) => page.page_number === expandedPageNumber) ?? null;
  const expandedThumbnailUrl = expandedPageNumber
    ? expandedPageUrls[expandedPageNumber] || thumbnailUrls[expandedPageNumber]
    : null;

  useEffect(() => {
    let isCancelled = false;

    async function renderExpandedPage() {
      if (expandedPageNumber === null || expandedPageUrls[expandedPageNumber]) {
        return;
      }

      setIsRenderingExpandedPage(true);

      try {
        const pdfjs = await import(
          /* webpackIgnore: true */
          `https://unpkg.com/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.min.mjs`
        );
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.worker.min.mjs`;

        const buffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;
        const page = await pdf.getPage(expandedPageNumber);
        const viewport = page.getViewport({ scale: PDF_EXPANDED_SCALE });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          return;
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (!isCancelled) {
          setExpandedPageUrls((current) => ({
            ...current,
            [expandedPageNumber]: canvas.toDataURL("image/png"),
          }));
        }

        if (typeof pdf.destroy === "function") {
          pdf.destroy();
        }
      } catch (error) {
        console.error("Erro ao renderizar página ampliada do PDF:", error);
      } finally {
        if (!isCancelled) {
          setIsRenderingExpandedPage(false);
        }
      }
    }

    renderExpandedPage();

    return () => {
      isCancelled = true;
    };
  }, [expandedPageNumber, expandedPageUrls, file]);

  useEffect(() => {
    let isCancelled = false;

    async function renderThumbnails() {
      setIsRendering(true);
      setRenderError(null);
      setThumbnailUrls({});
      setExpandedPageUrls({});

      try {
        const pdfjs = await import(
          /* webpackIgnore: true */
          `https://unpkg.com/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.min.mjs`
        );
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_CDN_VERSION}/build/pdf.worker.min.mjs`;

        const buffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buffer }).promise;

        const nextThumbnailUrls: Record<number, string> = {};

        for (const pageMeta of pages) {
          const page = await pdf.getPage(pageMeta.page_number);
          const viewport = page.getViewport({ scale: PDF_THUMBNAIL_SCALE });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            continue;
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          nextThumbnailUrls[pageMeta.page_number] = canvas.toDataURL("image/png");
        }

        if (!isCancelled) {
          setThumbnailUrls(nextThumbnailUrls);
        }

        if (typeof pdf.destroy === "function") {
          pdf.destroy();
        }
      } catch (error) {
        console.error("Erro ao renderizar miniaturas do PDF:", error);
        if (!isCancelled) {
          setRenderError("Não foi possível renderizar a prévia visual do PDF.");
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    renderThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [file, pages]);

  const togglePage = (pageNumber: number) => {
    const nextSelection = new Set(selectedSet);

    if (nextSelection.has(pageNumber)) {
      nextSelection.delete(pageNumber);
    } else {
      nextSelection.add(pageNumber);
    }

    const orderedPages = allPageNumbers.filter((page) => nextSelection.has(page));
    if (orderedPages.length === allPageNumbers.length) {
      onSelectedPagesChange(null);
      return;
    }

    onSelectedPagesChange(orderedPages);
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    pageNumber: number,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    togglePage(pageNumber);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/70 bg-background/80 p-3 dark:border-zinc-700/80 dark:bg-muted/30">
        <div className="min-w-0">
          <p className="max-w-full break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
            {fileName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedCount === allPageNumbers.length
              ? `${totalPages} páginas no PDF. Todas estão selecionadas. Toque para ajustar ou expandir para inspecionar melhor.`
              : `${totalPages} páginas no PDF. ${selectedCount} selecionadas no momento. Toque para ajustar ou expandir para inspecionar melhor.`}
          </p>
        </div>
        {isRendering && (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando páginas...
          </div>
        )}
      </div>

      {renderError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-300">
          {renderError}
        </p>
      )}

      <div className="max-h-[34rem] overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-2.5 dark:border-zinc-700/80 dark:bg-muted/30 sm:max-h-[36rem] sm:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pages.map((page) => {
            const isSelected = selectedSet.has(page.page_number);
            const thumbnailUrl = thumbnailUrls[page.page_number];

            return (
              <div
                key={page.page_number}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Página ${page.page_number}. ${isSelected ? "Selecionada" : "Fora da seleção"}. Pressione para alternar seleção.`}
                onClick={() => togglePage(page.page_number)}
                onKeyDown={(event) => handleCardKeyDown(event, page.page_number)}
                className={cn(
                  "text-left rounded-xl border bg-background overflow-hidden transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-card",
                  "hover:border-primary/60 hover:shadow-sm",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border dark:border-zinc-700/80",
                )}
              >
                <div className="aspect-[0.58] sm:aspect-[0.64] bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border/70 dark:border-zinc-700/80 dark:bg-muted/40">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={`Prévia da página ${page.page_number}`}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-xs">Renderizando...</span>
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium text-foreground block">
                        Página {page.page_number}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-1 block sm:hidden">
                        Toque para {isSelected ? "remover" : "adicionar"} esta página
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedPageNumber(page.page_number);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground dark:border-zinc-700/80 dark:bg-card dark:hover:bg-muted"
                        aria-label={`Expandir página ${page.page_number}`}
                      >
                        <Expand className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Expandir</span>
                      </button>
                      <span
                        className={cn(
                          "text-[11px] px-2 py-1 rounded-full",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isSelected ? "Selecionada" : "Fora da seleção"}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={expandedPageNumber !== null} onOpenChange={(open) => !open && setExpandedPageNumber(null)}>
        <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] overflow-hidden p-0 sm:w-[calc(100vw-2rem)] dark:border-zinc-700/80 dark:bg-card" showCloseButton={false}>
          <div className="flex items-center justify-end border-b border-border/70 bg-background px-3 py-2 dark:border-zinc-700/80 dark:bg-card sm:px-4">
            <button
              type="button"
              onClick={() => setExpandedPageNumber(null)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fechar visualização ampliada"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] max-h-[calc(92vh-3.5rem)]">
            <div className="overflow-auto bg-muted/30 p-3 dark:bg-muted/40 sm:p-6">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm dark:border-zinc-700/80">
                {expandedThumbnailUrl ? (
                  <img
                    src={expandedThumbnailUrl}
                    alt={`Prévia ampliada da página ${expandedPageNumber}`}
                    className="w-full h-auto object-contain"
                  />
                ) : (
                  <div className="min-h-[320px] flex items-center justify-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">
                        {isRenderingExpandedPage ? "Carregando página em alta resolução..." : "Carregando página..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-auto border-t border-border/70 bg-background p-4 dark:border-zinc-700/80 dark:bg-card lg:border-l lg:border-t-0 sm:p-6">
              <DialogHeader className="text-left">
                <DialogTitle>Página {expandedPageNumber}</DialogTitle>
                <DialogDescription>
                  Use esta visualização ampliada para confirmar se deseja incluir esta página na seleção.
                </DialogDescription>
              </DialogHeader>

              {expandedPage && (
                <div className="mt-4 space-y-4 pb-20 lg:pb-0">
                  <div className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground dark:bg-muted dark:text-muted-foreground">
                    {selectedSet.has(expandedPage.page_number) ? "Selecionada no deck" : "Fora da seleção"}
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePage(expandedPage.page_number)}
                    className={cn(
                      "hidden w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors lg:block",
                      selectedSet.has(expandedPage.page_number)
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border/70 bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:border-zinc-700/80 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80",
                    )}
                  >
                    {selectedSet.has(expandedPage.page_number)
                      ? "Remover esta página da seleção"
                      : "Adicionar esta página à seleção"}
                  </button>
                </div>
              )}

              {expandedPage && (
                <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur dark:border-zinc-700/80 dark:bg-background/95 lg:hidden">
                  <button
                    type="button"
                    onClick={() => togglePage(expandedPage.page_number)}
                    className={cn(
                      "w-full rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                      selectedSet.has(expandedPage.page_number)
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border/70 bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:border-zinc-700/80 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80",
                    )}
                  >
                    {selectedSet.has(expandedPage.page_number)
                      ? "Remover esta página da seleção"
                      : "Adicionar esta página à seleção"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
