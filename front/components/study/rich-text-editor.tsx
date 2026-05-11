"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  CaseSensitive,
  Bold,
  Code2,
  ChevronDown,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Sigma,
  SquareCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { normalizeEditorHtml } from "@/lib/rich-text";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
}

type ToolbarAction = {
  label: string;
  icon: typeof Bold;
  hint?: string;
  onClick: () => void;
};

export function RichTextEditor({
  value,
  onChange,
  onFocus,
  placeholder = "Digite aqui...",
  minHeightClassName = "min-h-[180px]",
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (document.queryCommandSupported?.("defaultParagraphSeparator")) {
      document.execCommand("defaultParagraphSeparator", false, "p");
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const normalizedValue = normalizeEditorHtml(value);
    if (normalizeEditorHtml(editor.innerHTML) !== normalizedValue) {
      editor.innerHTML = normalizedValue;
    }
  }, [value]);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(normalizeEditorHtml(editor.innerHTML));
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const stopEventPropagation = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const consumePointerEvent = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const insertHtml = (html: string) => {
    focusEditor();
    document.execCommand("insertHTML", false, html);
    emitChange();
  };

  const insertText = (text: string) => {
    focusEditor();
    document.execCommand("insertText", false, text);
    emitChange();
  };

  const actions: ToolbarAction[] = [
    { label: "Negrito", icon: Bold, hint: "Termos-chave", onClick: () => runCommand("bold") },
    { label: "Itálico", icon: Italic, hint: "Citações", onClick: () => runCommand("italic") },
    { label: "Parágrafo", icon: Pilcrow, hint: "Texto base", onClick: () => runCommand("formatBlock", "p") },
    { label: "Citação", icon: Quote, hint: "Bloco citado", onClick: () => runCommand("formatBlock", "blockquote") },
    { label: "Lista", icon: List, hint: "Marcadores", onClick: () => runCommand("insertUnorderedList") },
    { label: "Numerada", icon: ListOrdered, hint: "Passos", onClick: () => runCommand("insertOrderedList") },
    { label: "Código", icon: Code2, hint: "Inline", onClick: () => insertHtml("<code>termo técnico</code>") },
    {
      label: "Bloco código",
      icon: SquareCode,
      hint: "Trecho técnico",
      onClick: () =>
        insertHtml("<pre><code>// exemplo\nconst valor = 42;\n</code></pre><p><br></p>"),
    },
    { label: "Equação", icon: Sigma, hint: "Inline", onClick: () => insertText("\\(a^2 + b^2 = c^2\\)") },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]",
        className
      )}
      onClick={stopEventPropagation}
      onPointerDownCapture={stopEventPropagation}
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <CaseSensitive className="h-4 w-4" />
          <p className="truncate text-xs font-medium uppercase tracking-[0.18em]">
            Editor enriquecido
          </p>
        </div>
        <Popover open={isToolbarOpen} onOpenChange={setIsToolbarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-full border-black/10 bg-background/80 px-3 text-xs shadow-none dark:border-white/10 dark:bg-white/[0.04]"
              onPointerDown={consumePointerEvent}
              onMouseDown={consumePointerEvent}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsToolbarOpen((current) => !current);
              }}
              title="Exibir opções de formatação"
            >
              <span>Formatar</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isToolbarOpen && "rotate-180")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={10}
            className="w-[min(26rem,calc(100vw-3rem))] rounded-2xl border border-black/10 bg-popover p-3 text-popover-foreground shadow-xl dark:border-white/10 dark:bg-popover"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
            onClick={stopEventPropagation}
            onPointerDownCapture={stopEventPropagation}
          >
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-semibold text-foreground">Ferramentas</p>
                <p className="text-xs text-muted-foreground">Aplique formatações sem sair do campo.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rich-editor-tool h-auto min-h-14 flex-col items-start gap-1 rounded-xl border border-black/5 px-3 py-2 text-left shadow-none dark:border-white/5"
                    onPointerDown={consumePointerEvent}
                    onMouseDown={consumePointerEvent}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      action.onClick();
                    }}
                    title={action.label}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </div>
                    {action.hint && <span className="text-[11px] text-muted-foreground">{action.hint}</span>}
                  </Button>
                );
              })}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rich-editor-tool h-auto min-h-14 flex-col items-start gap-1 rounded-xl border border-dashed border-[#FACC15]/45 bg-[#FACC15]/8 px-3 py-2 text-left shadow-none"
                onPointerDown={consumePointerEvent}
                onMouseDown={consumePointerEvent}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  insertText("\n$$\nF = m \\cdot a\n$$\n");
                }}
                title="Equação em bloco"
              >
                <div className="flex items-center gap-2">
                  <Sigma className="h-4 w-4" />
                  <span className="text-xs font-medium">Equação bloco</span>
                </div>
                <span className="text-[11px] text-muted-foreground">KaTeX / LaTeX</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "flashcard-rich-editor prose prose-sm dark:prose-invert max-w-none px-4 py-4 text-sm leading-6 text-foreground outline-none",
          minHeightClassName
        )}
        onClick={stopEventPropagation}
        onMouseDown={stopEventPropagation}
        onFocus={onFocus}
        onInput={emitChange}
        onPaste={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const text = event.clipboardData.getData("text/plain");
          insertText(text);
        }}
      />
    </div>
  );
}
