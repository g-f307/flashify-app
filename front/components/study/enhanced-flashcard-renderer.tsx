'use client'

import DOMPurify from "dompurify";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Badge } from '@/components/ui/badge'
import { Code, FileText, Layers, BookOpen, GitCompare } from 'lucide-react'

interface EnhancedFlashcardRendererProps {
  content: string
  type?: 'concept' | 'code' | 'diagram' | 'example' | 'comparison'
  isAnswer?: boolean
  className?: string
}

const ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]

export function EnhancedFlashcardRenderer({
  content,
  type = 'concept',
  isAnswer = false,
  className,
}: EnhancedFlashcardRendererProps) {
  const sanitizedContent = DOMPurify.sanitize(content || "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  });

  const getTypeIcon = () => {
    switch (type) {
      case 'code':
        return <Code className="w-3 h-3" />
      case 'diagram':
        return <Layers className="w-3 h-3" />
      case 'example':
        return <BookOpen className="w-3 h-3" />
      case 'comparison':
        return <GitCompare className="w-3 h-3" />
      default:
        return <FileText className="w-3 h-3" />
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case 'code':
        return 'Código'
      case 'diagram':
        return 'Diagrama'
      case 'example':
        return 'Exemplo'
      case 'comparison':
        return 'Comparação'
      default:
        return 'Conceito'
    }
  }

  const getTypeColor = () => {
    switch (type) {
      case 'code':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-500/10 dark:text-green-200 dark:border-green-500/30'
      case 'diagram':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/10 dark:text-purple-200 dark:border-purple-500/30'
      case 'example':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/30'
      case 'comparison':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-500/10 dark:text-orange-200 dark:border-orange-500/30'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-white/10 dark:text-gray-200 dark:border-white/15'
    }
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <div className="flex max-h-full w-full min-h-0 flex-col justify-center gap-3">
        <div className="flex justify-center">
          <Badge variant="outline" className={`flex items-center gap-1 text-xs ${getTypeColor()}`}>
            {getTypeIcon()}
            {getTypeLabel()}
          </Badge>
        </div>

        <div className={`flashcard-rich-content min-h-0 overflow-auto ${isAnswer ? "text-left" : "text-center md:text-left"} ${className ?? ""}`}>
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={{
              a: ({ ...props }) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="break-all text-primary underline underline-offset-4"
                />
              ),
              blockquote: ({ ...props }) => (
                <blockquote
                  {...props}
                  className="my-3 border-l-4 border-primary/35 bg-primary/5 px-4 py-2 italic text-muted-foreground"
                />
              ),
              code: ({ className: codeClassName, children, ...props }) => {
                const isBlock = Boolean(codeClassName);
                if (!isBlock) {
                  return (
                    <code
                      {...props}
                      className="break-words rounded bg-black/5 px-1.5 py-0.5 text-[0.95em] dark:bg-white/10"
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <code
                    {...props}
                    className={`${codeClassName} block overflow-x-auto rounded-2xl bg-[#111827] p-4 text-sm text-slate-100`}
                  >
                    {children}
                  </code>
                );
              },
              h1: ({ ...props }) => <h1 {...props} className="mt-1 text-xl font-semibold leading-tight sm:text-2xl" />,
              h2: ({ ...props }) => <h2 {...props} className="mt-1 text-lg font-semibold leading-tight sm:text-xl" />,
              h3: ({ ...props }) => <h3 {...props} className="mt-1 text-base font-semibold leading-tight sm:text-lg" />,
              hr: ({ ...props }) => <hr {...props} className="my-4 border-border/70" />,
              li: ({ ...props }) => <li {...props} className="ml-5 pl-1" />,
              ol: ({ ...props }) => <ol {...props} className="my-3 list-decimal space-y-2" />,
              p: ({ ...props }) => <p {...props} className="my-2 leading-7" />,
              pre: ({ ...props }) => (
                <pre {...props} className="my-4 overflow-x-auto rounded-2xl bg-[#111827] p-0 text-sm text-slate-100" />
              ),
              table: ({ ...props }) => (
                <div className="my-4 overflow-x-auto">
                  <table {...props} className="min-w-full border-collapse overflow-hidden rounded-2xl border border-border/70 text-sm" />
                </div>
              ),
              td: ({ ...props }) => <td {...props} className="border border-border/70 px-3 py-2 align-top" />,
              th: ({ ...props }) => <th {...props} className="border border-border/70 bg-black/[0.03] px-3 py-2 text-left font-semibold dark:bg-white/[0.05]" />,
              ul: ({ ...props }) => <ul {...props} className="my-3 list-disc space-y-2" />,
            }}
          >
            {sanitizedContent}
          </Markdown>
        </div>
      </div>
    </div>
  )
}
